import { Router } from "express";
import { eq, desc, gte, sql, count } from "drizzle-orm";
import { db, playersTable, pvpMatchesTable, analyticsEventsTable, dailyStatsTable, betaFeedbackTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";

const router = Router();

router.get("/analytics/dashboard", async (req, res) => {
  try {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalPlayers] = await db.select({ count: count() }).from(playersTable);
    const [activePlayers24h] = await db.select({ count: count() })
      .from(playersTable).where(gte(playersTable.lastActiveAt, since24h));
    const [activePlayers7d] = await db.select({ count: count() })
      .from(playersTable).where(gte(playersTable.lastActiveAt, since7d));
    const [newPlayers7d] = await db.select({ count: count() })
      .from(playersTable).where(gte(playersTable.createdAt, since7d));
    const [pvpMatches24h] = await db.select({ count: count() })
      .from(pvpMatchesTable).where(gte(pvpMatchesTable.createdAt, since24h));
    const [pvpMatches7d] = await db.select({ count: count() })
      .from(pvpMatchesTable).where(gte(pvpMatchesTable.createdAt, since7d));

    const topPlayers = await db.select({
      id: playersTable.id,
      username: playersTable.username,
      avatar: playersTable.avatar,
      elo: playersTable.elo,
      pvpWins: playersTable.pvpWins,
      level: playersTable.level,
      verificationStatus: playersTable.verificationStatus,
    }).from(playersTable).orderBy(desc(playersTable.elo)).limit(10);

    const leagueStats = await db.select({
      league: playersTable.leagueDivision,
      count: count(),
    }).from(playersTable).groupBy(playersTable.leagueDivision);

    const recentFeedback = await db.select()
      .from(betaFeedbackTable)
      .orderBy(desc(betaFeedbackTable.createdAt))
      .limit(20);

    const dailyHistory = await db.select()
      .from(dailyStatsTable)
      .orderBy(desc(dailyStatsTable.date))
      .limit(14);

    res.json({
      totals: {
        players: totalPlayers.count,
        activePlayers24h: activePlayers24h.count,
        activePlayers7d: activePlayers7d.count,
        newPlayers7d: newPlayers7d.count,
        pvpMatches24h: pvpMatches24h.count,
        pvpMatches7d: pvpMatches7d.count,
      },
      topPlayers,
      leagueStats,
      recentFeedback,
      dailyHistory,
    });
  } catch (err) {
    req.log.error({ err }, "analytics dashboard error");
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/analytics/event", async (req, res) => {
  try {
    const { playerId, event, data, session } = req.body;
    await db.insert(analyticsEventsTable).values({
      id: nanoid(),
      playerId: playerId || null,
      event,
      data: data || {},
      session: session || null,
    });
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

router.post("/beta-feedback", async (req, res) => {
  try {
    const { playerId, username, rating, category, message, page } = req.body;
    await db.insert(betaFeedbackTable).values({
      id: nanoid(),
      playerId: playerId || null,
      username: username || "guest",
      rating: Math.min(5, Math.max(1, Number(rating) || 5)),
      category: category || "general",
      message,
      page: page || "/",
    });
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "beta feedback error");
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
