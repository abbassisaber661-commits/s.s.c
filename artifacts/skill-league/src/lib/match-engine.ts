import {
  SPORTS_BANK,
  CULTURE_BANK,
  PHILOSOPHY_BANK,
  RELIGION_BANK,
  VISUAL_BANK,
  type TriviaQ,
} from './question-bank';

// ─────────────────────────────────────────────
// 🤖 MATCH BOTS (FIXED EXPORT)
// ─────────────────────────────────────────────

export const MATCH_BOTS = [
  {
    id: "bot_easy",
    name: "Easy Bot",
    level: 1,
  },
  {
    id: "bot_medium",
    name: "Medium Bot",
    level: 2,
  },
  {
    id: "bot_hard",
    name: "Hard Bot",
    level: 3,
  },
];

// 🔥 FIX: bots getter
export function getMatchBots() {
  return MATCH_BOTS;
}

// 🔥 FIX: simulate bot answering question
export function simulateBotQuestion(question: any, botLevel: number) {
  const difficultyFactor = botLevel * 0.2;

  const timeDelay = Math.max(
    1000,
    5000 - difficultyFactor * 1500
  );

  const isCorrect = Math.random() > (0.3 + difficultyFactor);

  return {
    question,
    botLevel,
    isCorrect,
    timeDelay,
  };
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