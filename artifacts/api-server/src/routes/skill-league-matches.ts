/**
 * skill-league-matches.ts
 * ────────────────────────
 * SkillLeague competitive match recording system.
 *
 * Routes:
 *   POST /matches/submit-result   → record a completed match with per-question data
 *   GET  /matches/leaderboard/skill → real leaderboard ranked by points → time → accuracy
 *
 * Ranking rules:
 *   1. totalPoints  (more = better)
 *   2. totalAnswerTime (less = better)
 *   3. accuracy %  (more = better)
 */

import { Router } from 'express';
import { eq, desc, or, and, gte, sql } from 'drizzle-orm';
import { db, pvpMatchesTable, playersTable } from '@workspace/db';
import { nanoid } from '../lib/nanoid.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// ── Types ─────────────────────────────────────────────────────────────────────

interface AnswerRecord {
  questionId: string;
  correct: boolean;
  responseTime: number;
}

interface ShapeSection {
  time: number;
  correct: boolean;
}

interface SubmitResultBody {
  playerId:     string;
  matchId?:     string;
  leagueId?:    string;
  answers:      AnswerRecord[];
  shapeSection: ShapeSection;
}

// ── Pure calculation functions ────────────────────────────────────────────────

function calculateMatchResult(answers: AnswerRecord[], shapeSection: ShapeSection) {
  const correctAnswers = answers.filter(a => a.correct).length;
  const wrongAnswers   = answers.filter(a => !a.correct).length;
  const totalPoints    = correctAnswers;
  const totalTime      = answers.reduce((sum, a) => sum + a.responseTime, 0);
  const totalQuestions = correctAnswers + wrongAnswers;
  const accuracy       = totalQuestions > 0
    ? (correctAnswers / totalQuestions) * 100
    : 0;

  return {
    totalPoints,
    totalTime,
    accuracy,
    correctAnswers,
    wrongAnswers,
    shapeTime:    shapeSection.time,
    shapeCorrect: shapeSection.correct,
  };
}

function rankPlayers(players: { totalPoints: number; totalTime: number; accuracy: number }[]) {
  return [...players].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (a.totalTime   !== b.totalTime)   return a.totalTime - b.totalTime;
    return b.accuracy - a.accuracy;
  });
}

// ── POST /matches/submit-result ───────────────────────────────────────────────
//
//  Body: {
//    playerId, matchId?, leagueId?,
//    answers: [{ questionId, correct, responseTime }],
//    shapeSection: { time, correct }
//  }
//
//  1. Validates input
//  2. Computes match result (points, totalTime, accuracy, shapeTime)
//  3. Saves match record to pvp_matches (rounds = answers array)
//  4. Updates player skill stats (skillAccuracy, skillSpeed)
//  5. Returns full result breakdown

router.post('/matches/submit-result', optionalAuth, async (req, res) => {
  try {
    const body = req.body as SubmitResultBody;
    const { playerId, answers, shapeSection, leagueId } = body;

    if (!playerId) {
      res.status(400).json({ error: 'playerId is required' });
      return;
    }
    if (!Array.isArray(answers) || answers.length === 0) {
      res.status(400).json({ error: 'answers must be a non-empty array' });
      return;
    }
    if (!shapeSection || typeof shapeSection.time !== 'number') {
      res.status(400).json({ error: 'shapeSection with valid time is required' });
      return;
    }

    const result = calculateMatchResult(answers, shapeSection);

    const matchId = body.matchId ?? nanoid();

    const [match] = await db.insert(pvpMatchesTable).values({
      id:              matchId,
      playerAId:       playerId,
      playerBId:       playerId,
      winnerId:        playerId,
      playerAScore:    result.totalPoints,
      playerBScore:    0,
      leagueId:        leagueId ?? 'training',
      matchType:       'skill',
      duration:        Math.ceil(result.totalTime + result.shapeTime),
      rounds:          answers as any[],
      coinsStake:      0,
      correctCount:    result.correctAnswers,
      wrongCount:      result.wrongAnswers,
      totalAnswerTime: result.totalTime,
      shapeTime:       result.shapeTime,
      shapeCorrect:    result.shapeCorrect,
      finishedAt:      new Date(),
    }).returning();

    // Update player skill stats
    const accuracyInt = Math.round(result.accuracy);
    const speedScore  = result.totalTime > 0
      ? Math.max(1, Math.min(100, Math.round(100 - (result.totalTime / answers.length) * 10)))
      : 50;

    await db.update(playersTable).set({
      skillAccuracy: accuracyInt,
      skillSpeed:    speedScore,
      matchesPlayed: sql`${playersTable.matchesPlayed} + 1`,
      updatedAt:     new Date(),
    }).where(eq(playersTable.id, playerId));

    res.status(201).json({
      matchId:       match.id,
      playerId,
      result: {
        totalPoints:    result.totalPoints,
        totalTime:      Number(result.totalTime.toFixed(3)),
        accuracy:       Number(result.accuracy.toFixed(2)),
        correctAnswers: result.correctAnswers,
        wrongAnswers:   result.wrongAnswers,
        shapeTime:      result.shapeTime,
        shapeCorrect:   result.shapeCorrect,
      },
    });
  } catch (err) {
    req.log.error({ err }, 'submit-result error');
    res.status(500).json({ error: 'internal' });
  }
});

// ── GET /matches/leaderboard/skill ───────────────────────────────────────────
//
//  Query params:
//    leagueId?  — filter by league (default: all)
//    limit?     — max results (default 50, max 100)
//    playerId?  — include requesting player's rank in response
//
//  Aggregates from pvp_matches where matchType='skill':
//    - totalPoints  = SUM(correct_count)
//    - totalTime    = SUM(total_answer_time)
//    - accuracy     = AVG(correct_count / (correct_count + wrong_count)) * 100
//    - matchesPlayed = COUNT(*)
//
//  Ranked by: totalPoints DESC → totalTime ASC → accuracy DESC

router.get('/matches/leaderboard/skill', async (req, res) => {
  try {
    const limit    = Math.min(Number(req.query.limit) || 50, 100);
    const leagueId = typeof req.query.leagueId === 'string' ? req.query.leagueId : null;
    const playerId = typeof req.query.playerId === 'string' ? req.query.playerId : null;

    const conditions: ReturnType<typeof eq>[] = [
      eq(pvpMatchesTable.matchType, 'skill') as any,
    ];
    if (leagueId) {
      conditions.push(eq(pvpMatchesTable.leagueId, leagueId) as any);
    }

    const rows = await db
      .select({
        playerId:       pvpMatchesTable.playerAId,
        totalPoints:    sql<number>`SUM(${pvpMatchesTable.correctCount})`.mapWith(Number),
        totalTime:      sql<number>`ROUND(SUM(${pvpMatchesTable.totalAnswerTime})::numeric, 3)`.mapWith(Number),
        accuracy:       sql<number>`
          CASE
            WHEN SUM(${pvpMatchesTable.correctCount} + ${pvpMatchesTable.wrongCount}) = 0 THEN 0
            ELSE ROUND(
              (SUM(${pvpMatchesTable.correctCount})::numeric /
               SUM(${pvpMatchesTable.correctCount} + ${pvpMatchesTable.wrongCount})::numeric) * 100,
              2
            )
          END
        `.mapWith(Number),
        matchesPlayed:  sql<number>`COUNT(*)`.mapWith(Number),
        correctTotal:   sql<number>`SUM(${pvpMatchesTable.correctCount})`.mapWith(Number),
        wrongTotal:     sql<number>`SUM(${pvpMatchesTable.wrongCount})`.mapWith(Number),
      })
      .from(pvpMatchesTable)
      .where(and(...(conditions as [ReturnType<typeof eq>])))
      .groupBy(pvpMatchesTable.playerAId)
      .orderBy(
        sql`SUM(${pvpMatchesTable.correctCount}) DESC`,
        sql`SUM(${pvpMatchesTable.totalAnswerTime}) ASC`,
        sql`
          CASE
            WHEN SUM(${pvpMatchesTable.correctCount} + ${pvpMatchesTable.wrongCount}) = 0 THEN 0
            ELSE (SUM(${pvpMatchesTable.correctCount})::numeric /
                  SUM(${pvpMatchesTable.correctCount} + ${pvpMatchesTable.wrongCount})::numeric) * 100
          END DESC
        `
      )
      .limit(limit);

    if (rows.length === 0) {
      res.json({ players: [], playerRank: null, total: 0 });
      return;
    }

    const playerIds = rows.map(r => r.playerId);
    const profiles  = await db
      .select({
        id:       playersTable.id,
        username: playersTable.username,
        avatar:   playersTable.avatar,
        level:    playersTable.level,
        leagueDivision: playersTable.leagueDivision,
        verificationStatus: playersTable.verificationStatus,
      })
      .from(playersTable)
      .where(or(...playerIds.map(id => eq(playersTable.id, id))));

    const profileMap = new Map(profiles.map(p => [p.id, p]));

    const players = rows.map((row, idx) => ({
      rank:          idx + 1,
      playerId:      row.playerId,
      username:      profileMap.get(row.playerId)?.username ?? 'Unknown',
      avatar:        profileMap.get(row.playerId)?.avatar   ?? '🎮',
      level:         profileMap.get(row.playerId)?.level    ?? 1,
      leagueDivision: profileMap.get(row.playerId)?.leagueDivision ?? 'training',
      verificationStatus: profileMap.get(row.playerId)?.verificationStatus ?? 'none',
      totalPoints:   row.totalPoints,
      totalTime:     row.totalTime,
      accuracy:      row.accuracy,
      matchesPlayed: row.matchesPlayed,
      correctTotal:  row.correctTotal,
      wrongTotal:    row.wrongTotal,
    }));

    let playerRank: number | null = null;
    if (playerId) {
      const idx = players.findIndex(p => p.playerId === playerId);
      playerRank = idx >= 0 ? idx + 1 : null;
    }

    res.json({ players, playerRank, total: players.length });
  } catch (err) {
    req.log.error({ err }, 'skill-leaderboard error');
    res.status(500).json({ error: 'internal' });
  }
});

// ── GET /matches/leaderboard/skill/:playerId ──────────────────────────────────
// Returns a single player's aggregated skill stats

router.get('/matches/leaderboard/skill/:pid', async (req, res) => {
  try {
    const { pid } = req.params;

    const [row] = await db
      .select({
        totalPoints:   sql<number>`SUM(${pvpMatchesTable.correctCount})`.mapWith(Number),
        totalTime:     sql<number>`ROUND(SUM(${pvpMatchesTable.totalAnswerTime})::numeric, 3)`.mapWith(Number),
        accuracy:      sql<number>`
          CASE
            WHEN SUM(${pvpMatchesTable.correctCount} + ${pvpMatchesTable.wrongCount}) = 0 THEN 0
            ELSE ROUND(
              (SUM(${pvpMatchesTable.correctCount})::numeric /
               SUM(${pvpMatchesTable.correctCount} + ${pvpMatchesTable.wrongCount})::numeric) * 100,
              2
            )
          END
        `.mapWith(Number),
        matchesPlayed: sql<number>`COUNT(*)`.mapWith(Number),
        correctTotal:  sql<number>`SUM(${pvpMatchesTable.correctCount})`.mapWith(Number),
        wrongTotal:    sql<number>`SUM(${pvpMatchesTable.wrongCount})`.mapWith(Number),
        avgShapeTime:  sql<number>`ROUND(AVG(${pvpMatchesTable.shapeTime})::numeric, 3)`.mapWith(Number),
      })
      .from(pvpMatchesTable)
      .where(and(
        eq(pvpMatchesTable.playerAId, pid),
        eq(pvpMatchesTable.matchType, 'skill'),
      ))
      .groupBy(pvpMatchesTable.playerAId)
      .limit(1);

    if (!row) {
      res.json({
        playerId:      pid,
        totalPoints:   0,
        totalTime:     0,
        accuracy:      0,
        matchesPlayed: 0,
        correctTotal:  0,
        wrongTotal:    0,
        avgShapeTime:  0,
      });
      return;
    }

    res.json({ playerId: pid, ...row });
  } catch (err) {
    req.log.error({ err }, 'player-skill-stats error');
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
