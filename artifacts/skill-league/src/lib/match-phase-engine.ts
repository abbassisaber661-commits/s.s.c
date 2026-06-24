// ─────────────────────────────────────────────
// 🎮 SkillLeague Match Phase Engine (ADVANCED SYSTEM)
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// 🎯 MATCH PHASES
// ─────────────────────────────────────────────

export type MatchPhase =
  | 'questions'   // 🧠 مرحلة الأسئلة
  | 'shapes'      // 🧩 مرحلة تركيب الأشكال
  | 'completed';  // 🏁 انتهاء المباراة

// ─────────────────────────────────────────────
// 🎮 PHASE STATE
// ─────────────────────────────────────────────

export interface MatchPhaseState {
  phase: MatchPhase;
  questionIndex: number;
  shapeIndex: number;
  totalQuestions: number;
  totalShapes: number;
}

// ─────────────────────────────────────────────
// 🚀 INITIAL STATE
// ─────────────────────────────────────────────

export function createInitialPhaseState(
  questionCount: number,
  shapeCount = 3,
): MatchPhaseState {
  return {
    phase: 'questions',
    questionIndex: 0,
    shapeIndex: 0,
    totalQuestions: questionCount,
    totalShapes: shapeCount,
  };
}

// ─────────────────────────────────────────────
// 🔄 ADVANCE PHASE LOGIC
// ─────────────────────────────────────────────

export function advancePhase(state: MatchPhaseState): MatchPhaseState {
  const newState = { ...state };

  if (state.phase === 'questions') {
    newState.questionIndex++;

    if (newState.questionIndex >= state.totalQuestions) {
      newState.phase = 'shapes';
    }

    return newState;
  }

  if (state.phase === 'shapes') {
    newState.shapeIndex++;

    if (newState.shapeIndex >= state.totalShapes) {
      newState.phase = 'completed';
    }

    return newState;
  }

  return newState;
}

// ─────────────────────────────────────────────
// 🧠 HELPERS
// ─────────────────────────────────────────────

export function isQuestionPhase(state: MatchPhaseState): boolean {
  return state.phase === 'questions';
}

export function isShapePhase(state: MatchPhaseState): boolean {
  return state.phase === 'shapes';
}

export function isMatchCompleted(state: MatchPhaseState): boolean {
  return state.phase === 'completed';
}