import {
  SPORTS_BANK, CULTURE_BANK, PHILOSOPHY_BANK, RELIGION_BANK, VISUAL_BANK,
  type TriviaQ,
} from './question-bank';

// ─────────────────────────────────────────────
// 🔥 GLOBAL MATCH SEED (IMPORTANT FIX)
// ─────────────────────────────────────────────

function createMatchSeed(tier: string, matchSeed?: number) {
  const day = Math.floor(Date.now() / 86400000);
  const base = matchSeed ?? (day * 9973);
  return `${base}_${tier}`;
}

// ─────────────────────────────────────────────
// 🔥 SAFE RANDOM (FIXED SYNC ISSUE)
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
// 🔥 UTILITIES
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
// 🔥 DIFFICULTY SYSTEM (FIXED BALANCE)
// ─────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFF_MAP: Record<string, Difficulty> = {
  training: 'easy',
  coin: 'easy',
  'division-iii': 'easy',
  pro: 'medium',
  'division-ii': 'medium',
  professional: 'hard',
  champion: 'hard',
  champions: 'hard',
};

function getDiff(tier: string): Difficulty {
  return DIFF_MAP[tier] ?? 'easy';
}

// ─────────────────────────────────────────────
// 🔥 TRIVIA GENERATOR (FIXED SYNC + NO REPEAT)
// ─────────────────────────────────────────────

function genTrivia(q: TriviaQ, type: any, label: string, color: string, diff: Difficulty, rng: () => number) {
  const opts = shuffle([...q.opts], rng);
  const correct = opts.indexOf(q.correct);

  return {
    id: nextId(),
    type,
    prompt: q.q,
    timeLimitMs: diff === 'easy' ? 14000 : diff === 'medium' ? 12000 : 10000,
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
// 🔥 MAIN ENGINE (FIXED + CLEAN)
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

  // ─────────────────────────────
  // 🔥 LOAD BANKS (FIXED SHUFFLE SYNC)
  // ─────────────────────────────

  const sports  = shuffle([...SPORTS_BANK[diff]], rng);
  const culture = shuffle([...CULTURE_BANK[diff]], rng);
  const philo   = shuffle([...PHILOSOPHY_BANK[diff]], rng);
  const rel     = shuffle([...RELIGION_BANK[diff]], rng);
  const visual  = shuffle([...VISUAL_BANK[diff]], rng);

  // ─────────────────────────────
  // 🔥 FIX: NO REPEAT TRIVIA
  // ─────────────────────────────

  const knowledge = [
    genTrivia(sports[0],  'sports_trivia',     'Sports',     '#3AB4FF', diff, rng),
    genTrivia(culture[0], 'culture_trivia',    'Culture',    '#2EE87A', diff, rng),
    genTrivia(philo[0],   'philosophy_trivia', 'Philosophy', '#B44FFF', diff, rng),
    genTrivia(rel[0],     'religion_trivia',   'Religion',   '#FFD93D', diff, rng),
  ];

  const visualQ = [
    genTrivia(visual[0], 'visual_deception', 'Visual', '#FF8C42', diff, rng),
  ];

  // ─────────────────────────────
  // 🔥 CLASSIC SYSTEM
  // ─────────────────────────────

  const classic = [
    genColorPickName(),
    genShapeMatch(),
    genCategoryPick(),
    genPairMatch(),
    genPatternNext(),
  ];

  // ─────────────────────────────
  // 🔥 PVP LOGIC QUESTIONS FIXED
  // ─────────────────────────────

  const logic = [
    genArithSeq(diff),
    genGeoSeq(diff),
  ];

  if (diff === 'hard') {
    logic.push(genQuadraticSeq());
    logic.push(genShapeEq(diff));
  }

  // ─────────────────────────────
  // 🔥 FINAL MERGE (CONTROLLED)
  // ─────────────────────────────

  const pool = [
    ...knowledge,
    ...visualQ,
    ...logic,
    ...classic,
  ];

  const final = pool.slice(0, count);

  const shuffledFinal = shuffle(final, rng);

  return timeFactor === 1
    ? shuffledFinal
    : shuffledFinal.map(q => ({
        ...q,
        timeLimitMs: Math.round(q.timeLimitMs * timeFactor),
      }));
}

// ─────────────────────────────────────────────
// 🔥 SCORE (CLEAN)
// ─────────────────────────────────────────────

export function calcScore(correct: boolean) {
  return correct ? 3 : 0;
}

// ─────────────────────────────────────────────
// 🔥 BOT SYSTEM
// ─────────────────────────────────────────────

export interface MatchBot {
  id:    string;
  name:  string;
  avatar: string;
  skill: number; // 0–1
}

const ALL_BOTS: MatchBot[] = [
  { id: 'b01',  name: 'Nova',      avatar: '🤖', skill: 0.92 },
  { id: 'b02',  name: 'Kai',       avatar: '🦅', skill: 0.85 },
  { id: 'b03',  name: 'Zara',      avatar: '🌟', skill: 0.78 },
  { id: 'b04',  name: 'Orion',     avatar: '🔭', skill: 0.70 },
  { id: 'b05',  name: 'Echo',      avatar: '🎭', skill: 0.65 },
  { id: 'b06',  name: 'Pixel',     avatar: '🎮', skill: 0.60 },
  { id: 'b07',  name: 'Blaze',     avatar: '🔥', skill: 0.55 },
  { id: 'b08',  name: 'Luna',      avatar: '🌙', skill: 0.50 },
  { id: 'b09',  name: 'Rex',       avatar: '🦖', skill: 0.48 },
  { id: 'b10',  name: 'Nyx',       avatar: '🌌', skill: 0.45 },
  { id: 'b11',  name: 'Comet',     avatar: '☄️', skill: 0.42 },
  { id: 'b12',  name: 'Dart',      avatar: '🎯', skill: 0.40 },
  { id: 'b13',  name: 'Sage',      avatar: '🌿', skill: 0.38 },
  { id: 'b14',  name: 'Storm',     avatar: '⚡', skill: 0.35 },
  { id: 'b15',  name: 'Flux',      avatar: '🔄', skill: 0.32 },
  { id: 'b16',  name: 'Chip',      avatar: '💡', skill: 0.30 },
  { id: 'b17',  name: 'Vex',       avatar: '🎲', skill: 0.28 },
  { id: 'b18',  name: 'Pax',       avatar: '🕊️', skill: 0.25 },
  { id: 'b19',  name: 'Glitch',    avatar: '👾', skill: 0.22 },
];

export const MATCH_BOTS: MatchBot[] = ALL_BOTS.slice(0, 7);

export function getMatchBots(divTier: 'div3' | 'div2' | 'pro' | 'champions'): MatchBot[] {
  if (divTier === 'div3' || divTier === 'div2') return ALL_BOTS;
  return ALL_BOTS.slice(0, 7);
}

export function simulateBotQuestion(
  bot: MatchBot,
  _timeLimitMs: number,
  _streak: number,
): { correct: boolean } {
  const roll = Math.random();
  return { correct: roll < bot.skill };
}