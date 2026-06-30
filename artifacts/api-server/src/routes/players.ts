import { Router } from "express";
import { eq, desc, or, sql, and, gte, lte } from "drizzle-orm";
import { db, playersTable, pvpMatchesTable, coinTransactionsTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";

const router = Router();

// ─── Division Leaderboard (LP-range based, no artificial cap) ─────────────────

const LP_DIVISION_RANGES: Record<string, { min: number; max: number | null }> = {
  training: { min: 0,   max: 99   },
  coin:     { min: 100, max: 299  },
  pro:      { min: 300, max: 499  },
  champion: { min: 500, max: null },
};

router.get("/players/leaderboard/division/:division", async (req, res) => {
  const division = req.params.division;
  const range    = LP_DIVISION_RANGES[division];
  if (!range) { res.status(400).json({ error: "invalid division" }); return; }

  const playerId = typeof req.query.playerId === "string" ? req.query.playerId : null;

  try {
    const condition =
      range.max !== null
        ? and(gte(playersTable.lp, range.min), lte(playersTable.lp, range.max))
        : gte(playersTable.lp, range.min);

    const rows = await db
      .select({
        id:                 playersTable.id,
        username:           playersTable.username,
        avatar:             playersTable.avatar,
        level:              playersTable.level,
        lp:                 playersTable.lp,
        coins:              playersTable.coins,
        matchesPlayed:      playersTable.matchesPlayed,
        matchesWon:         playersTable.matchesWon,
        pvpWins:            playersTable.pvpWins,
        pvpLosses:          playersTable.pvpLosses,
        skillAccuracy:      playersTable.skillAccuracy,
        verificationStatus: playersTable.verificationStatus,
        lastActiveAt:       playersTable.lastActiveAt,
      })
      .from(playersTable)
      .where(condition)
      .orderBy(desc(playersTable.lp));

    let playerRank: number | null = null;
    if (playerId) {
      const idx = rows.findIndex(r => r.id === playerId);
      playerRank = idx >= 0 ? idx + 1 : null;
    }

    res.json({ players: rows, playerRank, total: rows.length });
  } catch (err) {
    req.log.error({ err }, "division leaderboard error");
    res.status(500).json({ error: "internal" });
  }
});

// ─── Global Leaderboard ───────────────────────────────────────────────────────

router.get("/players/leaderboard", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const rows = await db
      .select({
        id:                 playersTable.id,
        username:           playersTable.username,
        avatar:             playersTable.avatar,
        level:              playersTable.level,
        elo:                playersTable.elo,
        lp:                 playersTable.lp,
        fame:               playersTable.fame,
        coins:              playersTable.coins,
        leagueDivision:     playersTable.leagueDivision,
        matchesPlayed:      playersTable.matchesPlayed,
        matchesWon:         playersTable.matchesWon,
        pvpWins:            playersTable.pvpWins,
        pvpLosses:          playersTable.pvpLosses,
        pvpWinStreak:       playersTable.pvpWinStreak,
        bestPvpStreak:      playersTable.bestPvpStreak,
        verificationStatus: playersTable.verificationStatus,
      })
      .from(playersTable)
      .orderBy(desc(playersTable.elo))
      .limit(limit);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "leaderboard error");
    res.status(500).json({ error: "internal" });
  }
});

// ─── Player Profile ───────────────────────────────────────────────────────────

router.get("/players/:id", async (req, res) => {
  try {
    const [player] = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.id, req.params.id))
      .limit(1);
    if (!player) { res.status(404).json({ error: "not found" }); return; }
    res.json(player);
  } catch (err) {
    req.log.error({ err }, "get player error");
    res.status(500).json({ error: "internal" });
  }
});

// ─── Player Match History ─────────────────────────────────────────────────────

router.get("/players/:id/matches", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const rows = await db
      .select()
      .from(pvpMatchesTable)
      .where(or(
        eq(pvpMatchesTable.playerAId, req.params.id),
        eq(pvpMatchesTable.playerBId, req.params.id),
      ))
      .orderBy(desc(pvpMatchesTable.createdAt))
      .limit(limit);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "player matches error");
    res.status(500).json({ error: "internal" });
  }
});

// ─── Player Stats Aggregate ───────────────────────────────────────────────────

router.get("/players/:id/stats", async (req, res) => {
  try {
    const [player] = await db
      .select({
        id:            playersTable.id,
        username:      playersTable.username,
        avatar:        playersTable.avatar,
        level:         playersTable.level,
        elo:           playersTable.elo,
        lp:            playersTable.lp,
        leagueDivision:playersTable.leagueDivision,
        matchesPlayed: playersTable.matchesPlayed,
        matchesWon:    playersTable.matchesWon,
        pvpWins:       playersTable.pvpWins,
        pvpLosses:     playersTable.pvpLosses,
        pvpWinStreak:  playersTable.pvpWinStreak,
        bestPvpStreak: playersTable.bestPvpStreak,
        coins:         playersTable.coins,
        xp:            playersTable.xp,
        fame:          playersTable.fame,
      })
      .from(playersTable)
      .where(eq(playersTable.id, req.params.id))
      .limit(1);

    if (!player) { res.status(404).json({ error: "not found" }); return; }

    const total     = player.matchesPlayed || 0;
    const wins      = player.matchesWon    || 0;
    const pvpTotal  = (player.pvpWins || 0) + (player.pvpLosses || 0);
    const winRate   = total > 0 ? Math.round((wins / total) * 100) : 0;
    const pvpWinRate= pvpTotal > 0 ? Math.round(((player.pvpWins || 0) / pvpTotal) * 100) : 0;

    res.json({
      ...player,
      winRate,
      pvpWinRate,
      totalMatches: total,
      pvpTotal,
    });
  } catch (err) {
    req.log.error({ err }, "player stats error");
    res.status(500).json({ error: "internal" });
  }
});

// ─── Player Coin Transaction History ─────────────────────────────────────────

router.get("/players/:id/transactions", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const rows = await db
      .select()
      .from(coinTransactionsTable)
      .where(eq(coinTransactionsTable.playerId, req.params.id))
      .orderBy(desc(coinTransactionsTable.createdAt))
      .limit(limit);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "player transactions error");
    res.status(500).json({ error: "internal" });
  }
});

// ─── Create / Upsert Player ───────────────────────────────────────────────────

router.post("/players", async (req, res) => {
  try {
    const { id, username, avatar, language, piUid } = req.body as Record<string, unknown>;
    if (typeof username !== "string" || !username.trim()) {
      res.status(400).json({ error: "username required" }); return;
    }
    const playerId = (typeof id === "string" && id) ? id : nanoid();
    const existing = (typeof id === "string" && id)
      ? (await db.select({ id: playersTable.id }).from(playersTable).where(eq(playersTable.id, id)).limit(1))[0] ?? null
      : null;
    if (existing) {
      await db.update(playersTable)
        .set({ username: String(username), updatedAt: new Date(), lastActiveAt: new Date(),
               ...(typeof language === "string" && { language }),
               ...(typeof piUid === "string" && { piUid, verificationStatus: "verified" }),
               ...(typeof avatar === "string" && { avatar }) })
        .where(eq(playersTable.id, id as string));
      const [updated] = await db.select().from(playersTable).where(eq(playersTable.id, id as string));
      res.json(updated);
    } else {
      const [created] = await db.insert(playersTable).values({
        id: playerId,
        username: String(username).trim(),
        avatar: typeof avatar === "string" ? avatar : "🎮",
        language: typeof language === "string" ? language : "en",
        piUid: typeof piUid === "string" ? piUid : undefined,
        verificationStatus: piUid ? "verified" : "unverified",
      }).returning();
      res.status(201).json(created);
    }
  } catch (err) {
    req.log.error({ err }, "create/update player error");
    res.status(500).json({ error: "internal" });
  }
});

// ─── Patch Player ─────────────────────────────────────────────────────────────

router.patch("/players/:id", async (req, res) => {
  try {
    const allowed = ["username","avatar","bio","cover","language","coins","xp","level","elo","lp","fame",
      "leagueDivision","unlockedLeagues","ownedItems","xpBoostUntil","highScores",
      "achievements","trophies","dailyChallenges","matchesPlayed","matchesWon",
      "pvpWins","pvpLosses","pvpWinStreak","bestPvpStreak","tournamentWins","bestStreak",
      "skillSpeed","skillAccuracy","skillMemory"];
    const updates: Record<string, unknown> = { updatedAt: new Date(), lastActiveAt: new Date() };
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }

    req.log.info({
      playerId: req.params.id,
      bodyKeys: Object.keys(req.body),
      hasAvatar: "avatar" in req.body,
      avatarLen: typeof req.body.avatar === "string" ? req.body.avatar.length : null,
      hasCover: "cover" in req.body,
      coverLen: typeof req.body.cover === "string" ? req.body.cover.length : null,
      updatesKeys: Object.keys(updates),
    }, "[PATCH /players/:id] incoming");

    const [updated] = await db.update(playersTable)
      .set(updates as Partial<typeof playersTable.$inferSelect>)
      .where(eq(playersTable.id, req.params.id))
      .returning();
    if (!updated) { res.status(404).json({ error: "not found" }); return; }

    req.log.info({
      playerId: updated.id,
      avatarLen: typeof updated.avatar === "string" ? updated.avatar.length : null,
      coverLen: typeof updated.cover === "string" ? updated.cover.length : null,
    }, "[PATCH /players/:id] DB updated OK");

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "patch player error");
    res.status(500).json({ error: "internal" });
  }
});

// ─── Sync Player (bulk field update) ─────────────────────────────────────────

router.post("/players/:id/sync", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: new Date(), lastActiveAt: new Date() };
    const fields = ["coins","xp","level","elo","lp","fame","leagueDivision","unlockedLeagues",
      "ownedItems","xpBoostUntil","highScores","achievements","trophies","dailyChallenges",
      "matchesPlayed","matchesWon","pvpWins","pvpLosses","pvpWinStreak","bestPvpStreak",
      "tournamentWins","bestStreak","skillSpeed","skillAccuracy","skillMemory","language","avatar"];
    for (const f of fields) { if (f in body) updates[f] = body[f]; }
    await db.update(playersTable).set(updates as never).where(eq(playersTable.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "sync error");
    res.status(500).json({ error: "internal" });
  }
});

export default router;
