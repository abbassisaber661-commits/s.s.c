// ─────────────────────────────────────────────
// 🏆 SkillLeague Season Engine (COMPETITIVE CORE)
// ─────────────────────────────────────────────

import type { PlayerProfile, PlayerTier } from "@/lib/player-profile-system";
import {
  evaluateRankProgression,
  calculateSeasonBonus,
} from "@/lib/rank-progression-engine";

// ─────────────────────────────────────────────
// 🎯 SEASON RESULT TYPE
// ─────────────────────────────────────────────

export interface SeasonResult {
  playerId: string;
  oldTier: PlayerTier;
  newTier: PlayerTier;
  promoted: boolean;
  demoted: boolean;
  seasonBonus: number;
  finalPoints: number;
}

// ─────────────────────────────────────────────
// 🧠 SEASON ENGINE
// ─────────────────────────────────────────────

export class SeasonEngine {
  applyMatchResult(
    player: PlayerProfile,
    pointsEarned: number,
    wins: number
  ): SeasonResult {
    const rank = evaluateRankProgression(player, pointsEarned);
    const bonus = calculateSeasonBonus(wins);

    return {
      playerId: player.id,
      oldTier: rank.oldTier,
      newTier: rank.newTier,
      promoted: rank.promoted,
      demoted: rank.demoted,
      seasonBonus: bonus,
      finalPoints: player.points + pointsEarned + bonus,
    };
  }

  resetSeason(player: PlayerProfile): PlayerProfile {
    return {
      ...player,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
    };
  }
}

// singleton
export const seasonEngine = new SeasonEngine();