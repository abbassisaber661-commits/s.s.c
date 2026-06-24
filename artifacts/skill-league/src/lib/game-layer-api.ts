/**
 * game-layer-api.ts
 * ─────────────────
 * Typed fetch wrapper for the Game Layer backend (XP, arcade, daily reward).
 */

const BASE = (import.meta.env.BASE_URL?.replace(/\/$/, '') || '') + '/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as Record<string, string>).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface PlayerProfile {
  id:              string;
  playerId:        string;
  playerName:      string;
  xp:              number;
  level:           number;
  streak:          number;
  bestStreak:      number;
  badges:          string[];
  arcadeCoins:     number;
  totalWins:       number;
  totalDraws:      number;
  totalLosses:     number;
  arcadePlays:     number;
  dailyClaimCount: number;
  lastDailyAt:     string | null;
  createdAt:       string;
  updatedAt:       string;
}

export interface XpProgress {
  current: number;  // XP within current level
  needed:  number;  // XP needed to reach next level
  levelXp: number;  // XP at start of current level
}

export interface BadgeDef {
  id:   string;
  name: string;
  icon: string;
  desc: string;
}

export interface ArcadeGame {
  id:    string;
  name:  string;
  icon:  string;
  desc:  string;
  xp:    number;
  coins: number;
}

export interface ArcadeResult {
  game:        ArcadeGame;
  xpGained:    number;
  coinsGained: number;
  newXp:       number;
  newLevel:    number;
  levelledUp:  boolean;
  newBadges:   string[];
}

export interface DailyResult {
  coins:     number;
  xp:        number;
  profile:   PlayerProfile;
  newBadges: string[];
}

export interface ProgressionResult {
  xpGained:    number;
  bonusXp:     number;
  newLevel:    number;
  levelledUp:  boolean;
  newStreak:   number;
  streakBonus: number;
  newBadges:   string[];
}

// ── API ────────────────────────────────────────────────────────────────────

export const gameLayerApi = {
  /** Full player profile with XP progress. */
  getProfile: (playerId: string) =>
    apiFetch<{ profile: PlayerProfile; progress: XpProgress; badgeDefs: BadgeDef[] }>(
      `/game/player/${playerId}/xp-progress`,
    ),

  /** Raw profile (lightweight). */
  getRawProfile: (playerId: string) =>
    apiFetch<PlayerProfile | null>(`/game/player/${playerId}/profile`),

  /** List arcade games. */
  getArcadeGames: () =>
    apiFetch<ArcadeGame[]>('/game/arcade/games'),

  /** Play an arcade game. */
  playArcade: (playerId: string, playerName: string, gameId: string) =>
    apiFetch<ArcadeResult>('/arcade/play', {
      method: 'POST',
      body: JSON.stringify({ playerId, playerName, gameId }),
    }),

  /** Claim daily reward. */
  claimDaily: (playerId: string, playerName: string) =>
    apiFetch<DailyResult>('/daily/reward', {
      method: 'POST',
      body: JSON.stringify({ playerId, playerName }),
    }),

  /** XP leaderboard. */
  getXpLeaderboard: (limit = 20) =>
    apiFetch<PlayerProfile[]>(`/game/leaderboard/xp?limit=${limit}`),

  /** All badge definitions. */
  getBadges: () =>
    apiFetch<BadgeDef[]>('/game/badges'),
};
