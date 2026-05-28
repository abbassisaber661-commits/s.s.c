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

export function generateChallenge(maxSeqLen = 4): Challenge {
  const r = Math.random();
  if (r < 0.35) {
    const options = pickN(COLORS, 4);
    const target  = options[Math.floor(Math.random() * options.length)];
    return { type: 'reaction', target, options: shuffle(options) };
  } else if (r < 0.65) {
    const count   = Math.random() < 0.5 ? 3 : 4;
    const options = pickN(COLORS, count);
    const target  = options[Math.floor(Math.random() * options.length)];
    return { type: 'decision', target, options: shuffle(options) };
  } else {
    const len = 2 + Math.floor(Math.random() * (Math.min(maxSeqLen, 5) - 1));
    const sequence = Array.from({ length: len }, () => {
      const c = COLORS[Math.floor(Math.random() * COLORS.length)];
      return { id: c.id, hex: c.hex };
    });
    return { type: 'memory', sequence };
  }
}

export function getPoints(type: ChallengeType, currentStreak: number): number {
  const base  = type === 'memory' ? 20 : 10;
  const bonus = Math.floor(currentStreak / 3) * 5;
  return base + bonus;
}

// ─── League system ────────────────────────────────────────────────────────────

export type LeagueId = 'training' | 'bronze' | 'silver' | 'elite';

export interface LeagueConfig {
  id: LeagueId;
  difficulty: 1 | 2 | 3 | 4;
  themeColor: string;
  challengeTimeout: number;
  memorySeqLen: number;
  entryCost: number;
  rewardBase: number;
  unlockScore: number;
  unlockCoinsCost: number;
  prevLeague: LeagueId | null;
  nextLeague: LeagueId | null;
}

export const LEAGUES: Record<LeagueId, LeagueConfig> = {
  training: {
    id: 'training', difficulty: 1, themeColor: '#3AB4FF',
    challengeTimeout: 3000, memorySeqLen: 3,
    entryCost: 0,   rewardBase: 0,
    unlockScore: 0, unlockCoinsCost: 0,
    prevLeague: null, nextLeague: 'bronze',
  },
  bronze: {
    id: 'bronze', difficulty: 2, themeColor: '#CD7F32',
    challengeTimeout: 2500, memorySeqLen: 4,
    entryCost: 20,  rewardBase: 10,
    unlockScore: 60, unlockCoinsCost: 50,
    prevLeague: 'training', nextLeague: 'silver',
  },
  silver: {
    id: 'silver', difficulty: 3, themeColor: '#A8A9AD',
    challengeTimeout: 2000, memorySeqLen: 4,
    entryCost: 50,  rewardBase: 25,
    unlockScore: 150, unlockCoinsCost: 150,
    prevLeague: 'bronze', nextLeague: 'elite',
  },
  elite: {
    id: 'elite', difficulty: 4, themeColor: '#FFD700',
    challengeTimeout: 1500, memorySeqLen: 5,
    entryCost: 100, rewardBase: 60,
    unlockScore: 300, unlockCoinsCost: 0,
    prevLeague: 'silver', nextLeague: null,
  },
};

export const LEAGUE_ORDER: LeagueId[] = ['training', 'bronze', 'silver', 'elite'];

export function calculateReward(config: LeagueConfig, score: number): number {
  if (config.id === 'training') return 0;
  return config.rewardBase + Math.floor(score / 10);
}
