/**
 * daily-economy.ts
 * ─────────────────
 * Daily Tasks Routes + Season-End DN$ Awards.
 *
 * 🟢 DN$ = sole internal currency for all activity rewards.
 *
 * GET  /economy/daily/:playerId/status         — today's task progress
 * POST /economy/daily/:playerId/claim/login    — claim Daily Login (+1 DN$)
 * POST /economy/daily/:playerId/claim/social   — claim Social Activity (+3 DN$)
 * POST /economy/daily/:playerId/claim/content  — claim Create Content (+1 DN$)
 * POST /economy/daily/:playerId/claim/match    — claim Play Match (+1 DN$)
 * POST /economy/daily/:playerId/record/match   — record a completed match
 * POST /economy/daily/:playerId/record/story   — record a story posted
 * POST /economy/season-dn                      — award season-end DN$ by rank
 * GET  /daily/status/:playerId                 — alias
 * POST /daily/claim                            — alias (by taskId)
 */

import { Router } from 'express';
import { eq, gte, lte, and, desc } from 'drizzle-orm';
import { db, playersTable } from '@workspace/db';
import {
  claimLoginReward,
  claimSocialReward,
  claimContentReward,
  claimMatchReward,
  claimInteractionReward,
  recordMatchPlayed,
  recordStory,
  getDailyStatus,
} from '../lib/daily-rewards.js';
import { getShopCatalog, purchaseShopItem } from '../lib/shop-service.js';
import { awardDN } from '../lib/dn-service.js';
import {
  leagueTierToEconomyTier,
  getSeasonEndDN,
  type EconomyTier,
} from '../lib/economy-engine.js';

const router = Router();

// ── Season-End DN$ Table ───────────────────────────────────────────────────
//  Per spec:
//    Rank  | div3 | div2 | pro  | champions
//    ──────+──────+──────+──────+──────────
//    1st   |  5   |  10  |  15  |  20
//    2nd   |  4   |   8  |  12  |  15
//    3rd   |  3   |   5  |   8  |  10
//    4th   |  2   |   3  |   5  |   8
//    Rest  |  1   |   2  |   3  |   4

const LP_RANGES: Record<string, { min: number; max: number | null }> = {
  training: { min: 0,   max: 99   },
  dn:       { min: 0,   max: 99   },
  coin:     { min: 100, max: 299  },
  pro:      { min: 300, max: 499  },
  champion: { min: 500, max: null },
};

function parsePlayerId(req: { params: Record<string, string> }): string {
  return req.params.playerId?.trim() ?? '';
}

// ── Daily Status ─────────────────────────────────────────────────────────────

router.get('/economy/daily/:playerId/status', async (req, res) => {
  try {
    const playerId = parsePlayerId(req);
    if (!playerId) { res.status(400).json({ error: 'missing playerId' }); return; }
    res.json(await getDailyStatus(playerId));
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Claim: Daily Login (+1 DN$) ──────────────────────────────────────────────

router.post('/economy/daily/:playerId/claim/login', async (req, res) => {
  try {
    const playerId = parsePlayerId(req);
    if (!playerId) { res.status(400).json({ error: 'missing playerId' }); return; }
    const result = await claimLoginReward(playerId);
    res.status(result.awarded ? 200 : 409).json(result);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Claim: Social Activity (+3 DN$) ──────────────────────────────────────────

router.post('/economy/daily/:playerId/claim/social', async (req, res) => {
  try {
    const playerId = parsePlayerId(req);
    if (!playerId) { res.status(400).json({ error: 'missing playerId' }); return; }
    const result = await claimSocialReward(playerId);
    res.status(result.awarded ? 200 : 409).json(result);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Claim: Create Content (+1 DN$) ───────────────────────────────────────────

router.post('/economy/daily/:playerId/claim/content', async (req, res) => {
  try {
    const playerId = parsePlayerId(req);
    if (!playerId) { res.status(400).json({ error: 'missing playerId' }); return; }
    const result = await claimContentReward(playerId);
    res.status(result.awarded ? 200 : 409).json(result);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Claim: Get Popular (+2 DN$) ──────────────────────────────────────────────

router.post('/economy/daily/:playerId/claim/interaction', async (req, res) => {
  try {
    const playerId = parsePlayerId(req);
    if (!playerId) { res.status(400).json({ error: 'missing playerId' }); return; }
    const result = await claimInteractionReward(playerId);
    res.status(result.awarded ? 200 : 409).json(result);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Claim: Play Match (+1 DN$) ───────────────────────────────────────────────

router.post('/economy/daily/:playerId/claim/match', async (req, res) => {
  try {
    const playerId = parsePlayerId(req);
    if (!playerId) { res.status(400).json({ error: 'missing playerId' }); return; }
    const result = await claimMatchReward(playerId);
    res.status(result.awarded ? 200 : 409).json(result);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Record: Match Played ──────────────────────────────────────────────────────

router.post('/economy/daily/:playerId/record/match', async (req, res) => {
  try {
    const playerId = parsePlayerId(req);
    if (!playerId) { res.status(400).json({ error: 'missing playerId' }); return; }
    await recordMatchPlayed(playerId);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Record: Story Posted ──────────────────────────────────────────────────────

router.post('/economy/daily/:playerId/record/story', async (req, res) => {
  try {
    const playerId = parsePlayerId(req);
    if (!playerId) { res.status(400).json({ error: 'missing playerId' }); return; }
    await recordStory(playerId);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Season-End DN$ Award ──────────────────────────────────────────────────────
// POST /economy/season-dn
// Body: { leagueId: string }

router.post('/economy/season-dn', async (req, res) => {
  try {
    const { leagueId } = req.body as { leagueId?: string };
    if (!leagueId) { res.status(400).json({ error: 'leagueId required' }); return; }

    const econTier = leagueTierToEconomyTier(leagueId) as EconomyTier;
    const lpRange  = LP_RANGES[leagueId];
    if (!lpRange) { res.status(400).json({ error: 'unknown leagueId' }); return; }

    const condition =
      lpRange.max !== null
        ? and(gte(playersTable.lp, lpRange.min), lte(playersTable.lp, lpRange.max))
        : gte(playersTable.lp, lpRange.min);

    const topPlayers = await db
      .select({ id: playersTable.id, username: playersTable.username })
      .from(playersTable)
      .where(condition)
      .orderBy(desc(playersTable.lp))
      .limit(50);

    const awarded: { playerId: string; rank: number; dn: number }[] = [];

    for (let i = 0; i < topPlayers.length; i++) {
      const rank = i + 1;
      const dn   = getSeasonEndDN(econTier, rank);
      const p    = topPlayers[i];
      try {
        await awardDN(
          p.id,
          dn,
          'season_end',
          `Season end rank #${rank} in ${leagueId.toUpperCase()} (+${dn} DN$)`,
        );
        awarded.push({ playerId: p.id, rank, dn });
        console.info(`[season-dn] Awarded ${dn} DN$ to ${p.username} (rank #${rank} in ${leagueId})`);
      } catch (err) {
        console.error(`[season-dn] error for player ${p.id}:`, err);
      }
    }

    res.json({ awarded, total: awarded.reduce((s, a) => s + a.dn, 0) });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Shop ──────────────────────────────────────────────────────────────────────

router.get('/economy/shop/:playerId', async (req, res) => {
  try {
    res.json(await getShopCatalog(req.params.playerId));
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

router.post('/economy/shop/:playerId/buy', async (req, res) => {
  try {
    const { itemId } = req.body as { itemId?: string };
    if (!itemId) { res.status(400).json({ error: 'missing itemId' }); return; }
    const result = await purchaseShopItem(req.params.playerId, itemId);
    if (!result.success) { res.status(400).json({ error: result.reason }); return; }
    res.status(201).json(result);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Legacy Aliases ────────────────────────────────────────────────────────────

router.get('/daily/status/:playerId', async (req, res) => {
  try {
    const playerId = req.params.playerId?.trim() ?? '';
    if (!playerId) { res.status(400).json({ error: 'missing playerId' }); return; }
    res.json(await getDailyStatus(playerId));
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

router.post('/daily/claim', async (req, res) => {
  try {
    const { playerId, taskId } = req.body as { playerId?: string; taskId?: string };
    if (!playerId || !taskId) { res.status(400).json({ error: 'missing playerId or taskId' }); return; }
    let result: { awarded: boolean; dn?: number; reason?: string };
    switch (taskId) {
      case 'login':       result = await claimLoginReward(playerId);       break;
      case 'social':      result = await claimSocialReward(playerId);      break;
      case 'content':     result = await claimContentReward(playerId);     break;
      case 'match':       result = await claimMatchReward(playerId);       break;
      case 'interaction': result = await claimInteractionReward(playerId); break;
      default: res.status(400).json({ error: `Unknown taskId: ${taskId}` }); return;
    }
    res.status(result.awarded ? 200 : 409).json(result);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// Legacy: POST /economy/daily/:playerId/login
router.post('/economy/daily/:playerId/login', async (req, res) => {
  try {
    const result = await claimLoginReward(parsePlayerId(req));
    res.status(result.awarded ? 200 : 409).json(result);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// Legacy: POST /economy/daily/:playerId/match
router.post('/economy/daily/:playerId/match', async (req, res) => {
  try {
    await recordMatchPlayed(parsePlayerId(req));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
