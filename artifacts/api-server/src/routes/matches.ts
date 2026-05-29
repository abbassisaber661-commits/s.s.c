import { Router } from "express";
import { eq, desc, or, and } from "drizzle-orm";
import { db, pvpMatchesTable, tournamentsTable, playersTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";

const router = Router();

router.get("/matches", async (req, res) => {
  try {
    const { playerId, league, limit: lim } = req.query as Record<string, string>;
    const limit = Math.min(Number(lim) || 20, 100);
    const conditions = [];
    if (playerId) conditions.push(or(eq(pvpMatchesTable.playerAId, playerId), eq(pvpMatchesTable.playerBId, playerId)));
    if (league) conditions.push(eq(pvpMatchesTable.leagueId, league));
    const rows = await db.select().from(pvpMatchesTable)
      .where(conditions.length ? and(...(conditions as [ReturnType<typeof eq>])) : undefined)
      .orderBy(desc(pvpMatchesTable.createdAt)).limit(limit);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.post("/matches", async (req, res) => {
  try {
    const { playerAId, playerBId, leagueId, playerAScore, playerBScore, duration, coinsStake, rounds, matchType } = req.body as Record<string, unknown>;
    if (!playerAId || !playerBId || !leagueId) { res.status(400).json({ error: "missing fields" }); return; }
    const winnerId = (playerAScore as number) >= (playerBScore as number) ? playerAId : playerBId;
    const [match] = await db.insert(pvpMatchesTable).values({
      id: nanoid(),
      playerAId: String(playerAId),
      playerBId: String(playerBId),
      winnerId: String(winnerId),
      playerAScore: Number(playerAScore) || 0,
      playerBScore: Number(playerBScore) || 0,
      leagueId: String(leagueId),
      duration: Number(duration) || 30,
      rounds: (rounds as unknown[]) || [],
      coinsStake: Number(coinsStake) || 0,
      finishedAt: new Date(),
    }).returning();

    res.status(201).json(match);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.get("/matches/:id", async (req, res) => {
  try {
    const [match] = await db.select().from(pvpMatchesTable).where(eq(pvpMatchesTable.id, req.params.id)).limit(1);
    if (!match) { res.status(404).json({ error: "not found" }); return; }
    res.json(match);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.get("/tournaments", async (req, res) => {
  try {
    const rows = await db.select().from(tournamentsTable).orderBy(desc(tournamentsTable.createdAt)).limit(20);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.post("/tournaments", async (req, res) => {
  try {
    const { name, type, size, rewardCoins, rewardXp, startAt, endAt } = req.body as Record<string, unknown>;
    if (!name || !startAt) { res.status(400).json({ error: "missing fields" }); return; }
    const [t] = await db.insert(tournamentsTable).values({
      id: nanoid(),
      name: String(name),
      type: String(type || 'daily'),
      status: 'open',
      size: Number(size) || 8,
      rewardCoins: Number(rewardCoins) || 500,
      rewardXp: Number(rewardXp) || 300,
      startAt: new Date(String(startAt)),
      endAt: endAt ? new Date(String(endAt)) : undefined,
    }).returning();
    res.status(201).json(t);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.post("/tournaments/:id/join", async (req, res) => {
  try {
    const { playerId } = req.body as Record<string, unknown>;
    if (!playerId) { res.status(400).json({ error: "playerId required" }); return; }
    const [tournament] = await db.select().from(tournamentsTable).where(eq(tournamentsTable.id, req.params.id)).limit(1);
    if (!tournament) { res.status(404).json({ error: "not found" }); return; }
    if (tournament.status !== 'open') { res.status(400).json({ error: "tournament not open" }); return; }
    const parts = tournament.participants as string[];
    if (parts.includes(String(playerId))) { res.json(tournament); return; }
    const updated = [...parts, String(playerId)];
    const [result] = await db.update(tournamentsTable)
      .set({ participants: updated, ...(updated.length >= tournament.size ? { status: 'full' } : {}) })
      .where(eq(tournamentsTable.id, req.params.id)).returning();
    res.json(result);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

export default router;
