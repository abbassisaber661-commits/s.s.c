// ─── Helpers ──────────────────────────────────────────────────────────────────

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
let _id = 0;
function nextId() { return `q_${++_id}_${Date.now()}`; }

// ─── Data ─────────────────────────────────────────────────────────────────────

const COLORS = [
  { id: 'red',    hex: '#FF3A5E', name: 'Red'    },
  { id: 'blue',   hex: '#3AB4FF', name: 'Blue'   },
  { id: 'green',  hex: '#2EE87A', name: 'Green'  },
  { id: 'yellow', hex: '#FFD93D', name: 'Yellow' },
  { id: 'purple', hex: '#B44FFF', name: 'Purple' },
  { id: 'orange', hex: '#FF8C42', name: 'Orange' },
  { id: 'pink',   hex: '#FF6EB4', name: 'Pink'   },
  { id: 'cyan',   hex: '#00E5FF', name: 'Cyan'   },
];

const SHAPES = [
  { id: 'circle',   char: '●', name: 'Circle'   },
  { id: 'square',   char: '■', name: 'Square'   },
  { id: 'triangle', char: '▲', name: 'Triangle' },
  { id: 'diamond',  char: '◆', name: 'Diamond'  },
  { id: 'star',     char: '★', name: 'Star'     },
  { id: 'heart',    char: '♥', name: 'Heart'    },
  { id: 'cross',    char: '✚', name: 'Cross'    },
  { id: 'moon',     char: '☽', name: 'Moon'     },
];

const CATEGORIES = [
  { label: 'Fruit',   icon: '🍎', items: ['🍎','🍊','🍇','🍌','🍓','🥭','🍑','🍍'], distractors: ['🚗','🎮','🏠','📱','🎵','⚽','🌵','🔑','💡','🎪'] },
  { label: 'Animal',  icon: '🐶', items: ['🐶','🐱','🐸','🦊','🐼','🦁','🐨','🐺'], distractors: ['🍕','🚀','📺','🎭','🌊','⚙️','🎪','🍦','📦','🧩'] },
  { label: 'Vehicle', icon: '🚗', items: ['🚗','✈️','🚀','🚢','🚂','🏍️','🚁','🛸'], distractors: ['🍦','🐋','🎸','🌺','📦','🎯','🌙','🍔','🌿','🧸'] },
  { label: 'Sport',   icon: '⚽', items: ['⚽','🎾','🏀','🏈','🎯','🏓','🥊','🎿'], distractors: ['🍔','🦋','🔭','🎨','🧸','📿','🎺','🌿','🍰','🔮'] },
];

const PAIRS = [
  { a: '☀️', aLabel: 'Sun',       b: '🌙', bLabel: 'Moon',     distractors: ['🌊','🔥','❄️','⚡'] },
  { a: '🔑', aLabel: 'Key',       b: '🔒', bLabel: 'Lock',     distractors: ['🎁','📦','🧩','🎈'] },
  { a: '🔥', aLabel: 'Fire',      b: '💧', bLabel: 'Water',    distractors: ['🌪️','⚡','🌿','❄️'] },
  { a: '📚', aLabel: 'Book',      b: '🎓', bLabel: 'Graduate', distractors: ['✏️','🖥️','🔬','🎭'] },
  { a: '🐝', aLabel: 'Bee',       b: '🍯', bLabel: 'Honey',    distractors: ['🌸','🍀','🦋','🌺'] },
  { a: '⬆️', aLabel: 'Up',        b: '⬇️', bLabel: 'Down',     distractors: ['➡️','↗️','↙️','↔️'] },
  { a: '⚡', aLabel: 'Lightning', b: '🌩️', bLabel: 'Thunder',  distractors: ['☁️','🌈','❄️','🌬️'] },
  { a: '🌱', aLabel: 'Seed',      b: '🌳', bLabel: 'Tree',     distractors: ['🍂','🌊','🔥','❄️'] },
  { a: '🎵', aLabel: 'Music',     b: '🎸', bLabel: 'Guitar',   distractors: ['🎨','📷','🎭','🎪'] },
  { a: '🌙', aLabel: 'Night',     b: '⭐', bLabel: 'Stars',    distractors: ['☀️','☁️','🌈','🌊'] },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type QType = 'color_pick_name' | 'color_tap_color' | 'shape_match' | 'pattern_next' | 'category_pick' | 'pair_match';

export interface Option {
  id:    string;
  kind:  'color' | 'shape' | 'emoji' | 'text';
  label: string;
  value: string; // hex for color, char for shape, emoji for emoji, text for text
}

export interface DisplayData {
  kind:   'color_block' | 'shape_char' | 'sequence' | 'emoji_prompt' | 'text_prompt';
  value:  string;
  extra?: string[];   // sequence array (hex values)
  label?: string;     // sub-label
  color?: string;     // accent color
}

export interface Question {
  id:           string;
  type:         QType;
  timeLimitMs:  number;
  prompt:       string;
  display:      DisplayData;
  options:      Option[];
  correctIndex: number;
}

// ─── Question Generators ──────────────────────────────────────────────────────

function genColorPickName(): Question {
  const picked = pickN(COLORS, 4);
  const correctIdx = Math.floor(Math.random() * 4);
  const target = picked[correctIdx];
  return {
    id: nextId(), type: 'color_pick_name', timeLimitMs: 4000,
    prompt: 'Name this color',
    display: { kind: 'color_block', value: target.hex, color: target.hex },
    options: picked.map(c => ({ id: c.id, kind: 'text', label: c.name, value: c.hex })),
    correctIndex: correctIdx,
  };
}

function genColorTapColor(): Question {
  const picked = pickN(COLORS, 4);
  const correctIdx = Math.floor(Math.random() * 4);
  const target = picked[correctIdx];
  return {
    id: nextId(), type: 'color_tap_color', timeLimitMs: 4000,
    prompt: `Tap ${target.name}`,
    display: { kind: 'text_prompt', value: target.name, color: target.hex, label: 'Find this color:' },
    options: picked.map(c => ({ id: c.id, kind: 'color', label: c.name, value: c.hex })),
    correctIndex: correctIdx,
  };
}

function genShapeMatch(): Question {
  const picked = pickN(SHAPES, 4);
  const correctIdx = Math.floor(Math.random() * 4);
  const target = picked[correctIdx];
  const accent = COLORS[Math.floor(Math.random() * COLORS.length)];
  return {
    id: nextId(), type: 'shape_match', timeLimitMs: 4000,
    prompt: 'Find this shape',
    display: { kind: 'shape_char', value: target.char, color: accent.hex, label: target.name },
    options: picked.map(s => ({ id: s.id, kind: 'shape', label: s.name, value: s.char })),
    correctIndex: correctIdx,
  };
}

function genPatternNext(): Question {
  const patTypes = ['AB', 'AAB', 'ABB', 'AABB', 'ABC'];
  const unit = patTypes[Math.floor(Math.random() * patTypes.length)];
  const letters = [...new Set(unit.split(''))];
  const numColors = letters.length;
  const patColors = pickN(COLORS, numColors);
  const letterMap: Record<string, typeof COLORS[0]> = {};
  letters.forEach((l, i) => { letterMap[l] = patColors[i]; });

  const fullSeq = (unit + unit + unit).split('').map(l => letterMap[l]);
  const shown   = fullSeq.slice(0, 4);
  const correct = fullSeq[4];

  const distractors = pickN(COLORS.filter(c => c.id !== correct.id), 3);
  const allOptions  = shuffle([correct, ...distractors]);
  const correctIdx  = allOptions.indexOf(correct);

  return {
    id: nextId(), type: 'pattern_next', timeLimitMs: 5000,
    prompt: 'What comes next?',
    display: { kind: 'sequence', value: correct.hex, extra: shown.map(c => c.hex), color: correct.hex },
    options: allOptions.map(c => ({ id: c.id, kind: 'color', label: c.name, value: c.hex })),
    correctIndex: correctIdx,
  };
}

function genCategoryPick(): Question {
  const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const correct = cat.items[Math.floor(Math.random() * cat.items.length)];
  const distractors = pickN(cat.distractors, 3);
  const allOptions  = shuffle([correct, ...distractors]);
  const correctIdx  = allOptions.indexOf(correct);
  return {
    id: nextId(), type: 'category_pick', timeLimitMs: 4000,
    prompt: `Find the ${cat.label}`,
    display: { kind: 'emoji_prompt', value: cat.icon, label: cat.label, color: '#FFD93D' },
    options: allOptions.map((e, i) => ({ id: `opt_${i}`, kind: 'emoji', label: e, value: e })),
    correctIndex: correctIdx,
  };
}

function genPairMatch(): Question {
  const pair = PAIRS[Math.floor(Math.random() * PAIRS.length)];
  const distractors = pickN(pair.distractors, 3);
  const allOptions  = shuffle([pair.b, ...distractors]);
  const correctIdx  = allOptions.indexOf(pair.b);
  return {
    id: nextId(), type: 'pair_match', timeLimitMs: 5000,
    prompt: `Pair with ${pair.aLabel}`,
    display: { kind: 'emoji_prompt', value: pair.a, label: pair.aLabel, color: '#B44FFF' },
    options: allOptions.map((e, i) => ({ id: `opt_${i}`, kind: 'emoji', label: e, value: e })),
    correctIndex: correctIdx,
  };
}

const GENERATORS = [genColorPickName, genColorTapColor, genShapeMatch, genPatternNext, genCategoryPick, genPairMatch];

export function generateMatchQuestions(count = 10): Question[] {
  const qs: Question[] = [];
  const pool = shuffle([...GENERATORS, ...GENERATORS]); // ensure variety
  for (let i = 0; i < count; i++) {
    qs.push(pool[i % pool.length]());
  }
  return shuffle(qs);
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export function calcScore(correct: boolean, timeLeftMs: number, timeLimitMs: number, streak: number): number {
  if (!correct) return 0;
  const base       = 100;
  const speedBonus = Math.floor((timeLeftMs / timeLimitMs) * 200); // 0–200
  const streakBonus= Math.min(streak * 30, 300);                   // 30 per hit, max 300
  return base + speedBonus + streakBonus;
}

// ─── Bots ─────────────────────────────────────────────────────────────────────

export interface MatchBot {
  id:     string;
  name:   string;
  avatar: string;
  skill:  number; // probability of correct answer 0–1
  speed:  number; // 1 = fastest (answers at 15% of time), 0 = slowest (95%)
}

export const MATCH_BOTS: MatchBot[] = [
  { id: 'bot_nova',  name: 'Nova_X',    avatar: '🤖', skill: 0.94, speed: 0.90 },
  { id: 'bot_blaze', name: 'BlazeFire', avatar: '🔥', skill: 0.78, speed: 0.72 },
  { id: 'bot_star',  name: 'StarQ',     avatar: '⭐', skill: 0.62, speed: 0.55 },
  { id: 'bot_kiwi',  name: 'KiwiBot',   avatar: '🥝', skill: 0.45, speed: 0.38 },
];

export interface BotResult {
  correct:  boolean;
  timeMs:   number;  // how long after question start they answer
  points:   number;
}

export function simulateBotQuestion(bot: MatchBot, timeLimitMs: number, currentStreak: number): BotResult {
  const correct   = Math.random() < bot.skill;
  // fast bots answer 15–45% of time into the window; slow bots 50–90%
  const minFrac   = 0.15 + (1 - bot.speed) * 0.35;
  const maxFrac   = minFrac + 0.25 + (1 - bot.speed) * 0.15;
  const frac      = minFrac + Math.random() * (maxFrac - minFrac);
  const timeMs    = Math.min(Math.floor(timeLimitMs * frac), timeLimitMs - 100);
  const timeLeftMs= timeLimitMs - timeMs;
  const points    = calcScore(correct, timeLeftMs, timeLimitMs, correct ? currentStreak : 0);
  return { correct, timeMs, points };
}
