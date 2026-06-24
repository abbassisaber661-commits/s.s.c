// ─────────────────────────────────────────────
// 🎮 SkillLeague Leaderboard Engine (RANKING CORE)
// ─────────────────────────────────────────────

import type { PlayerProfile } from '@/lib/player-profile-system';

// ─────────────────────────────────────────────
// 🏆 LEADERBOARD ENTRY
// ─────────────────────────────────────────────

export interface LeaderboardEntry {
  id: string;
  username: string;
  points: number;
  xp: number;
  tier: string;
  rankPosition?: number;
}

// ─────────────────────────────────────────────
// 📊 LEADERBOARD ENGINE
// ─────────────────────────────────────────────

class LeaderboardEngine {
  private players: PlayerProfile[] = [];

  // =========================
  // UPDATE PLAYER LIST
  // =========================
  update(players: PlayerProfile[]) {
    this.players = [...players];
  }

  // =========================
  // GET SORTED LEADERBOARD
  // =========================
  getLeaderboard(): LeaderboardEntry[] {
    return [...this.players]
      .sort((a, b) => {
        if (b.points === a.points) {
          return b.xp - a.xp;
        }
        return b.points - a.points;
      })
      .map((p, index) => ({
        id: p.id,
        username: p.username,
        points: p.points,
        xp: p.xp,
        tier: p.tier,
        rankPosition: index + 1,
      }));
  }

  // =========================
  // GET TOP PLAYERS
  // =========================
  getTop(limit = 10): LeaderboardEntry[] {
    return this.getLeaderboard().slice(0, limit);
  }

  // =========================
  // GET PLAYER RANK
  // =========================
  getPlayerRank(playerId: string): number | null {
    const leaderboard = this.getLeaderboard();
    const player = leaderboard.find(p => p.id === playerId);
    return player?.rankPosition ?? null;
  }

  // =========================
  // RESET LEADERBOARD
  // =========================
  reset() {
    this.players = [];
  }
}

// singleton
export const leaderboardEngine = new LeaderboardEngine();