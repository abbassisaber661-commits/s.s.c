// ─────────────────────────────────────────────
// 🎮 SkillLeague Game Core Index (MASTER EXPORT)
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// 📦 CORE SYSTEM EXPORTS
// ─────────────────────────────────────────────

export { gameEngine } from '@/lib/game-engine';

export { matchSessionManager } from '@/lib/match-session-manager';

export { gameOrchestrator, runGameFlow, resetGame } from '@/lib/game-orchestrator';

export { leaderboardEngine } from '@/lib/leaderboard-engine';

export { seasonEngine } from '@/lib/season-engine';

export { statsTracker } from '@/lib/stats-tracker';

export { calculateRewards } from '@/lib/reward-system';

export { calculateRank } from '@/lib/rank-progression-engine';

// ─────────────────────────────────────────────
// 🎯 TYPES EXPORTS
// ─────────────────────────────────────────────

export type { PlayerProfile } from '@/lib/player-profile-system';

export type { SoloMatchSession } from '@/lib/matchmaking-core';

// ─────────────────────────────────────────────
// 🚀 CORE ENTRY POINT
// ─────────────────────────────────────────────

export const GameCore = {
  gameEngine: () => import('@/lib/esport-game-engine'),
  matchSessionManager: () => import('@/lib/match-session-manager'),
  orchestrator: () => import('@/lib/game-orchestrator'),
  leaderboard: () => import('@/lib/leaderboard-engine'),
  season: () => import('@/lib/season-engine'),
};