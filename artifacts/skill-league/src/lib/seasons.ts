// ─────────────────────────────────────────────
// 🎮 SkillLeague Seasons Logic System (FIXED)
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

// ─────────────────────────────────────────────
// 🧠 SEASON MANAGER
// ─────────────────────────────────────────────

export class SeasonManager {
  private currentSeason: Season | null = null;
  private stats: Map<string, SeasonStats> = new Map();

  // =====================
  // START SEASON
  // =====================
  startSeason(season: Season) {
    this.currentSeason = season;
  }

  // =====================
  // END SEASON
  // =====================
  endSeason() {
    this.currentSeason = null;
    this.stats.clear();
  }

  // =====================
  // UPDATE STATS (FIXED SAFE IMMUTABLE)
  // =====================
  updateStats(playerId: string, points: number, win: boolean) {
    if (!this.currentSeason || !this.currentSeason.active) return;

    const existing = this.stats.get(playerId);

    const updated: SeasonStats = {
      playerId,
      points: (existing?.points ?? 0) + points,
      wins: (existing?.wins ?? 0) + (win ? 1 : 0),
      losses: (existing?.losses ?? 0) + (win ? 0 : 1),
    };

    this.stats.set(playerId, updated);
  }

  // =====================
  // GET LEADERBOARD (STABLE SORT)
  // =====================
  getLeaderboard() {
    return Array.from(this.stats.values()).sort((a, b) => {
      // primary: points
      if (b.points !== a.points) {
        return b.points - a.points;
      }

      // secondary: wins
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }

      return a.losses - b.losses;
    });
  }

  // =====================
  // GET PLAYER RANK
  // =====================
  getPlayerRank(playerId: string) {
    const leaderboard = this.getLeaderboard();
    const index = leaderboard.findIndex(p => p.playerId === playerId);
    return index !== -1 ? index + 1 : null;
  }

  // =====================
  // RESET
  // =====================
  reset() {
    this.stats.clear();
  }
}

// singleton
export const seasonManager = new SeasonManager();