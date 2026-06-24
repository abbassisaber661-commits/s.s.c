// ─────────────────────────────────────────────
// 🎮 SkillLeague Stats Tracker (ANALYTICS CORE)
// ─────────────────────────────────────────────

import type { PlayerProfile } from '@/lib/player-profile-system';

// ─────────────────────────────────────────────
// 📊 PLAYER STATS SNAPSHOT
// ─────────────────────────────────────────────

export interface PlayerStatsSnapshot {
  totalGames: number;
  winRate: number;
  avgScore: number;
  bestStreak: number;
  totalXP: number;
  totalPoints: number;
}

// ─────────────────────────────────────────────
// 🎯 TRACKER CLASS
// ─────────────────────────────────────────────

class StatsTracker {
  private history: Array<{
    score: number;
    win: boolean;
    xp: number;
    points: number;
  }> = [];

  // =========================
  // ADD GAME RESULT
  // =========================
  addGameResult(data: {
    score: number;
    win: boolean;
    xp: number;
    points: number;
  }) {
    this.history.push(data);
  }

  // =========================
  // CALCULATE SNAPSHOT
  // =========================
  getSnapshot(player: PlayerProfile): PlayerStatsSnapshot {
    const totalGames = this.history.length;

    const wins = this.history.filter(h => h.win).length;

    const winRate = totalGames === 0 ? 0 : wins / totalGames;

    const avgScore =
      totalGames === 0
        ? 0
        : this.history.reduce((sum, h) => sum + h.score, 0) / totalGames;

    const bestStreak = this.calculateBestStreak();

    const totalXP = this.history.reduce((sum, h) => sum + h.xp, 0);

    const totalPoints = this.history.reduce((sum, h) => sum + h.points, 0);

    return {
      totalGames,
      winRate,
      avgScore,
      bestStreak,
      totalXP,
      totalPoints,
    };
  }

  // =========================
  // STREAK CALCULATION
  // =========================
  private calculateBestStreak(): number {
    let max = 0;
    let current = 0;

    for (const game of this.history) {
      if (game.win) {
        current++;
        max = Math.max(max, current);
      } else {
        current = 0;
      }
    }

    return max;
  }

  // =========================
  // RESET STATS
  // =========================
  reset() {
    this.history = [];
  }
}

// singleton
export const statsTracker = new StatsTracker();