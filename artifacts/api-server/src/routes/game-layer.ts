/**
 * game-layer.ts
 * ─────────────
 * Game Layer REST endpoints — player progression, arcade, daily reward.
 * Does NOT touch league system endpoints.
 *
 * Routes:
 *   GET  /game/player/:pid/profile     → player XP/level/streak/badges
 *   GET  /game/player/:pid/xp-progress → XP progress to next level
 *   GET  /game/leaderboard/xp          → top players by XP
 *   GET  /game/arcade/games            → list arcade games
 *   POST /arcade/play                  → play an arcade game
 *   POST /daily/reward                 → claim daily reward
 */

import { Router } from 'express';
import { desc } from 'drizzle-orm';
import { db, playersTable } from '@workspace/db';
import {
  getOrCreateProfile,
  getProfile,
  playArcadeGame,
  claimDailyReward,
  getXpLeaderboard,
  xpToNextLevel,
  ARCADE_REWARDS,
  BADGE_DEFS,
} from '../lib/player-store.js';

const router = Router();

// ── Profile ─────────────────────────────────────────────────────────────────

router.get('/game/player/:pid/profile', (req, res) => {
  const profile = getProfile(req.params.pid);
  if (!profile) { res.json(null); return; }
  res.json(profile);
});

router.get('/game/player/:pid/xp-progress', (req, res) => {
  const profile = getProfile(req.params.pid);
  if (!profile) { res.json(null); return; }
  res.json({
    profile,
    progress: xpToNextLevel(profile.xp),
    badgeDefs: BADGE_DEFS,
  });
});

router.get('/game/badges', (_req, res) => {
  res.json(BADGE_DEFS);
});

// ── Leaderboard ─────────────────────────────────────────────────────────────

router.get('/game/leaderboard/xp', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  res.json(getXpLeaderboard(limit));
});

router.get('/leaderboard/live', async (req, res) => {
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
        pvpWins:            playersTable.pvpWins,
        pvpLosses:          playersTable.pvpLosses,
        matchesPlayed:      playersTable.matchesPlayed,
        matchesWon:         playersTable.matchesWon,
        verificationStatus: playersTable.verificationStatus,
        leagueDivision:     playersTable.leagueDivision,
      })
      .from(playersTable)
      .orderBy(desc(playersTable.elo))
      .limit(limit);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'internal' });
  }
});

// ── Arcade ───────────────────────────────────────────────────────────────────

router.get('/game/arcade/games', (_req, res) => {
  res.json(
    Object.entries(ARCADE_REWARDS).map(([id, g]) => ({ id, ...g })),
  );
});

router.post('/arcade/play', (req, res) => {
  const { playerId, playerName, gameId } = req.body as Record<string, unknown>;
  if (!playerId || !gameId) {
    res.status(400).json({ error: 'playerId and gameId required' }); return;
  }

  const result = playArcadeGame(
    String(playerId),
    String(playerName || 'Player'),
    String(gameId),
  );

  if (!result) {
    res.status(400).json({ error: `unknown game: ${gameId}. Valid: ${Object.keys(ARCADE_REWARDS).join(', ')}` });
    return;
  }

  res.status(201).json(result);
});

// ── Daily reward ─────────────────────────────────────────────────────────────

router.post('/daily/reward', (req, res) => {
  const { playerId, playerName } = req.body as Record<string, unknown>;
  if (!playerId) {
    res.status(400).json({ error: 'playerId required' }); return;
  }

  const result = claimDailyReward(
    String(playerId),
    String(playerName || 'Player'),
  );

  if ('error' in result) {
    res.status(409).json(result); return;
  }

  res.status(201).json(result);
});

export default router;
