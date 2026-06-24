import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";
import { requireAuth } from "../middleware/auth.js";
import { getClientIp, logAudit } from "../middleware/antiCheat.js";
import { strictRateLimit } from "../middleware/rateLimit.js";

const router = Router();

const PI_PRODUCTS: Record<string, { name: string; coins?: number; vipTier?: string; description: string }> = {
  "vip_silver":    { name: "VIP Silver (30 days)",   vipTier: "silver",   description: "Silver VIP membership" },
  "vip_gold":      { name: "VIP Gold (30 days)",     vipTier: "gold",     description: "Gold VIP membership" },
  "vip_diamond":   { name: "VIP Diamond (30 days)",  vipTier: "diamond",  description: "Diamond VIP membership" },
  "coins_250":     { name: "250 Coins Bundle",       coins: 250,          description: "250 in-game coins" },
  "coins_500":     { name: "500 Coins Bundle",       coins: 500,          description: "500 in-game coins" },
  "coins_1000":    { name: "1000 Coins Bundle",      coins: 1000,         description: "1000 in-game coins" },
  "tournament_entry": { name: "Tournament Entry",                         description: "Entry to paid tournament" },
};

const pendingPayments = new Map<string, {
  playerId: string; amount: number; memo: string;
  metadata: Record<string, unknown>; status: string; createdAt: number;
  piPaymentId?: string;
}>();

router.post("/pi/payment/create", requireAuth, strictRateLimit, async (req, res) => {
  const { playerId, amount, memo, metadata } = req.body as Record<string, unknown>;
  if (!playerId || !amount || !memo) {
    res.status(400).json({ error: "playerId, amount, memo required" }); return;
  }
  if (req.auth!.playerId !== String(playerId)) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  const paymentId = nanoid();
  pendingPayments.set(paymentId, {
    playerId: String(playerId), amount: Number(amount),
    memo: String(memo), metadata: (metadata as Record<string, unknown>) ?? {},
    status: "pending", createdAt: Date.now(),
  });
  await logAudit(String(playerId), "pi_payment_create", "pi_payment", paymentId, null,
    { amount, memo }, getClientIp(req), req.headers["user-agent"] ?? "");
  res.status(201).json({ paymentId, status: "pending" });
});

router.post("/pi/payment/approve", requireAuth, async (req, res) => {
  const { paymentId, piPaymentId } = req.body as Record<string, unknown>;
  if (!paymentId || !piPaymentId) {
    res.status(400).json({ error: "paymentId and piPaymentId required" }); return;
  }
  const pending = pendingPayments.get(String(paymentId));
  if (!pending) { res.status(404).json({ error: "payment not found" }); return; }
  pending.status = "approved";
  pending.piPaymentId = String(piPaymentId);
  res.json({ ok: true, status: "approved" });
});

router.post("/pi/payment/complete", requireAuth, async (req, res) => {
  const { paymentId, piTxId } = req.body as Record<string, unknown>;
  if (!paymentId || !piTxId) {
    res.status(400).json({ error: "paymentId and piTxId required" }); return;
  }
  const pending = pendingPayments.get(String(paymentId));
  if (!pending) { res.status(404).json({ error: "payment not found" }); return; }
  if (pending.status !== "approved") {
    res.status(409).json({ error: "payment not approved yet" }); return;
  }

  const product = pending.metadata.productId as string | undefined;
  const productInfo = product ? PI_PRODUCTS[product] : undefined;
  const resolvedPiPaymentId = pending.piPaymentId ?? String(paymentId);

  try {
    await db.execute(sql`
      INSERT INTO pi_payments (id, player_id, pi_payment_id, pi_tx_id, amount, memo, metadata, status, completed_at)
      VALUES (${String(paymentId)}, ${pending.playerId}, ${resolvedPiPaymentId},
              ${String(piTxId)}, ${pending.amount}, ${pending.memo},
              ${JSON.stringify(pending.metadata)}, 'completed', NOW())
      ON CONFLICT (pi_payment_id) DO NOTHING
    `);

    if (productInfo?.coins) {
      const [player] = await db.select({ coins: playersTable.coins })
        .from(playersTable).where(eq(playersTable.id, pending.playerId)).limit(1);
      if (player) {
        const newCoins = player.coins + productInfo.coins;
        await db.update(playersTable).set({ coins: newCoins, updatedAt: new Date() })
          .where(eq(playersTable.id, pending.playerId));
        const txId = nanoid();
        const desc = `Pi purchase: ${productInfo.name}`;
        await db.execute(sql`
          INSERT INTO coin_transactions (id, player_id, amount, type, source, description, balance_after)
          VALUES (${txId}, ${pending.playerId}, ${productInfo.coins}, 'add', 'pi_purchase', ${desc}, ${newCoins})
        `);
      }
    }

    await logAudit(pending.playerId, "pi_payment_complete", "pi_payment", String(paymentId),
      { status: "approved" }, { status: "completed", piTxId },
      getClientIp(req), req.headers["user-agent"] ?? "");

    pendingPayments.delete(String(paymentId));
    res.json({ ok: true, product: productInfo?.name });
  } catch (err) {
    req.log.error({ err }, "pi complete error");
    res.status(500).json({ error: "internal" });
  }
});

router.get("/pi/products", async (_req, res) => {
  res.json(PI_PRODUCTS);
});

export default router;
