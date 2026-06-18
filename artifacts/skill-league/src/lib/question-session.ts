// ─── Phase B: Match Session Manager ──────────────────────────────────────────
// Generates and manages locked question sets for competitive matches.
//
// Rules enforced:
//  • One question set per match (locked by matchId + division)
//  • All players in the same match receive the SAME questions
//  • Question order is randomised PER PLAYER (different sequence, same set)
//  • No question repeats within a single match session
//  • Scoring: correct = 3 pts, wrong = 0 pts
//  • Anti-repetition: last 3 matches are fully excluded (fresh first, seen as fallback)
//  • VA anti-pattern: no duplicate display key within a match; theme diversity enforced
//  • PZ hard guarantee: puzzle always spawns, with cross-difficulty fallback

import type { Language } from './i18n';
import {
  QUESTION_POOL,
  getQuestionText,
  getQuestionOptions,
  type PoolQuestion,
  type DivisionTier,
  type KnowledgeQuestion,
  type VisualAttentionQuestion,
  type PuzzleAssemblyQuestion,
} from './question-pool';

// ─── Scoring constants ────────────────────────────────────────────────────────

/** Points awarded for a correct answer */
export const CORRECT_POINTS   = 3;

/** Points awarded for a wrong answer */
export const WRONG_POINTS     = 0;

/** Default number of questions per match */
export const QUESTIONS_PER_MATCH = 10;

// ─── Division → difficulty mapping ───────────────────────────────────────────

const DIVISION_DIFFS: Record<DivisionTier, number[]> = {
  div3:      [1],
  div2:      [2],
  pro:       [3],
  champions: [3, 4],
};

// ─── How many puzzle questions to guarantee per division ──────────────────────

const PUZZLE_TARGET: Record<DivisionTier, number> = {
  div3:      1,
  div2:      2,
  pro:       3,
  champions: 3,
};

// ─── Per-division category caps ───────────────────────────────────────────────

const CATEGORY_CAPS: Record<DivisionTier, Record<string, number>> = {
  div3: {
    sports:           2,
    culture:          2,
    geography:        1,
    history:          1,
    philosophy:       1,
    religious:        1,
    famous_people:    1,
    visual_attention: 2,
    puzzle_assembly:  1,
  },
  div2: {
    sports:           2,
    culture:          2,
    geography:        1,
    history:          1,
    philosophy:       1,
    religious:        1,
    famous_people:    1,
    visual_attention: 2,
    puzzle_assembly:  2,
  },
  pro: {
    sports:           1,
    culture:          1,
    geography:        1,
    history:          1,
    philosophy:       1,
    religious:        1,
    famous_people:    1,
    visual_attention: 3,
    puzzle_assembly:  3,
  },
  champions: {
    sports:           1,
    culture:          1,
    geography:        1,
    history:          1,
    philosophy:       1,
    religious:        1,
    famous_people:    1,
    visual_attention: 3,
    puzzle_assembly:  3,
  },
};

// ─── Seeded random number generator (LCG) ────────────────────────────────────

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return (): number => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967295;
  };
}

/** Convert a string to a stable numeric hash */
function hashStr(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Seeded Fisher-Yates shuffle — does NOT mutate the original array */
function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── VA anti-pattern helpers ──────────────────────────────────────────────────
// Prevent the same display emoji or same scenario theme from appearing twice
// in a single match session.

/** Primary display token — first emoji token in the display string */
function getVaDisplayKey(q: VisualAttentionQuestion): string {
  return q.display.split(/\s+/)[0] ?? q.display;
}

/** Detect broad theme of a VA question from its English instruction */
function detectVaTheme(q: VisualAttentionQuestion): string {
  const t = q.instr.en.toLowerCase();
  if (/flag|country/.test(t))                                              return 'flags';
  if (/car|truck|bus|train|plane|ship|boat|ambulance|fire|taxi|rocket|vehicle/.test(t)) return 'vehicles';
  if (/dog|cat|lion|tiger|bear|rabbit|bird|fish|horse|elephant|monkey|snake|cow|wolf|fox|ant|bee|animal/.test(t)) return 'animals';
  if (/pizza|burger|cake|fruit|apple|banana|food|eat|rice|bread|chicken|sushi|taco|ice|coffee|drink|cook/.test(t)) return 'food';
  if (/phone|laptop|computer|camera|keyboard|robot|battery|plug|bulb|clock|watch|screen|printer|electronic/.test(t)) return 'electronics';
  if (/star|moon|sun|planet|earth|fire|water|snow|rain|lightning|cloud|nature/.test(t)) return 'nature';
  if (/medal|trophy|sport|soccer|football|basketball|tennis|swim|run|boxing|ski|surf|bowl|golf/.test(t)) return 'sports';
  if (/castle|tower|temple|building|house|bridge|mosque|church|statue|landmark/.test(t)) return 'buildings';
  if (/flower|plant|tree|leaf|cactus|rose|tulip|seed|palm/.test(t))       return 'plants';
  if (/count|how many/.test(t))                                            return 'counting';
  if (/scissor|wrench|tool|hammer|key|lock|hook|nail/.test(t))            return 'tools';
  return 'objects';
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatchSession {
  matchId:        string;
  division:       DivisionTier;
  questions:      PoolQuestion[];
  totalQuestions: number;
  seed:           number;
}

export interface PlayerSession {
  matchId:         string;
  division:        DivisionTier;
  totalQuestions:  number;
  orderedQuestions: PoolQuestion[];
}

export interface DisplayQuestion {
  source:     PoolQuestion;
  text:       string;
  options:    string[];
  timeLimitMs: number;
  timerModel:  'countdown' | 'puzzle';
  correctIndex: 0 | 1 | 2 | 3;
  category:   string;
  difficulty: number;
}

// ─── Session generation ───────────────────────────────────────────────────────

/**
 * Generate a locked question set for a competitive match.
 *
 * Pipeline (strict order):
 *   1. Force PUZZLE_TARGET puzzles  (hard guarantee, cross-difficulty fallback)
 *   2. Fill VA up to division cap   (display-key dedup + theme diversity enforced)
 *   3. Fill MCQ slots               (per-category caps)
 *   4. Last-resort fill             (no category limits, no repeats)
 *
 * Anti-repetition:
 *   • excludeIds marks questions seen in recent matches — fresh questions
 *     are always preferred; seen ones serve as fallback only.
 *   • VA within-match: no two questions share the same primary display emoji.
 *   • VA within-match: theme diversity enforced (prefer different themes).
 *   • PZ: hard guarantee — always spawns even when all PZ are "seen".
 *     If the division's PZ pool is exhausted, pulls from adjacent difficulties.
 */
export function generateMatchSession(
  matchId:    string,
  division:   DivisionTier,
  excludeIds?: ReadonlySet<string>,
): MatchSession {
  const seed = hashStr(`${matchId}::${division}::session`);
  const rng  = lcg(seed);

  const diffs = DIVISION_DIFFS[division];
  const caps  = CATEGORY_CAPS[division];

  // 1. Filter pool to eligible difficulty
  const allEligible = QUESTION_POOL.filter(q =>
    q.difficulties.some(d => diffs.includes(d))
  );

  // 2. Separate question groups
  const puzzleAll = allEligible.filter(q => q.category === 'puzzle_assembly');
  const vaAll     = allEligible.filter(q => q.category === 'visual_attention');
  const mcqAll    = allEligible.filter(q =>
    q.category !== 'puzzle_assembly' && q.category !== 'visual_attention'
  );

  // 3. Cross-difficulty PZ fallback pool — used only when division PZ pool is
  //    exhausted. Picks from all difficulties so puzzles ALWAYS appear.
  const puzzleFallbackAll = QUESTION_POOL.filter(q => q.category === 'puzzle_assembly');

  // 4. Split each group into fresh (not yet seen) vs seen
  const split = <T extends PoolQuestion>(arr: T[]) => ({
    fresh: excludeIds ? arr.filter(q => !excludeIds.has(q.id)) : arr,
    seen:  excludeIds ? arr.filter(q =>  excludeIds.has(q.id)) : ([] as T[]),
  });

  const pzSplit  = split(puzzleAll);
  const vaSplit  = split(vaAll);
  const mcqSplit = split(mcqAll);
  const pzFbSplit = split(puzzleFallbackAll);

  // 5. Seeded-shuffle each group: fresh first, seen as fallback
  const sPuzzle = seededShuffle(
    [...pzSplit.fresh, ...seededShuffle(pzSplit.seen, rng)], rng,
  );
  // PZ cross-difficulty fallback (all PZ not already chosen)
  const sPuzzleFallback = seededShuffle(
    [...pzFbSplit.fresh, ...seededShuffle(pzFbSplit.seen, rng)], rng,
  );
  const sVA = seededShuffle(
    [...vaSplit.fresh, ...seededShuffle(vaSplit.seen, rng)], rng,
  );
  const sMCQ = seededShuffle(
    [...mcqSplit.fresh, ...seededShuffle(mcqSplit.seen, rng)], rng,
  );

  // 6. STEP 1 — Pre-place exactly PUZZLE_TARGET puzzles (hard guarantee)
  const selected: PoolQuestion[] = [];
  const categoryCount: Record<string, number> = {};
  const selectedIds = new Set<string>();
  const puzzleTarget = PUZZLE_TARGET[division];

  // Primary: use division-eligible PZ pool
  for (const q of sPuzzle) {
    if (selected.length >= puzzleTarget) break;
    if (!selectedIds.has(q.id)) {
      selected.push(q);
      selectedIds.add(q.id);
      categoryCount['puzzle_assembly'] = (categoryCount['puzzle_assembly'] ?? 0) + 1;
    }
  }

  // Hard fallback: if still short, pull from ANY difficulty PZ pool
  if ((categoryCount['puzzle_assembly'] ?? 0) < puzzleTarget) {
    for (const q of sPuzzleFallback) {
      if ((categoryCount['puzzle_assembly'] ?? 0) >= puzzleTarget) break;
      if (!selectedIds.has(q.id)) {
        selected.push(q);
        selectedIds.add(q.id);
        categoryCount['puzzle_assembly'] = (categoryCount['puzzle_assembly'] ?? 0) + 1;
      }
    }
  }

  // 7. STEP 2 — Fill VA with display-key dedup + theme diversity
  const vaMax = caps['visual_attention'] ?? 2;
  const usedVaDisplayKeys = new Set<string>();
  const usedVaThemes      = new Set<string>();

  for (const q of sVA) {
    if (selected.length >= QUESTIONS_PER_MATCH) break;
    const used = categoryCount['visual_attention'] ?? 0;
    if (used >= vaMax) break;

    const vaQ        = q as VisualAttentionQuestion;
    const displayKey = getVaDisplayKey(vaQ);
    const theme      = detectVaTheme(vaQ);

    // Hard block: same display emoji already used in this match
    if (usedVaDisplayKeys.has(displayKey)) continue;

    // Soft block: same theme — skip only if another option may exist
    // (allow repeat theme only when pool is too small to fill slots)
    const remainingVA  = sVA.filter(v =>
      !selectedIds.has(v.id) &&
      !usedVaDisplayKeys.has(getVaDisplayKey(v as VisualAttentionQuestion))
    );
    const freshThemes  = remainingVA.filter(v =>
      !usedVaThemes.has(detectVaTheme(v as VisualAttentionQuestion))
    );
    const slotsLeft    = vaMax - used;
    if (usedVaThemes.has(theme) && freshThemes.length >= slotsLeft) continue;

    selected.push(q);
    selectedIds.add(q.id);
    usedVaDisplayKeys.add(displayKey);
    usedVaThemes.add(theme);
    categoryCount['visual_attention'] = used + 1;
  }

  // 8. STEP 3 — Fill MCQ slots respecting per-category caps
  for (const q of sMCQ) {
    if (selected.length >= QUESTIONS_PER_MATCH) break;
    if (selectedIds.has(q.id)) continue;
    const cat  = q.category;
    const used = categoryCount[cat] ?? 0;
    const max  = caps[cat] ?? 1;
    if (used < max) {
      selected.push(q);
      selectedIds.add(q.id);
      categoryCount[cat] = used + 1;
    }
  }

  // 9. STEP 4 — Last resort: fill without category limits (no ID repeats)
  if (selected.length < QUESTIONS_PER_MATCH) {
    for (const q of seededShuffle(allEligible, rng)) {
      if (selected.length >= QUESTIONS_PER_MATCH) break;
      if (!selectedIds.has(q.id)) {
        selected.push(q);
        selectedIds.add(q.id);
      }
    }
  }

  return {
    matchId,
    division,
    questions:      selected,
    totalQuestions: selected.length,
    seed,
  };
}

// ─── Player-specific ordering ─────────────────────────────────────────────────
//
// PUZZLE GUARANTEE: PZ questions always appear FIRST in the ordered sequence.
// Specifically:
//   • Position 0 is ALWAYS a puzzle_assembly question (if any exist in the set)
//   • Remaining puzzles (if PUZZLE_TARGET > 1) are spread within the first half
//   • Other questions (VA + MCQ) fill positions after the initial puzzle
//
// This prevents puzzles from being hidden at the end of a match where players
// might not reach them if they quit or the timer runs out.

export function getPlayerSession(
  session:  MatchSession,
  playerId: string,
): PlayerSession {
  const seed = hashStr(`${session.matchId}::${playerId}::order`);
  const rng  = lcg(seed);

  // Separate puzzle questions from everything else
  const puzzleQs = session.questions.filter(q => q.category === 'puzzle_assembly');
  const otherQs  = session.questions.filter(q => q.category !== 'puzzle_assembly');

  if (puzzleQs.length === 0) {
    // No puzzles in session (should never happen with guarantee, but safe fallback)
    return {
      matchId:          session.matchId,
      division:         session.division,
      totalQuestions:   session.totalQuestions,
      orderedQuestions: seededShuffle([...otherQs], rng),
    };
  }

  // Shuffle puzzles and others independently
  const shuffledPuzzles = seededShuffle([...puzzleQs], rng);
  const shuffledOthers  = seededShuffle([...otherQs],  rng);

  // Build ordered list:
  //  • First puzzle is ALWAYS at index 0 (guaranteed visible)
  //  • If there are multiple puzzles, interleave them within first 60% of match
  //    so player encounters all puzzles early, not bunched at the end
  const ordered: PoolQuestion[] = [];

  if (shuffledPuzzles.length === 1) {
    // Single puzzle → position 0 (first question)
    ordered.push(shuffledPuzzles[0]);
    ordered.push(...shuffledOthers);
  } else {
    // Multiple puzzles (div2/pro/champions) → distribute evenly in first half
    // e.g. 2 puzzles + 8 others: P _ _ _ P _ _ _ _ _
    const totalSlots = session.totalQuestions;
    const step       = Math.max(2, Math.floor(totalSlots / (shuffledPuzzles.length + 1)));
    let   pzIdx      = 0;
    let   otherIdx   = 0;
    for (let slot = 0; slot < totalSlots; slot++) {
      const nextPzSlot = pzIdx < shuffledPuzzles.length
        ? pzIdx * step   // ideal slot for this puzzle
        : Infinity;
      if (slot === nextPzSlot || (pzIdx < shuffledPuzzles.length && slot === 0)) {
        ordered.push(shuffledPuzzles[pzIdx++]);
      } else if (otherIdx < shuffledOthers.length) {
        ordered.push(shuffledOthers[otherIdx++]);
      } else if (pzIdx < shuffledPuzzles.length) {
        ordered.push(shuffledPuzzles[pzIdx++]);
      }
    }
    // Safety: append any remaining items not yet added
    while (pzIdx    < shuffledPuzzles.length) ordered.push(shuffledPuzzles[pzIdx++]);
    while (otherIdx < shuffledOthers.length)  ordered.push(shuffledOthers[otherIdx++]);
  }

  return {
    matchId:          session.matchId,
    division:         session.division,
    totalQuestions:   session.totalQuestions,
    orderedQuestions: ordered,
  };
}

// ─── Time limit computation ───────────────────────────────────────────────────

function computeTimeLimitMs(q: PoolQuestion, division: DivisionTier): number {
  const diff = q.difficulties[0] ?? 1;

  let baseMs: number;
  if (q.type === 'knowledge') {
    const bases: Record<number, number> = { 1: 32000, 2: 28000, 3: 24000, 4: 20000 };
    baseMs = bases[diff] ?? 24000;
  } else if (q.type === 'visual_attention') {
    const bases: Record<number, number> = { 1: 12000, 2: 10000, 3: 8000, 4: 6000 };
    baseMs = bases[diff] ?? 8000;
  } else {
    const bases: Record<number, number> = { 1: 36000, 2: 30000, 3: 24000, 4: 20000 };
    baseMs = bases[diff] ?? 24000;
  }
  return applyTimeFactor(baseMs, division);
}

// ─── Translation / display prep ───────────────────────────────────────────────

export function prepareDisplayQuestion(
  q:        PoolQuestion,
  lang:     Language,
  division?: DivisionTier,
): DisplayQuestion {
  const timeLimitMs  = division ? computeTimeLimitMs(q, division) : q.timeLimitMs;
  const timerModel   = q.timerModel === 'puzzle' ? 'puzzle' : 'countdown';
  const correctIndex = q.c as 0 | 1 | 2 | 3;
  const difficulty   = q.difficulties[0] ?? 1;

  return {
    source:       q,
    text:         getQuestionText(q, lang),
    options:      getQuestionOptions(q, lang),
    timeLimitMs,
    timerModel,
    correctIndex,
    category:     q.category,
    difficulty,
  };
}

export function prepareSessionForDisplay(
  playerSession: PlayerSession,
  lang:          Language,
): DisplayQuestion[] {
  return playerSession.orderedQuestions.map(q =>
    prepareDisplayQuestion(q, lang, playerSession.division),
  );
}

// ─── Time limit scaling ───────────────────────────────────────────────────────

export function applyTimeFactor(timeLimitMs: number, division: DivisionTier): number {
  const factors: Record<DivisionTier, number> = {
    div3:      1.00,
    div2:      0.88,
    pro:       0.75,
    champions: 0.62,
  };
  return Math.round(timeLimitMs * factors[division]);
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export function scoreAnswer(correct: boolean): number {
  return correct ? CORRECT_POINTS : WRONG_POINTS;
}

export function scoreAnswerWithSpeed(
  correct:     boolean,
  timeLeftMs:  number,
  timeLimitMs: number,
): number {
  if (!correct) return WRONG_POINTS;
  const speedBonus = timeLimitMs > 0
    ? Math.floor((timeLeftMs / timeLimitMs) * 1)
    : 0;
  return CORRECT_POINTS + speedBonus;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export function divisionToDifficulty(division: DivisionTier): number {
  const map: Record<DivisionTier, number> = {
    div3:      1,
    div2:      2,
    pro:       3,
    champions: 4,
  };
  return map[division];
}

export function getPoolSize(division: DivisionTier): number {
  const diffs = DIVISION_DIFFS[division];
  return QUESTION_POOL.filter(q => q.difficulties.some(d => diffs.includes(d))).length;
}

export function isCorrect(q: PoolQuestion, selectedIndex: number): boolean {
  return selectedIndex === q.c;
}

export function getCorrectAnswer(q: PoolQuestion, lang: Language): string {
  const opts = getQuestionOptions(q, lang);
  return opts[q.c] ?? '';
}

// ─── Recent question tracking ─────────────────────────────────────────────────
// Prevents identical questions from appearing in back-to-back matches.
//
// Two-layer tracking:
//   • Per-division key  (sl_recent_q_<div>)  — division-specific exclusion
//   • Global key        (sl_recent_q_global) — cross-division exclusion
//     catches players who switch tiers between matches.
//
// Capacity: MAX_RECENT IDs per layer.  A 10-question match fills 10 slots,
// so MAX_RECENT = 90 covers exactly the last 9 matches (≈ 3 sessions).
// Oldest IDs are evicted when the cap is exceeded.

const RECENT_IDS_PREFIX = 'sl_recent_q';
const GLOBAL_RECENT_KEY = 'sl_recent_q_global';
const MAX_RECENT = 90;

/**
 * Load the combined set of recently-seen question IDs.
 * Merges per-division + global stores so both layers prevent repetition.
 */
export function loadRecentQuestionIds(division?: DivisionTier): ReadonlySet<string> {
  try {
    const divKey    = division ? `${RECENT_IDS_PREFIX}_${division}` : RECENT_IDS_PREFIX;
    const divRaw    = localStorage.getItem(divKey);
    const globalRaw = localStorage.getItem(GLOBAL_RECENT_KEY);
    const divIds    = divRaw    ? (JSON.parse(divRaw)    as string[]) : [];
    const globalIds = globalRaw ? (JSON.parse(globalRaw) as string[]) : [];
    return new Set<string>([...divIds, ...globalIds]);
  } catch {
    return new Set<string>();
  }
}

/**
 * Persist `ids` into both the per-division and global recent stores.
 * Both stores are capped at MAX_RECENT; oldest IDs are evicted first.
 */
export function saveRecentQuestionIds(ids: string[], division?: DivisionTier): void {
  try {
    // Per-division store
    const divKey      = division ? `${RECENT_IDS_PREFIX}_${division}` : RECENT_IDS_PREFIX;
    const divExisting = (() => {
      const raw = localStorage.getItem(divKey);
      return raw ? (JSON.parse(raw) as string[]) : [];
    })();
    const divMerged = [...new Set([...ids, ...divExisting])].slice(0, MAX_RECENT);
    localStorage.setItem(divKey, JSON.stringify(divMerged));

    // Global store
    const globalExisting = (() => {
      const raw = localStorage.getItem(GLOBAL_RECENT_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    })();
    const globalMerged = [...new Set([...ids, ...globalExisting])].slice(0, MAX_RECENT);
    localStorage.setItem(GLOBAL_RECENT_KEY, JSON.stringify(globalMerged));
  } catch { /* storage unavailable — silent fail */ }
}

// ─── Category stats ───────────────────────────────────────────────────────────

export interface CategoryStats {
  category: string;
  correct:  number;
  total:    number;
  accuracy: number;
}

export function calcCategoryStats(
  questions:       PoolQuestion[],
  answerResults:   boolean[],
): CategoryStats[] {
  const stats: Record<string, { correct: number; total: number }> = {};

  questions.forEach((q, i) => {
    const cat = q.category;
    if (!stats[cat]) stats[cat] = { correct: 0, total: 0 };
    stats[cat].total++;
    if (answerResults[i]) stats[cat].correct++;
  });

  return Object.entries(stats).map(([category, { correct, total }]) => ({
    category,
    correct,
    total,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
  }));
}
