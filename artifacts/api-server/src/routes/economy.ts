import { Router } from "express";
import { eq, desc, sum, and, gte } from "drizzle-orm";
import { db, coinTransactionsTable, storePurchasesTable, boostUsageTable, seasonsTable, playersTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";

const router = Router();

router.get("/economy/:playerId/transactions", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const rows = await db.select().from(coinTransactionsTable)
      .where(eq(coinTransactionsTable.playerId, req.params.playerId))
      .orderBy(desc(coinTransactionsTable.createdAt)).limit(limit);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.post("/economy/transaction", async (req, res) => {
  try {
    const { playerId, amount, type, source, description } = req.body as Record<string, unknown>;
    if (!playerId || amount === undefined || !type || !source) { res.status(400).json({ error: "missing fields" }); return; }
    const [player] = await db.select({ coins: playersTable.coins }).from(playersTable).where(eq(playersTable.id, String(playerId))).limit(1);
    if (!player) { res.status(404).json({ error: "player not found" }); return; }
    const newBalance = player.coins + Number(amount);
    if (newBalance < 0) { res.status(400).json({ error: "insufficient balance" }); return; }
    const [tx] = await db.insert(coinTransactionsTable).values({
      id: nanoid(), playerId: String(playerId), amount: Number(amount),
      type: String(type), source: String(source),
      description: String(description || ""),
      balanceAfter: newBalance,
    }).returning();
    await db.update(playersTable).set({ coins: newBalance, updatedAt: new Date() }).where(eq(playersTable.id, String(playerId)));
    res.status(201).json({ transaction: tx, newBalance });
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.get("/economy/:playerId/purchases", async (req, res) => {
  try {
    const rows = await db.select().from(storePurchasesTable)
      .where(eq(storePurchasesTable.playerId, req.params.playerId))
      .orderBy(desc(storePurchasesTable.createdAt)).limit(50);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.post("/economy/purchase", async (req, res) => {
  try {
    const { playerId, itemId, itemName, piPrice, coinsSpent, piTxId } = req.body as Record<string, unknown>;
    if (!playerId || !itemId || !itemName) { res.status(400).json({ error: "missing fields" }); return; }
    const [purchase] = await db.insert(storePurchasesTable).values({
      id: nanoid(), playerId: String(playerId), itemId: String(itemId),
      itemName: String(itemName), piPrice: Number(piPrice) || 0,
      coinsSpent: Number(coinsSpent) || 0, piTxId: piTxId ? String(piTxId) : undefined,
      status: 'completed',
    }).returning();
    const owned = (await db.select({ ownedItems: playersTable.ownedItems }).from(playersTable).where(eq(playersTable.id, String(playerId))))[0]?.ownedItems as string[] || [];
    if (!owned.includes(String(itemId))) {
      await db.update(playersTable).set({ ownedItems: [...owned, String(itemId)], updatedAt: new Date() }).where(eq(playersTable.id, String(playerId)));
    }
    res.status(201).json(purchase);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.post("/economy/boost", async (req, res) => {
  try {
    const { playerId, type, multiplier, hours } = req.body as Record<string, unknown>;
    if (!playerId || !hours) { res.status(400).json({ error: "missing fields" }); return; }
    const endAt = new Date(Date.now() + Number(hours) * 3_600_000);
    const [boost] = await db.insert(boostUsageTable).values({
      id: nanoid(), playerId: String(playerId),
      type: String(type || "xp"), multiplier: Number(multiplier) || 2,
      hours: Number(hours), endAt, active: true,
    }).returning();
    await db.update(playersTable).set({ xpBoostUntil: endAt, updatedAt: new Date() }).where(eq(playersTable.id, String(playerId)));
    res.status(201).json(boost);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.get("/seasons", async (req, res) => {
  try {
    const rows = await db.select().from(seasonsTable).orderBy(desc(seasonsTable.startAt)).limit(10);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

export default router;
