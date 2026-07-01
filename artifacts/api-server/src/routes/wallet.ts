import { Router } from "express";
import { eq, desc, and, gt, lt, sum, sql } from "drizzle-orm";
import { db, walletsTable, walletTransactionsTable, playersTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";

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
    .values({ id: nanoid(), playerId, dnBalance: 0 })
    .returning();
  return created;
}

/* ─── GET /wallet/:playerId ─── */
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

/* ─── POST /wallet/gift ─── */
router.post("/wallet/gift", async (req, res) => {
  try {
    const { senderId, receiverId, amount, message } = req.body as Record<string, unknown>;

    if (!senderId || !receiverId || !amount) {
      res.status(400).json({ error: "senderId, receiverId, amount required" });
      return;
    }
    const dn = Math.abs(Number(amount));
    if (!Number.isInteger(dn) || dn <= 0) {
      res.status(400).json({ error: "amount must be a positive integer" });
      return;
    }
    if (String(senderId) === String(receiverId)) {
      res.status(400).json({ error: "cannot gift yourself" });
      return;
    }

    const [senderPlayer] = await db
      .select({ username: playersTable.username })
      .from(playersTable)
      .where(eq(playersTable.id, String(senderId)))
      .limit(1);
    const [receiverPlayer] = await db
      .select({ username: playersTable.username })
      .from(playersTable)
      .where(eq(playersTable.id, String(receiverId)))
      .limit(1);

    if (!senderPlayer || !receiverPlayer) {
      res.status(404).json({ error: "player not found" });
      return;
    }

    const senderWallet   = await getOrCreateWallet(String(senderId));
    const receiverWallet = await getOrCreateWallet(String(receiverId));

    if (senderWallet.dnBalance < dn) {
      res.status(400).json({ error: "insufficient DN balance" });
      return;
    }

    const newSenderBalance   = senderWallet.dnBalance - dn;
    const newReceiverBalance = receiverWallet.dnBalance + dn;
    const note = String(message || "").slice(0, 200) || undefined;

    await db.update(walletsTable)
      .set({ dnBalance: newSenderBalance, updatedAt: new Date() })
      .where(eq(walletsTable.playerId, String(senderId)));

    await db.update(walletsTable)
      .set({ dnBalance: newReceiverBalance, updatedAt: new Date() })
      .where(eq(walletsTable.playerId, String(receiverId)));

    const senderTxId   = nanoid();
    const receiverTxId = nanoid();

    await db.insert(walletTransactionsTable).values([
      {
        id:          senderTxId,
        playerId:    String(senderId),
        amount:      -dn,
        type:        "gift_sent",
        description: note ? `هدية إلى ${receiverPlayer.username}: ${note}` : `هدية إلى ${receiverPlayer.username}`,
        relatedId:   String(receiverId),
        balanceAfter: newSenderBalance,
      },
      {
        id:          receiverTxId,
        playerId:    String(receiverId),
        amount:      dn,
        type:        "gift_received",
        description: note ? `هدية من ${senderPlayer.username}: ${note}` : `هدية من ${senderPlayer.username}`,
        relatedId:   String(senderId),
        balanceAfter: newReceiverBalance,
      },
    ]);

    res.status(201).json({
      ok:                  true,
      senderBalance:       newSenderBalance,
      receiverBalance:     newReceiverBalance,
      senderTxId,
      receiverTxId,
    });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

/* ─── POST /wallet/credit (internal: award DN to a player) ─── */
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

    res.status(201).json({ ok: true, transaction: tx, newBalance });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

export default router;
