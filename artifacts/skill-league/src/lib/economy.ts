/**
 * economy.ts
 * ──────────
 * Frontend Economy Engine — mirrors the backend calculation for instant
 * UI feedback without a network round-trip.
 *
 * After calling calcMatchEconomy() locally (for instant display), also
 * call economyApi.reportMatchResult() to persist the result server-side.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type EconomyTier = 'div3' | 'div2' | 'pro' | 'champions';

export interface MatchEconomyInput {
  rank:        number;  // 1 = first place
  accuracyPct: number;  // 0–1
  tier:        EconomyTier;
}

export interface CoinBreakdown {
  base:          number;
  rankBonus:     number;
  accuracyBonus: number;
  total:         number;
}

export interface GemBreakdown {
  gemsEarned: number;
  reason:     string;
}

export interface EconomyResult {
  coinsEarned:   number;
  gemsEarned:    number;
  coinBreakdown: CoinBreakdown;
  gemBreakdown:  GemBreakdown;
  newCoins:      number;
  newGems:       number;
}

// ── Gem reward table ──────────────────────────────────────────────────────────

const GEM_TABLE: Record<EconomyTier, Partial<Record<number, number>>> = {
  div3:      { 1: 1 },
  div2:      { 1: 2, 2: 1 },
  pro:       { 1: 3, 2: 2, 3: 1 },
  champions: { 1: 3, 2: 2, 3: 1 },
};

// ── Entry gem requirements ────────────────────────────────────────────────────

export const ENTRY_GEM_COST: Record<EconomyTier, number> = {
  div3:      0,
  div2:      1,
  pro:       2,
  champions: 4,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map a LeagueTier string to an EconomyTier */
export function leagueTierToEconomyTier(tier: string): EconomyTier {
  const map: Record<string, EconomyTier> = {
    training: 'div3',
    coin:     'div2',
    pro:      'pro',
    champion: 'champions',
  };
  return map[tier] ?? 'div3';
}

// ── Core calculation (pure — no side effects) ─────────────────────────────────

export function calcMatchEconomy(
  input:       MatchEconomyInput,
  playerCoins  = 0,
  playerGems   = 0,
): EconomyResult {
  // Coins
  const base = 1;

  let rankBonus = 0;
  if      (input.rank === 1) rankBonus = 3;
  else if (input.rank === 2) rankBonus = 2;
  else if (input.rank === 3) rankBonus = 1;

  let accuracyBonus = 0;
  if (input.accuracyPct >= 1.0)       accuracyBonus = 2;
  else if (input.accuracyPct >= 0.8)  accuracyBonus = 1;

  const coinsEarned = base + rankBonus + accuracyBonus;

  // Gems
  const gemsEarned = GEM_TABLE[input.tier]?.[input.rank] ?? 0;

  let gemReason = 'No gem reward for this rank/tier';
  if (gemsEarned > 0) {
    const place =
      input.rank === 1 ? '1st place' :
      input.rank === 2 ? '2nd place' : '3rd place';
    gemReason = `${place} in ${input.tier.toUpperCase()}`;
  }

  return {
    coinsEarned,
    gemsEarned,
    coinBreakdown: { base, rankBonus, accuracyBonus, total: coinsEarned },
    gemBreakdown:  { gemsEarned, reason: gemReason },
    newCoins: playerCoins + coinsEarned,
    newGems:  Math.max(0, playerGems + gemsEarned),
  };
}

/** Check whether a player can enter a league tier. */
export function canEnterLeague(tier: EconomyTier, playerGems: number): boolean {
  return playerGems >= ENTRY_GEM_COST[tier];
}

// ── Persistent gem storage (localStorage) ────────────────────────────────────

const GEMS_KEY = 'sl_economy_gems_v1';

export function loadLocalGems(): number {
  try {
    const raw = localStorage.getItem(GEMS_KEY);
    if (raw !== null) return Math.max(0, parseInt(raw, 10) || 0);
  } catch { /* ignore */ }
  return 0;
}

export function saveLocalGems(gems: number): void {
  try {
    localStorage.setItem(GEMS_KEY, String(Math.max(0, gems)));
  } catch { /* ignore */ }
}

// ── API client ────────────────────────────────────────────────────────────────

const BASE = (import.meta.env.BASE_URL?.replace(/\/$/, '') || '') + '/api';

export interface MatchResultPayload {
  playerId:    string;
  playerName:  string;
  rank:        number;
  accuracyPct: number;
  tier:        string;
}

export interface ServerEconomyResult extends EconomyResult {
  tier:        string;
  rank:        number;
  accuracyPct: number;
}

export const economyApi = {
  /**
   * Report a match result to the server.
   * The server calculates rewards, persists them, and returns the breakdown.
   */
  reportMatchResult: async (payload: MatchResultPayload): Promise<ServerEconomyResult> => {
    const res = await fetch(`${BASE}/economy/match-result`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((body as Record<string, string>).error ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<ServerEconomyResult>;
  },

  /** Get current gem count for a player. */
  getGems: async (playerId: string): Promise<number> => {
    const res = await fetch(`${BASE}/economy/${playerId}/gems`);
    if (!res.ok) return 0;
    const body = await res.json() as { gems: number };
    return body.gems ?? 0;
  },
};
