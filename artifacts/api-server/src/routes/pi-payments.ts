import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, playersTable, walletsTable, giftLedgerTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";
import { requireAuth } from "../middleware/auth.js";
import { getClientIp, logAudit } from "../middleware/antiCheat.js";
import { strictRateLimit } from "../middleware/rateLimit.js";
import { createNotification } from "../lib/notificationService.js";

const router = Router();

// Pi is the ONLY real payment/gifting currency in the app (Pi Network Testnet
// now, Mainnet later). DN$ is a separate, non-transferable internal points
// system and never appears in this flow.
const PI_PRODUCTS: Record<string, { name: string; coins?: number; vipTier?: string; description: string }> = {
  "vip_silver":    { name: "VIP Silver (30 days)",   vipTier: "silver",   description: "Silver VIP membership" },
  "vip_gold":      { name: "VIP Gold (30 days)",     vipTier: "gold",     description: "Gold VIP membership" },
  "vip_diamond":   { name: "VIP Diamond (30 days)",  vipTier: "diamond",  description: "Diamond VIP membership" },
  "coins_250":     { name: "250 Coins Bundle",       coins: 250,          description: "250 in-game coins" },
  "coins_500":     { name: "500 Coins Bundle",       coins: 500,          description: "500 in-game coins" },
  "coins_1000":    { name: "1000 Coins Bundle",      coins: 1000,         description: "1000 in-game coins" },
  "tournament_entry": { name: "Tournament Entry",                         description: "Entry to paid tournament" },
};

interface PendingPayment {
  playerId: string; amount: number; memo: string;
  metadata: Record<string, unknown>; status: string; createdAt: number;
  piPaymentId?: string;
}

const pendingPayments = new Map<string, PendingPayment>();

async function getOrCreateWallet(playerId: string) {
  const [existing] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.playerId, playerId))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(walletsTable)
    .values({ id: nanoid(), playerId, dnBalance: 0, piEarnings: 0 })
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

  // ── Gift-type payments: validate receiver up front ──
  if (meta.kind === "gift") {
    const receiverId = meta.receiverId ? String(meta.receiverId) : "";
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
  pendingPayments.set(paymentId, {
    playerId: String(playerId), amount: piAmount,
    memo: String(memo), metadata: meta,
    status: "pending", createdAt: Date.now(),
  });
  await logAudit(String(playerId), "pi_payment_create", "pi_payment", paymentId, null,
    { amount: piAmount, memo, kind: meta.kind ?? "purchase" }, getClientIp(req), req.headers["user-agent"] ?? "");
  res.status(201).json({ paymentId, status: "pending" });
});

/* ─── POST /pi/payments/:paymentId/approve ─── */
router.post("/pi/payments/:paymentId/approve", requireAuth, async (req, res) => {
  const { paymentId } = req.params;
  const { piPaymentId } = req.body as Record<string, unknown>;
  if (!piPaymentId) {
    res.status(400).json({ error: "piPaymentId required" }); return;
  }
  const pending = pendingPayments.get(String(paymentId));
  if (!pending) { res.status(404).json({ error: "payment not found" }); return; }
  pending.status = "approved";
  pending.piPaymentId = String(piPaymentId);
  res.json({ ok: true, status: "approved" });
});

/* ─── POST /pi/payments/:paymentId/complete ─── */
router.post("/pi/payments/:paymentId/complete", requireAuth, async (req, res) => {
  const { paymentId } = req.params;
  const { txId } = req.body as Record<string, unknown>;
  if (!txId) {
    res.status(400).json({ error: "txId required" }); return;
  }
  const pending = pendingPayments.get(String(paymentId));
  if (!pending) { res.status(404).json({ error: "payment not found" }); return; }
  if (pending.status !== "approved") {
    res.status(409).json({ error: "payment not approved yet" }); return;
  }

  const isGift = pending.metadata.kind === "gift";
  const product = pending.metadata.productId as string | undefined;
  const productInfo = product ? PI_PRODUCTS[product] : undefined;
  const resolvedPiPaymentId = pending.piPaymentId ?? String(paymentId);

  try {
    await db.execute(sql`
      INSERT INTO pi_payments (id, player_id, pi_payment_id, pi_tx_id, amount, memo, metadata, status, completed_at)
      VALUES (${String(paymentId)}, ${pending.playerId}, ${resolvedPiPaymentId},
              ${String(txId)}, ${pending.amount}, ${pending.memo},
              ${JSON.stringify(pending.metadata)}, 'completed', NOW())
      ON CONFLICT (pi_payment_id) DO NOTHING
    `);

    if (isGift) {
      const receiverId = String(pending.metadata.receiverId);
      const postId = pending.metadata.postId ? String(pending.metadata.postId) : null;
      const emoji = pending.metadata.emoji ? String(pending.metadata.emoji).slice(0, 8) : "🎁";
      const message = pending.metadata.message ? String(pending.metadata.message).slice(0, 200) : "";

      const [senderPlayer] = await db.select({ username: playersTable.username })
        .from(playersTable).where(eq(playersTable.id, pending.playerId)).limit(1);
      const [receiverPlayer] = await db.select({ username: playersTable.username })
        .from(playersTable).where(eq(playersTable.id, receiverId)).limit(1);

      const receiverWallet = await getOrCreateWallet(receiverId);
      const newPiEarnings = Number(receiverWallet.piEarnings) + pending.amount;
      await db.update(walletsTable)
        .set({ piEarnings: newPiEarnings, updatedAt: new Date() })
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
      { status: "approved" }, { status: "completed", txId, kind: isGift ? "gift" : "purchase" },
      getClientIp(req), req.headers["user-agent"] ?? "");

    pendingPayments.delete(String(paymentId));
    res.json({ ok: true, product: productInfo?.name, kind: isGift ? "gift" : "purchase" });
  } catch (err) {
    req.log.error({ err }, "pi complete error");
    res.status(500).json({ error: "internal" });
  }
});

router.get("/pi/products", async (_req, res) => {
  res.json(PI_PRODUCTS);
});

export default router;
