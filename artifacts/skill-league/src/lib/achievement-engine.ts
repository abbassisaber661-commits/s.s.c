// ─────────────────────────────────────────────
// 🏅 SkillLeague Achievement Engine
// ─────────────────────────────────────────────

import type { PlayerStats } from "@/lib/player-stats-engine";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
}

export function checkAchievements(
  stats: PlayerStats
): Achievement[] {
  return [
    {
      id: "first_win",
      name: "First Victory",
      description: "Win your first match",
      unlocked: stats.wins >= 1,
    },

    {
      id: "ten_wins",
      name: "Rising Star",
      description: "Win 10 matches",
      unlocked: stats.wins >= 10,
    },

    {
      id: "fifty_wins",
      name: "Elite Player",
      description: "Win 50 matches",
      unlocked: stats.wins >= 50,
    },

    {
      id: "streak_5",
      name: "Hot Streak",
      description: "Reach a 5-win streak",
      unlocked: stats.bestStreak >= 5,
    },

    {
      id: "streak_10",
      name: "Unstoppable",
      description: "Reach a 10-win streak",
      unlocked: stats.bestStreak >= 10,
    },

    {
      id: "hundred_matches",
      name: "Veteran",
      description: "Play 100 matches",
      unlocked: stats.matchesPlayed >= 100,
    },
  ];
}