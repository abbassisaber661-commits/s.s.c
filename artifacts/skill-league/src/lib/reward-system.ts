// ─────────────────────────────────────────────
// 🎮 SkillLeague Reward System (ECONOMY CORE)
// ─────────────────────────────────────────────

import type { PlayerProfile } from '@/lib/player-profile-system';

// ─────────────────────────────────────────────
// 🏆 REWARD TYPES
// ─────────────────────────────────────────────

export interface RewardResult {
  coins: number;
  xp: number;
  bonusCoins: number;
  totalCoins: number;
}

// ─────────────────────────────────────────────
// 🎯 BASE REWARD RULES
// ─────────────────────────────────────────────

const BASE_REWARD = {
  winCoins: 50,
  loseCoins: 10,
  xpPerCorrect: 20,
};

// ─────────────────────────────────────────────
// 🚀 CALCULATE REWARDS
// ─────────────────────────────────────────────

export function calculateRewards(params: {
  correctAnswers: number;
  totalQuestions: number;
  win: boolean;
}): RewardResult {
  const { correctAnswers, win } = params;

  const xp = correctAnswers * BASE_REWARD.xpPerCorrect;

  const coins = win
    ? BASE_REWARD.winCoins
    : BASE_REWARD.loseCoins;

  const bonusCoins =
    correctAnswers >= 8 ? 30 :
    correctAnswers >= 5 ? 15 : 0;

  return {
    coins,
    xp,
    bonusCoins,
    totalCoins: coins + bonusCoins,
  };
}

// ─────────────────────────────────────────────
// 📈 APPLY REWARDS TO PLAYER
// ─────────────────────────────────────────────

export function applyRewards(
  player: PlayerProfile,
  rewards: RewardResult
): PlayerProfile {
  return {
    ...player,
    xp: player.xp + rewards.xp,
    points: player.points + rewards.totalCoins,
  };
}