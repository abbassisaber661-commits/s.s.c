// ─────────────────────────────────────────────
// 🎮 SkillLeague Match Session Manager (CORE LAYER)
// ─────────────────────────────────────────────

import type { SoloMatchSession } from "@/lib/matchmaking-core";
import { gameEngine } from "@/lib/game-engine";
import {
  calculatePoints,
  calculateXP,
  getTierFromPoints,
} from "@/lib/game-config";
import type { PlayerProfile } from "@/lib/player-profile-system";

// ─────────────────────────────────────────────
// 🎯 SESSION STATE WRAPPER
// ─────────────────────────────────────────────

class MatchSessionManager {
  start(player: PlayerProfile, questionCount = 10) {
    return gameEngine.start(player, questionCount);
  }

  answer(index: number) {
    return gameEngine.answer(index);
  }

  isFinished() {
    return gameEngine.isFinished();
  }

  finish() {
    const result = gameEngine.finish();
    if (!result) return null;

    const points = calculatePoints(result.score);
    const xp = calculateXP(result.score, result.score >= 7);
    const newTier = getTierFromPoints(points);

    return {
      ...result,
      points,
      xp,
      newTier,
    };
  }

  getSession() {
    return gameEngine.getState();
  }
}

// singleton
export const matchSessionManager = new MatchSessionManager();