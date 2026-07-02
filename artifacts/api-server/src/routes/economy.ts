import { Router } from "express";
import { eq, desc, sum, and, gte } from "drizzle-orm";
import { db, coinTransactionsTable, storePurchasesTable, boostUsageTable, seasonsTable, playersTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";
import {
  calcMatchEconomy,
  canEnterLeague,
  getEntryGemCost,
  leagueTierToEconomyTier,
  type EconomyTier,
} from "../lib/economy-engine.js";
import { getOrCreateProfile } from "../lib/player-store.js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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

// ── Economy Engine: match result reward ────────────────────────────────────
//
//  POST /economy/match-result
//  Body: { playerId, playerName, rank, accuracyPct, tier }
//  Returns: EconomyResult + updated gems
//
//  This endpoint:
//    1. Looks up the player's current gems from the player-store JSON
//    2. Calculates coins + gems earned via the Economy Engine
//    3. Persists the new gem count back to the player-store
//    4. Records a coin transaction in the DB
//    5. Returns the full reward breakdown

const PLAYER_DATA_FILE = process.env.PLAYER_DATA_FILE ?? resolve("data/players.json");

function readPlayerStore(): { schemaVersion: number; profiles: Array<Record<string, unknown>> } {
  if (!existsSync(PLAYER_DATA_FILE)) return { schemaVersion: 1, profiles: [] };
  try {
    return JSON.parse(readFileSync(PLAYER_DATA_FILE, "utf8"));
  } catch {
    return { schemaVersion: 1, profiles: [] };
  }
}

function writePlayerStore(data: { schemaVersion: number; profiles: Array<Record<string, unknown>> }) {
  try {
    writeFileSync(PLAYER_DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("[economy] failed to write player store:", err);
  }
}

router.post("/economy/match-result", async (req, res) => {
  try {
    const { playerId, playerName, rank, accuracyPct, tier } = req.body as Record<string, unknown>;

    if (!playerId || rank === undefined || accuracyPct === undefined || !tier) {
      res.status(400).json({ error: "missing fields: playerId, rank, accuracyPct, tier" });
      return;
    }

    const rankNum     = Number(rank);
    const accuracyNum = Number(accuracyPct);
    const tierStr     = String(tier);

    // Resolve economy tier (supports both economy tier strings and league tier strings)
    const econTierMap: Record<string, EconomyTier> = {
      div3: "div3", div2: "div2", pro: "pro", champions: "champions",
      training: "div3", coin: "div2", champion: "champions",
    };
    const economyTier: EconomyTier = econTierMap[tierStr] ?? "div3";

    // Get current player coins from DB
    const playerIdStr = String(playerId);
    const [dbPlayer]  = await db
      .select({ coins: playersTable.coins })
      .from(playersTable)
      .where(eq(playersTable.id, playerIdStr))
      .limit(1);

    const currentCoins = dbPlayer?.coins ?? 0;

    // Get current player gems from player-store JSON
    const psData   = readPlayerStore();
    const profile  = psData.profiles.find(
      (p: Record<string, unknown>) => p.playerId === playerIdStr || p.id === playerIdStr,
    ) as Record<string, unknown> | undefined;
    const currentGems = typeof profile?.gems === "number" ? profile.gems : 0;

    // Calculate economy rewards
    const result = calcMatchEconomy(
      { rank: rankNum, accuracyPct: accuracyNum, tier: economyTier },
      currentCoins,
      currentGems,
    );

    // Persist new gems back to player-store (JSON cache)
    if (profile) {
      profile.gems      = result.newGems;
      profile.updatedAt = new Date().toISOString();
    } else {
      // Create a minimal profile entry for gems tracking
      const newProfile: Record<string, unknown> = {
        id: playerIdStr, playerId: playerIdStr,
        playerName: String(playerName ?? "Player"),
        xp: 0, level: 1, streak: 0, bestStreak: 0,
        badges: [], arcadeCoins: 0, gems: result.newGems,
        totalWins: 0, totalDraws: 0, totalLosses: 0,
        arcadePlays: 0, dailyClaimCount: 0,
        lastDailyAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      psData.profiles.push(newProfile);
    }
    writePlayerStore(psData);

    // Persist gems to DB (authoritative source) — coins are NOT awarded here,
    // they are handled exclusively by POST /matches to avoid double-counting.
    if (dbPlayer && result.gemsEarned > 0) {
      const [currentPlayer] = await db
        .select({ gems: playersTable.gems })
        .from(playersTable)
        .where(eq(playersTable.id, playerIdStr))
        .limit(1);
      const newDbGems = (currentPlayer?.gems ?? 0) + result.gemsEarned;
      await db
        .update(playersTable)
        .set({ gems: newDbGems, updatedAt: new Date() })
        .where(eq(playersTable.id, playerIdStr));
    }

    res.status(200).json({
      ...result,
      tier:         economyTier,
      rank:         rankNum,
      accuracyPct:  accuracyNum,
    });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

// ── Economy Engine: league entry check ─────────────────────────────────────

router.get("/economy/:playerId/gems", async (req, res) => {
  try {
    const playerIdStr = req.params.playerId;

    // Primary: read from DB (authoritative)
    const [dbPlayer] = await db
      .select({ gems: playersTable.gems })
      .from(playersTable)
      .where(eq(playersTable.id, playerIdStr))
      .limit(1);

    if (dbPlayer !== undefined) {
      res.json({ gems: dbPlayer.gems ?? 0 });
      return;
    }

    // Fallback: read from JSON file for non-DB players
    const psData  = readPlayerStore();
    const profile = psData.profiles.find(
      (p: Record<string, unknown>) => p.playerId === playerIdStr || p.id === playerIdStr,
    ) as Record<string, unknown> | undefined;
    const gems = typeof profile?.gems === "number" ? profile.gems : 0;
    res.json({ gems });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

router.get("/economy/entry-check/:tier/:gems", (req, res) => {
  const tier       = req.params.tier as EconomyTier;
  const playerGems = parseInt(req.params.gems, 10);
  const econTierMap: Record<string, EconomyTier> = {
    div3: "div3", div2: "div2", pro: "pro", champions: "champions",
    training: "div3", coin: "div2", champion: "champions",
  };
  const economyTier = econTierMap[tier] ?? "div3";
  res.json({
    canEnter:    canEnterLeague(economyTier, playerGems),
    required:    getEntryGemCost(economyTier),
    playerGems,
  });
});

export default router;
