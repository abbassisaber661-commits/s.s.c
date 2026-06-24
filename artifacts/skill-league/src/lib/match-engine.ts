import {
  SPORTS_BANK,
  CULTURE_BANK,
  PHILOSOPHY_BANK,
  RELIGION_BANK,
  VISUAL_BANK,
  type TriviaQ,
} from './question-bank';

// ─────────────────────────────────────────────
// 🤖 MATCH BOT TYPE
// ─────────────────────────────────────────────

export interface MatchBot {
  id:     string;
  name:   string;
  avatar: string;
  skill:  number;
  level:  number;
}

// ─────────────────────────────────────────────
// 🤖 MATCH BOTS
// ─────────────────────────────────────────────

export const MATCH_BOTS: MatchBot[] = [
  { id: 'bot_alpha',   name: 'Alpha',   avatar: '🤖', skill: 0.55, level: 2 },
  { id: 'bot_nova',    name: 'Nova',    avatar: '🦾', skill: 0.45, level: 1 },
  { id: 'bot_titan',   name: 'Titan',   avatar: '⚡', skill: 0.65, level: 3 },
  { id: 'bot_cipher',  name: 'Cipher',  avatar: '🎯', skill: 0.50, level: 2 },
];

const BOTS_BY_TIER: Record<string, MatchBot[]> = {
  div3: [
    { id: 'bot_rookie1',  name: 'Rookie',   avatar: '🌱', skill: 0.35, level: 1 },
    { id: 'bot_rookie2',  name: 'Sprout',   avatar: '🐣', skill: 0.30, level: 1 },
    { id: 'bot_rookie3',  name: 'Newbie',   avatar: '🎮', skill: 0.38, level: 1 },
    { id: 'bot_rookie4',  name: 'Trainee',  avatar: '📚', skill: 0.32, level: 1 },
  ],
  div2: [
    { id: 'bot_silver1',  name: 'Atlas',    avatar: '🪙', skill: 0.52, level: 2 },
    { id: 'bot_silver2',  name: 'Echo',     avatar: '🔔', skill: 0.48, level: 2 },
    { id: 'bot_silver3',  name: 'Orion',    avatar: '🌙', skill: 0.55, level: 2 },
    { id: 'bot_silver4',  name: 'Vega',     avatar: '⭐', skill: 0.50, level: 2 },
  ],
  pro: [
    { id: 'bot_pro1',     name: 'Apex',     avatar: '🏆', skill: 0.68, level: 3 },
    { id: 'bot_pro2',     name: 'Blaze',    avatar: '🔥', skill: 0.72, level: 3 },
    { id: 'bot_pro3',     name: 'Storm',    avatar: '⚡', skill: 0.65, level: 3 },
    { id: 'bot_pro4',     name: 'Phantom',  avatar: '👻', skill: 0.70, level: 3 },
  ],
  champions: [
    { id: 'bot_champ1',   name: 'Zeus',     avatar: '👑', skill: 0.85, level: 4 },
    { id: 'bot_champ2',   name: 'Oracle',   avatar: '🔮', skill: 0.80, level: 4 },
    { id: 'bot_champ3',   name: 'Nexus',    avatar: '💎', skill: 0.88, level: 4 },
    { id: 'bot_champ4',   name: 'Infinity', avatar: '∞',  skill: 0.82, level: 4 },
  ],
};

export function getMatchBots(divTier?: string): MatchBot[] {
  if (divTier && BOTS_BY_TIER[divTier]) return BOTS_BY_TIER[divTier];
  return MATCH_BOTS;
}

// ─────────────────────────────────────────────
// 🤖 BOT SIMULATION
// ─────────────────────────────────────────────

export interface BotAnswer {
  correct: boolean;
  timeMs:  number;
}

export function simulateBotQuestion(
  bot:            MatchBot,
  timeLimitMs:    number,
  currentStreak = 0,
): BotAnswer {
  const streakBonus = Math.min(0.1, currentStreak * 0.02);
  const accuracy    = Math.min(0.95, bot.skill + streakBonus);
  const correct     = Math.random() < accuracy;
  const minMs       = timeLimitMs * 0.15;
  const maxMs       = timeLimitMs * 0.90;
  const timeMs      = minMs + Math.random() * (maxMs - minMs);
  return { correct, timeMs };
}

// ─────────────────────────────────────────────
// 🔥 GLOBAL MATCH SEED
// ─────────────────────────────────────────────

function createMatchSeed(tier: string, matchSeed?: number) {
  const day = Math.floor(Date.now() / 86400000);
  const base = matchSeed ?? day * 9973;
  return `${base}_${tier}`;
}

// ─────────────────────────────────────────────
// 🔥 RNG
// ─────────────────────────────────────────────

function seededRng(seed: string) {
  let h = 2166136261;

  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return () => {
    h += h << 13;
    h ^= h >>> 7;
    h += h << 3;
    h ^= h >>> 17;
    return (h >>> 0) / 4294967296;
  };
}

// ─────────────────────────────────────────────
// 🔥 SHUFFLE
// ─────────────────────────────────────────────

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let _id = 0;
const nextId = () => `q_${++_id}_${Date.now()}`;

// ─────────────────────────────────────────────
// 🔥 DIFFICULTY SYSTEM
// ─────────────────────────────────────────────

type Difficulty = 'medium' | 'hard';

const DIFF_MAP: Record<string, Difficulty> = {
  training: 'medium',
  'division-iii': 'hard',
  'division-ii': 'hard',
  pro: 'hard',
  champions: 'hard',
};

function getDiff(tier: string): Difficulty {
  return DIFF_MAP[tier] ?? 'medium';
}

// ─────────────────────────────────────────────
// 🔥 QUESTION TRACKING
// ─────────────────────────────────────────────

const usedQuestions = new Set<string>();

function pickUnique(list: TriviaQ[], rng: () => number): TriviaQ {
  const available = list.filter(q => !usedQuestions.has(q.q));
  const pool = available.length ? available : list;

  const q = pool[Math.floor(rng() * pool.length)];
  usedQuestions.add(q.q);

  return q;
}

// ─────────────────────────────────────────────
// 🔥 TRIVIA BUILDER
// ─────────────────────────────────────────────

function genTrivia(
  q: TriviaQ,
  type: string,
  label: string,
  color: string,
  diff: Difficulty,
  rng: () => number,
) {
  const opts = shuffle([...q.opts], rng);
  const correct = opts.indexOf(q.correct);

  return {
    id: nextId(),
    type,
    prompt: q.q,
    timeLimitMs: diff === 'hard' ? 10000 : 12000,

    difficulty: diff,

    display: {
      kind: 'trivia',
      value: q.q,
      label,
      color,
    },

    options: opts.map(o => ({
      id: o,
      kind: 'text',
      label: o,
      value: o,
    })),

    correctIndex: correct,
  };
}

// ─────────────────────────────────────────────
// 🔥 MAIN ENGINE
// ─────────────────────────────────────────────

export function generateMatchQuestions(
  count = 10,
  tier = 'training',
  timeFactor = 1,
  matchSeed?: number,
) {
  const diff = getDiff(tier);
  const seed = createMatchSeed(tier, matchSeed);
  const rng = seededRng(seed);

  usedQuestions.clear();

  const sports  = shuffle([...SPORTS_BANK[diff]], rng);
  const culture = shuffle([...CULTURE_BANK[diff]], rng);
  const philo   = shuffle([...PHILOSOPHY_BANK[diff]], rng);
  const rel     = shuffle([...RELIGION_BANK[diff]], rng);
  const visual  = shuffle([...VISUAL_BANK[diff]], rng);

  const knowledge = [
    genTrivia(pickUnique(sports, rng),  'sports_trivia',     'Sports',     '#3AB4FF', diff, rng),
    genTrivia(pickUnique(culture, rng), 'culture_trivia',    'Culture',    '#2EE87A', diff, rng),
    genTrivia(pickUnique(philo, rng),   'philosophy_trivia', 'Philosophy', '#B44FFF', diff, rng),
    genTrivia(pickUnique(rel, rng),     'religion_trivia',   'Religion',   '#FFD93D', diff, rng),
  ];

  const visualQ = [
    genTrivia(pickUnique(visual, rng), 'visual_deception', 'Visual', '#FF8C42', diff, rng),
  ];

  const pool = [...knowledge, ...visualQ];
  const final = shuffle(pool.slice(0, count), rng);

  return final.map(q => ({
    ...q,
    timeLimitMs: Math.round(q.timeLimitMs * timeFactor),
  }));
}

// ─────────────────────────────────────────────
// 🔥 SCORE SYSTEM
// ─────────────────────────────────────────────

export function calcScore(correct: boolean) {
  return correct ? 3 : 0;
}