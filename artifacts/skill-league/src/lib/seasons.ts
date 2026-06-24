// ─────────────────────────────────────────────
// 🎮 SkillLeague Seasons Logic System
// ─────────────────────────────────────────────

export interface Season {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  active: boolean;
}

export interface SeasonStats {
  playerId: string;
  points: number;
  wins: number;
  losses: number;
}

export class SeasonManager {
  private currentSeason: Season | null = null;
  private stats: Map<string, SeasonStats> = new Map();

  startSeason(season: Season) {
    this.currentSeason = season;
  }

  endSeason() {
    this.currentSeason = null;
    this.stats.clear();
  }

  updateStats(playerId: string, points: number, win: boolean) {
    const existing = this.stats.get(playerId);

    const updated: SeasonStats = existing || {
      playerId,
      points: 0,
      wins: 0,
      losses: 0,
    };

    updated.points += points;
    updated.wins += win ? 1 : 0;
    updated.losses += win ? 0 : 1;

    this.stats.set(playerId, updated);
  }

  getLeaderboard() {
    return Array.from(this.stats.values()).sort(
      (a, b) => b.points - a.points
    );
  }
}

export const seasonManager = new SeasonManager();