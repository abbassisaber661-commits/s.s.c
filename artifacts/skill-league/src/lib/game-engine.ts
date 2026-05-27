export type LeagueType = 'training' | 'easy' | 'ranked' | 'elite';
export type ChallengeType = 'reaction' | 'decision' | 'memory';

export interface GameConfig {
  duration: number;
  colors: string[];
  memorySeqLength: number;
  entryCostType: 'none' | 'coins' | 'tokens';
  entryCost: number;
  speedMultiplier: number;
}

export const LEAGUES: Record<LeagueType, GameConfig> = {
  training: { duration: 40, colors: ['#FF3366', '#33CCFF', '#33FF66'], memorySeqLength: 3, entryCostType: 'none', entryCost: 0, speedMultiplier: 1 },
  easy: { duration: 35, colors: ['#FF3366', '#33CCFF', '#33FF66', '#FFCC33'], memorySeqLength: 4, entryCostType: 'coins', entryCost: 10, speedMultiplier: 1.2 },
  ranked: { duration: 30, colors: ['#FF3366', '#33CCFF', '#33FF66', '#FFCC33', '#9933FF'], memorySeqLength: 4, entryCostType: 'tokens', entryCost: 5, speedMultiplier: 1.5 },
  elite: { duration: 25, colors: ['#FF3366', '#33CCFF', '#33FF66', '#FFCC33', '#9933FF', '#FF9933'], memorySeqLength: 5, entryCostType: 'tokens', entryCost: 15, speedMultiplier: 2.0 },
};

export function calculateScore(timeMs: number, streak: number) {
  let score = 100;
  if (timeMs <= 300) score *= 3;
  else if (timeMs <= 600) score *= 2;
  else if (timeMs <= 1000) score *= 1.5;
  
  if (streak >= 10) score += 200;
  else if (streak >= 5) score += 100;
  else if (streak >= 3) score += 50;

  return Math.floor(score);
}
