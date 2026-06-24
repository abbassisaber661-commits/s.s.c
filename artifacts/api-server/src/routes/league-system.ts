/**
 * league-system.ts
 * ────────────────
 * REST API for the SkillLeague league system.
 *
 * Routes:
 *   GET  /league-system/leagues                     → list all leagues
 *   GET  /league-system/leagues/:id/season          → active season
 *   GET  /league-system/leagues/:id/standings       → season standings
 *   GET  /league-system/leagues/:id/prize-pool      → prize breakdown
 *   POST /league-system/leagues/:id/join            → join league (checks gems)
 *   GET  /league-system/players/:pid/status         → player's league memberships
 *   GET  /league-system/players/:pid/active-league  → currently active league (1-per-season)
 *   GET  /league-system/players/:pid/matches        → player's match schedule
 *   POST /league-system/matches/:id/play            → play (simulate) a match
 *   POST /league-system/admin/advance-season        → end season + promotions + relegations
 *   POST /league-system/admin/refresh-matches       → refresh match availability
 */

import { Router } from 'express';
import {
  getLeagues, getLeague, getActiveSeason, getLeagueSeasons,
  getStandings, getPlayerEntry, getPlayerSeasons, getPlayerActiveLeague,
  joinLeague, getPlayerMatches, playMatch, advanceSeason,
  getPrizeBreakdown, refreshMatchStatuses, getSeasonCurrentRound,
  getSeasonSnapshot, getAllSeasons, getExpiredActiveSeasons,
  LEAGUE_TO_ECONOMY_TIER, LEAGUE_GEM_COST,
  type LeagueId,
} from '../lib/league-store.js';
import { seedBotStandings } from '../lib/bot-simulator.js';
import { applyMatchResult, getOrCreateProfile } from '../lib/player-store.js';
import { calcPromotionReward } from '../lib/economy-engine.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { db, playersTable, coinTransactionsTable } from '@workspace/db';
import { nanoid } from '../lib/nanoid.js';

const router = Router();

// ── Season-End Gem Table ───────────────────────────────────────────────────
//  Gems awarded to top-ranked REAL players at season end (not bots).
//
//  div3      : 1st → +1
//  div2      : 1st → +2, 2nd → +1
//  pro       : 1st → +3, 2nd → +2, 3rd → +1
//  champions : 1st → +4, 2nd → +3, 3rd → +2, 4th → +1

const SEASON_END_GEM_TABLE: Record<string, Partial<Record<number, number>>> = {
  div3:      { 1: 1 },
  div2:      { 1: 2, 2: 1 },
  pro:       { 1: 3, 2: 2, 3: 1 },
  champions: { 1: 4, 2: 3, 3: 2, 4: 1 },
};

// LP ranges for each division — used to query real players by rank
const DIVISION_LP_RANGES: Record<string, { min: number; max: number | null }> = {
  training: { min: 0,   max: 99   },
  coin:     { min: 100, max: 299  },
  pro:      { min: 300, max: 499  },
  champion: { min: 500, max: null },
};

/**
 * Award season-end gems to top real players in a league/division.
 * Fire-and-forget safe — errors are swallowed.
 */
async function awardSeasonEndGems(leagueId: LeagueId): Promise<void> {
  const econTier = LEAGUE_TO_ECONOMY_TIER[leagueId] ?? 'div3';
  const gemMap   = SEASON_END_GEM_TABLE[econTier];
  if (!gemMap) return;

  const maxRank  = Math.max(...Object.keys(gemMap).map(Number));
  const lpRange  = DIVISION_LP_RANGES[leagueId];
  if (!lpRange) return;

  try {
    const condition =
      lpRange.max !== null
        ? and(gte(playersTable.lp, lpRange.min), lte(playersTable.lp, lpRange.max))
        : gte(playersTable.lp, lpRange.min);

    const topPlayers = await db
      .select({ id: playersTable.id, gems: playersTable.gems, coins: playersTable.coins })
      .from(playersTable)
      .where(condition)
      .orderBy(desc(playersTable.lp))
      .limit(maxRank);

    for (let i = 0; i < topPlayers.length; i++) {
      const rank       = i + 1;
      const gemsToGive = gemMap[rank];
      if (!gemsToGive) continue;

      const player   = topPlayers[i];
      const newGems  = (player.gems ?? 0) + gemsToGive;

      await db.update(playersTable)
        .set({ gems: newGems, updatedAt: new Date() })
        .where(eq(playersTable.id, player.id));

      await db.insert(coinTransactionsTable).values({
        id:           nanoid(),
        playerId:     player.id,
        amount:       0,
        type:         'gem_earn',
        source:       'season_end',
        description:  `Season end rank #${rank} in ${econTier.toUpperCase()} (+${gemsToGive} gems)`,
        balanceAfter: player.coins ?? 0,
      });

      console.info(`[season-gems] Awarded ${gemsToGive} gems to player ${player.id} (rank #${rank} in ${leagueId})`);
    }
  } catch (err) {
    console.error('[season-gems] error awarding season-end gems:', err);
  }
}

// Seed bot standings on startup (idempotent — botsSeeded flag prevents re-seeding)
try { seedBotStandings(); } catch { /* never block startup */ }

// ── Player store helpers (gem r/w) ─────────────────────────────────────────

const PLAYER_DATA_FILE = process.env.PLAYER_DATA_FILE ?? resolve('data/players.json');

function readPlayerStore(): { schemaVersion: number; profiles: Array<Record<string, unknown>> } {
  if (!existsSync(PLAYER_DATA_FILE)) return { schemaVersion: 1, profiles: [] };
  try { return JSON.parse(readFileSync(PLAYER_DATA_FILE, 'utf8')); }
  catch { return { schemaVersion: 1, profiles: [] }; }
}

function writePlayerStore(data: { schemaVersion: number; profiles: Array<Record<string, unknown>> }) {
  try { writeFileSync(PLAYER_DATA_FILE, JSON.stringify(data, null, 2), 'utf8'); }
  catch (err) { console.error('[league-system] failed to write player store:', err); }
}

function getPlayerGems(playerId: string): { gems: number; profile: Record<string, unknown> | undefined; store: ReturnType<typeof readPlayerStore> } {
  const store   = readPlayerStore();
  const profile = store.profiles.find(
    (p) => p.playerId === playerId || p.id === playerId,
  ) as Record<string, unknown> | undefined;
  const gems = typeof profile?.gems === 'number' ? profile.gems : 0;
  return { gems, profile, store };
}

function deductGems(playerId: string, playerName: string, amount: number): boolean {
  const { gems, profile, store } = getPlayerGems(playerId);
  if (gems < amount) return false;
  if (profile) {
    profile.gems      = gems - amount;
    profile.updatedAt = new Date().toISOString();
  } else {
    store.profiles.push({
      id: playerId, playerId, playerName,
      xp: 0, level: 1, streak: 0, bestStreak: 0,
      badges: [], arcadeCoins: 0, gems: 0,
      totalWins: 0, totalDraws: 0, totalLosses: 0,
      arcadePlays: 0, dailyClaimCount: 0, lastDailyAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return true; // cost 0 → no deduction needed
  }
  writePlayerStore(store);
  return true;
}

function grantGems(playerId: string, playerName: string, amount: number): number {
  const { gems, profile, store } = getPlayerGems(playerId);
  const newGems = gems + amount;
  if (profile) {
    profile.gems      = newGems;
    profile.updatedAt = new Date().toISOString();
  } else {
    store.profiles.push({
      id: playerId, playerId, playerName,
      xp: 0, level: 1, streak: 0, bestStreak: 0,
      badges: [], arcadeCoins: 0, gems: newGems,
      totalWins: 0, totalDraws: 0, totalLosses: 0,
      arcadePlays: 0, dailyClaimCount: 0, lastDailyAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return newGems;
  }
  writePlayerStore(store);
  return newGems;
}

// ── Top 5 Per Division (same source as Leaderboard page) ─────────────────────
//
// Uses the exact same LP-range + orderBy(LP desc) query as
// GET /players/leaderboard/division/:division — just limited to 5 rows.

const LP_DIVISION_RANGES_TOP5: Record<string, { min: number; max: number | null }> = {
  training: { min: 0,   max: 99   },
  coin:     { min: 100, max: 299  },
  pro:      { min: 300, max: 499  },
  champion: { min: 500, max: null },
};

const DIVISION_META = [
  { id: 'training', name: 'Division III',     emblem: '🎯', color: '#3AB4FF', colorRgb: '58,180,255',  href: '/leaderboard' },
  { id: 'coin',     name: 'Division II',      emblem: '🪙', color: '#FFD93D', colorRgb: '255,217,61',  href: '/leaderboard' },
  { id: 'pro',      name: 'Pro League',       emblem: '🏆', color: '#2EE87A', colorRgb: '46,232,122',  href: '/leaderboard' },
  { id: 'champion', name: 'Champions League', emblem: '👑', color: '#B44FFF', colorRgb: '180,79,255',  href: '/leaderboard' },
] as const;

router.get('/league-system/top5', async (_req, res) => {
  try {
    const results = await Promise.all(
      DIVISION_META.map(async (meta) => {
        const range = LP_DIVISION_RANGES_TOP5[meta.id]!;
        const condition =
          range.max !== null
            ? and(gte(playersTable.lp, range.min), lte(playersTable.lp, range.max))
            : gte(playersTable.lp, range.min);

        const rows = await db
          .select({
            id:       playersTable.id,
            username: playersTable.username,
            lp:       playersTable.lp,
          })
          .from(playersTable)
          .where(condition)
          .orderBy(desc(playersTable.lp))
          .limit(5);

        return {
          ...meta,
          players: rows.map((r, i) => ({
            rank: i + 1,
            name: r.username,
            lp:   r.lp,
          })),
        };
      }),
    );

    res.json(results);
  } catch (err) {
    console.error('[top5] error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

// ── Leagues ─────────────────────────────────────────────────────────────────

router.get('/league-system/leagues', (_req, res) => {
  res.json(getLeagues());
});

router.get('/league-system/leagues/:id/season', (req, res) => {
  const leagueId = req.params.id as LeagueId;
  if (!getLeague(leagueId)) { res.status(404).json({ error: 'league not found' }); return; }
  const season = getActiveSeason(leagueId);
  if (!season) { res.status(404).json({ error: 'no active season' }); return; }
  const currentRound = getSeasonCurrentRound(season);
  res.json({ ...season, currentRound, totalRounds: season.totalRounds ?? 30 });
});

router.get('/league-system/leagues/:id/standings', (req, res) => {
  const leagueId = req.params.id as LeagueId;
  if (!getLeague(leagueId)) { res.status(404).json({ error: 'league not found' }); return; }

  const { seasonId } = req.query as Record<string, string>;
  let resolvedSeasonId = seasonId;

  if (!resolvedSeasonId) {
    const active = getActiveSeason(leagueId);
    if (!active) { res.json([]); return; }
    resolvedSeasonId = active.id;
  }

  res.json(getStandings(resolvedSeasonId));
});

router.get('/league-system/leagues/:id/prize-pool', (req, res) => {
  const leagueId = req.params.id as LeagueId;
  if (!getLeague(leagueId)) { res.status(404).json({ error: 'league not found' }); return; }
  const season = getActiveSeason(leagueId);
  if (!season) { res.json([]); return; }
  res.json({
    season,
    breakdown: getPrizeBreakdown(season.id),
  });
});

router.get('/league-system/leagues/:id/history', (req, res) => {
  const leagueId = req.params.id as LeagueId;
  if (!getLeague(leagueId)) { res.status(404).json({ error: 'league not found' }); return; }
  res.json(getLeagueSeasons(leagueId));
});

// ── Join ─────────────────────────────────────────────────────────────────────
//
//  Full flow:
//    1. Validate league + player fields
//    2. Gem balance check (if entryCostGems > 0)
//    3. joinLeague() — enforces one-league-per-season
//    4. Deduct gems on success
//    5. Return entry + matches

router.post('/league-system/leagues/:id/join', async (req, res) => {
  const leagueId = req.params.id as LeagueId;
  const league   = getLeague(leagueId);
  if (!league) { res.status(404).json({ error: 'league not found' }); return; }

  const { playerId, playerName } = req.body as Record<string, unknown>;
  if (!playerId || !playerName) {
    res.status(400).json({ error: 'playerId and playerName required' }); return;
  }

  const pid  = String(playerId);
  const pnam = String(playerName);

  // Gem balance check
  const gemCost = LEAGUE_GEM_COST[leagueId] ?? 0;
  if (gemCost > 0) {
    const { gems } = getPlayerGems(pid);
    if (gems < gemCost) {
      res.status(402).json({
        error:        'insufficient_gems',
        required:     gemCost,
        playerGems:   gems,
        message:      `You need ${gemCost} 💎 gem${gemCost !== 1 ? 's' : ''} to enter ${league.name}. You have ${gems}.`,
      });
      return;
    }
  }

  const result = joinLeague(leagueId, pid, pnam);

  if ('error' in result) {
    if (result.error === 'already_in_league') {
      res.status(409).json({
        error: 'already_in_league',
        conflictLeague: result.conflictLeague,
        message: `You are already competing in the ${result.conflictLeague} league this season. You can only be in one league at a time.`,
      });
      return;
    }
    const code = result.error === 'already joined' ? 409 : 400;
    res.status(code).json(result); return;
  }

  // Deduct gems (after successful join so we don't lose gems on error)
  if (gemCost > 0) {
    deductGems(pid, pnam, gemCost);
  }

  // Game Layer: ensure profile exists + grant league-tier badges
  try {
    const profile = getOrCreateProfile(pid, pnam);
    const leagueBadge = leagueId === 'elite' ? 'elite_player' : leagueId === 'champion' ? 'champion_player' : null;
    if (leagueBadge && !profile.badges.includes(leagueBadge)) {
      profile.badges.push(leagueBadge);
    }
  } catch { /* never block join */ }

  res.status(201).json(result);
});

// ── Players ──────────────────────────────────────────────────────────────────

router.get('/league-system/players/:pid/status', (req, res) => {
  const { pid } = req.params;
  const memberships = getPlayerSeasons(pid);
  const active  = memberships.filter(m => m.season.status === 'active');
  const history = memberships.filter(m => m.season.status === 'ended');
  res.json({ active, history });
});

/** Returns the single active league entry for a player (one-per-season rule). */
router.get('/league-system/players/:pid/active-league', (req, res) => {
  const { pid } = req.params;
  const active = getPlayerActiveLeague(pid);
  res.json(active ?? null);
});

router.get('/league-system/players/:pid/matches', (req, res) => {
  const { pid } = req.params;
  const { seasonId } = req.query as Record<string, string>;

  if (seasonId) {
    res.json(getPlayerMatches(seasonId, pid));
    return;
  }

  // Return matches across ALL active seasons the player is in
  const active = getPlayerSeasons(pid).filter(m => m.season.status === 'active');
  const all = active.flatMap(m => getPlayerMatches(m.season.id, pid));
  res.json(all);
});

router.get('/league-system/players/:pid/entry/:leagueId', (req, res) => {
  const { pid, leagueId } = req.params;
  const season = getActiveSeason(leagueId as LeagueId);
  if (!season) { res.json(null); return; }
  const entry = getPlayerEntry(season.id, pid);
  res.json(entry);
});

// ── Matches ──────────────────────────────────────────────────────────────────

router.post('/league-system/matches/:id/play', (req, res) => {
  const { id } = req.params;
  const { playerId, playerName } = req.body as Record<string, unknown>;
  if (!playerId) { res.status(400).json({ error: 'playerId required' }); return; }

  const result = playMatch(id, String(playerId));
  if ('error' in result) {
    const code = result.error === 'match not found' ? 404 : 400;
    res.status(code).json(result); return;
  }

  // Game Layer: update XP / level / streak / badges (non-breaking side-effect)
  let progression: ReturnType<typeof applyMatchResult> | null = null;
  try {
    progression = applyMatchResult(
      String(playerId),
      String(playerName ?? 'Player'),
      result.result!,
      result.leagueId,
    );
  } catch { /* never block match result */ }

  res.json({ ...result, progression });
});

// ── Admin ────────────────────────────────────────────────────────────────────

router.get('/league-system/seasons', (_req, res) => {
  res.json(getAllSeasons());
});

router.get('/league-system/seasons/:seasonId/snapshot', (req, res) => {
  const snapshot = getSeasonSnapshot(req.params.seasonId);
  res.json(snapshot);
});

router.post('/league-system/admin/advance-season', async (req, res) => {
  const { leagueId, adminKey } = req.body as Record<string, unknown>;
  if (adminKey !== (process.env.ADMIN_KEY ?? 'sl-admin-2025')) {
    res.status(403).json({ error: 'forbidden' }); return;
  }
  if (!leagueId) { res.status(400).json({ error: 'leagueId required' }); return; }

  // ── Fetch LP snapshot from DB for all real players in this season ─────────
  const lid = String(leagueId) as LeagueId;
  const lpMap: Record<string, number> = {};
  try {
    const rows = await db.select({ id: playersTable.id, lp: playersTable.lp }).from(playersTable);
    for (const r of rows) { if (r.lp !== null) lpMap[r.id] = r.lp; }
  } catch { /* non-fatal — snapshot will have null LP for all */ }

  // ── Season-end gem awards (before advancing, so LP snapshot is current) ──
  await awardSeasonEndGems(lid).catch(() => {});

  const result = advanceSeason(lid, lpMap);
  if ('error' in result) { res.status(400).json(result); return; }

  // ── Promotion rewards ────────────────────────────────────────────────────
  const econFromTier  = LEAGUE_TO_ECONOMY_TIER[String(leagueId) as LeagueId] ?? 'div3';
  const promotionRewardResults: Array<{
    playerId: string; playerName: string;
    coinsAwarded: number; gemsAwarded: number;
  }> = [];

  for (const promo of result.promotions) {
    const toEconTier = LEAGUE_TO_ECONOMY_TIER[promo.toLeague];
    if (!toEconTier) continue;
    try {
      // Get current coins from DB
      const [dbPlayer] = await db.select({ coins: playersTable.coins })
        .from(playersTable).where(eq(playersTable.id, promo.playerId)).limit(1);
      const currentCoins = dbPlayer?.coins ?? 0;

      // Get current gems
      const { gems: currentGems } = getPlayerGems(promo.playerId);

      const reward = calcPromotionReward(econFromTier, toEconTier, currentCoins, currentGems);

      // Grant gems
      if (reward.gemsAwarded > 0) {
        grantGems(promo.playerId, promo.playerName, reward.gemsAwarded);
      }

      // Grant coins via DB
      if (reward.coinsAwarded > 0 && dbPlayer) {
        await db.update(playersTable)
          .set({ coins: reward.newCoins, updatedAt: new Date() })
          .where(eq(playersTable.id, promo.playerId));
        await db.insert(coinTransactionsTable).values({
          id:          nanoid(),
          playerId:    promo.playerId,
          amount:      reward.coinsAwarded,
          type:        'earn',
          source:      'season_promotion',
          description: `Promotion reward: ${promo.fromLeague} → ${promo.toLeague}`,
          balanceAfter: reward.newCoins,
        });
      }

      promotionRewardResults.push({
        playerId: promo.playerId,
        playerName: promo.playerName,
        coinsAwarded: reward.coinsAwarded,
        gemsAwarded: reward.gemsAwarded,
      });
    } catch (err) {
      console.error('[advance-season] promotion reward error:', err);
    }
  }

  res.json({ ...result, promotionRewards: promotionRewardResults });
});

router.post('/league-system/admin/refresh-matches', (_req, res) => {
  const count = refreshMatchStatuses();
  res.json({ refreshed: count });
});

// ── Season auto-advance scheduler ─────────────────────────────────────────────
//
// Runs every hour and automatically closes any season whose endAt has passed.
// Fetches LP from DB, calls advanceSeason(), grants promotion rewards,
// then re-seeds bots for the new season — all without admin intervention.

let _seasonSchedulerInterval: ReturnType<typeof setInterval> | null = null;

async function autoAdvanceExpiredSeasons(): Promise<void> {
  const expired = getExpiredActiveSeasons();
  if (expired.length === 0) return;

  console.info(`[season-scheduler] Found ${expired.length} expired season(s) — auto-advancing`);

  // Fetch LP for all real players once
  const lpMap: Record<string, number> = {};
  try {
    const rows = await db.select({ id: playersTable.id, lp: playersTable.lp }).from(playersTable);
    for (const r of rows) { if (r.lp !== null) lpMap[r.id] = r.lp; }
  } catch { /* non-fatal */ }

  for (const season of expired) {
    const leagueId = season.leagueId;
    try {
      // ── Season-end gem awards (before advancing, so LP snapshot is current) ──
      await awardSeasonEndGems(leagueId).catch(() => {});

      const result = advanceSeason(leagueId, lpMap);
      if ('error' in result) {
        console.error(`[season-scheduler] advance error for ${leagueId}:`, result.error);
        continue;
      }

      console.info(
        `[season-scheduler] ${season.name} ended → ${result.newSeason.name} started ` +
        `(+${result.promotedCount} promoted, -${result.relegatedCount} relegated)`,
      );

      // Re-seed bots for the new season
      try { seedBotStandings(); } catch { /* never block */ }

      // Grant promotion rewards (coins + gems)
      const econFromTier = LEAGUE_TO_ECONOMY_TIER[leagueId] ?? 'div3';
      for (const promo of result.promotions) {
        const toEconTier = LEAGUE_TO_ECONOMY_TIER[promo.toLeague];
        if (!toEconTier) continue;
        try {
          const [dbPlayer] = await db.select({ coins: playersTable.coins })
            .from(playersTable).where(eq(playersTable.id, promo.playerId)).limit(1);
          const currentCoins = dbPlayer?.coins ?? 0;
          const { gems: currentGems } = getPlayerGems(promo.playerId);
          const reward = calcPromotionReward(econFromTier, toEconTier, currentCoins, currentGems);

          if (reward.gemsAwarded > 0) grantGems(promo.playerId, promo.playerName, reward.gemsAwarded);
          if (reward.coinsAwarded > 0 && dbPlayer) {
            await db.update(playersTable)
              .set({ coins: reward.newCoins, updatedAt: new Date() })
              .where(eq(playersTable.id, promo.playerId));
            await db.insert(coinTransactionsTable).values({
              id: nanoid(), playerId: promo.playerId,
              amount: reward.coinsAwarded, type: 'earn',
              source: 'season_promotion',
              description: `Auto-advance promotion: ${promo.fromLeague} → ${promo.toLeague}`,
              balanceAfter: reward.newCoins,
            });
          }
        } catch (err) {
          console.error('[season-scheduler] promotion reward error:', err);
        }
      }
    } catch (err) {
      console.error(`[season-scheduler] unexpected error for ${leagueId}:`, err);
    }
  }
}

export function startSeasonScheduler(): void {
  if (_seasonSchedulerInterval) return;

  // Check immediately on startup (catches seasons that expired while server was down)
  setTimeout(() => { autoAdvanceExpiredSeasons().catch(() => {}); }, 5_000);

  // Then every hour
  _seasonSchedulerInterval = setInterval(
    () => { autoAdvanceExpiredSeasons().catch(() => {}); },
    60 * 60 * 1_000,
  );

  console.info('[season-scheduler] started (checks every 60 min)');
}

export default router;
