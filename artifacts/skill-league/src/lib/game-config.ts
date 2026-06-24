// ─────────────────────────────────────────────
// 🎮 SkillLeague Game Config (GLOBAL SETTINGS)
// ─────────────────────────────────────────────

export const GAME_CONFIG = {
  match: {
    defaultQuestionCount: 10,
    maxQuestionCount: 20,
    minQuestionCount: 5,
  },

  scoring: {
    correctAnswerPoints: 10,
    wrongAnswerPoints: 0,
    speedBonusMultiplier: 0.2,
  },

  xp: {
    baseXpPerCorrect: 20,
    winBonusXp: 50,
  },

  tiers: {
    training: { minPoints: 0 },
    "division-iii": { minPoints: 100 },
    "division-ii": { minPoints: 300 },
    pro: { minPoints: 700 },
    champions: { minPoints: 1500 },
  },

  time: {
    easy: 14000,
    medium: 12000,
    hard: 10000,
  },
};

// ─────────────────────────────────────────────
// 🎯 HELPERS
// ─────────────────────────────────────────────

export function getTierFromPoints(points: number): string {
  const t = GAME_CONFIG.tiers;

  if (points >= t.champions.minPoints) return "champions";
  if (points >= t.pro.minPoints) return "pro";
  if (points >= t["division-ii"].minPoints) return "division-ii";
  if (points >= t["division-iii"].minPoints) return "division-iii";

  return "training";
}

export function getTimeByDifficulty(diff: "easy" | "medium" | "hard") {
  return GAME_CONFIG.time[diff];
}

// ─────────────────────────────────────────────
// 🎯 SCORING SYSTEM
// ─────────────────────────────────────────────

export function calculatePoints(correctAnswers: number) {
  return correctAnswers * GAME_CONFIG.scoring.correctAnswerPoints;
}

export function calculateXP(correctAnswers: number, win: boolean) {
  return (
    correctAnswers * GAME_CONFIG.xp.baseXpPerCorrect +
    (win ? GAME_CONFIG.xp.winBonusXp : 0)
  );
}