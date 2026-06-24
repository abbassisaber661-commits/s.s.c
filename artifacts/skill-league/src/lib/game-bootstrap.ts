// ─────────────────────────────────────────────
// 🎮 SkillLeague Game Bootstrap (SYSTEM INITIALIZER)
// ─────────────────────────────────────────────

import { seasonEngine } from '@/lib/season-engine';
import { leaderboardEngine } from '@/lib/leaderboard-engine';
import { statsTracker } from '@/lib/stats-tracker';
import { gameEngine } from '@/lib/esport-game-engine';

// ─────────────────────────────────────────────
// 🎯 BOOTSTRAP STATE
// ─────────────────────────────────────────────

let initialized = false;

// ─────────────────────────────────────────────
// 🚀 INIT SYSTEM
// ─────────────────────────────────────────────

export function initGameSystem() {
  if (initialized) return;

  // Initialize default season
  seasonEngine.startSeason('Season 1 - Launch', 30);

  // Reset engines safely
  leaderboardEngine.reset();
  statsTracker.reset();

  // Ensure engine is clean
  gameEngine.finish();

  initialized = true;

  console.log('🎮 SkillLeague Game System Initialized');
}

// ─────────────────────────────────────────────
// 🔄 RESET FULL SYSTEM (ADMIN TOOL)
// ─────────────────────────────────────────────

export function resetGameSystem() {
  leaderboardEngine.reset();
  statsTracker.reset();
  seasonEngine.reset();
  gameEngine.finish();

  initialized = false;

  console.log('♻️ SkillLeague Game System Reset');
}

// ─────────────────────────────────────────────
// 📊 SYSTEM STATUS
// ─────────────────────────────────────────────

export function getSystemStatus() {
  return {
    initialized,
    season: seasonEngine.getCurrentSeason(),
    leaderboardSize: leaderboardEngine.getTop(999).length,
  };
}