// ─────────────────────────────────────────────
// 🎮 SkillLeague Rank Progression Engine
// ─────────────────────────────────────────────

import type { PlayerProfile } from "@/lib/player-profile-system";

// ─────────────────────────────────────────────
// 🏆 RANK TYPES
// ─────────────────────────────────────────────

export type Rank =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "master"
  | "legend";

// ─────────────────────────────────────────────
// 📊 POINT THRESHOLDS
// ─────────────────────────────────────────────

const RANKS: Record<Rank, number> = {
  bronze: 0,
  silver: 200,
  gold: 500,
  platinum: 900,
  diamond: 1400,
  master: 2000,
  legend: 3000,
};

// ─────────────────────────────────────────────
// 🎯 GET RANK FROM POINTS
// ─────────────────────────────────────────────

export function getRankFromPoints(points: number): Rank {
  if (points >= RANKS.legend) return "legend";
  if (points >= RANKS.master) return "master";
  if (points >= RANKS.diamond) return "diamond";
  if (points >= RANKS.platinum) return "platinum";
  if (points >= RANKS.gold) return "gold";
  if (points >= RANKS.silver) return "silver";
  return "bronze";
}

// ─────────────────────────────────────────────
// 📈 PROGRESSION UPDATE
// ─────────────────────────────────────────────

export function updateRank(profile: PlayerProfile): PlayerProfile {
  const newRank = getRankFromPoints(profile.points);

  return {
    ...profile,
    tier: newRank as any,
  };
}

// ─────────────────────────────────────────────
// 🏆 CALCULATE RANK (used by game-orchestrator)
// ─────────────────────────────────────────────

export function calculateRank(input: {
  points: number;
  wins: number;
  losses: number;
}): { tier: string; promoted: boolean; demoted: boolean } {
  const tier = getRankFromPoints(input.points);
  return { tier, promoted: false, demoted: false };
}

// ─────────────────────────────────────────────
// 📈 APPLY RANK PROGRESSION (used by match-result-handler)
// ─────────────────────────────────────────────

export function applyRankProgression(
  player: PlayerProfile,
  percent: number,
): {
  player: PlayerProfile;
  rank: Rank;
  rewards: { coins: number; xp: number };
} {
  const pointsGained = Math.round(percent * 10);
  const updatedPlayer = updateRank({ ...player, points: player.points + pointsGained });
  const rank = getRankFromPoints(updatedPlayer.points);
  const coins = percent >= 80 ? 50 : percent >= 50 ? 20 : 5;
  const xp = Math.round(percent * 2);
  return { player: updatedPlayer, rank, rewards: { coins, xp } };
}

// ─────────────────────────────────────────────
// 📊 EVALUATE RANK PROGRESSION (used by season-engine)
// ─────────────────────────────────────────────

export function evaluateRankProgression(
  player: PlayerProfile,
  pointsEarned: number,
): {
  oldTier: string;
  newTier: string;
  promoted: boolean;
  demoted: boolean;
} {
  const oldTier = (player.tier as string) ?? 'training';
  const newPoints = player.points + pointsEarned;
  const newRank = getRankFromPoints(newPoints);
  const RANK_ORDER: Rank[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'legend'];
  const oldRank = getRankFromPoints(player.points);
  const oldIdx = RANK_ORDER.indexOf(oldRank);
  const newIdx = RANK_ORDER.indexOf(newRank);
  return {
    oldTier,
    newTier: newRank,
    promoted: newIdx > oldIdx,
    demoted: newIdx < oldIdx,
  };
}

// ─────────────────────────────────────────────
// 💰 CALCULATE SEASON BONUS (used by season-engine)
// ─────────────────────────────────────────────

export function calculateSeasonBonus(wins: number): number {
  if (wins >= 20) return 500;
  if (wins >= 10) return 200;
  if (wins >= 5)  return 100;
  return 0;
}

// ─────────────────────────────────────────────
// 🔥 NEXT RANK INFO
// ─────────────────────────────────────────────

export function getNextRankInfo(points: number) {
  const entries = Object.entries(RANKS) as [Rank, number][];

  for (let i = 0; i < entries.length; i++) {
    const [rank, required] = entries[i];

    if (points < required) {
      return {
        nextRank: rank,
        pointsNeeded: required - points,
      };
    }
  }

  return {
    nextRank: "legend",
    pointsNeeded: 0,
  };
}