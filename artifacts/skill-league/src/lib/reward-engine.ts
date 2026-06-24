// ─────────────────────────────────────────────
// 🎁 SkillLeague Reward Engine
// ─────────────────────────────────────────────

export interface Reward {
  coins: number;
  xpBonus: number;
  title?: string;
}

export function getMatchReward(
  win: boolean,
  streak: number
): Reward {
  let coins = win ? 50 : 15;
  let xpBonus = win ? 25 : 5;

  // 🔥 Win streak bonus
  if (streak >= 3) {
    coins += streak * 10;
    xpBonus += streak * 5;
  }

  let title: string | undefined;

  if (streak >= 10) {
    title = "Unstoppable";
  } else if (streak >= 5) {
    title = "Champion";
  }

  return {
    coins,
    xpBonus,
    title,
  };
}