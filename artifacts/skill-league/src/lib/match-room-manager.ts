// ─────────────────────────────────────────────
// 🎮 SkillLeague Match Room Manager
// ─────────────────────────────────────────────

import { MatchRoom } from "@/lib/match-room";
import type { PlayerProfile } from "@/lib/player-profile-system";

class MatchRoomManager {
  private rooms = new Map<string, MatchRoom>();

  // 🎯 Create Room
  createRoom(
    player1: PlayerProfile,
    player2: PlayerProfile
  ) {
    const roomId =
      "room_" +
      Date.now() +
      "_" +
      Math.random().toString(36).slice(2, 8);

    const room = new MatchRoom(
      roomId,
      player1,
      player2
    );

    this.rooms.set(roomId, room);

    return room;
  }

  // 🔍 Get Room
  getRoom(roomId: string) {
    return this.rooms.get(roomId);
  }

  // ❌ Remove Room
  removeRoom(roomId: string) {
    this.rooms.delete(roomId);
  }

  // 📊 All Rooms
  getRooms() {
    return Array.from(this.rooms.values());
  }

  // 🧹 Cleanup finished rooms
  cleanupFinishedRooms() {
    for (const [roomId, room] of this.rooms.entries()) {
      const state = room.getState();

      if (state.finished) {
        this.rooms.delete(roomId);
      }
    }
  }
}

export const matchRoomManager =
  new MatchRoomManager();