export const COLORS = [
  { id: 'red',    hex: '#FF3A5E' },
  { id: 'blue',   hex: '#3AB4FF' },
  { id: 'green',  hex: '#2EE87A' },
  { id: 'yellow', hex: '#FFD93D' },
  { id: 'purple', hex: '#B44FFF' },
];

export type Color = { id: string; hex: string };
export type ChallengeType = 'reaction' | 'decision' | 'memory';

export interface ReactionChallenge { type: 'reaction'; target: Color; options: Color[] }
export interface DecisionChallenge  { type: 'decision';  target: Color; options: Color[] }
export interface MemoryChallenge    { type: 'memory';  sequence: Color[] }
export type Challenge = ReactionChallenge | DecisionChallenge | MemoryChallenge;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickN<T>(arr: T[], n: number): T[] {
  return shuffle([...arr]).slice(0, n);
}

export function generateChallenge(): Challenge {
  const r = Math.random();
  if (r < 0.35) {
    const options = pickN(COLORS, 4);
    const target = options[Math.floor(Math.random() * options.length)];
    return { type: 'reaction', target, options: shuffle(options) };
  } else if (r < 0.65) {
    const count = Math.random() < 0.5 ? 3 : 4;
    const options = pickN(COLORS, count);
    const target = options[Math.floor(Math.random() * options.length)];
    return { type: 'decision', target, options: shuffle(options) };
  } else {
    const len = 2 + Math.floor(Math.random() * 3);
    const sequence = Array.from({ length: len }, () => {
      const c = COLORS[Math.floor(Math.random() * COLORS.length)];
      return { id: c.id, hex: c.hex };
    });
    return { type: 'memory', sequence };
  }
}

export function getPoints(type: ChallengeType, currentStreak: number): number {
  const base = type === 'memory' ? 20 : 10;
  const bonus = Math.floor(currentStreak / 3) * 5;
  return base + bonus;
}

export type LeagueType = 'training' | 'easy' | 'ranked' | 'elite';

export interface GameConfig {
  duration: number;
  entryCostType: 'none' | 'coins' | 'tokens';
  entryCost: number;
}

export const LEAGUES: Record<LeagueType, GameConfig> = {
  training: { duration: 30, entryCostType: 'none',   entryCost: 0  },
  easy:     { duration: 30, entryCostType: 'coins',  entryCost: 10 },
  ranked:   { duration: 30, entryCostType: 'tokens', entryCost: 5  },
  elite:    { duration: 30, entryCostType: 'tokens', entryCost: 15 },
};
