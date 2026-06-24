// ─────────────────────────────────────────────
// 🏆 SkillLeague Match Result Engine
// ─────────────────────────────────────────────

import { calculateXP, calculatePoints } from "@/lib/game-config";

export interface MatchResult {
  winnerId: string;
  loserId: string;
  winnerXP: number;
  loserXP: number;
  winnerPoints: number;
  loserPoints: number;
}

export function buildMatchResult(
  winnerId: string,
  loserId: string,
  winnerScore: number,
  loserScore: number
): MatchResult {
  return {
    winnerId,
    loserId,
    winnerXP: calculateXP(winnerScore, true),
    loserXP: calculateXP(loserScore, false),
    winnerPoints: calculatePoints(winnerScore),
    loserPoints: calculatePoints(loserScore),
  };
}