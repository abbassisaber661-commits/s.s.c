/**
 * audit.ts
 * ─────────
 * Smart Audit System routes — READ-ONLY, no side effects.
 *
 * Routes:
 *   GET /system/audit/report     → full audit report (JSON)
 *   GET /system/audit/health     → quick health check
 *   GET /system/audit/social     → social system audit only
 *   GET /system/audit/economy    → economy system audit only
 *   GET /system/audit/game       → game event audit only
 *   GET /system/audit/unlinked   → list of unlinked/missing events
 *   GET /system/audit/suggestions → smart fix suggestions only
 */

import { Router } from 'express';
import { runFullAudit, runHealthCheck } from '../lib/audit-engine.js';

const router = Router();

// ── Full Report ────────────────────────────────────────────────────────────────

router.get('/system/audit/report', async (_req, res) => {
  try {
    const report = await runFullAudit();
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Audit failed', details: String(err) });
  }
});

// ── Health Check ───────────────────────────────────────────────────────────────

router.get('/system/audit/health', async (_req, res) => {
  try {
    const health = await runHealthCheck();
    const statusCode = health.status === 'critical' ? 503 : health.status === 'degraded' ? 207 : 200;
    res.status(statusCode).json(health);
  } catch (err) {
    res.status(500).json({ error: 'Health check failed', details: String(err) });
  }
});

// ── Social Audit ───────────────────────────────────────────────────────────────

router.get('/system/audit/social', async (_req, res) => {
  try {
    const report = await runFullAudit();
    res.json({
      generatedAt: report.generatedAt,
      social: report.social,
      suggestions: report.suggestions.filter(s => ['post_creation_reward', 'like_interaction_reward', 'comment_interaction_reward', 'interaction_coin_reward', 'interaction_unification'].includes(s.event)),
    });
  } catch (err) {
    res.status(500).json({ error: 'Social audit failed', details: String(err) });
  }
});

// ── Economy Audit ──────────────────────────────────────────────────────────────

router.get('/system/audit/economy', async (_req, res) => {
  try {
    const report = await runFullAudit();
    res.json({
      generatedAt: report.generatedAt,
      economy: report.economy,
      suggestions: report.suggestions.filter(s =>
        ['dn_earn_pipeline', 'pi_earn_pipeline', 'shop_coin_deduction', 'daily_economy_table'].includes(s.event),
      ),
    });
  } catch (err) {
    res.status(500).json({ error: 'Economy audit failed', details: String(err) });
  }
});

// ── Game Events Audit ──────────────────────────────────────────────────────────

router.get('/system/audit/game', async (_req, res) => {
  try {
    const report = await runFullAudit();
    res.json({
      generatedAt: report.generatedAt,
      game: report.game,
      suggestions: report.suggestions.filter(s =>
        ['match_completion_reward', 'daily_login_reward', 'season_end_pi'].includes(s.event),
      ),
    });
  } catch (err) {
    res.status(500).json({ error: 'Game audit failed', details: String(err) });
  }
});

// ── Unlinked Events ────────────────────────────────────────────────────────────

router.get('/system/audit/unlinked', async (_req, res) => {
  try {
    const report = await runFullAudit();
    res.json({
      generatedAt:   report.generatedAt,
      unlinkedEvents: report.unlinkedEvents,
      issues:         report.issues,
      warnings:       report.warnings,
    });
  } catch (err) {
    res.status(500).json({ error: 'Unlinked events scan failed', details: String(err) });
  }
});

// ── Suggestions ────────────────────────────────────────────────────────────────

router.get('/system/audit/suggestions', async (_req, res) => {
  try {
    const report = await runFullAudit();
    res.json({
      generatedAt: report.generatedAt,
      count:       report.suggestions.length,
      suggestions: report.suggestions,
      note:        'READ-ONLY: These are suggestions only. No automatic fixes are applied.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Suggestions engine failed', details: String(err) });
  }
});

export default router;
