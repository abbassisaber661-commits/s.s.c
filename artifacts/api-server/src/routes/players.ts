import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";

const router = Router();

router.get("/players/leaderboard", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const rows = await db
      .select({
        id: playersTable.id,
        username: playersTable.username,
        avatar: playersTable.avatar,
        level: playersTable.level,
        elo: playersTable.elo,
        fame: playersTable.fame,
        leagueDivision: playersTable.leagueDivision,
        matchesPlayed: playersTable.matchesPlayed,
        matchesWon: playersTable.matchesWon,
        pvpWins: playersTable.pvpWins,
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

router.patch("/players/:id", async (req, res) => {
  try {
    const allowed = ["username","avatar","language","coins","xp","level","elo","fame",
      "leagueDivision","unlockedLeagues","ownedItems","xpBoostUntil","highScores",
      "achievements","trophies","dailyChallenges","matchesPlayed","matchesWon",
      "pvpWins","pvpLosses","pvpWinStreak","bestPvpStreak","tournamentWins","bestStreak",
      "skillSpeed","skillAccuracy","skillMemory"];
    const updates: Record<string, unknown> = { updatedAt: new Date(), lastActiveAt: new Date() };
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }
    const [updated] = await db.update(playersTable)
      .set(updates as Partial<typeof playersTable.$inferSelect>)
      .where(eq(playersTable.id, req.params.id))
      .returning();
    if (!updated) { res.status(404).json({ error: "not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "patch player error");
    res.status(500).json({ error: "internal" });
  }
});

router.post("/players/:id/sync", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: new Date(), lastActiveAt: new Date() };
    const fields = ["coins","xp","level","elo","fame","leagueDivision","unlockedLeagues",
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
