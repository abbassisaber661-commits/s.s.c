/**
 * economy-stabilizer.ts  (route)
 * ────────────────────────────────
 * Economy Stabilization Layer — API routes.
 *
 * ❌ Read-only reporting + safe-reward helper — no core logic changes.
 *
 * Endpoints:
 *   GET  /system/economy/stability-report   — full stability score + components
 *   GET  /system/economy/hard-caps          — view current hard-cap config
 *   POST /system/economy/safe-reward        — normalize a reward through all caps (dry-run or live)
 *   POST /system/economy/exploit-check      — check a single event for exploit patterns
 */

import { Router } from 'express';
import {
  getStabilityReport,
  normalizeReward,
  checkExploit,
  safeReward,
  HARD_CAPS,
  type RewardSource,
} from '../lib/economy-stabilizer.js';

const router = Router();

// ── Stability Report ──────────────────────────────────────────────────────────
//
//  GET /system/economy/stability-report
//  Returns: { score, grade, label, components, coinsPerUserPerDay, ... }

router.get('/system/economy/stability-report', async (req, res) => {
  try {
    const report = await getStabilityReport();
    res.json(report);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Hard Caps View ────────────────────────────────────────────────────────────
//
//  GET /system/economy/hard-caps
//  Returns the current hard-cap configuration (read-only).

router.get('/system/economy/hard-caps', (_req, res) => {
  res.json({
    caps: HARD_CAPS,
    description: {
      maxCoinsPerUserPerDay:        'Max coins any user may earn in one calendar day (all sources)',
      maxCoinsPerEvent:             'Max coins from a single reward event',
      maxGemsPerSeason:             'Max gems a user may hold per season',
      maxLoginCoinsPerDay:          'Login reward — always fixed, immune to inflation scaling',
      maxInteractionsPerDay:        'Max interactions (likes+comments) counted for rewards per day',
      minSecondsBetweenSameEvents:  'Cooldown between two identical reward events for one user',
      maxMatchesPerHour:            'Max reward-earning match events per user per hour',
    },
  });
});

// ── Safe Reward Check ─────────────────────────────────────────────────────────
//
//  POST /system/economy/safe-reward
//  Body: { playerId, amount, source, dryRun? }
//
//  dryRun = true  → returns result without updating cooldown (for previewing)
//  dryRun = false → runs full exploit check + updates cooldown state

router.post('/system/economy/safe-reward', async (req, res) => {
  try {
    const { playerId, amount, source, dryRun } = req.body as Record<string, unknown>;

    if (!playerId || amount === undefined || !source) {
      res.status(400).json({ error: 'missing fields: playerId, amount, source' });
      return;
    }

    const VALID_SOURCES: RewardSource[] = [
      'match_result', 'daily_login', 'daily_post', 'daily_match',
      'daily_interaction', 'promotion', 'season_end', 'shop_refund', 'manual',
    ];

    if (!VALID_SOURCES.includes(source as RewardSource)) {
      res.status(400).json({ error: `Invalid source. Valid: ${VALID_SOURCES.join(', ')}` });
      return;
    }

    if (dryRun) {
      // Dry-run: only normalize caps (no cooldown update)
      const norm = await normalizeReward({
        playerId:  String(playerId),
        amount:    Number(amount),
        source:    source as RewardSource,
      });
      res.json({ dryRun: true, ...norm });
    } else {
      const result = await safeReward({
        playerId:  String(playerId),
        amount:    Number(amount),
        source:    source as RewardSource,
      });
      res.json(result);
    }
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Exploit Check ─────────────────────────────────────────────────────────────
//
//  POST /system/economy/exploit-check
//  Body: { playerId, source }
//
//  Returns: { clean, reason? }

router.post('/system/economy/exploit-check', async (req, res) => {
  try {
    const { playerId, source } = req.body as Record<string, unknown>;

    if (!playerId || !source) {
      res.status(400).json({ error: 'missing fields: playerId, source' });
      return;
    }

    const result = await checkExploit(String(playerId), source as RewardSource);
    res.json(result);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
