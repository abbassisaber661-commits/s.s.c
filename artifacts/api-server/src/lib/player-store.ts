/**
 * player-store.ts
 * ───────────────
 * Game Layer — player progression data (XP, level, streak, badges, coins, daily reward).
 * Completely separate JSON store from league-store.ts.
 * Persists to /tmp/sl-player-data.json.
 *
 * Does NOT modify any league system logic.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { MatchResult } from './league-store.js';

// ── Constants ──────────────────────────────────────────────────────────────

const DATA_FILE = process.env.PLAYER_DATA_FILE ?? resolve('data/players.json');

// Ensure the data directory exists on startup
try {
  mkdirSync(dirname(DATA_FILE), { recursive: true });
} catch {
  // already exists — safe to ignore
}

export const XP_PER_WIN   = 50;
export const XP_PER_DRAW  = 20;
export const XP_PER_LOSS  = 10;
export const XP_PLAYED    = 20;   // base "match played" bonus

export const STREAK_BONUSES: Record<number, number> = {
  3:  20,
  5:  50,
  10: 100,
};

export const ARCADE_REWARDS: Record<string, { xp: number; coins: number; name: string; icon: string; desc: string }> = {
  memory_speed: { xp: 10, coins: 15, name: 'Memory Speed',  icon: '🧠', desc: 'Match tiles before the clock runs out.' },
  logic_puzzle: { xp: 15, coins: 20, name: 'Logic Puzzle',  icon: '🔮', desc: 'Crack the sequence and win big XP.' },
  word_sprint:  { xp: 10, coins: 15, name: 'Word Sprint',   icon: '💬', desc: 'Spell as many words as you can in 60s.' },
};

const DAILY_COINS = 20;
const DAILY_XP    = 10;

const XP_PER_LEVEL = 500;

// ── Badges ─────────────────────────────────────────────────────────────────

interface BadgeDef {
  id:   string;
  name: string;
  icon: string;
  desc: string;
}

export const BADGE_DEFS: BadgeDef[] = [
  { id: 'first_win',         name: 'First Win',         icon: '🏆', desc: 'Win your first match.' },
  { id: 'hot_streak',        name: 'Hot Streak',         icon: '🔥', desc: 'Win 5 matches in a row.' },
  { id: 'legendary_streak',  name: 'Legendary Streak',   icon: '⚡', desc: 'Win 10 matches in a row.' },
  { id: 'elite_player',      name: 'Elite Player',       icon: '🥇', desc: 'Join the Elite League.' },
  { id: 'champion_player',   name: 'Champion Player',    icon: '👑', desc: 'Join the Champion League.' },
  { id: 'first_arcade',      name: 'Arcade Initiate',    icon: '🎮', desc: 'Play your first arcade game.' },
  { id: 'daily_devotee',     name: 'Daily Devotee',      icon: '📅', desc: 'Claim 7 daily rewards.' },
];

// ── Types ──────────────────────────────────────────────────────────────────

export interface PlayerProfile {
  id:              string;
  playerId:        string;
  playerName:      string;
  xp:              number;
  level:           number;
  streak:          number;    // current consecutive win streak
  bestStreak:      number;    // all-time best streak
  badges:          string[];  // badge ids
  arcadePoints:    number;    // points earned from arcade mode (game layer)
  totalWins:       number;
  totalDraws:      number;
  totalLosses:     number;
  arcadePlays:     number;
  dailyClaimCount: number;
  lastDailyAt:     string | null; // ISO date string YYYY-MM-DD
  createdAt:       string;
  updatedAt:       string;
}

export interface ProgressionResult {
  xpGained:     number;
  bonusXp:      number;
  newLevel:     number;
  levelledUp:   boolean;
  newStreak:    number;
  streakBonus:  number;
  newBadges:    string[];
}

interface Store {
  schemaVersion: number;
  profiles:      PlayerProfile[];
}

// ── Persistence ────────────────────────────────────────────────────────────

let _store: Store;

function load(): Store {
  if (existsSync(DATA_FILE)) {
    try {
      return JSON.parse(readFileSync(DATA_FILE, 'utf8')) as Store;
    } catch {
      console.warn('[player-store] corrupt data — starting fresh');
    }
  }
  return { schemaVersion: 1, profiles: [] };
}

function save() {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(_store, null, 2), 'utf8');
  } catch (err) {
    console.error('[player-store] failed to persist:', err);
  }
}

function store(): Store {
  if (!_store) _store = load();
  return _store;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function calcLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function grantBadge(profile: PlayerProfile, badgeId: string): boolean {
  if (profile.badges.includes(badgeId)) return false;
  profile.badges.push(badgeId);
  return true;
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Get or create a player profile. */
export function getOrCreateProfile(playerId: string, playerName: string): PlayerProfile {
  const s = store();
  let profile = s.profiles.find(p => p.playerId === playerId);
  if (!profile) {
    const now = new Date().toISOString();
    profile = {
      id: randomUUID(), playerId, playerName,
      xp: 0, level: 1, streak: 0, bestStreak: 0,
      badges: [], arcadePoints: 0,
      totalWins: 0, totalDraws: 0, totalLosses: 0,
      arcadePlays: 0, dailyClaimCount: 0,
      lastDailyAt: null, createdAt: now, updatedAt: now,
    };
    s.profiles.push(profile);
    save();
  }
  return profile;
}

/** Get a player profile without creating one. */
export function getProfile(playerId: string): PlayerProfile | null {
  return store().profiles.find(p => p.playerId === playerId) ?? null;
}

/**
 * Called after every match. Updates XP, level, streak, badges.
 * Completely independent of league ranking logic.
 */
export function applyMatchResult(
  playerId:   string,
  playerName: string,
  result:     MatchResult,
  leagueId?:  string,
): ProgressionResult {
  const s = store();
  const profile = getOrCreateProfile(playerId, playerName);
  const oldLevel = profile.level;

  // Base XP for playing + result
  const baseXp   = result === 'win' ? XP_PER_WIN : result === 'draw' ? XP_PER_DRAW : XP_PER_LOSS;
  const playedXp = XP_PLAYED;

  // Streak
  let streakBonus = 0;
  if (result === 'win') {
    profile.streak++;
    profile.bestStreak = Math.max(profile.bestStreak, profile.streak);
    if (STREAK_BONUSES[profile.streak] !== undefined) {
      streakBonus = STREAK_BONUSES[profile.streak];
    }
  } else {
    profile.streak = 0;
  }

  const totalXp = baseXp + playedXp + streakBonus;
  profile.xp   += totalXp;
  profile.level  = calcLevel(profile.xp);

  // Stats
  if (result === 'win')       profile.totalWins++;
  else if (result === 'draw') profile.totalDraws++;
  else                        profile.totalLosses++;

  // Badges
  const newBadges: string[] = [];
  if (profile.totalWins === 1 && grantBadge(profile, 'first_win'))         newBadges.push('first_win');
  if (profile.streak >= 5    && grantBadge(profile, 'hot_streak'))          newBadges.push('hot_streak');
  if (profile.streak >= 10   && grantBadge(profile, 'legendary_streak'))    newBadges.push('legendary_streak');
  if (leagueId === 'elite'   && grantBadge(profile, 'elite_player'))        newBadges.push('elite_player');
  if (leagueId === 'champion'&& grantBadge(profile, 'champion_player'))     newBadges.push('champion_player');

  profile.updatedAt = new Date().toISOString();
  save();

  return {
    xpGained:   baseXp + playedXp,
    bonusXp:    streakBonus,
    newLevel:   profile.level,
    levelledUp: profile.level > oldLevel,
    newStreak:  profile.streak,
    streakBonus,
    newBadges,
  };
}

/**
 * Play an arcade game — rewards XP and coins.
 * Returns null if gameId is unknown.
 */
export function playArcadeGame(
  playerId:   string,
  playerName: string,
  gameId:     string,
): {
  game:        (typeof ARCADE_REWARDS)[string];
  xpGained:    number;
  arcadePoints:number;
  newXp:       number;
  newLevel:    number;
  levelledUp:  boolean;
  newBadges:   string[];
} | null {
  const reward = ARCADE_REWARDS[gameId];
  if (!reward) return null;

  const s = store();
  const profile = getOrCreateProfile(playerId, playerName);
  const oldLevel = profile.level;

  profile.xp         += reward.xp;
  profile.arcadePoints += reward.xp;
  profile.arcadePlays++;
  profile.level       = calcLevel(profile.xp);
  profile.updatedAt   = new Date().toISOString();

  const newBadges: string[] = [];
  if (profile.arcadePlays === 1 && grantBadge(profile, 'first_arcade')) newBadges.push('first_arcade');

  save();

  return {
    game:        reward,
    xpGained:    reward.xp,
    arcadePoints: reward.xp,
    newXp:       profile.xp,
    newLevel:    profile.level,
    levelledUp:  profile.level > oldLevel,
    newBadges,
  };
}

/**
 * Claim daily reward — once per calendar day.
 * Returns { coins, xp, profile } or { error: 'already claimed' }.
 */
export function claimDailyReward(
  playerId:   string,
  playerName: string,
): {
  coins:      number;
  xp:         number;
  profile:    PlayerProfile;
  newBadges:  string[];
} | { error: string } {
  const today = todayStr();
  const profile = getOrCreateProfile(playerId, playerName);

  if (profile.lastDailyAt === today) {
    return { error: 'already claimed today' };
  }

  const oldLevel = profile.level;
  profile.xp          += DAILY_XP;
  profile.arcadePoints += DAILY_XP;
  profile.level        = calcLevel(profile.xp);
  profile.lastDailyAt  = today;
  profile.dailyClaimCount++;
  profile.updatedAt    = new Date().toISOString();

  const newBadges: string[] = [];
  if (profile.dailyClaimCount >= 7 && grantBadge(profile, 'daily_devotee')) newBadges.push('daily_devotee');

  save();

  return { coins: DAILY_COINS, xp: DAILY_XP, profile, newBadges };
}

/** XP leaderboard — top players by XP. */
export function getXpLeaderboard(limit = 20): PlayerProfile[] {
  return [...store().profiles]
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit);
}

/** XP needed to reach next level from current XP. */
export function xpToNextLevel(xp: number): { current: number; needed: number; levelXp: number } {
  const level  = calcLevel(xp);
  const levelXp = (level - 1) * XP_PER_LEVEL;   // XP at start of current level
  const needed  = level * XP_PER_LEVEL;           // XP needed for next level
  return { current: xp - levelXp, needed: needed - levelXp, levelXp };
}
