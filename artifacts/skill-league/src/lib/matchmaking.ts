import { LeagueId } from './game-engine';

export type MatchType = 'pvp' | 'bot';
export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface MatchmakingResult {
  type: MatchType;
  opponentName: string;
  opponentLevel: number;
  opponentElo: number;
  difficulty?: BotDifficulty;
  waitSeconds: number;
}

const PVP_PLAYER_NAMES = [
  'StarKnight', 'NeonRacer', 'ByteWolf', 'PixelFox', 'SwiftArrow',
  'CryptoAce', 'DataStrike', 'CodeSniper', 'QuantumBolt', 'NetRunner',
  'FlashMind', 'GridHunter', 'SpeedDemon', 'BrainStorm', 'QuickByte',
  'AlphaCore', 'ZeroLag', 'TurboThink', 'NightHawk', 'FastLogic',
];

const BOT_NAMES_BY_DIFF: Record<BotDifficulty, string[]> = {
  easy:   ['SlowBot_E', 'EasyAI_1', 'Beginner_X', 'Novice_Bot', 'LearnAI_3'],
  medium: ['MindBot_M', 'MidAI_7', 'SmartBot_2', 'AveragePro', 'SteadyAI'],
  hard:   ['MasterAI', 'EliteBot_H', 'OmegaMind', 'ApexAI_X', 'UltraCore'],
};

export const DAILY_BOT_LIMIT = 10;
const BOT_COUNT_KEY = 'sl_daily_bot_count';

interface BotCount { date: string; count: number; }

export function getDailyBotCount(): number {
  try {
    const raw = localStorage.getItem(BOT_COUNT_KEY);
    if (!raw) return 0;
    const data: BotCount = JSON.parse(raw);
    const today = new Date().toISOString().split('T')[0];
    if (data.date !== today) return 0;
    return data.count;
  } catch { return 0; }
}

export function incrementBotCount(): void {
  const today = new Date().toISOString().split('T')[0];
  const count = getDailyBotCount() + 1;
  localStorage.setItem(BOT_COUNT_KEY, JSON.stringify({ date: today, count }));
}

export function canPlayBotMatch(): boolean {
  return getDailyBotCount() < DAILY_BOT_LIMIT;
}

export function getBotAccuracyByDifficulty(diff: BotDifficulty): number {
  return { easy: 0.50, medium: 0.73, hard: 0.92 }[diff];
}

export function getBotReactionByDifficulty(diff: BotDifficulty, challengeType: string): number {
  const base = { easy: 1800, medium: 1100, hard: 550 }[diff];
  const jitter = (Math.random() - 0.5) * 500;
  const memExtra = challengeType === 'memory' ? 400 : 0;
  return Math.max(180, base + jitter + memExtra);
}

export function getBotLevelByDifficulty(playerLevel: number, diff: BotDifficulty): number {
  const offsets = { easy: -4, medium: 0, hard: 4 };
  return Math.max(1, Math.min(100, playerLevel + offsets[diff] + Math.floor(Math.random() * 3) - 1));
}

export function getBotEloByDifficulty(playerElo: number, diff: BotDifficulty): number {
  const offsets = { easy: -80, medium: 0, hard: 80 };
  return Math.max(800, playerElo + offsets[diff] + Math.floor(Math.random() * 40) - 20);
}

export function startMatchmaking(
  playerLevel: number,
  playerElo: number,
  leagueId: LeagueId,
): Promise<MatchmakingResult> {
  const waitSeconds = 5 + Math.floor(Math.random() * 7);
  const findRealPlayer = Math.random() < 0.65 && canPlayBotMatch() === false
    ? false
    : Math.random() < 0.65;

  return new Promise((resolve) => {
    setTimeout(() => {
      if (findRealPlayer) {
        const name = PVP_PLAYER_NAMES[Math.floor(Math.random() * PVP_PLAYER_NAMES.length)];
        const levelOffset = Math.floor(Math.random() * 5) - 2;
        const eloOffset = Math.floor(Math.random() * 60) - 30;
        resolve({
          type: 'pvp',
          opponentName: name,
          opponentLevel: Math.max(1, Math.min(100, playerLevel + levelOffset)),
          opponentElo: Math.max(800, playerElo + eloOffset),
          waitSeconds,
        });
      } else {
        const diff: BotDifficulty = leagueId === 'elite' ? 'hard' : leagueId === 'silver' ? 'medium' : 'easy';
        const names = BOT_NAMES_BY_DIFF[diff];
        const name = names[Math.floor(Math.random() * names.length)];
        incrementBotCount();
        resolve({
          type: 'bot',
          opponentName: name,
          opponentLevel: getBotLevelByDifficulty(playerLevel, diff),
          opponentElo: getBotEloByDifficulty(playerElo, diff),
          difficulty: diff,
          waitSeconds,
        });
      }
    }, waitSeconds * 1000);
  });
}

export function getEloChange(
  won: boolean,
  draw: boolean,
  playerElo: number,
  opponentElo: number,
  matchType: MatchType,
): number {
  const K = matchType === 'pvp' ? 32 : 16;
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const score = won ? 1 : draw ? 0.5 : 0;
  return Math.round(K * (score - expected));
}

export function getPvpRewardDN(stake: number, won: boolean, draw: boolean, matchType: MatchType): number {
  if (!won && !draw) return 0;
  const multiplier = matchType === 'pvp' ? 2.5 : 1.6;
  if (draw) return Math.round(stake * 0.8);
  return Math.round(stake * multiplier);
}

export function getPvpRewardXp(won: boolean, draw: boolean, matchType: MatchType): number {
  if (matchType === 'pvp') return won ? 120 : draw ? 50 : 25;
  return won ? 70 : draw ? 25 : 10;
}
