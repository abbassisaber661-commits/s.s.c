import { Router } from "express";
import { eq, or, sql } from "drizzle-orm";
import { db, playersTable, walletsTable, giftLedgerTable, piPaymentsTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";
import { requireAuth } from "../middleware/auth.js";
import { getClientIp, logAudit } from "../middleware/antiCheat.js";
import { strictRateLimit } from "../middleware/rateLimit.js";
import { createNotification } from "../lib/notificationService.js";

const router = Router();

// Pi is the ONLY real payment/gifting currency in the app (Pi Network Testnet
// now, Mainnet later). DN$ is a separate, non-transferable internal points
// system and never appears in this flow.
//
// This file owns the "Pi Internal Ledger" — every payment attempt is persisted
// to `pi_payments` immediately (pending → confirmed → failed). It never holds
// or moves real Pi itself; Pi Network settles the actual funds. The ledger
// only tracks/displays state so the UI can show pending vs. confirmed vs.
// failed earnings, and keeps wallets.totalEarnedPi / pendingPi / availablePi
// in sync for gift receivers.
const PI_PRODUCTS: Record<string, { name: string; coins?: number; vipTier?: string; description: string }> = {
  "vip_silver":    { name: "VIP Silver (30 days)",   vipTier: "silver",   description: "Silver VIP membership" },
  "vip_gold":      { name: "VIP Gold (30 days)",     vipTier: "gold",     description: "Gold VIP membership" },
  "vip_diamond":   { name: "VIP Diamond (30 days)",  vipTier: "diamond",  description: "Diamond VIP membership" },
  "coins_250":     { name: "250 Coins Bundle",       coins: 250,          description: "250 in-game coins" },
  "coins_500":     { name: "500 Coins Bundle",       coins: 500,          description: "500 in-game coins" },
  "coins_1000":    { name: "1000 Coins Bundle",      coins: 1000,         description: "1000 in-game coins" },
  "tournament_entry": { name: "Tournament Entry",                         description: "Entry to paid tournament" },
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

  // ── Gift-type payments: validate receiver up front ──
  if (isGift) {
    receiverId = meta.receiverId ? String(meta.receiverId) : "";
    if (!receiverId) {
      res.status(400).json({ error: "receiverId required for gift payments" }); return;
    }
    if (receiverId === String(playerId)) {
      res.status(400).json({ error: "cannot gift yourself" }); return;
    }
    const [receiver] = await db.select({ id: playersTable.id })
      .from(playersTable).where(eq(playersTable.id, receiverId)).limit(1);
    if (!receiver) {
      res.status(404).json({ error: "receiver not found" }); return;
    }
  }

  const paymentId = nanoid();

  await db.insert(piPaymentsTable).values({
    id:          paymentId,
    playerId:    String(playerId),
    receiverId,
    kind:        isGift ? "gift" : "purchase",
    amount:      piAmount,
    memo:        String(memo),
    metadata:    meta,
    status:      "pending",
  });

  // Reflect the incoming (unconfirmed) amount on the receiver's ledger right away
  // so the UI can show "pending" Pi while waiting for the Pi Network to confirm.
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

/* ─── POST /pi/payments/:paymentId/approve ─── */
router.post("/pi/payments/:paymentId/approve", requireAuth, async (req, res) => {
  const { paymentId } = req.params;
  const { piPaymentId } = req.body as Record<string, unknown>;
  if (!piPaymentId) {
    res.status(400).json({ error: "piPaymentId required" }); return;
  }
  const [pending] = await db.select().from(piPaymentsTable)
    .where(eq(piPaymentsTable.id, String(paymentId))).limit(1);
  if (!pending) { res.status(404).json({ error: "payment not found" }); return; }
  if (pending.status !== "pending") {
    res.status(409).json({ error: `payment already ${pending.status}` }); return;
  }
  await db.update(piPaymentsTable)
    .set({ piPaymentId: String(piPaymentId), updatedAt: new Date() })
    .where(eq(piPaymentsTable.id, String(paymentId)));
  res.json({ ok: true, status: "pending" });
});

/* ─── POST /pi/payments/:paymentId/complete — Pi SDK confirmed the tx ─── */
router.post("/pi/payments/:paymentId/complete", requireAuth, async (req, res) => {
  const { paymentId } = req.params;
  const { txId } = req.body as Record<string, unknown>;
  if (!txId) {
    res.status(400).json({ error: "txId required" }); return;
  }
  const [pending] = await db.select().from(piPaymentsTable)
    .where(eq(piPaymentsTable.id, String(paymentId))).limit(1);
  if (!pending) { res.status(404).json({ error: "payment not found" }); return; }
  if (pending.status !== "pending") {
    res.status(409).json({ error: `payment already ${pending.status}` }); return;
  }

  const meta = (pending.metadata as Record<string, unknown>) ?? {};
  const isGift = pending.kind === "gift";
  const product = meta.productId as string | undefined;
  const productInfo = product ? PI_PRODUCTS[product] : undefined;
  const resolvedPiPaymentId = pending.piPaymentId ?? String(paymentId);

  try {
    await db.update(piPaymentsTable)
      .set({ status: "confirmed", piTxId: String(txId), piPaymentId: resolvedPiPaymentId, completedAt: new Date(), updatedAt: new Date() })
      .where(eq(piPaymentsTable.id, String(paymentId)));

    if (isGift) {
      const receiverId = pending.receiverId ?? String(meta.receiverId);
      const postId = meta.postId ? String(meta.postId) : null;
      const emoji = meta.emoji ? String(meta.emoji).slice(0, 8) : "🎁";
      const message = meta.message ? String(meta.message).slice(0, 200) : "";

      const [senderPlayer] = await db.select({ username: playersTable.username })
        .from(playersTable).where(eq(playersTable.id, pending.playerId)).limit(1);
      const [receiverPlayer] = await db.select({ username: playersTable.username })
        .from(playersTable).where(eq(playersTable.id, receiverId)).limit(1);

      // Move the amount off pendingPi and onto confirmed totalEarnedPi/availablePi.
      const receiverWallet = await getOrCreateWallet(receiverId);
      const newPending = Math.max(0, Number(receiverWallet.pendingPi) - pending.amount);
      const newTotalEarned = Number(receiverWallet.totalEarnedPi) + pending.amount;
      const newAvailable = Number(receiverWallet.availablePi) + pending.amount;
      await db.update(walletsTable)
        .set({ pendingPi: newPending, totalEarnedPi: newTotalEarned, availablePi: newAvailable, updatedAt: new Date() })
        .where(eq(walletsTable.playerId, receiverId));

      await db.insert(giftLedgerTable).values({
        id:          nanoid(),
        senderId:    pending.playerId,
        receiverId,
        postId,
        amount:      pending.amount,
        currency:    "pi",
        emoji,
        message,
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
    } else if (productInfo?.coins) {
      const [player] = await db.select({ coins: playersTable.coins })
        .from(playersTable).where(eq(playersTable.id, pending.playerId)).limit(1);
      if (player) {
        const newCoins = player.coins + productInfo.coins;
        await db.update(playersTable).set({ coins: newCoins, updatedAt: new Date() })
          .where(eq(playersTable.id, pending.playerId));
        const txRowId = nanoid();
        const desc = `Pi purchase: ${productInfo.name}`;
        await db.execute(sql`
          INSERT INTO coin_transactions (id, player_id, amount, type, source, description, balance_after)
          VALUES (${txRowId}, ${pending.playerId}, ${productInfo.coins}, 'add', 'pi_purchase', ${desc}, ${newCoins})
        `);
      }
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

/* ─── POST /pi/payments/:paymentId/fail — Pi SDK cancelled/errored before completion ─── */
router.post("/pi/payments/:paymentId/fail", requireAuth, async (req, res) => {
  const { paymentId } = req.params;
  const { reason } = req.body as Record<string, unknown>;

  const [pending] = await db.select().from(piPaymentsTable)
    .where(eq(piPaymentsTable.id, String(paymentId))).limit(1);
  if (!pending) { res.status(404).json({ error: "payment not found" }); return; }
  if (req.auth!.playerId !== pending.playerId) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  if (pending.status !== "pending") {
    // Already resolved (confirmed/failed) — idempotent no-op.
    res.json({ ok: true, status: pending.status }); return;
  }

  await db.update(piPaymentsTable)
    .set({ status: "failed", updatedAt: new Date() })
    .where(eq(piPaymentsTable.id, String(paymentId)));

  const meta = (pending.metadata as Record<string, unknown>) ?? {};
  if (pending.kind === "gift") {
    const receiverId = pending.receiverId ?? (meta.receiverId ? String(meta.receiverId) : null);
    if (receiverId) {
      const receiverWallet = await getOrCreateWallet(receiverId);
      const newPending = Math.max(0, Number(receiverWallet.pendingPi) - pending.amount);
      await db.update(walletsTable)
        .set({ pendingPi: newPending, updatedAt: new Date() })
        .where(eq(walletsTable.playerId, receiverId));
    }
  }

  await logAudit(pending.playerId, "pi_payment_fail", "pi_payment", String(paymentId),
    { status: "pending" }, { status: "failed", reason: reason ?? "cancelled" },
    getClientIp(req), req.headers["user-agent"] ?? "");

  res.json({ ok: true, status: "failed" });
});

/* ─── GET /pi/ledger/:playerId — transaction history (sent + received) ─── */
router.get("/pi/ledger/:playerId", requireAuth, async (req, res) => {
  try {
    const playerId = String(req.params.playerId);
    const rows = await db.select().from(piPaymentsTable)
      .where(or(eq(piPaymentsTable.playerId, playerId), eq(piPaymentsTable.receiverId, playerId)))
      .orderBy(piPaymentsTable.createdAt);

    res.json({
      data: rows.reverse().map(r => ({
        id:         r.id,
        kind:       r.kind,
        senderId:   r.playerId,
        receiverId: r.receiverId,
        amountPi:   r.amount,
        status:     r.status,
        txId:       r.piTxId,
        memo:       r.memo,
        createdAt:  r.createdAt,
        completedAt:r.completedAt,
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
