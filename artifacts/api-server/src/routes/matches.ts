import { Router } from "express";
import { eq, desc, or, and, gte } from "drizzle-orm";
import { db, pvpMatchesTable, tournamentsTable, playersTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";
import { optionalAuth } from "../middleware/auth.js";
import { claimMatchReward } from "../lib/daily-rewards.js";

const router = Router();

// ── Pure calculation functions (mirrored from frontend libs) ─────────────────

function getTier(lp: number): string {
  if (lp >= 500) return 'champion';
  if (lp >= 300) return 'pro';
  if (lp >= 100) return 'coin';
  return 'training';
}

const TIER_MIN_LP: Record<string, number> = { training: 0, coin: 100, pro: 300, champion: 500 };
const TIER_PENALTY: Record<string, boolean> = { training: false, coin: true, pro: true, champion: true };

function calcLpDelta(
  currentLp: number,
  result: { score: number; rank: number; bestStreak: number; correctPct: number },
): { newLp: number; delta: number; oldTier: string; newTier: string } {
  const oldTier = getTier(currentLp);
  let delta = 0;

  if (result.rank === 1)            delta += 25;
  else if (result.rank === 2)       delta += 12;
  else if (result.rank === 3)       delta += 5;
  else if (TIER_PENALTY[oldTier])   delta -= 8;

  if (result.score >= 900)          delta += 20;
  else if (result.score >= 700)     delta += 15;
  else if (result.score >= 500)     delta += 10;
  else if (result.score >= 300)     delta += 5;

  if (result.bestStreak >= 7)       delta += 15;
  else if (result.bestStreak >= 5)  delta += 10;
  else if (result.bestStreak >= 3)  delta += 5;

  if (result.correctPct >= 1.0)     delta += 10;
  else if (result.correctPct >= 0.9)delta += 6;
  else if (result.correctPct >= 0.7)delta += 3;

  let newLp = Math.max(0, currentLp + delta);
  if (TIER_PENALTY[oldTier]) {
    newLp = Math.max(TIER_MIN_LP[oldTier] ?? 0, newLp);
  }

  return { newLp, delta, oldTier, newTier: getTier(newLp) };
}

// accuracy is 0-1 (correctPct). Mirrors xp.ts xpForMatch() — accuracy*100 to match frontend scale.
function calcXpForMatch(score: number, accuracyFraction: number, isWin: boolean, bestStreak: number): number {
  let base = 20;
  base += Math.floor(score / 15);
  base += Math.floor((accuracyFraction * 100) / 20) * 5;
  if (isWin)              base += 30;
  if (bestStreak >= 3)    base += 10;
  if (bestStreak >= 5)    base += 15;
  return base;
}

// Mirrors xp.ts levelFromXp()
function levelFromXp(xp: number): number {
  const XP_PER_LEVEL = 200;
  const MAX_LEVEL    = 100;
  let level = 1, accumulated = 0;
  while (level < MAX_LEVEL) {
    const needed = Math.floor(XP_PER_LEVEL * Math.pow(level, 1.15));
    if (accumulated + needed > xp) break;
    accumulated += needed;
    level++;
  }
  return level;
}

// Mirrors league-progression.ts coin calc
function calcCoinsForMatch(score: number, rank: number, accuracyFraction: number, tier: string): number {
  let dn = 1;
  if      (rank === 1) dn += 3;
  else if (rank === 2) dn += 2;
  else if (rank === 3) dn += 1;
  if      (accuracyFraction >= 1.0) dn += 2;
  else if (accuracyFraction >= 0.8) dn += 1;
  if (tier !== 'training') {
    const base     = Math.floor(score / 12);
    const winBonus = rank === 1 ? 60 : rank === 2 ? 30 : rank === 3 ? 10 : 0;
    dn += base + winBonus;
  }
  return dn;
}

// ── UTC date helpers ─────────────────────────────────────────────────────────

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function startOfTomorrowUtc(): Date {
  const d = startOfTodayUtc();
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

// ── GET /matches/daily-status ─────────────────────────────────────────────────

router.get("/matches/daily-status", optionalAuth, async (req, res) => {
  try {
    const playerId = req.auth?.playerId ?? (req.query.playerId as string | undefined);
    if (!playerId) {
      res.json({ canPlay: true, nextMatchAt: null, matchesPlayedToday: 0 });
      return;
    }

    const todayStart = startOfTodayUtc();
    const existing   = await db
      .select({ id: pvpMatchesTable.id })
      .from(pvpMatchesTable)
      .where(and(eq(pvpMatchesTable.playerAId, playerId), gte(pvpMatchesTable.createdAt, todayStart)))
      .limit(1);

    if (existing.length > 0) {
      res.json({ canPlay: false, nextMatchAt: startOfTomorrowUtc().toISOString(), matchesPlayedToday: 1 });
    } else {
      res.json({ canPlay: true, nextMatchAt: null, matchesPlayedToday: 0 });
    }
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

// ── GET /matches ─────────────────────────────────────────────────────────────

router.get("/matches", async (req, res) => {
  try {
    const { playerId, league, limit: lim } = req.query as Record<string, string>;
    const limit = Math.min(Number(lim) || 20, 100);
    const conditions = [];
    if (playerId) conditions.push(or(eq(pvpMatchesTable.playerAId, playerId), eq(pvpMatchesTable.playerBId, playerId)));
    if (league)   conditions.push(eq(pvpMatchesTable.leagueId, league));
    const rows = await db
      .select().from(pvpMatchesTable)
      .where(conditions.length ? and(...(conditions as [ReturnType<typeof eq>])) : undefined)
      .orderBy(desc(pvpMatchesTable.createdAt)).limit(limit);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

// ── POST /matches ─────────────────────────────────────────────────────────────
//
//  Body: { playerAId, playerBId, leagueId, playerAScore, playerBScore,
//          duration, coinsStake, rounds, matchType, accuracy, bestStreak }
//
//  accuracy  — correctPct 0–1
//  bestStreak — longest answer streak during the match
//
//  1. Enforces 1 match per calendar day (UTC) per playerAId → 429 if exceeded
//  2. Calculates LP / XP / DN$ server-side
//  3. Persists updates to players table
//  4. Returns full rewards breakdown

router.post("/matches", optionalAuth, async (req, res) => {
  try {
    const {
      playerAId, playerBId, leagueId,
      playerAScore, playerBScore,
      duration, dnStake, coinsStake, rounds, matchType,
      accuracy, bestStreak,
    } = req.body as Record<string, unknown>;

    if (!playerAId || !playerBId || !leagueId) {
      res.status(400).json({ error: "missing fields: playerAId, playerBId, leagueId" });
      return;
    }

    const pAId          = String(playerAId);
    const pAScore       = Number(playerAScore) || 0;
    const pBScore       = Number(playerBScore) || 0;
    const accuracyNum   = Math.min(1, Math.max(0, Number(accuracy) || 0));
    const bestStreakNum  = Math.max(0, Number(bestStreak) || 0);
    const isWin         = pAScore >= pBScore;
    const winnerId      = isWin ? pAId : String(playerBId);
    const rank          = isWin ? 1 : 2;

    // ── Daily limit check (backend-enforced) ─────────────────────────────
    const todayStart   = startOfTodayUtc();
    const existingToday = await db
      .select({ id: pvpMatchesTable.id })
      .from(pvpMatchesTable)
      .where(and(eq(pvpMatchesTable.playerAId, pAId), gte(pvpMatchesTable.createdAt, todayStart)))
      .limit(1);

    if (existingToday.length > 0) {
      res.status(429).json({
        error:      "daily_limit_reached",
        message:    "You have already played your match for today.",
        nextMatchAt: startOfTomorrowUtc().toISOString(),
      });
      return;
    }

    // ── Load current player snapshot ──────────────────────────────────────
    const [dbPlayer] = await db
      .select({
        xp:            playersTable.xp,
        level:         playersTable.level,
        lp:            playersTable.lp,
        matchesPlayed: playersTable.matchesPlayed,
        matchesWon:    playersTable.matchesWon,
        pvpWins:       playersTable.pvpWins,
        pvpLosses:     playersTable.pvpLosses,
        pvpWinStreak:  playersTable.pvpWinStreak,
        bestPvpStreak: playersTable.bestPvpStreak,
      })
      .from(playersTable)
      .where(eq(playersTable.id, pAId))
      .limit(1);

    // ── Reward calculations ───────────────────────────────────────────────
    const tierStr    = String(leagueId);
    const currentLp  = dbPlayer?.lp    ?? 0;
    const currentXp  = dbPlayer?.xp    ?? 0;

    const lpResult   = calcLpDelta(currentLp, { score: pAScore, rank, bestStreak: bestStreakNum, correctPct: accuracyNum });
    const xpGained   = calcXpForMatch(pAScore, accuracyNum, isWin, bestStreakNum);
    const newXp      = currentXp + xpGained;
    const newLevel   = levelFromXp(newXp);
    const dnEarned   = calcCoinsForMatch(pAScore, rank, accuracyNum, tierStr);

    // ── Insert match record ───────────────────────────────────────────────
    const [match] = await db.insert(pvpMatchesTable).values({
      id:           nanoid(),
      playerAId:    pAId,
      playerBId:    String(playerBId),
      winnerId,
      playerAScore: pAScore,
      playerBScore: pBScore,
      leagueId:     String(leagueId),
      duration:     Number(duration) || 30,
      rounds:       (rounds as unknown[]) || [],
      dnStake:      Number(dnStake ?? coinsStake) || 0,
      dnWonA:       dnEarned,
      xpGainedA:    xpGained,
      eloChangeA:   lpResult.delta,
      finishedAt:   new Date(),
    }).returning();

    // ── Persist LP / XP / level to players table ─────────────────────────
    if (dbPlayer) {
      const newPvpWinStreak  = isWin ? (dbPlayer.pvpWinStreak ?? 0) + 1 : 0;
      const newBestPvpStreak = Math.max(dbPlayer.bestPvpStreak ?? 0, newPvpWinStreak);

      await db.update(playersTable).set({
        lp:            lpResult.newLp,
        xp:            newXp,
        level:         newLevel,
        leagueDivision: lpResult.newTier,
        matchesPlayed: (dbPlayer.matchesPlayed ?? 0) + 1,
        matchesWon:    (dbPlayer.matchesWon    ?? 0) + (isWin ? 1 : 0),
        pvpWins:       (dbPlayer.pvpWins       ?? 0) + (isWin ? 1 : 0),
        pvpLosses:     (dbPlayer.pvpLosses     ?? 0) + (isWin ? 0 : 1),
        pvpWinStreak:  newPvpWinStreak,
        bestPvpStreak: newBestPvpStreak,
        updatedAt:     new Date(),
      }).where(eq(playersTable.id, pAId));

      // ── Economy hook: daily match DN reward (fire-and-forget) ────────
      claimMatchReward(pAId).catch(() => {});
    }

    // ── Respond with full breakdown ───────────────────────────────────────
    res.status(201).json({
      ...match,
      dnWonA:     dnEarned,
      xpGainedA:  xpGained,
      eloChangeA: lpResult.delta,
      rewards: {
        lp: {
          delta:   lpResult.delta,
          oldLp:   currentLp,
          newLp:   lpResult.newLp,
          oldTier: lpResult.oldTier,
          newTier: lpResult.newTier,
        },
        xp: {
          gained:   xpGained,
          oldXp:    currentXp,
          newXp,
          oldLevel: levelFromXp(currentXp),
          newLevel,
          levelUp:  newLevel > levelFromXp(currentXp),
        },
        dn: {
          earned:  dnEarned,
        },
      },
    });
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

// ── GET /matches/:id ─────────────────────────────────────────────────────────

router.get("/matches/:id", async (req, res) => {
  try {
    const [match] = await db.select().from(pvpMatchesTable).where(eq(pvpMatchesTable.id, req.params.id)).limit(1);
    if (!match) { res.status(404).json({ error: "not found" }); return; }
    res.json(match);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

// ── Tournaments (unchanged) ──────────────────────────────────────────────────

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
    const { name, type, size, rewardDn, rewardCoins: rewardCoins_legacy, rewardXp, startAt, endAt } = req.body as Record<string, unknown>;
    if (!name || !startAt) { res.status(400).json({ error: "missing fields" }); return; }
    const [t] = await db.insert(tournamentsTable).values({
      id: nanoid(), name: String(name), type: String(type || 'daily'),
      status: 'open', size: Number(size) || 8,
      rewardDn: Number(rewardDn ?? rewardCoins_legacy) || 500, rewardXp: Number(rewardXp) || 300,
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
    const parts   = tournament.participants as string[];
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
