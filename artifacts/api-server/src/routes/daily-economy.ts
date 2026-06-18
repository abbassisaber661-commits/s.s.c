/**
 * daily-economy.ts
 * ─────────────────
 * Daily Tasks Routes — progress tracking + explicit claim endpoints.
 *
 * GET  /economy/daily/:playerId/status            — today's task progress
 *
 * POST /economy/daily/:playerId/claim/login       — claim Daily Login reward (5 coins)
 * POST /economy/daily/:playerId/claim/social      — claim Social Activity reward (10 coins)
 * POST /economy/daily/:playerId/claim/content     — claim Create Content reward (10 coins)
 * POST /economy/daily/:playerId/claim/match       — claim Play Match reward (10 coins)
 *
 * POST /economy/daily/:playerId/record/match      — record a completed match (no auto-award)
 * POST /economy/daily/:playerId/record/story      — record a story posted (no auto-award)
 *
 * GET  /economy/shop/:playerId                    — shop catalog + player balance
 * POST /economy/shop/:playerId/buy                — purchase a shop item with coins
 *
 * POST /economy/season-gems                       — award season-end gems by rank
 * GET  /economy/player/:playerId/balance          — coins + gems balance
 */

import { Router }        from 'express';
import { eq }            from 'drizzle-orm';
import { db, playersTable } from '@workspace/db';
import {
  claimLoginReward,
  claimSocialReward,
  claimContentReward,
  claimMatchReward,
  recordMatchPlayed,
  recordStory,
  getDailyStatus,
} from '../lib/daily-rewards.js';
import {
  getShopCatalog,
  purchaseShopItem,
} from '../lib/shop-service.js';
import { nanoid }        from '../lib/nanoid.js';
import { coinTransactionsTable } from '@workspace/db';

const router = Router();

// ── Season-End Gem Table ──────────────────────────────────────────────────
const SEASON_GEM_TABLE: Record<string, Partial<Record<number, number>>> = {
  div3:      { 1: 1 },
  div2:      { 1: 2, 2: 1 },
  pro:       { 1: 3, 2: 2, 3: 1 },
  champions: { 1: 4, 2: 3, 3: 2, 4: 1 },
};

function parsePlayerId(req: { params: Record<string, string> }): string {
  return req.params.playerId?.trim() ?? '';
}

// ── Daily Status ───────────────────────────────────────────────────────────

router.get('/economy/daily/:playerId/status', async (req, res) => {
  try {
    const playerId = parsePlayerId(req);
    if (!playerId) { res.status(400).json({ error: 'missing playerId' }); return; }
    const status = await getDailyStatus(playerId);
    res.json(status);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Claim: Daily Login ─────────────────────────────────────────────────────

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

// ── Claim: Social Activity ────────────────────────────────────────────────

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

// ── Claim: Create Content ─────────────────────────────────────────────────

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

// ── Claim: Play Match ─────────────────────────────────────────────────────

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

// ── Record: Match Played ──────────────────────────────────────────────────

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

// ── Record: Story Posted ──────────────────────────────────────────────────

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

// ── Legacy: POST /economy/daily/:playerId/login (kept for backward compat) ──

router.post('/economy/daily/:playerId/login', async (req, res) => {
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

// ── Legacy: POST /economy/daily/:playerId/match (record + auto attempt claim) ──

router.post('/economy/daily/:playerId/match', async (req, res) => {
  try {
    const playerId = parsePlayerId(req);
    if (!playerId) { res.status(400).json({ error: 'missing playerId' }); return; }
    await recordMatchPlayed(playerId);
    res.json({ ok: true, recorded: true });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Shop Catalog ───────────────────────────────────────────────────────────

router.get('/economy/shop/:playerId', async (req, res) => {
  try {
    const playerId = parsePlayerId(req);
    if (!playerId) { res.status(400).json({ error: 'missing playerId' }); return; }
    const catalog = await getShopCatalog(playerId);
    res.json(catalog);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Shop Purchase ──────────────────────────────────────────────────────────

router.post('/economy/shop/:playerId/buy', async (req, res) => {
  try {
    const playerId = parsePlayerId(req);
    if (!playerId) { res.status(400).json({ error: 'missing playerId' }); return; }

    const { itemId } = req.body as { itemId?: string };
    if (!itemId) { res.status(400).json({ error: 'missing itemId' }); return; }

    const result = await purchaseShopItem(playerId, itemId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Season-End Gem Reward ──────────────────────────────────────────────────

router.post('/economy/season-gems', async (req, res) => {
  try {
    const { playerId, division, rank } = req.body as Record<string, unknown>;

    if (!playerId || !division || rank === undefined) {
      res.status(400).json({ error: 'missing fields: playerId, division, rank' });
      return;
    }

    const playerIdStr = String(playerId);
    const divStr      = String(division).toLowerCase();
    const rankNum     = Number(rank);

    const divMap: Record<string, string> = {
      'division iii': 'div3', 'div3': 'div3', 'division3': 'div3',
      'division ii':  'div2', 'div2': 'div2', 'division2': 'div2',
      'professional': 'pro',  'pro':  'pro',
      'champions':    'champions', 'champion': 'champions',
    };

    const economyDiv = divMap[divStr];
    if (!economyDiv) {
      res.status(400).json({ error: `Unknown division: ${division}` });
      return;
    }

    const gemsAwarded = SEASON_GEM_TABLE[economyDiv]?.[rankNum] ?? 0;

    if (gemsAwarded === 0) {
      res.json({ gemsAwarded: 0, reason: 'No gem reward for this rank/division', division: economyDiv, rank: rankNum });
      return;
    }

    const [player] = await db
      .select({ gems: playersTable.gems, coins: playersTable.coins })
      .from(playersTable)
      .where(eq(playersTable.id, playerIdStr))
      .limit(1);

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    const newGems = player.gems + gemsAwarded;

    await db
      .update(playersTable)
      .set({ gems: newGems, updatedAt: new Date() })
      .where(eq(playersTable.id, playerIdStr));

    await db.insert(coinTransactionsTable).values({
      id:          nanoid(),
      playerId:    playerIdStr,
      amount:      0,
      type:        'gem_earn',
      source:      'season_end',
      description: `Season end: rank #${rankNum} in ${economyDiv.toUpperCase()} (+${gemsAwarded} gems)`,
      balanceAfter: player.coins,
    });

    res.json({
      gemsAwarded,
      newGems,
      division: economyDiv,
      rank: rankNum,
      reason: `Rank #${rankNum} in ${economyDiv.toUpperCase()}`,
    });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Player Balance ─────────────────────────────────────────────────────────

router.get('/economy/player/:playerId/balance', async (req, res) => {
  try {
    const playerId = parsePlayerId(req);
    if (!playerId) { res.status(400).json({ error: 'missing playerId' }); return; }

    const [player] = await db
      .select({ coins: playersTable.coins, gems: playersTable.gems })
      .from(playersTable)
      .where(eq(playersTable.id, playerId))
      .limit(1);

    if (!player) { res.status(404).json({ error: 'Player not found' }); return; }

    res.json({ coins: player.coins, gems: player.gems });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
