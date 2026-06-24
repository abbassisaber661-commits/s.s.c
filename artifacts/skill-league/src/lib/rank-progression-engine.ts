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