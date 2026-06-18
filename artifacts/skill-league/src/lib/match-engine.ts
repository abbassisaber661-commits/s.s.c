import {
  SPORTS_BANK, CULTURE_BANK, PHILOSOPHY_BANK, RELIGION_BANK, VISUAL_BANK,
  type TriviaQ,
} from './question-bank';

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

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
// Deterministic per-match seed ensures all players receive identical questions.
// Default seed = UTC day × 37 + tier index, so same league+day → same question set.

function seededRng(seed: number) {
  let s = (seed ^ 0x5DEECE66D) >>> 0;
  return (): number => {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0;
    return s / 0x100000000;
  };
}

function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Tier index used to differentiate seeds per league
const TIER_SEED_OFFSET: Record<string, number> = {
  training: 0, coin: 1, pro: 2, champion: 3,
  'division-iii': 0, 'division-ii': 1, professional: 2, champions: 3,
};

// ─── Difficulty ────────────────────────────────────────────────────────────────
// All difficulty logic is centralised here.
// Callers pass a league tier string; this file maps it to an internal level.
//
// Division III (training/coin) → easy   : thinking + attention + light deception
// Division II  (pro)           → medium : precise knowledge required
// Professional (pro-high)      → hard   : exact details, years, stats
// Champions    (champion)      → hard   : maximum deception + precision (same bank, harder mix)

type Difficulty = 'easy' | 'medium' | 'hard';

/** Maps every known league tier to an internal difficulty level. */
const TIER_TO_DIFFICULTY: Record<string, Difficulty> = {
  training:       'easy',
  coin:           'easy',
  'division-iii': 'easy',
  pro:            'medium',
  'division-ii':  'medium',
  professional:   'hard',
  champion:       'hard',
  champions:      'hard',
};

function diffFor(tier: string): Difficulty {
  return TIER_TO_DIFFICULTY[tier] ?? 'easy';
}

// ─── Classic colour / shape data ──────────────────────────────────────────────

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

// ─── Image Puzzle data ────────────────────────────────────────────────────────
//
// Each theme has:
//   emojis       — the "correct" pool used to fill the grid
//   nearFakes    — visually / thematically close distractors (hard tier)
//   farFakes     — obviously-wrong distractors (easy tier)

const IMAGE_THEMES = [
  {
    name: 'Animals',
    emojis:    ['🐶','🐱','🐸','🦊','🐼','🦁','🐨','🐺','🦋'],
    nearFakes: ['🐾','🦮','🐈','🐅','🦝','🦡','🦦','🐻'],
    farFakes:  ['🌸','🍀','🌵','🍄','🌺','🍁'],
  },
  {
    name: 'Space',
    emojis:    ['🌍','🌙','⭐','☀️','🪐','☄️','🚀','🛸','🌠'],
    nearFakes: ['🌑','🌒','🌓','🌔','💫','🌟','✨','🌌'],
    farFakes:  ['🎆','🎇','🌊','⚡','🌪️','💥'],
  },
  {
    name: 'Food',
    emojis:    ['🍎','🍊','🍇','🍌','🍓','🥭','🍑','🍍','🥥'],
    nearFakes: ['🍏','🍋','🍈','🍉','🫐','🍒','🍐','🥝'],
    farFakes:  ['🌮','🍕','🍜','🍱','🍔','🌯'],
  },
  {
    name: 'Sports',
    emojis:    ['⚽','🎾','🏀','🏈','🎯','🏓','🥊','🎿','🏊'],
    nearFakes: ['🏐','🏉','⚾','🎱','🏸','🏒','🥅','🎣'],
    farFakes:  ['🎮','🎲','🃏','🎭','🎪','🎡'],
  },
  {
    name: 'Nature',
    emojis:    ['🌲','🌊','🌋','🏔️','🌅','🌈','🌪️','🌿','🍂'],
    nearFakes: ['🌳','🌴','🌱','🌾','🍃','🍀','🍁','🌻'],
    farFakes:  ['🏠','🚗','📦','🔑','💡','📱'],
  },
];

// ─── Word banks ───────────────────────────────────────────────────────────────
//
// Easy   → 3-letter words, few distractors
// Medium → 4–5-letter words, moderate distractors
// Hard   → 5–7-letter words, heavy distractors

const WORD_BANKS: Record<Difficulty, string[]> = {
  easy: [
    'CAT','DOG','SUN','BIG','RED','RUN','FLY','ICE',
    'HOT','SKY','GEM','MAP','ACE','BIT','CUP','OAK',
    'JAB','ZAP','FOX','HUB',
  ],
  medium: [
    'JUMP','FAST','GLOW','SHIP','FIRE','WIND','RAIN','GAME',
    'BLUE','STAR','MIND','BOLD','QUIZ','FLIP','GRIT','HAZE',
    'IRKS','JOLT','KNOT','LURE','MAZE','NEON','ORBS','PACT',
  ],
  hard: [
    // 5 letters
    'SPARK','BLEND','FROST','CLIMB','BRAVE','STORM','CRISP','GRIND','SWIFT','PLUMB',
    'TROVE','KNACK','QUILL','THROB','SQUAT','FLINT','GLOOM','SNARE','WHIRL','DEPOT',
    // 6 letters
    'BLAZED','CANTER','FLURRY','MYSTIC','TANGLE','UNVEIL','WARDEN','CIPHER','DAGGER','FATHOM',
    // 7 letters
    'PHANTOM','CRYSTAL','DESTINY','THUNDER','QUANTUM','FRACTAL','COURAGE','GALLANT','JOURNEY',
  ],
};

// ─── Logic shape symbols ──────────────────────────────────────────────────────

const LOGIC_SHAPES = [
  { symbol: '★', name: 'Star'     },
  { symbol: '●', name: 'Circle'   },
  { symbol: '■', name: 'Square'   },
  { symbol: '▲', name: 'Triangle' },
  { symbol: '◆', name: 'Diamond'  },
  { symbol: '♥', name: 'Heart'    },
  { symbol: '✚', name: 'Cross'    },
  { symbol: '☽', name: 'Moon'     },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type QType =
  | 'color_pick_name'
  | 'color_tap_color'
  | 'shape_match'
  | 'pattern_next'
  | 'category_pick'
  | 'pair_match'
  | 'image_puzzle'
  | 'word_assembly'
  | 'logic_pattern'
  // ── Knowledge & Deception types (SkillLeague Question System) ──
  | 'sports_trivia'
  | 'culture_trivia'
  | 'philosophy_trivia'
  | 'religion_trivia'
  | 'visual_deception'
  | 'puzzle_assembly';

export interface Option {
  id:    string;
  kind:  'color' | 'shape' | 'emoji' | 'text' | 'number';
  label: string;
  value: string;
}

export interface DisplayData {
  kind:        'color_block' | 'shape_char' | 'sequence' | 'emoji_prompt' | 'text_prompt' | 'image_grid' | 'logic_eq' | 'trivia';
  value:       string;
  extra?:      string[];
  label?:      string;
  color?:      string;
  gridEmojis?: string[];
  gridSize?:   number;
  gridCols?:   number;
  logicLines?: string[];
}

export interface Question {
  id:           string;
  type:         QType;
  timeLimitMs:  number;
  prompt:       string;
  display:      DisplayData;
  options:      Option[];
  correctIndex: number;
  wordTarget?:  string;
  letterPool?:  string[];
  /** The difficulty level that was used to generate this question (for display). */
  difficulty?:  Difficulty;
}

// ─── Classic question generators ──────────────────────────────────────────────

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
  const patColors = pickN(COLORS, letters.length);
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

const CLASSIC_GENERATORS = [
  genColorPickName, genColorTapColor, genShapeMatch,
  genPatternNext, genCategoryPick, genPairMatch,
];

// ─── Trivia question generator ────────────────────────────────────────────────
//
// Picks one question from a TriviaQ bank, shuffles its options using the seeded
// RNG so every player in the same match sees options in the same order.

function genTriviaQ(
  q:      TriviaQ,
  type:   QType,
  label:  string,
  color:  string,
  diff:   Difficulty,
  rng:    () => number,
): Question {
  const shuffledOpts = seededShuffle([...q.opts], rng);
  const correctIdx   = shuffledOpts.indexOf(q.correct);

  // Determine option kind: visual_deception emojis → 'emoji', everything else → 'text'
  const optKind: Option['kind'] = type === 'visual_deception' ? 'emoji' : 'text';

  // Time limits scale with difficulty (knowledge questions need more reading time)
  const timeLimitMs =
    diff === 'easy'   ? 14000 :
    diff === 'medium' ? 12000 : 10000;

  return {
    id: nextId(),
    type,
    timeLimitMs,
    difficulty: diff,
    // For trivia, the question text IS the prompt (rendered prominently in the 'trivia' display)
    prompt: q.q,
    display: {
      kind:  'trivia',
      value: q.q,
      label,
      color,
    },
    options: shuffledOpts.map((o, i) => ({
      id:    `tq_${i}`,
      kind:  optKind,
      label: o,
      value: o,
    })),
    correctIndex: correctIdx,
  };
}

// ─── Puzzle Assembly ──────────────────────────────────────────────────────────
//
// Extends image_puzzle with larger emoji grids scaled to league difficulty:
//   easy   (Division III)  → 3×3 grid,  9 cells,  2 missing → ~7-9 visible pieces
//   medium (Division II)   → 4×3 grid, 12 cells,  2 missing → ~10-12 visible pieces
//   hard   (Professional)  → 4×4 grid, 16 cells,  3 missing → ~13-16 visible pieces
//   hard++ (Champions)     → 5×4 grid, 20 cells,  4 missing → ~16-20 visible pieces
//
// The "missing" cell is the puzzle challenge — the player picks the correct emoji.

const PUZZLE_THEMES_EXTENDED = [
  { name: 'Animals',  emojis: ['🐶','🐱','🐸','🦊','🐼','🦁','🐨','🐺','🦋','🐘','🦒','🦓','🦈','🐬','🦅','🦜','🐊','🦕','🦔','🦡'], nearFakes: ['🐾','🦮','🐈','🐅','🦝','🦡','🦦','🐻','🐆','🐒'], farFakes: ['🌸','🍀','🌵','🍄','🌺','🍁'] },
  { name: 'Space',    emojis: ['🌍','🌙','⭐','☀️','🪐','☄️','🚀','🛸','🌠','🌌','🔭','🛰️','💫','🌑','🌒','🌓','🌔','🌕','🌖','🌗'], nearFakes: ['🌑','💫','🌟','✨','🎆','🎇'], farFakes: ['🌊','⚡','🌪️','💥','🎮','📱'] },
  { name: 'Food',     emojis: ['🍎','🍊','🍇','🍌','🍓','🥭','🍑','🍍','🥥','🍒','🍋','🫐','🍈','🥝','🍉','🍏','🥑','🥕','🌽','🫒'], nearFakes: ['🍏','🍋','🍈','🍉','🫐','🍒','🍐','🥝'], farFakes: ['🌮','🍕','🍜','🍱','🍔','🌯'] },
  { name: 'Sports',   emojis: ['⚽','🎾','🏀','🏈','🎯','🏓','🥊','🎿','🏊','🏋️','🤺','🏇','🥇','🏒','🎱','🏸','🥅','🎣','🥋','🎽'], nearFakes: ['🏐','🏉','⚾','🎱','🏸','🏒','🥅','🎣'], farFakes: ['🎮','🎲','🃏','🎭','🎪','🎡'] },
  { name: 'Nature',   emojis: ['🌲','🌊','🌋','🏔️','🌅','🌈','🌪️','🌿','🍂','🌺','🌸','🌻','🌞','🌝','🍃','🍀','🌱','🌾','🌴','🌳'], nearFakes: ['🌳','🌴','🌱','🌾','🍃','🍀','🍁','🌻'], farFakes: ['🏠','🚗','📦','🔑','💡','📱'] },
];

function genPuzzleAssembly(diff: Difficulty, isChampion = false): Question {
  const theme = PUZZLE_THEMES_EXTENDED[Math.floor(Math.random() * PUZZLE_THEMES_EXTENDED.length)];

  // Grid dimensions and visible-piece targets per tier
  const [cols, rows] =
    isChampion  ? [5, 4] :
    diff === 'hard'   ? [4, 4] :
    diff === 'medium' ? [4, 3] : [3, 3];
  const totalCells = cols * rows;
  const missingCount = isChampion ? 4 : diff === 'hard' ? 3 : 2;

  // Pool the emoji set (may need to repeat if totalCells > theme.emojis.length)
  const pool: string[] = [];
  while (pool.length < totalCells) {
    pool.push(...shuffle([...theme.emojis]));
  }
  const cells = pool.slice(0, totalCells);

  // Pick ONE missing cell for the question (always the last missing one)
  const missingIdx = Math.floor(Math.random() * totalCells);
  const correct    = cells[missingIdx];

  // Mark all missing cells (others shown as blank, only missingIdx is the question)
  const otherMissing: number[] = [];
  while (otherMissing.length < missingCount - 1) {
    const idx = Math.floor(Math.random() * totalCells);
    if (idx !== missingIdx && !otherMissing.includes(idx)) otherMissing.push(idx);
  }

  const gridEmojis = cells.map((e, i) =>
    i === missingIdx    ? '' :
    otherMissing.includes(i) ? '？' : e,
  );

  // Option pool
  const optionCount = diff === 'easy' ? 4 : diff === 'medium' ? 5 : isChampion ? 8 : 7;
  const fakePool =
    diff === 'hard' || isChampion
      ? shuffle([...theme.nearFakes, ...theme.emojis.filter(e => !cells.includes(e))])
      : shuffle([...theme.farFakes]);
  const fakes      = fakePool.slice(0, optionCount - 1);
  const allOptions = shuffle([correct, ...fakes]);
  const correctIdx = allOptions.indexOf(correct);

  const timeLimitMs =
    isChampion  ? 5000 :
    diff === 'hard'   ? 6000 :
    diff === 'medium' ? 8000 : 10000;

  return {
    id: nextId(), type: 'puzzle_assembly', timeLimitMs, difficulty: diff,
    prompt: `Find the missing piece — ${theme.name} (${cols}×${rows})`,
    display: { kind: 'image_grid', value: theme.name, gridEmojis, gridSize: cols, gridCols: cols },
    options: allOptions.map((e, i) => ({ id: `pa_${i}`, kind: 'emoji', label: e, value: e })),
    correctIndex: correctIdx,
  };
}

// ─── Image Puzzle ─────────────────────────────────────────────────────────────
//
// Difficulty determines:
//   • number of option choices (easy 4 / medium 5 / hard 7-8)
//   • which fake pool to use (easy: farFakes — obviously wrong;
//                             hard: nearFakes — visually similar / same theme)
//   • time limit

function genImagePuzzle(diff: Difficulty): Question {
  const theme = IMAGE_THEMES[Math.floor(Math.random() * IMAGE_THEMES.length)];
  const cells = shuffle([...theme.emojis]).slice(0, 9);
  const missingIdx = Math.floor(Math.random() * 9);
  const correct    = cells[missingIdx];

  const gridEmojis = cells.map((e, i) => (i === missingIdx ? '' : e));

  // Option count & distractor pool by difficulty
  const optionCount =
    diff === 'easy'   ? 4 :
    diff === 'medium' ? 5 : 7;

  // Hard uses near-theme fakes; easy/medium use obvious far fakes + some near
  const fakePool =
    diff === 'hard'
      ? shuffle([...theme.nearFakes, ...theme.emojis.filter(e => !cells.includes(e))])
      : diff === 'medium'
      ? shuffle([...theme.nearFakes.slice(0, 2), ...theme.farFakes])
      : shuffle([...theme.farFakes]);

  const fakes      = fakePool.slice(0, optionCount - 1);
  const allOptions = shuffle([correct, ...fakes]);
  const correctIdx = allOptions.indexOf(correct);

  const timeLimitMs =
    diff === 'easy'   ? 7000 :
    diff === 'medium' ? 5500 : 4500;

  return {
    id: nextId(), type: 'image_puzzle', timeLimitMs, difficulty: diff,
    prompt: `Complete the ${theme.name} grid`,
    display: { kind: 'image_grid', value: theme.name, gridEmojis, gridSize: 3 },
    options: allOptions.map((e, i) => ({ id: `img_${i}`, kind: 'emoji', label: e, value: e })),
    correctIndex: correctIdx,
  };
}

// ─── Word Assembly ────────────────────────────────────────────────────────────
//
// Difficulty determines:
//   • word length  (easy 3 / medium 4-5 / hard 5-7)
//   • extra fake letters added to the tile pool (easy 2 / medium 3 / hard 5)
//   • time limit

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function genWordAssembly(diff: Difficulty): Question {
  const bank = WORD_BANKS[diff];
  const word = bank[Math.floor(Math.random() * bank.length)];
  const letters = word.split('');
  const wordLetterSet = new Set(letters);

  const extraCount = diff === 'easy' ? 2 : diff === 'medium' ? 3 : 5;
  const extras: string[] = [];
  let attempts = 0;
  while (extras.length < extraCount && attempts < 200) {
    attempts++;
    const c = ALPHABET[Math.floor(Math.random() * 26)];
    if (!wordLetterSet.has(c) && !extras.includes(c)) extras.push(c);
  }

  const letterPool = shuffle([...letters, ...extras]);
  const timeLimitMs = diff === 'easy' ? 9000 : diff === 'medium' ? 7000 : 6000;

  return {
    id: nextId(), type: 'word_assembly', timeLimitMs, difficulty: diff,
    prompt: 'Build the hidden word',
    display: {
      kind: 'text_prompt',
      value: `${word.length} letters`,
      label: 'Assemble the hidden word:',
      color: '#B44FFF',
    },
    options: letterPool.map((l, i) => ({ id: `letter_${i}`, kind: 'text', label: l, value: l })),
    correctIndex: -1,
    wordTarget: word,
    letterPool,
  };
}

// ─── Logic Pattern ────────────────────────────────────────────────────────────
//
// Difficulty determines:
//   • variant mix   (easy: arithmetic only; medium: arith + geo + 2-var shape;
//                    hard: geo + 3-var shape + quadratic)
//   • number range  (larger for higher tiers)
//   • distractor quality (harder to dismiss)

// ── Arithmetic sequence ───────────────────────────────────────────────────────
function genArithSeq(diff: Difficulty): Question {
  const start  = Math.floor(Math.random() * (diff === 'easy' ? 8 : diff === 'medium' ? 20 : 35)) + 1;
  const step   = Math.floor(Math.random() * (diff === 'easy' ? 3 : diff === 'medium' ? 8 : 14)) + 1;
  const seq    = [start, start + step, start + 2 * step, start + 3 * step];
  const answer = start + 4 * step;

  const wrongs = shuffle([
    answer + 1, answer - 1, answer + step, answer - step,
    answer + 2, answer + Math.floor(step / 2) + 1,
  ].filter(v => v !== answer && v > 0));

  const allOptions = shuffle([answer, ...wrongs.slice(0, 3)]);
  const correctIdx = allOptions.indexOf(answer);

  return {
    id: nextId(), type: 'logic_pattern',
    timeLimitMs: diff === 'easy' ? 7000 : diff === 'medium' ? 6000 : 5000,
    difficulty: diff,
    prompt: 'What comes next?',
    display: {
      kind: 'logic_eq', value: seq.join(', ') + ', ?',
      logicLines: [seq.join(', ') + ', ?'],
      label: 'Number Sequence', color: '#3AB4FF',
    },
    options: allOptions.map((n, i) => ({ id: `num_${i}`, kind: 'number', label: String(n), value: String(n) })),
    correctIndex: correctIdx,
  };
}

// ── Quadratic sequence (hard only: differences increase by a fixed amount) ────
function genQuadraticSeq(): Question {
  const a  = Math.floor(Math.random() * 3) + 1;  // 2nd-order coeff
  const b  = Math.floor(Math.random() * 5) + 1;
  const c  = Math.floor(Math.random() * 5);
  const f  = (n: number) => a * n * n + b * n + c;
  const seq = [f(1), f(2), f(3), f(4), f(5)];
  const answer = f(6);

  const wrongs = shuffle([
    answer + a, answer - a, answer + b, answer + 2 * a, answer - b,
  ].filter(v => v !== answer && v > 0));

  const allOptions = shuffle([answer, ...wrongs.slice(0, 3)]);
  const correctIdx = allOptions.indexOf(answer);

  return {
    id: nextId(), type: 'logic_pattern', timeLimitMs: 5000, difficulty: 'hard',
    prompt: 'What comes next?',
    display: {
      kind: 'logic_eq', value: seq.join(', ') + ', ?',
      logicLines: ['2nd-order pattern', seq.join(', ') + ', ?'],
      label: 'Advanced Sequence', color: '#FF8C42',
    },
    options: allOptions.map((n, i) => ({ id: `qs_${i}`, kind: 'number', label: String(n), value: String(n) })),
    correctIndex: correctIdx,
  };
}

// ── Geometric (×N) sequence ───────────────────────────────────────────────────
function genGeoSeq(diff: Difficulty): Question {
  const ratioPool = diff === 'easy' ? [2, 3] : diff === 'medium' ? [2, 3, 4] : [3, 4, 5];
  const ratio     = ratioPool[Math.floor(Math.random() * ratioPool.length)];
  const start     = Math.floor(Math.random() * (diff === 'easy' ? 3 : 5)) + 1;
  const seq       = [start, start * ratio, start * ratio ** 2, start * ratio ** 3];
  const answer    = start * ratio ** 4;

  const wrongs = shuffle([
    answer + ratio, answer - ratio, answer * 2,
    Math.floor(answer / 2), answer + start, answer - start,
  ].filter(v => v !== answer && v > 0 && Number.isFinite(v)));

  const allOptions = shuffle([answer, ...wrongs.slice(0, 3)]);
  const correctIdx = allOptions.indexOf(answer);

  return {
    id: nextId(), type: 'logic_pattern',
    timeLimitMs: diff === 'easy' ? 8000 : diff === 'medium' ? 6000 : 5000,
    difficulty: diff,
    prompt: 'What comes next?',
    display: {
      kind: 'logic_eq', value: seq.join(', ') + ', ?',
      logicLines: [`×${ratio} pattern`, seq.join(', ') + ', ?'],
      label: 'Multiply Sequence', color: '#2EE87A',
    },
    options: allOptions.map((n, i) => ({ id: `geo_${i}`, kind: 'number', label: String(n), value: String(n) })),
    correctIndex: correctIdx,
  };
}

// ── Shape-value equation (2-variable for easy/medium, 3-variable for hard) ───
function genShapeEq(diff: Difficulty): Question {
  const useThreeVars = diff === 'hard' && Math.random() > 0.4;
  const shapes = pickN(LOGIC_SHAPES, useThreeVars ? 3 : 2);
  const maxVal  = diff === 'easy' ? 5 : diff === 'medium' ? 9 : 13;
  const vals    = shapes.map(() => Math.floor(Math.random() * maxVal) + 1);
  const opsPool = diff === 'easy' ? ['+'] : diff === 'medium' ? ['+', '-'] : ['+', '-', '×'];

  if (!useThreeVars) {
    const [s1, s2]  = shapes;
    const [v1, v2]  = vals;
    const op        = opsPool[Math.floor(Math.random() * opsPool.length)];
    const answer    = op === '+' ? v1 + v2 : op === '-' ? Math.abs(v1 - v2) : v1 * v2;
    const wrongs    = shuffle([answer + 1, answer - 1, answer + 2, answer - 2, v1 * v2, v1 + v2]
      .filter(v => v !== answer && v > 0));
    const allOptions = shuffle([answer, ...wrongs.slice(0, 3)]);
    const correctIdx = allOptions.indexOf(answer);
    return {
      id: nextId(), type: 'logic_pattern',
      timeLimitMs: diff === 'easy' ? 7000 : diff === 'medium' ? 6000 : 5000,
      difficulty: diff,
      prompt: 'Solve the equation',
      display: {
        kind: 'logic_eq', value: `${s1.symbol} ${op} ${s2.symbol} = ?`,
        logicLines: [`${s1.symbol} = ${v1}`, `${s2.symbol} = ${v2}`, `${s1.symbol} ${op} ${s2.symbol} = ?`],
        label: 'Shape Values', color: '#B44FFF',
      },
      options: allOptions.map((n, i) => ({ id: `ans_${i}`, kind: 'number', label: String(n), value: String(n) })),
      correctIndex: correctIdx,
    };
  }

  // Three-variable version (hard)
  const [s1, s2, s3] = shapes;
  const [v1, v2, v3] = vals;
  const op1 = opsPool[Math.floor(Math.random() * opsPool.length)];
  const op2 = opsPool[Math.floor(Math.random() * opsPool.length)];
  const partial = op1 === '+' ? v1 + v2 : op1 === '-' ? Math.abs(v1 - v2) : v1 * v2;
  const answer  = op2 === '+' ? partial + v3 : op2 === '-' ? Math.abs(partial - v3) : partial * v3;
  const wrongs  = shuffle([answer + 1, answer - 1, answer + 2, answer - 2, answer + v3, partial]
    .filter(v => v !== answer && v > 0));
  const allOptions = shuffle([answer, ...wrongs.slice(0, 3)]);
  const correctIdx = allOptions.indexOf(answer);

  return {
    id: nextId(), type: 'logic_pattern', timeLimitMs: 5000, difficulty: 'hard',
    prompt: 'Solve the equation',
    display: {
      kind: 'logic_eq', value: `${s1.symbol} ${op1} ${s2.symbol} ${op2} ${s3.symbol} = ?`,
      logicLines: [
        `${s1.symbol} = ${v1},  ${s2.symbol} = ${v2},  ${s3.symbol} = ${v3}`,
        `${s1.symbol} ${op1} ${s2.symbol} ${op2} ${s3.symbol} = ?`,
      ],
      label: '3-Variable Puzzle', color: '#FF3A5E',
    },
    options: allOptions.map((n, i) => ({ id: `ans3_${i}`, kind: 'number', label: String(n), value: String(n) })),
    correctIndex: correctIdx,
  };
}

// ── Logic pattern dispatcher ──────────────────────────────────────────────────
function genLogicPattern(diff: Difficulty): Question {
  type Variant = 'arith' | 'geo' | 'shape' | 'quadratic';
  const pool: Variant[] =
    diff === 'easy'   ? ['arith', 'arith', 'shape'] :
    diff === 'medium' ? ['arith', 'geo', 'shape', 'shape'] :
                        ['geo', 'shape', 'shape', 'quadratic'];

  const variant = pool[Math.floor(Math.random() * pool.length)];
  if (variant === 'arith')     return genArithSeq(diff);
  if (variant === 'geo')       return genGeoSeq(diff);
  if (variant === 'quadratic') return genQuadraticSeq();
  return genShapeEq(diff);
}

// ─── Unified question-set generator ──────────────────────────────────────────
//
// Single entry point for all leagues and match modes.
// All players in the SAME match receive IDENTICAL questions in IDENTICAL order
// because the seeded RNG is derived from (UTC day + tier offset).
//
//   tier       : 'training' | 'coin' | 'pro' | 'champion' (and division aliases)
//   count      : total questions per match (default 10)
//   matchSeed  : optional override seed (e.g. from server match ID)
//   timeFactor : multiplier on all time limits (≤1 = faster)
//
// Question composition per match (10 Qs):
//   4 knowledge (sports / culture / philosophy / religion — rotated by seed)
//   1 visual deception
//   1 puzzle assembly  (grid size varies by tier)
//   1 word assembly
//   1 logic pattern
//   2 classic (color / shape / category / pair / pattern)

export function generateMatchQuestions(
  count       = 10,
  tier        = 'training',
  timeFactor  = 1,
  matchSeed?: number,
): Question[] {
  const diff = diffFor(tier);
  const isChampion = tier === 'champion' || tier === 'champions';

  // ── Seeded RNG — same seed = same questions for all players ────────────────
  const utcDay   = Math.floor(Date.now() / 86_400_000);
  const tierOff  = TIER_SEED_OFFSET[tier] ?? 0;
  const seed     = matchSeed ?? (utcDay * 37 + tierOff * 1000003);
  const rng      = seededRng(seed);

  // ── Pick trivia questions from each bank (no repeats within a match) ───────
  // Shuffle each bank with seeded RNG then take the first N
  const sportPool  = seededShuffle([...SPORTS_BANK[diff]],      rng);
  const cultPool   = seededShuffle([...CULTURE_BANK[diff]],     rng);
  const philPool   = seededShuffle([...PHILOSOPHY_BANK[diff]],  rng);
  const relPool    = seededShuffle([...RELIGION_BANK[diff]],    rng);
  const visPool    = seededShuffle([...VISUAL_BANK[diff]],      rng);

  // One question from each knowledge category (4 total) — no repeats guaranteed
  const knowledgeQs: Question[] = [
    genTriviaQ(sportPool[0],  'sports_trivia',     'Sports',      '#3AB4FF', diff, rng),
    genTriviaQ(cultPool[0],   'culture_trivia',    'Culture',     '#2EE87A', diff, rng),
    genTriviaQ(philPool[0],   'philosophy_trivia', 'Philosophy',  '#B44FFF', diff, rng),
    genTriviaQ(relPool[0],    'religion_trivia',   'Religion',    '#FFD93D', diff, rng),
  ];

  // If count > 10 or champions tier, add second round of knowledge
  const extraKnowledge: Question[] = count > 10 || isChampion ? [
    genTriviaQ(sportPool[1] ?? sportPool[0],  'sports_trivia',    'Sports',     '#3AB4FF', diff, rng),
    genTriviaQ(cultPool[1]  ?? cultPool[0],   'culture_trivia',   'Culture',    '#2EE87A', diff, rng),
  ] : [];

  // ── Visual deception ───────────────────────────────────────────────────────
  const visualQs: Question[] = [
    genTriviaQ(visPool[0], 'visual_deception', 'Visual', '#FF8C42', diff, rng),
  ];

  // ── Puzzle assembly (grid size by tier) ────────────────────────────────────
  const puzzleQs: Question[] = [
    genPuzzleAssembly(diff, isChampion),
  ];

  // ── Classic puzzle types ───────────────────────────────────────────────────
  const classicPuzzleQs: Question[] = [
    genWordAssembly(diff),
    genLogicPattern(diff),
  ];

  // ── Fill remaining slots with classic generators ───────────────────────────
  const classicFill = shuffle([...CLASSIC_GENERATORS]).map(g => g());

  // ── Assemble and trim to count ─────────────────────────────────────────────
  const structured = [
    ...knowledgeQs,
    ...extraKnowledge,
    ...visualQs,
    ...puzzleQs,
    ...classicPuzzleQs,
    ...classicFill,
  ].slice(0, count);

  // If structured is short (shouldn't happen), top up with classics
  while (structured.length < count) {
    const g = CLASSIC_GENERATORS[structured.length % CLASSIC_GENERATORS.length];
    structured.push(g());
  }

  // ── Final shuffle — seeded, so all players get same order ──────────────────
  const final = seededShuffle(structured, rng);

  return timeFactor === 1
    ? final
    : final.map(q => ({ ...q, timeLimitMs: Math.round(q.timeLimitMs * timeFactor) }));
}

// ─── Scoring ──────────────────────────────────────────────────────────────────
//
// SkillLeague scoring rules:
//   Correct answer = 3 points
//   Wrong answer   = 0 points
//   Tiebreaker     = total match time (faster total time wins)
//
// The `timeLeftMs` and `timeLimitMs` params are kept in the signature for
// tiebreaker tracking — the caller stores elapsed time separately.

export function calcScore(correct: boolean, _timeLeftMs: number, _timeLimitMs: number, _streak: number): number {
  return correct ? 3 : 0;
}

// ─── Bots ─────────────────────────────────────────────────────────────────────

export interface MatchBot {
  id:     string;
  name:   string;
  avatar: string;
  skill:  number;
  speed:  number;
}

/** Full pool of 19 bots — sliced to match lobby size per tier. */
export const MATCH_BOTS: MatchBot[] = [
  { id: 'bot_nova',    name: 'Nova_X',     avatar: '🤖', skill: 0.94, speed: 0.90 },
  { id: 'bot_blaze',   name: 'BlazeFire',  avatar: '🔥', skill: 0.78, speed: 0.72 },
  { id: 'bot_star',    name: 'StarQ',      avatar: '⭐', skill: 0.62, speed: 0.55 },
  { id: 'bot_kiwi',    name: 'KiwiBot',    avatar: '🥝', skill: 0.45, speed: 0.38 },
  { id: 'bot_cobra',   name: 'CobraK',     avatar: '🐍', skill: 0.88, speed: 0.85 },
  { id: 'bot_wolf',    name: 'ByteWolf',   avatar: '🐺', skill: 0.82, speed: 0.78 },
  { id: 'bot_sky',     name: 'SkyKing',    avatar: '🦅', skill: 0.75, speed: 0.68 },
  { id: 'bot_fast',    name: 'FastHand',   avatar: '⚡', skill: 0.70, speed: 0.82 },
  { id: 'bot_pi',      name: 'PiMaster',   avatar: '🔢', skill: 0.66, speed: 0.60 },
  { id: 'bot_zeta',    name: 'ZetaBot',    avatar: '🔮', skill: 0.58, speed: 0.52 },
  { id: 'bot_neon',    name: 'NeonPulse',  avatar: '💜', skill: 0.55, speed: 0.50 },
  { id: 'bot_quant',   name: 'QuantumK',   avatar: '🌀', skill: 0.52, speed: 0.48 },
  { id: 'bot_swift',   name: 'SwiftOne',   avatar: '🐇', skill: 0.50, speed: 0.75 },
  { id: 'bot_brain',   name: 'BrainWave',  avatar: '🧠', skill: 0.90, speed: 0.65 },
  { id: 'bot_top',     name: 'TopTier',    avatar: '🏆', skill: 0.48, speed: 0.43 },
  { id: 'bot_grid',    name: 'GridHawk',   avatar: '🦉', skill: 0.43, speed: 0.40 },
  { id: 'bot_data',    name: 'DataDash',   avatar: '📊', skill: 0.40, speed: 0.60 },
  { id: 'bot_iron',    name: 'IronFox',    avatar: '🦊', skill: 0.38, speed: 0.35 },
  { id: 'bot_code',    name: 'CodeStrike', avatar: '💻', skill: 0.35, speed: 0.32 },
];

/**
 * Returns the bot array for the given match tier.
 *  div3 / div2  → 19 bots (20-player lobby)
 *  pro / champions → 7 bots (8-player lobby)
 */
export function getMatchBots(tier: string): MatchBot[] {
  const isLargeLobby = tier === 'div3' || tier === 'div2' || tier === 'training' || tier === 'coin';
  return isLargeLobby ? MATCH_BOTS.slice(0, 19) : MATCH_BOTS.slice(0, 7);
}

export interface BotResult {
  correct: boolean;
  timeMs:  number;
  points:  number;
}

export function simulateBotQuestion(bot: MatchBot, timeLimitMs: number, currentStreak: number): BotResult {
  const correct    = Math.random() < bot.skill;
  const minFrac    = 0.15 + (1 - bot.speed) * 0.35;
  const maxFrac    = minFrac + 0.25 + (1 - bot.speed) * 0.15;
  const frac       = minFrac + Math.random() * (maxFrac - minFrac);
  const timeMs     = Math.min(Math.floor(timeLimitMs * frac), timeLimitMs - 100);
  const timeLeftMs = timeLimitMs - timeMs;
  const points     = calcScore(correct, timeLeftMs, timeLimitMs, correct ? currentStreak : 0);
  return { correct, timeMs, points };
}
