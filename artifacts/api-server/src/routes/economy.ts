/**
 * economy.ts
 * ──────────
 * Economy routes — DN$/Pi system.
 *
 * 🟣 Pi  = real payment currency (handled by Pi SDK on frontend)
 * 🟢 DN$ = internal gamification points
 *
 * Routes:
 *   GET  /economy/:playerId/dn-transactions    — DN$ transaction history
 *   GET  /economy/:playerId/dn-balance         — current DN$ balance
 *   GET  /economy/:playerId/purchases          — store purchase history
 *   POST /economy/purchase                     — record a store purchase
 *   POST /economy/boost                        — activate XP boost
 *   GET  /seasons                              — list recent seasons
 *   POST /economy/shop/:playerId/buy           — buy shop item with DN$
 *   POST /economy/daily/:playerId/match-reward — award match-activity DN$
 */

import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db, walletTransactionsTable, storePurchasesTable, boostUsageTable, seasonsTable, playersTable } from '@workspace/db';
import { nanoid } from '../lib/nanoid.js';
import { getOrCreateWallet, awardDN } from '../lib/dn-service.js';
import { purchaseShopItem, getShopCatalog } from '../lib/shop-service.js';
import { ACTIVITY_DN, GAME_ASSIST_COST_DN } from '../lib/economy-engine.js';

const router = Router();

// ── DN$ Transaction History ────────────────────────────────────────────────

router.get('/economy/:playerId/dn-transactions', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const rows = await db
      .select()
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.playerId, req.params.playerId))
      .orderBy(desc(walletTransactionsTable.createdAt))
      .limit(limit);
    res.json(rows);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── DN$ Balance ─────────────────────────────────────────────────────────────

router.get('/economy/:playerId/dn-balance', async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.params.playerId);
    res.json({ dnBalance: wallet.dnBalance });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Store Purchase History ──────────────────────────────────────────────────

router.get('/economy/:playerId/purchases', async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(storePurchasesTable)
      .where(eq(storePurchasesTable.playerId, req.params.playerId))
      .orderBy(desc(storePurchasesTable.createdAt))
      .limit(50);
    res.json(rows);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Record Store Purchase (Pi-based) ─────────────────────────────────────────

router.post('/economy/purchase', async (req, res) => {
  try {
    const { playerId, itemId, itemName, piPrice, dnSpent, piTxId } = req.body as Record<string, unknown>;
    if (!playerId || !itemId || !itemName) {
      res.status(400).json({ error: 'missing fields' });
      return;
    }
    const [purchase] = await db
      .insert(storePurchasesTable)
      .values({
        id: nanoid(),
        playerId: String(playerId),
        itemId: String(itemId),
        itemName: String(itemName),
        piPrice: Number(piPrice) || 0,
        dnSpent: Number(dnSpent) || 0,
        piTxId: piTxId ? String(piTxId) : undefined,
        status: 'completed',
      })
      .returning();
    const owned = (await db
      .select({ ownedItems: playersTable.ownedItems })
      .from(playersTable)
      .where(eq(playersTable.id, String(playerId))))[0]?.ownedItems as string[] || [];
    if (!owned.includes(String(itemId))) {
      await db
        .update(playersTable)
        .set({ ownedItems: [...owned, String(itemId)], updatedAt: new Date() })
        .where(eq(playersTable.id, String(playerId)));
    }
    res.status(201).json(purchase);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── XP Boost (Pi-purchased) ──────────────────────────────────────────────────

router.post('/economy/boost', async (req, res) => {
  try {
    const { playerId, type, multiplier, hours } = req.body as Record<string, unknown>;
    if (!playerId) {
      res.status(400).json({ error: 'missing playerId' });
      return;
    }
    const startAt = new Date();
    const endAt   = new Date(startAt.getTime() + (Number(hours) || 1) * 3_600_000);
    const [boost] = await db
      .insert(boostUsageTable)
      .values({
        id:         nanoid(),
        playerId:   String(playerId),
        type:       String(type || 'xp'),
        multiplier: Number(multiplier) || 2,
        hours:      Number(hours) || 1,
        startAt,
        endAt,
        active:     true,
      })
      .returning();
    await db
      .update(playersTable)
      .set({ xpBoostUntil: endAt, updatedAt: new Date() })
      .where(eq(playersTable.id, String(playerId)));
    res.status(201).json(boost);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Seasons List ─────────────────────────────────────────────────────────────

router.get('/seasons', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(seasonsTable)
      .orderBy(desc(seasonsTable.createdAt))
      .limit(10);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'internal' });
  }
});

// ── Shop: Catalog ─────────────────────────────────────────────────────────────

router.get('/economy/shop/:playerId', async (req, res) => {
  try {
    const catalog = await getShopCatalog(req.params.playerId);
    res.json(catalog);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Shop: Buy item with DN$ ───────────────────────────────────────────────────

router.post('/economy/shop/:playerId/buy', async (req, res) => {
  try {
    const { itemId } = req.body as { itemId?: string };
    if (!itemId) {
      res.status(400).json({ error: 'missing itemId' });
      return;
    }
    const result = await purchaseShopItem(req.params.playerId, itemId);
    if (!result.success) {
      res.status(400).json({ error: result.reason });
      return;
    }
    res.status(201).json(result);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Match Activity DN$ Reward ─────────────────────────────────────────────────
// Called after a match to award DN$ for participation + accuracy bonus.

router.post('/economy/daily/:playerId/match-reward', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { accuracyPct } = req.body as { accuracyPct?: number };

    // Base: +1 DN$ for participating
    let total = ACTIVITY_DN.matchPlay;
    const breakdown: string[] = ['Participation: +1 DN$'];

    // Accuracy bonus: +1 DN$ for 100%
    if (typeof accuracyPct === 'number' && accuracyPct >= 1.0) {
      total += ACTIVITY_DN.accuracy100;
      breakdown.push('Perfect accuracy: +1 DN$');
    }

    const { newBalance } = await awardDN(
      playerId,
      total,
      'match_play',
      breakdown.join(', '),
    );
    res.json({ awarded: true, dn: total, newBalance, breakdown });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

// ── Game Assist: buy hint (eliminate wrong answer) ────────────────────────────

router.post('/economy/game-assist/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { spendDN: spendDNHelper } = await import('../lib/dn-service.js');
    const result = await spendDNHelper(
      playerId,
      GAME_ASSIST_COST_DN,
      'game_assist',
      'Eliminate one wrong answer',
    );
    if (!result.success) {
      res.status(400).json({ error: 'insufficient_dn', required: GAME_ASSIST_COST_DN, have: result.newBalance });
      return;
    }
    res.json({ ok: true, dnSpent: GAME_ASSIST_COST_DN, newBalance: result.newBalance });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
