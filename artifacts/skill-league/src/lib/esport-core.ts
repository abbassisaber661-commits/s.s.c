// ─────────────────────────────────────────────
// 🎮 SkillLeague Esport CORE INTEGRATION
// ─────────────────────────────────────────────

import { gameEngine } from "@/lib/game-engine";
import { matchSessionManager } from "@/lib/match-session-manager";
import { updateRank } from "@/lib/rank-progression-engine";
import type { PlayerProfile } from "@/lib/player-profile-system";

// ─────────────────────────────────────────────
// 🚀 MAIN GAME ORCHESTRATOR
// ─────────────────────────────────────────────

export class EsportCore {
  startMatch(player: PlayerProfile, count = 10) {
    return matchSessionManager.start(player, count);
  }

  answer(index: number) {
    return matchSessionManager.answer(index);
  }

  finish(player: PlayerProfile) {
    const result = matchSessionManager.finish();

    if (!result) return null;

    // 🔥 update player progression
    const updatedProfile = {
      ...player,
      points: (player.points || 0) + result.points,
      xp: (player.xp || 0) + result.xp,
    };

    const ranked = updateRank(updatedProfile);

    return {
      session: result,
      player: ranked,
    };
  }

  getState() {
    return matchSessionManager.getSession();
  }

  reset() {
    gameEngine.reset();
  }
}

// singleton
export const esportCore = new EsportCore();