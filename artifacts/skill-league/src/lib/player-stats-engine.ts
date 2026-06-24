// ─────────────────────────────────────────────
// 📊 SkillLeague Player Stats Engine
// ─────────────────────────────────────────────

export interface PlayerStats {
  matchesPlayed: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  totalCorrectAnswers: number;
  totalWrongAnswers: number;
}

export function createDefaultStats(): PlayerStats {
  return {
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    currentStreak: 0,
    bestStreak: 0,
    totalCorrectAnswers: 0,
    totalWrongAnswers: 0,
  };
}

export function registerWin(
  stats: PlayerStats
): PlayerStats {
  const streak = stats.currentStreak + 1;

  return {
    ...stats,
    matchesPlayed: stats.matchesPlayed + 1,
    wins: stats.wins + 1,
    currentStreak: streak,
    bestStreak: Math.max(stats.bestStreak, streak),
  };
}

export function registerLoss(
  stats: PlayerStats
): PlayerStats {
  return {
    ...stats,
    matchesPlayed: stats.matchesPlayed + 1,
    losses: stats.losses + 1,
    currentStreak: 0,
  };
}

export function registerAnswer(
  stats: PlayerStats,
  correct: boolean
): PlayerStats {
  return {
    ...stats,
    totalCorrectAnswers:
      stats.totalCorrectAnswers + (correct ? 1 : 0),

    totalWrongAnswers:
      stats.totalWrongAnswers + (correct ? 0 : 1),
  };
}

export function getWinRate(
  stats: PlayerStats
) {
  if (stats.matchesPlayed === 0) return 0;

  return Math.round(
    (stats.wins / stats.matchesPlayed) * 100
  );
}