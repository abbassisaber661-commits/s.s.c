// ─────────────────────────────────────────────
// 🏆 SkillLeague Leaderboard Engine (FIXED)
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
// 🧠 ENGINE
// ─────────────────────────────────────────────

class Leaderboard {
  private board: LeaderboardEntry[] = [];

  // =========================
  // UPSERT PLAYER
  // =========================
  upsert(player: PlayerProfile) {
    const entry: LeaderboardEntry = {
      playerId: player.id,
      username: player.username,
      points: player.points,
      xp: player.xp,
      tier: player.tier,
      wins: player.wins,
    };

    const index = this.board.findIndex(
      (p) => p.playerId === player.id
    );

    if (index !== -1) {
      this.board[index] = entry;
    } else {
      this.board.push(entry);
    }

    this.sort();
  }

  // =========================
  // SORT FIXED (NO CLONE ISSUE)
  // =========================
  private sort() {
    this.board.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }

      if (b.xp !== a.xp) {
        return b.xp - a.xp;
      }

      return b.wins - a.wins;
    });
  }

  // =========================
  // GET TOP
  // =========================
  getTop(limit = 10): LeaderboardEntry[] {
    return this.board.slice(0, limit);
  }

  // =========================
  // GET RANK
  // =========================
  getPlayerRank(playerId: string): number | null {
    const index = this.board.findIndex(
      (p) => p.playerId === playerId
    );

    return index !== -1 ? index + 1 : null;
  }

  // =========================
  // RESET
  // =========================
  reset() {
    this.board = [];
  }

  // =========================
  // DEBUG (مهم للتجربة)
  // =========================
  dump() {
    return this.board;
  }
}

// ─────────────────────────────────────────────
// 🔥 SINGLETON
// ─────────────────────────────────────────────

export const leaderboard = new Leaderboard();