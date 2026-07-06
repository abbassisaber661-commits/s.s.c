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

export interface DNBreakdown {
  base:          number;
  rankBonus:     number;
  accuracyBonus: number;
  total:         number;
}

export interface PiBreakdown {
  piEarned: number;
  reason:   string;
}

export interface EconomyResult {
  dnEarned:    number;
  piEarned:    number;
  dnBreakdown: DNBreakdown;
  piBreakdown: PiBreakdown;
  newDN:       number;
  newPi:       number;
}

// ── Pi reward table (formerly gem table) ─────────────────────────────────────

const PI_REWARD_TABLE: Record<EconomyTier, Partial<Record<number, number>>> = {
  div3:      { 1: 1 },
  div2:      { 1: 2, 2: 1 },
  pro:       { 1: 3, 2: 2, 3: 1 },
  champions: { 1: 3, 2: 2, 3: 1 },
};

// ── Entry Pi requirements ─────────────────────────────────────────────────────

export const ENTRY_PI_COST: Record<EconomyTier, number> = {
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
  input:      MatchEconomyInput,
  playerDN  = 0,
  playerPi  = 0,
): EconomyResult {
  // DN$ earned
  const base = 1;

  let rankBonus = 0;
  if      (input.rank === 1) rankBonus = 3;
  else if (input.rank === 2) rankBonus = 2;
  else if (input.rank === 3) rankBonus = 1;

  let accuracyBonus = 0;
  if (input.accuracyPct >= 1.0)       accuracyBonus = 2;
  else if (input.accuracyPct >= 0.8)  accuracyBonus = 1;

  const dnEarned = base + rankBonus + accuracyBonus;

  // Pi earned
  const piEarned = PI_REWARD_TABLE[input.tier]?.[input.rank] ?? 0;

  let piReason = 'No Pi reward for this rank/tier';
  if (piEarned > 0) {
    const place =
      input.rank === 1 ? '1st place' :
      input.rank === 2 ? '2nd place' : '3rd place';
    piReason = `${place} in ${input.tier.toUpperCase()}`;
  }

  return {
    dnEarned,
    piEarned,
    dnBreakdown: { base, rankBonus, accuracyBonus, total: dnEarned },
    piBreakdown: { piEarned, reason: piReason },
    newDN: playerDN + dnEarned,
    newPi: Math.max(0, playerPi + piEarned),
  };
}

/** Check whether a player can enter a league tier. */
export function canEnterLeague(tier: EconomyTier, playerPi: number): boolean {
  return playerPi >= ENTRY_PI_COST[tier];
}

// ── Persistent Pi storage (localStorage) ─────────────────────────────────────

const PI_LOCAL_KEY = 'sl_economy_pi_v1';

export function loadLocalPi(): number {
  try {
    const raw = localStorage.getItem(PI_LOCAL_KEY);
    if (raw !== null) return Math.max(0, parseInt(raw, 10) || 0);
  } catch { /* ignore */ }
  return 0;
}

export function saveLocalPi(pi: number): void {
  try {
    localStorage.setItem(PI_LOCAL_KEY, String(Math.max(0, pi)));
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

  /** Get current Pi count for a player. */
  getPi: async (playerId: string): Promise<number> => {
    const res = await fetch(`${BASE}/economy/${playerId}/gems`);
    if (!res.ok) return 0;
    const body = await res.json() as { gems: number };
    return body.gems ?? 0;
  },
};
