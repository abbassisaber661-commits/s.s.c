// ─────────────────────────────────────────────
// 🎮 SkillLeague Match Result Handler
// ─────────────────────────────────────────────

import type { PlayerProfile } from "@/lib/player-profile-system";
import { updateMatchResult } from "@/lib/player-profile-system";
import {
  applyRankProgression,
} from "@/lib/rank-progression-engine";

// ─────────────────────────────────────────────
// 🎯 MATCH RESULT TYPE
// ─────────────────────────────────────────────

export interface MatchResult {
  score: number;
  total: number;
  win: boolean;
}

// ─────────────────────────────────────────────
// 🧠 CORE HANDLER
// ─────────────────────────────────────────────

export function handleMatchResult(
  player: PlayerProfile,
  result: MatchResult
) {
  const percent = (result.score / result.total) * 100;

  // 🎯 Rank system
  const rankData = applyRankProgression(player, percent);

  // 🎮 Update match stats (wins/losses + xp + points)
  const updatedPlayer = updateMatchResult(
    rankData.player,
    result.win,
    rankData.rewards.coins,
    rankData.rewards.xp
  );

  return {
    player: updatedPlayer,
    rank: rankData.rank,
    rewards: rankData.rewards,
    percent,
  };
}