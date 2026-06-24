// ─────────────────────────────────────────────
// 🎮 SkillLeague Match Finalizer (GLOBAL ORCHESTRATOR)
// ─────────────────────────────────────────────

import type { PlayerProfile } from "@/lib/player-profile-system";
import type { MatchResult } from "@/lib/match-result-handler";

import { handleMatchResult } from "@/lib/match-result-handler";

// ─────────────────────────────────────────────
// 🧠 FINAL OUTPUT TYPE
// ─────────────────────────────────────────────

export interface FinalMatchOutput {
  player: PlayerProfile;
  rank: string;
  rewards: any;
  percent: number;
}

// ─────────────────────────────────────────────
// 🚀 FINALIZER CORE
// ─────────────────────────────────────────────

export function finalizeMatch(
  player: PlayerProfile,
  result: MatchResult
): FinalMatchOutput {
  return handleMatchResult(player, result);
}