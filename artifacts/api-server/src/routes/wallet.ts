import { Router } from "express";
import { eq, desc, and, gt, lt, sum, sql } from "drizzle-orm";
import { db, walletsTable, walletTransactionsTable, playersTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";
import { createNotification } from "../lib/notificationService.js";

const router = Router();

/* ─── helper: get or create wallet ─── */
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

/* ─── GET /wallet/:playerId ───
 * DN$ here is a pure internal points balance (gameplay/XP driven, non-transferable,
 * no monetary value). piEarnings is the player's accumulated Pi received from gifts
 * (real payments, handled entirely through the /pi/payments flow). ─── */
router.get("/wallet/:playerId", async (req, res) => {
  try {
    const { playerId } = req.params;
    const wallet = await getOrCreateWallet(playerId);

    const [incomeRow] = await db
      .select({ total: sql<number>`coalesce(sum(amount),0)` })
      .from(walletTransactionsTable)
      .where(and(eq(walletTransactionsTable.playerId, playerId), gt(walletTransactionsTable.amount, 0)));

    const [spendingRow] = await db
      .select({ total: sql<number>`coalesce(sum(abs(amount)),0)` })
      .from(walletTransactionsTable)
      .where(and(eq(walletTransactionsTable.playerId, playerId), lt(walletTransactionsTable.amount, 0)));

    res.json({
      dnBalance:    wallet.dnBalance,
      piEarnings:   Number(wallet.piEarnings ?? 0),
      totalIncome:  Number(incomeRow?.total ?? 0),
      totalSpending:Number(spendingRow?.total ?? 0),
    });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

/* ─── GET /wallet/:playerId/transactions ─── */
router.get("/wallet/:playerId/transactions", async (req, res) => {
  try {
    const { playerId } = req.params;
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const filter = String(req.query.filter || "all"); // all | income | spending

    const conditions = [eq(walletTransactionsTable.playerId, playerId)];
    if (filter === "income")   conditions.push(gt(walletTransactionsTable.amount, 0));
    if (filter === "spending") conditions.push(lt(walletTransactionsTable.amount, 0));

    const rows = await db
      .select()
      .from(walletTransactionsTable)
      .where(and(...conditions))
      .orderBy(desc(walletTransactionsTable.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(walletTransactionsTable)
      .where(and(...conditions));

    res.json({
      data:  rows,
      total: Number(countRow?.count ?? 0),
      page,
      limit,
    });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

// NOTE: DN$ is a non-transferable internal points system — there is intentionally
// no P2P "send" endpoint for it. Gifting between users is real money and is handled
// exclusively via Pi payments (see routes/pi-payments.ts, POST /pi/payments with
// metadata.kind = "gift").

/* ─── POST /wallet/credit (internal: award DN points to a player) ─── */
router.post("/wallet/credit", async (req, res) => {
  try {
    const { playerId, amount, type, description } = req.body as Record<string, unknown>;
    if (!playerId || !amount || !type) {
      res.status(400).json({ error: "playerId, amount, type required" });
      return;
    }
    const dn = Number(amount);
    if (!Number.isInteger(dn) || dn === 0) {
      res.status(400).json({ error: "amount must be a non-zero integer" });
      return;
    }

    const wallet = await getOrCreateWallet(String(playerId));
    const newBalance = wallet.dnBalance + dn;
    if (newBalance < 0) {
      res.status(400).json({ error: "insufficient balance" });
      return;
    }

    await db.update(walletsTable)
      .set({ dnBalance: newBalance, updatedAt: new Date() })
      .where(eq(walletsTable.playerId, String(playerId)));

    const [tx] = await db.insert(walletTransactionsTable).values({
      id:          nanoid(),
      playerId:    String(playerId),
      amount:      dn,
      type:        String(type),
      description: String(description || ""),
      balanceAfter: newBalance,
    }).returning();

    // ── Notification for positive DN credits ──
    if (dn > 0) {
      createNotification({
        playerId: String(playerId),
        type:  "dn",
        title: `💰 استقبلت ${dn} DN`,
        body:  String(description || `رصيدك الجديد: ${newBalance} DN`),
        data:  { amount: dn, newBalance, txType: String(type) },
      }).catch(() => {});
    }

    res.status(201).json({ ok: true, transaction: tx, newBalance });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

export default router;
