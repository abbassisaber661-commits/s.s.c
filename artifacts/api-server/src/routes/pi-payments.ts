import { Router } from "express";
import { eq, or, inArray, and } from "drizzle-orm";
import { db, playersTable, walletsTable, giftLedgerTable, piPaymentsTable, subscriptionsTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";
import { requireAuth } from "../middleware/auth.js";
import { getClientIp, logAudit } from "../middleware/antiCheat.js";
import { strictRateLimit } from "../middleware/rateLimit.js";
import { createNotification } from "../lib/notificationService.js";

const router = Router();

// ── Pi Network server-side API key ──────────────────────────────────────────
// Required for server-to-server calls:
//   POST /v2/payments/:id/approve   (onReadyForServerApproval)
//   POST /v2/payments/:id/complete  (onReadyForServerCompletion)
//
// Get yours from the Pi Developer Portal → your app → API Key.
// Set PI_NETWORK_API_KEY (or legacy PI_API_KEY) in Replit Secrets.
const PI_SERVER_KEY =
  process.env["PI_NETWORK_API_KEY"] ??
  process.env["PI_API_KEY"]         ??
  "";

if (!PI_SERVER_KEY) {
  console.warn(
    "[Pi] WARNING: PI_NETWORK_API_KEY is not set. " +
    "Payment approve/complete calls to Pi Network will be skipped. " +
    "This MUST be configured before going to Mainnet.",
  );
}

// ── Pi Network API helpers ───────────────────────────────────────────────────

/**
 * Call POST /v2/payments/:piPaymentId/approve
 * Signals to Pi that our server acknowledges the payment.
 * Must be called in onReadyForServerApproval.
 */
async function piNetworkApprove(
  piPaymentId: string,
  log: { warn: (o: object, m: string) => void },
): Promise<boolean> {
  if (!PI_SERVER_KEY) {
    log.warn({ piPaymentId }, "[Pi] Skipping approve — PI_NETWORK_API_KEY not set");
    return true; // allow flow to continue in Testnet without a key
  }
  try {
    const res = await fetch(
      `https://api.minepi.com/v2/payments/${piPaymentId}/approve`,
      {
        method: "POST",
        headers: { Authorization: `Key ${PI_SERVER_KEY}` },
      },
    );
    if (!res.ok) {
      log.warn({ piPaymentId, status: res.status }, "[Pi] approve call rejected by Pi Network");
      return false;
    }
    return true;
  } catch (err) {
    log.warn({ piPaymentId, err }, "[Pi] approve network error");
    return false;
  }
}

/**
 * Call POST /v2/payments/:piPaymentId/complete
 * Signals to Pi that we have verified the blockchain transaction.
 * Must be called in onReadyForServerCompletion with the txid.
 *
 * Returns the Pi payment object on success, null on failure.
 */
async function piNetworkComplete(
  piPaymentId: string,
  txid: string,
  log: { warn: (o: object, m: string) => void; error: (o: object, m: string) => void },
): Promise<{ identifier: string; amount: number; status: Record<string, boolean> } | null> {
  if (!PI_SERVER_KEY) {
    log.warn({ piPaymentId }, "[Pi] Skipping complete — PI_NETWORK_API_KEY not set");
    return { identifier: piPaymentId, amount: 0, status: { developer_completed: true } }; // Testnet bypass
  }
  try {
    const res = await fetch(
      `https://api.minepi.com/v2/payments/${piPaymentId}/complete`,
      {
        method: "POST",
        headers: {
          Authorization:  `Key ${PI_SERVER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txid }),
      },
    );
    if (!res.ok) {
      log.warn({ piPaymentId, txid, status: res.status }, "[Pi] complete call rejected by Pi Network");
      return null;
    }
    return res.json() as Promise<{ identifier: string; amount: number; status: Record<string, boolean> }>;
  } catch (err) {
    log.error({ piPaymentId, txid, err }, "[Pi] complete network error");
    return null;
  }
}

// ── Subscription plan → expected price (server-authoritative) ───────────────
// These are the ONLY valid prices accepted by the backend.
// Frontend metadata.plan is validated against this map before fulfillment;
// a crafted flow sending a lower-priced plan with a higher-tier plan ID is
// rejected here with a 402.
const SUBSCRIPTION_PLAN_PRICES: Record<string, number> = {
  premium3: 3,
  premium1: 1,
};

// Pi is the ONLY real payment/gifting currency in the app (Pi Network Testnet
// now, Mainnet later). DN$ is a separate, non-transferable internal points
// system and never appears in this flow.
const PI_PRODUCTS: Record<string, { name: string; dn?: number; vipTier?: string; description: string }> = {
  "vip_silver":       { name: "VIP Silver (30 days)",   vipTier: "silver",   description: "Silver VIP membership" },
  "vip_gold":         { name: "VIP Gold (30 days)",     vipTier: "gold",     description: "Gold VIP membership" },
  "vip_diamond":      { name: "VIP Diamond (30 days)",  vipTier: "diamond",  description: "Diamond VIP membership" },
  "coins_250":        { name: "250 DN$ Bundle",         dn: 250,             description: "250 DN$ in-game points" },
  "coins_500":        { name: "500 DN$ Bundle",         dn: 500,             description: "500 DN$ in-game points" },
  "coins_1000":       { name: "1000 DN$ Bundle",        dn: 1000,            description: "1000 DN$ in-game points" },
  "tournament_entry": { name: "Tournament Entry",                            description: "Entry to paid tournament" },
  "premium3":         { name: "S.S.C Premium (30 days) — 3π",               description: "S.S.C SkillLeague Social Channel Premium subscription" },
  "premium1":         { name: "S.S.C Standard (30 days) — 1π",              description: "S.S.C SkillLeague Social Channel Standard subscription" },
};

async function getOrCreateWallet(playerId: string) {
  const [existing] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.playerId, playerId))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(walletsTable)
    .values({ id: nanoid(), playerId, dnBalance: 0, totalEarnedPi: 0, pendingPi: 0, availablePi: 0 })
    .returning();
  return created;
}

// ── Helper: insert subscription row (idempotent by piPaymentId) ──────────────
async function fulfillSubscription(
  playerId:    string,
  plan:        string,
  amountPi:    number,
  piPaymentId: string,
  txId:        string,
): Promise<void> {
  // Guard against double-fulfillment (incomplete payment recovery path)
  const existing = await db
    .select({ id: subscriptionsTable.id })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.piPaymentId, piPaymentId))
    .limit(1);
  if (existing.length) return; // already fulfilled

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await db.insert(subscriptionsTable).values({
    id: nanoid(),
    playerId,
    plan,
    amountPi,
    piPaymentId,
    piTxId: txId,
    status: "active",
    expiresAt,
  });
}

/* ─── POST /pi/payments — create a pending Pi payment (purchase or gift) ─── */
router.post("/pi/payments", requireAuth, strictRateLimit, async (req, res) => {
  const { playerId, amount, memo, metadata } = req.body as Record<string, unknown>;
  if (!playerId || !amount || !memo) {
    res.status(400).json({ error: "playerId, amount, memo required" }); return;
  }
  if (req.auth!.playerId !== String(playerId)) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const meta = (metadata as Record<string, unknown>) ?? {};
  const piAmount = Number(amount);
  if (!Number.isFinite(piAmount) || piAmount <= 0) {
    res.status(400).json({ error: "amount must be a positive number" }); return;
  }

  const isGift = meta.kind === "gift";
  let receiverId: string | null = null;

  if (isGift) {
    receiverId = meta.receiverId ? String(meta.receiverId) : "";
    if (!receiverId) { res.status(400).json({ error: "receiverId required for gift payments" }); return; }
    if (receiverId === String(playerId)) { res.status(400).json({ error: "cannot gift yourself" }); return; }
    const [receiver] = await db.select({ id: playersTable.id })
      .from(playersTable).where(eq(playersTable.id, receiverId)).limit(1);
    if (!receiver) { res.status(404).json({ error: "receiver not found" }); return; }
  }

  const paymentId = nanoid();
  await db.insert(piPaymentsTable).values({
    id: paymentId, playerId: String(playerId), receiverId,
    kind: isGift ? "gift" : "purchase",
    amount: piAmount, memo: String(memo), metadata: meta, status: "pending",
  });

  if (isGift && receiverId) {
    const receiverWallet = await getOrCreateWallet(receiverId);
    await db.update(walletsTable)
      .set({ pendingPi: Number(receiverWallet.pendingPi) + piAmount, updatedAt: new Date() })
      .where(eq(walletsTable.playerId, receiverId));
  }

  await logAudit(String(playerId), "pi_payment_create", "pi_payment", paymentId, null,
    { amount: piAmount, memo, kind: isGift ? "gift" : "purchase" }, getClientIp(req), req.headers["user-agent"] ?? "");
  res.status(201).json({ paymentId, status: "pending" });
});

/* ─── POST /pi/payments/:paymentId/approve ──────────────────────────────────
   Called by frontend onReadyForServerApproval(piPaymentId).
   1. Records the Pi payment ID in our DB.
   2. Calls POST https://api.minepi.com/v2/payments/:piPaymentId/approve
      Authorization: Key <PI_NETWORK_API_KEY>
   ────────────────────────────────────────────────────────────────────────── */
router.post("/pi/payments/:paymentId/approve", requireAuth, async (req, res) => {
  const { paymentId } = req.params;
  const { piPaymentId } = req.body as Record<string, unknown>;
  if (!piPaymentId) { res.status(400).json({ error: "piPaymentId required" }); return; }

  const [pending] = await db.select().from(piPaymentsTable)
    .where(eq(piPaymentsTable.id, String(paymentId))).limit(1);
  if (!pending) { res.status(404).json({ error: "payment not found" }); return; }
  if (req.auth!.playerId !== pending.playerId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (pending.status !== "pending") { res.status(409).json({ error: `payment already ${pending.status}` }); return; }

  // Persist the Pi payment ID immediately so we can look it up later
  await db.update(piPaymentsTable)
    .set({ piPaymentId: String(piPaymentId), updatedAt: new Date() })
    .where(eq(piPaymentsTable.id, String(paymentId)));

  // ── Call Pi Network to approve ─────────────────────────────────────────
  // POST https://api.minepi.com/v2/payments/:piPaymentId/approve
  // Authorization: Key <PI_NETWORK_API_KEY>
  // Pi SDK won't proceed to the blockchain step until the server approves.
  // Treat rejection as a hard failure — Pi SDK will surface it to the user.
  const approved = await piNetworkApprove(String(piPaymentId), req.log);
  if (!approved && PI_SERVER_KEY) {
    res.status(502).json({ error: "Pi Network rejected the payment. Please try again." });
    return;
  }

  res.json({ ok: true, status: "pending" });
});

/* ─── POST /pi/payments/:paymentId/complete ─────────────────────────────────
   Called by frontend onReadyForServerCompletion(piPaymentId, txId).
   1. Calls POST https://api.minepi.com/v2/payments/:piPaymentId/complete
      Authorization: Key <PI_NETWORK_API_KEY>
      Body: { txid }
   2. Verifies Pi Network confirms the transaction.
   3. Updates our DB and fulfills the product (subscription, gift, VIP, etc.).
   ────────────────────────────────────────────────────────────────────────── */
router.post("/pi/payments/:paymentId/complete", requireAuth, async (req, res) => {
  const { paymentId } = req.params;
  const { txId } = req.body as Record<string, unknown>;
  if (!txId) { res.status(400).json({ error: "txId required" }); return; }

  const [pending] = await db.select().from(piPaymentsTable)
    .where(eq(piPaymentsTable.id, String(paymentId))).limit(1);
  if (!pending) { res.status(404).json({ error: "payment not found" }); return; }
  if (req.auth!.playerId !== pending.playerId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (pending.status !== "pending") { res.status(409).json({ error: `payment already ${pending.status}` }); return; }

  const resolvedPiPaymentId = pending.piPaymentId ?? String(paymentId);

  // ── Call Pi Network to complete ────────────────────────────────────────
  // POST https://api.minepi.com/v2/payments/:piPaymentId/complete
  // Authorization: Key <PI_NETWORK_API_KEY>
  // Body: { txid: string }
  // This is the authoritative server-side signal that the payment is done.
  const piResult = await piNetworkComplete(resolvedPiPaymentId, String(txId), req.log);
  if (!piResult) {
    res.status(402).json({
      error: "Pi Network could not confirm the payment. Please contact support if Pi was deducted from your balance.",
    });
    return;
  }

  // ── Server-side amount integrity check ────────────────────────────────
  // Verify that what Pi Network says was paid matches what we stored.
  // Without a key (Testnet bypass) piResult.amount is 0 — skip the check.
  if (PI_SERVER_KEY && piResult.amount > 0 && Math.abs(piResult.amount - pending.amount) > 0.00001) {
    req.log.error(
      { expected: pending.amount, actual: piResult.amount, piPaymentId: resolvedPiPaymentId },
      "[Pi] Amount mismatch — rejecting completion",
    );
    res.status(402).json({ error: "Payment amount does not match expected value." });
    return;
  }

  const meta        = (pending.metadata as Record<string, unknown>) ?? {};
  const isGift      = pending.kind === "gift";
  const product     = meta.productId as string | undefined;
  const productInfo = product ? PI_PRODUCTS[product] : undefined;

  // ── Plan-price integrity check (subscriptions only) ───────────────────
  // Validate that the amount in our DB matches the server-authoritative
  // plan price. Prevents a client that manipulates metadata from receiving
  // a higher-tier subscription by underpaying.
  if (meta.kind === "subscription") {
    const plan          = String(meta.plan ?? "premium1");
    const expectedPrice = SUBSCRIPTION_PLAN_PRICES[plan];
    if (expectedPrice !== undefined && Math.abs(pending.amount - expectedPrice) > 0.00001) {
      req.log.error(
        { plan, expectedPrice, actualAmount: pending.amount },
        "[Pi] Subscription plan/amount mismatch — rejecting",
      );
      res.status(402).json({ error: "Subscription amount does not match plan price." });
      return;
    }
  }

  try {
    await db.update(piPaymentsTable)
      .set({
        status: "confirmed", piTxId: String(txId),
        piPaymentId: resolvedPiPaymentId, completedAt: new Date(), updatedAt: new Date(),
      })
      .where(eq(piPaymentsTable.id, String(paymentId)));

    if (isGift) {
      const receiverId = pending.receiverId ?? String(meta.receiverId);
      const postId     = meta.postId  ? String(meta.postId)            : null;
      const emoji      = meta.emoji   ? String(meta.emoji).slice(0, 8) : "🎁";
      const message    = meta.message ? String(meta.message).slice(0, 200) : "";

      const [[senderPlayer], [receiverPlayer]] = await Promise.all([
        db.select({ username: playersTable.username }).from(playersTable).where(eq(playersTable.id, pending.playerId)).limit(1),
        db.select({ username: playersTable.username }).from(playersTable).where(eq(playersTable.id, receiverId)).limit(1),
      ]);

      const receiverWallet = await getOrCreateWallet(receiverId);
      await db.update(walletsTable)
        .set({
          pendingPi:      Math.max(0, Number(receiverWallet.pendingPi) - pending.amount),
          totalEarnedPi:  Number(receiverWallet.totalEarnedPi) + pending.amount,
          availablePi:    Number(receiverWallet.availablePi)   + pending.amount,
          updatedAt: new Date(),
        })
        .where(eq(walletsTable.playerId, receiverId));

      await db.insert(giftLedgerTable).values({
        id: nanoid(), senderId: pending.playerId, receiverId, postId,
        amount: pending.amount, currency: "pi", emoji, message,
        piPaymentId: resolvedPiPaymentId,
      });

      createNotification({
        playerId: receiverId,
        type: "gift",
        title: `${emoji} هدية Pi من ${senderPlayer?.username ?? "مستخدم"}`,
        body: message ? `${pending.amount} π — "${message}"` : `استقبلت ${pending.amount} π`,
        data: { senderId: pending.playerId, amount: pending.amount, emoji, currency: "pi" },
      }).catch(() => {});
      createNotification({
        playerId: pending.playerId,
        type: "gift_sent",
        title: `${emoji} أرسلت هدية Pi إلى ${receiverPlayer?.username ?? "مستخدم"}`,
        body: `${pending.amount} π`,
        data: { receiverId, amount: pending.amount, emoji, currency: "pi" },
      }).catch(() => {});

    } else if (meta.kind === "subscription") {
      // ── S.S.C Premium Subscription ───────────────────────────────────────
      // Pi Network already confirmed the payment above (piNetworkComplete).
      // Now fulfill the subscription in our DB.
      await fulfillSubscription(
        pending.playerId,
        String(meta.plan ?? "premium1"),
        pending.amount,
        resolvedPiPaymentId,
        String(txId),
      );

    } else if (productInfo?.dn) {
      const { awardDN } = await import("../lib/dn-service.js");
      await awardDN(pending.playerId, productInfo.dn, "pi_purchase", `Pi purchase: ${productInfo.name}`).catch(() => {});
    }

    await logAudit(pending.playerId, "pi_payment_complete", "pi_payment", String(paymentId),
      { status: "pending" }, { status: "confirmed", txId, kind: isGift ? "gift" : "purchase" },
      getClientIp(req), req.headers["user-agent"] ?? "");

    res.json({ ok: true, product: productInfo?.name, kind: isGift ? "gift" : "purchase" });
  } catch (err) {
    req.log.error({ err }, "pi complete error");
    res.status(500).json({ error: "internal" });
  }
});

/* ─── POST /pi/payments/incomplete ──────────────────────────────────────────
   Public endpoint (no JWT required) — called by the frontend's
   onIncompletePaymentFound callback, which fires DURING Pi.authenticate()
   before any JWT is available.

   Handles payments from a previous session that were interrupted:

   • txId provided  → payment hit the blockchain but our server never
                       received the completion signal.
                       Action: call Pi Network /complete → fulfill product
                               → mark confirmed in DB.

   • txId absent    → payment was created but never submitted to the
                       blockchain (user closed the wallet early).
                       Action: mark failed in our DB.
                               Pi Network auto-expires these.

   Body: { piPaymentId: string, txId?: string }
   ────────────────────────────────────────────────────────────────────────── */
router.post("/pi/payments/incomplete", strictRateLimit, async (req, res) => {
  const { piPaymentId, txId } = req.body as Record<string, unknown>;
  if (!piPaymentId) { res.status(400).json({ error: "piPaymentId required" }); return; }

  try {
    const [payment] = await db.select().from(piPaymentsTable)
      .where(eq(piPaymentsTable.piPaymentId, String(piPaymentId))).limit(1);

    if (!payment) {
      // Not in our DB — acknowledge so the user can proceed
      req.log.info({ piPaymentId }, "[Pi] Incomplete payment not found in DB — acknowledging");
      res.json({ ok: true, status: "unknown" }); return;
    }

    if (payment.status !== "pending") {
      // Already resolved — idempotent
      res.json({ ok: true, status: payment.status }); return;
    }

    if (!txId) {
      // No blockchain tx — cancel in our DB only
      await db.update(piPaymentsTable)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(piPaymentsTable.id, payment.id));

      // Reverse pending Pi for gift payments
      if (payment.kind === "gift" && payment.receiverId) {
        const w = await getOrCreateWallet(payment.receiverId);
        await db.update(walletsTable)
          .set({ pendingPi: Math.max(0, Number(w.pendingPi) - payment.amount), updatedAt: new Date() })
          .where(eq(walletsTable.playerId, payment.receiverId));
      }

      req.log.info({ piPaymentId }, "[Pi] Incomplete payment (no blockchain tx) — marked failed");
      res.json({ ok: true, status: "failed" }); return;
    }

    // ── Payment is on the blockchain — complete it ──────────────────────
    // Call Pi Network /complete (same as the normal completion path)
    const piResult = await piNetworkComplete(String(piPaymentId), String(txId), req.log);
    if (!piResult) {
      // Pi Network rejected — leave as pending so user can retry
      req.log.warn({ piPaymentId, txId }, "[Pi] Pi Network rejected incomplete payment completion");
      res.status(402).json({ error: "Pi Network could not confirm the payment." }); return;
    }

    await db.update(piPaymentsTable)
      .set({ status: "confirmed", piTxId: String(txId), completedAt: new Date(), updatedAt: new Date() })
      .where(eq(piPaymentsTable.id, payment.id));

    // Fulfill subscription if applicable
    const meta = (payment.metadata as Record<string, unknown>) ?? {};
    if (meta.kind === "subscription") {
      const plan          = String(meta.plan ?? "premium1");
      const expectedPrice = SUBSCRIPTION_PLAN_PRICES[plan];
      // Reject if the stored amount doesn't match the authoritative plan price
      if (expectedPrice !== undefined && Math.abs(payment.amount - expectedPrice) > 0.00001) {
        req.log.error({ plan, expectedPrice, actualAmount: payment.amount }, "[Pi] Incomplete: plan/amount mismatch — not fulfilling");
        res.status(402).json({ error: "Subscription amount does not match plan price." }); return;
      }
      await fulfillSubscription(payment.playerId, plan, payment.amount, String(piPaymentId), String(txId));
    }

    req.log.info({ piPaymentId, txId }, "[Pi] Incomplete payment recovered and completed");
    res.json({ ok: true, status: "confirmed" });
  } catch (err) {
    req.log.error({ err, piPaymentId }, "[Pi] Error handling incomplete payment");
    res.status(500).json({ error: "internal" });
  }
});

/* ─── POST /pi/payments/:paymentId/fail ─────────────────────────────────── */
router.post("/pi/payments/:paymentId/fail", requireAuth, async (req, res) => {
  const { paymentId } = req.params;
  const { reason } = req.body as Record<string, unknown>;

  const [pending] = await db.select().from(piPaymentsTable)
    .where(eq(piPaymentsTable.id, String(paymentId))).limit(1);
  if (!pending) { res.status(404).json({ error: "payment not found" }); return; }
  if (req.auth!.playerId !== pending.playerId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (pending.status !== "pending") {
    res.json({ ok: true, status: pending.status }); return;
  }

  await db.update(piPaymentsTable)
    .set({ status: "failed", updatedAt: new Date() })
    .where(eq(piPaymentsTable.id, String(paymentId)));

  const meta = (pending.metadata as Record<string, unknown>) ?? {};
  if (pending.kind === "gift") {
    const receiverId = pending.receiverId ?? (meta.receiverId ? String(meta.receiverId) : null);
    if (receiverId) {
      const w = await getOrCreateWallet(receiverId);
      await db.update(walletsTable)
        .set({ pendingPi: Math.max(0, Number(w.pendingPi) - pending.amount), updatedAt: new Date() })
        .where(eq(walletsTable.playerId, receiverId));
    }
  }

  await logAudit(pending.playerId, "pi_payment_fail", "pi_payment", String(paymentId),
    { status: "pending" }, { status: "failed", reason: reason ?? "cancelled" },
    getClientIp(req), req.headers["user-agent"] ?? "");

  res.json({ ok: true, status: "failed" });
});

/* ─── GET /pi/ledger/:playerId ─────────────────────────────────────────────── */
router.get("/pi/ledger/:playerId", requireAuth, async (req, res) => {
  try {
    const playerId = String(req.params.playerId);
    const rows = await db.select().from(piPaymentsTable)
      .where(or(eq(piPaymentsTable.playerId, playerId), eq(piPaymentsTable.receiverId, playerId)))
      .orderBy(piPaymentsTable.createdAt);

    const ids = new Set<string>();
    for (const r of rows) {
      ids.add(r.playerId);
      if (r.receiverId) ids.add(r.receiverId);
    }
    const players = ids.size
      ? await db.select({ id: playersTable.id, username: playersTable.username })
          .from(playersTable).where(inArray(playersTable.id, Array.from(ids)))
      : [];
    const usernameById = new Map(players.map(p => [p.id, p.username]));

    res.json({
      data: rows.reverse().map(r => ({
        id:           r.id,
        kind:         r.kind,
        senderId:     r.playerId,
        senderName:   usernameById.get(r.playerId) ?? r.playerId,
        receiverId:   r.receiverId,
        receiverName: r.receiverId ? (usernameById.get(r.receiverId) ?? r.receiverId) : null,
        amountPi:     r.amount,
        status:       r.status,
        txId:         r.piTxId,
        memo:         r.memo,
        createdAt:    r.createdAt,
        completedAt:  r.completedAt,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "pi ledger error");
    res.status(500).json({ error: "internal" });
  }
});

router.get("/pi/products", async (_req, res) => {
  res.json(PI_PRODUCTS);
});

export default router;
