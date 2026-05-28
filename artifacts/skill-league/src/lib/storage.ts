import type { Language } from './i18n';
import { detectBrowserLanguage } from './i18n';

export interface LeaderboardEntry {
  score: number;
  correct: number;
  streak: number;
  accuracy: number;
  date: string;
}

export interface PlayerData {
  username: string;
  coins: number;
  highScores: Record<string, number>;
  leaderboard: Record<string, LeaderboardEntry[]>;
  unlockedLeagues: string[];
  matchesPlayed: number;
  matchesWon: number;
  bestStreak: number;
  language: Language;
}

const ADJECTIVES = ['Swift', 'Bright', 'Sharp', 'Bold', 'Quick', 'Smart', 'Fast', 'Keen'];
const NOUNS      = ['Eagle', 'Fox', 'Tiger', 'Wolf', 'Hawk', 'Star', 'Arrow', 'Bolt'];

function generateUsername(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a}${n}${Math.floor(Math.random() * 99) + 1}`;
}

function migrateOld(old: any): Partial<PlayerData> {
  const out: Partial<PlayerData> = {};
  if (typeof old.trainingCoins === 'number') out.coins = Math.floor(old.trainingCoins / 2) + 100;
  if (old.language) out.language = old.language as Language;
  if (old.highScores) {
    const hs = { ...old.highScores };
    if (hs.easy)   { hs.bronze = Math.max(hs.bronze ?? 0, hs.easy);   delete hs.easy; }
    if (hs.ranked) { hs.silver = Math.max(hs.silver ?? 0, hs.ranked); delete hs.ranked; }
    out.highScores = hs;
  }
  return out;
}

const DEFAULTS: PlayerData = {
  username: '',
  coins: 100,
  highScores: {},
  leaderboard: {},
  unlockedLeagues: ['training'],
  matchesPlayed: 0,
  matchesWon: 0,
  bestStreak: 0,
  language: 'en',
};

export const storage = {
  get: (): PlayerData => {
    try {
      const raw = localStorage.getItem('player_data');
      if (raw) {
        const p = JSON.parse(raw);
        const isOld = typeof p.trainingCoins === 'number' || !p.username;
        if (isOld) {
          return {
            ...DEFAULTS,
            username: generateUsername(),
            language: detectBrowserLanguage(),
            ...migrateOld(p),
          };
        }
        return { ...DEFAULTS, ...p };
      }
    } catch { /* ignore */ }
    return { ...DEFAULTS, username: generateUsername(), language: detectBrowserLanguage() };
  },
  save: (data: PlayerData) => {
    localStorage.setItem('player_data', JSON.stringify(data));
  },
};
