/**
 * economy-balance.ts
 * ───────────────────
 * Economy Balancer Routes — Monitoring, inflation detection, and smart recommendations.
 *
 * ❌ Read-only layer — no DB writes, no core logic changes.
 *
 * Endpoints:
 *   GET  /system/economy/balance-report    — full health report
 *   GET  /system/economy/weekly-analysis   — 7-day trend comparison
 *   GET  /system/economy/scaling-preview   — preview scaling multipliers
 *   GET  /system/economy/recommendations   — smart recommendation list
 */

import { Router } from 'express';
import {
  buildBalanceReport,
  getWeeklyAnalysis,
  getSmartRecommendations,
  getEconomyMetrics,
  detectInflation,
  getScalingFactor,
  applyScaling,
  type RewardType,
} from '../lib/economy-balancer.js';

const router = Router();

// ── Full Economy Health Report ────────────────────────────────────────────────
//
//  GET /system/economy/balance-report
//
//  Returns a complete snapshot:
//    { inflation, dnPerUserPerDay, piFlow, riskLevel, recommendation, ... }

router.get('/system/economy/balance-report', async (req, res) => {
  try {
    const report = await buildBalanceReport();
    res.json(report);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Weekly Economy Analysis ───────────────────────────────────────────────────
//
//  GET /system/economy/weekly-analysis
//
//  Returns current week vs previous week comparison with trend classification:
//    Growing | Stable | Over-inflated | Under-powered

router.get('/system/economy/weekly-analysis', async (req, res) => {
  try {
    const analysis = await getWeeklyAnalysis();
    res.json(analysis);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Scaling Preview ───────────────────────────────────────────────────────────
//
//  GET /system/economy/scaling-preview
//
//  Shows what the current scaling multiplier is and a preview of how
//  each reward type would be scaled — without applying any changes.

router.get('/system/economy/scaling-preview', async (req, res) => {
  try {
    const metrics    = await getEconomyMetrics(7);
    const inflation  = detectInflation(metrics);
    const factor     = getScalingFactor(inflation);

    const SAMPLE_REWARDS: { type: RewardType; base: number; label: string }[] = [
      { type: 'match',      base: 6, label: 'Match reward (1st place, 100% accuracy, div2)' },
      { type: 'post',       base: 1, label: 'Post reward (2 posts/day)' },
      { type: 'engagement', base: 1, label: 'Engagement reward (5+5 interactions)' },
      { type: 'login',      base: 1, label: 'Login reward (exempt from scaling)' },
    ];

    const preview = SAMPLE_REWARDS.map(r => ({
      type:    r.type,
      label:   r.label,
      base:    r.base,
      scaled:  applyScaling(r.base, r.type, inflation),
      factor:  r.type === 'login' ? 1.0 : factor,
      exempt:  r.type === 'login',
    }));

    res.json({
      inflation,
      scalingFactor: factor,
      dnPerUserPerDay: Math.round(
        (metrics.dnEarnedPerDay / Math.max(metrics.totalActiveUsers, 1)) * 100,
      ) / 100,
      preview,
      calculatedAt: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Smart Recommendations ─────────────────────────────────────────────────────
//
//  GET /system/economy/recommendations
//
//  Returns prioritised list of actionable recommendations for the current state.

router.get('/system/economy/recommendations', async (req, res) => {
  try {
    const metrics         = await getEconomyMetrics(7);
    const inflation       = detectInflation(metrics);
    const recommendations = getSmartRecommendations(inflation, metrics);

    res.json({
      inflation,
      totalRecommendations: recommendations.length,
      recommendations,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
