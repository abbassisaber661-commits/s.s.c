// ─────────────────────────────────────────────
// 🎮 SkillLeague Game Orchestrator (CORE SYSTEM)
// ─────────────────────────────────────────────

import type { PlayerProfile } from '@/lib/player-profile-system';
import { gameEngine } from '@/lib/game-engine';
import { matchSessionManager } from '@/lib/match-session-manager';
import { calculateRank } from '@/lib/rank-progression-engine';

// ─────────────────────────────────────────────
// 🎯 ORCHESTRATOR RESULT
// ─────────────────────────────────────────────

export interface GameResult {
  score: number;
  points: number;
  xp: number;
  tier: string;
  promoted: boolean;
  demoted: boolean;
  updatedPlayer: PlayerProfile;
}

// ─────────────────────────────────────────────
// 🚀 MAIN ORCHESTRATOR
// ─────────────────────────────────────────────

export function runGameFlow(): GameResult | null {
  const session = gameEngine.getState();
  const result = matchSessionManager.finish();

  if (!session || !result) return null;

  const player = result.updatedPlayer;

  const rank = calculateRank({
    points: player.points,
    wins: player.wins,
    losses: player.losses,
  });

  return {
    score: result.score,
    points: result.points,
    xp: result.xp,
    tier: rank.tier,
    promoted: rank.promoted,
    demoted: rank.demoted,
    updatedPlayer: player,
  };
}

// ─────────────────────────────────────────────
// 🔄 SAFE RESET SYSTEM
// ─────────────────────────────────────────────

export function resetGame(): void {
  gameEngine.finish();
}

export const gameOrchestrator = { runGameFlow, resetGame };