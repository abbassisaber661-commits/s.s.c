// ─────────────────────────────────────────────
// 🏆 SkillLeague Points Ranking System
// ─────────────────────────────────────────────

export type Tier = 'div3' | 'div2' | 'pro' | 'champ';

export interface PlayerRank {
  id: string;
  name: string;

  points: number;   // 🔥 النظام الأساسي (بدل ELO)

  tier: Tier;

  wins: number;
  losses: number;

  streak: number;
}

// ─────────────────────────────────────────────
// 🔥 CREATE PLAYER
// ─────────────────────────────────────────────

export function createPlayer(name: string, id: string): PlayerRank {
  return {
    id,
    name,
    points: 100, // بداية عادلة
    tier: 'div3',
    wins: 0,
    losses: 0,
    streak: 0,
  };
}

// ─────────────────────────────────────────────
// 📈 POINTS SYSTEM (CORE LOGIC)
// ─────────────────────────────────────────────

function getPointsGain(tier: Tier, win: boolean): number {
  const base = {
    div3: 10,
    div2: 15,
    pro: 20,
    champ: 25,
  }[tier];

  return win ? base : -Math.floor(base / 2);
}

// ─────────────────────────────────────────────
// 🏆 UPDATE POINTS
// ─────────────────────────────────────────────

export function updatePoints(
  player: PlayerRank,
  result: 'win' | 'loss',
): PlayerRank {
  const gain = getPointsGain(player.tier, result === 'win');

  const newPoints = Math.max(0, player.points + gain);

  const updated: PlayerRank = {
    ...player,
    points: newPoints,

    wins: player.wins + (result === 'win' ? 1 : 0),
    losses: player.losses + (result === 'loss' ? 1 : 0),

    streak: result === 'win' ? player.streak + 1 : 0,

    tier: calculateTier(newPoints),
  };

  return updated;
}

// ─────────────────────────────────────────────
// 🎯 TIER SYSTEM (POINTS BASED)
// ─────────────────────────────────────────────

function calculateTier(points: number): Tier {
  if (points >= 2000) return 'champ';
  if (points >= 1200) return 'pro';
  if (points >= 600) return 'div2';
  return 'div3';
}

// ─────────────────────────────────────────────
// 🎮 MATCH RESULT
// ─────────────────────────────────────────────

export function processMatch(
  player: PlayerRank,
  playerScore: number,
  opponentScore: number,
): PlayerRank {
  const result = playerScore > opponentScore ? 'win' : 'loss';
  return updatePoints(player, result);
}

// ─────────────────────────────────────────────
// 📊 DEBUG
// ─────────────────────────────────────────────

export function debugRank(player: PlayerRank) {
  return {
    points: player.points,
    tier: player.tier,
    winRate:
      player.wins + player.losses === 0
        ? 0
        : player.wins / (player.wins + player.losses),
  };
}