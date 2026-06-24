// ─────────────────────────────────────────────
// 🏆 SkillLeague Leaderboard System
// ─────────────────────────────────────────────

import type { PlayerProfile } from "@/lib/player-profile-system";

// ─────────────────────────────────────────────
// 📊 ENTRY TYPE
// ─────────────────────────────────────────────

export interface LeaderboardEntry {
  playerId: string;
  username: string;
  points: number;
  xp: number;
  tier: string;
  wins: number;
}

// ─────────────────────────────────────────────
// 🧠 LEADERBOARD ENGINE
// ─────────────────────────────────────────────

export class Leaderboard {
  private board: LeaderboardEntry[] = [];

  upsert(player: PlayerProfile) {
    const index = this.board.findIndex(
      (p) => p.playerId === player.id
    );

    const entry: LeaderboardEntry = {
      playerId: player.id,
      username: player.username,
      points: player.points,
      xp: player.xp,
      tier: player.tier,
      wins: player.wins,
    };

    if (index !== -1) {
      this.board[index] = entry;
    } else {
      this.board.push(entry);
    }

    this.sort();
  }

  private sort() {
    this.board.sort((a, b) => {
      if (b.points === a.points) {
        return b.xp - a.xp;
      }
      return b.points - a.points;
    });
  }

  getTop(limit = 10) {
    return this.board.slice(0, limit);
  }

  getPlayerRank(playerId: string) {
    return this.board.findIndex((p) => p.playerId === playerId) + 1;
  }

  reset() {
    this.board = [];
  }
}

// singleton
export const leaderboard = new Leaderboard();