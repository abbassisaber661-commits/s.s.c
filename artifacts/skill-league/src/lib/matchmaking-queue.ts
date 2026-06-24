// ─────────────────────────────────────────────
// 🎮 SkillLeague Matchmaking Queue System
// ─────────────────────────────────────────────

import { getSocket, SocketEvents } from "@/lib/socket";
import type { PlayerProfile } from "@/lib/player-profile-system";

// ─────────────────────────────────────────────
// 🧠 QUEUE SYSTEM
// ─────────────────────────────────────────────

class MatchmakingQueue {
  private queue: PlayerProfile[] = [];

  // ➕ Join queue
  join(player: PlayerProfile) {
    const socket = getSocket();

    this.queue.push(player);

    socket.emit(SocketEvents.JOIN_MATCH, {
      playerId: player.id,
      tier: player.tier,
    });

    this.tryMatch();
  }

  // 🔍 Try pairing players
  private tryMatch() {
    if (this.queue.length < 2) return;

    const player1 = this.queue.shift();
    const player2 = this.queue.shift();

    if (!player1 || !player2) return;

    const socket = getSocket();

    socket.emit(SocketEvents.START_MATCH, {
      players: [player1, player2],
    });
  }

  // ❌ Leave queue
  leave(playerId: string) {
    this.queue = this.queue.filter((p) => p.id !== playerId);
  }

  // 📊 Queue status
  getQueueSize() {
    return this.queue.length;
  }
}

export const matchmakingQueue = new MatchmakingQueue();