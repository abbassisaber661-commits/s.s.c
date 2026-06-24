// ─────────────────────────────────────────────
// 🎮 SkillLeague Player Profile System (ESPORT CORE)
// ─────────────────────────────────────────────

export interface PlayerProfile {
  id: string;
  username: string;
  points: number;
  xp: number;
  level: number;
  tier: PlayerTier;
  gamesPlayed: number;
  wins: number;
  losses: number;
}

// ─────────────────────────────────────────────
// 🏆 TIERS SYSTEM
// ─────────────────────────────────────────────

export type PlayerTier =
  | 'training'
  | 'division-iii'
  | 'division-ii'
  | 'pro'
  | 'champions';

// ─────────────────────────────────────────────
// ⚡ LEVEL SYSTEM
// ─────────────────────────────────────────────

export function getXPForNextLevel(level: number): number {
  return 100 + level * 50;
}

// ─────────────────────────────────────────────
// 📈 XP SYSTEM
// ─────────────────────────────────────────────

export function addXP(profile: PlayerProfile, gainedXP: number): PlayerProfile {
  let xp = profile.xp + gainedXP;
  let level = profile.level;

  while (xp >= getXPForNextLevel(level)) {
    xp -= getXPForNextLevel(level);
    level += 1;
  }

  return {
    ...profile,
    xp,
    level,
  };
}

// ─────────────────────────────────────────────
// 🏆 POINTS SYSTEM
// ─────────────────────────────────────────────

export function addPoints(profile: PlayerProfile, points: number): PlayerProfile {
  return {
    ...profile,
    points: profile.points + points,
  };
}

// ─────────────────────────────────────────────
// 🎮 MATCH RESULT UPDATE (AUTO SYNC TIER)
// ─────────────────────────────────────────────

export function updateMatchResult(
  profile: PlayerProfile,
  win: boolean,
  pointsEarned: number,
  xpEarned: number,
): PlayerProfile {
  const updated: PlayerProfile = {
    ...profile,
    gamesPlayed: profile.gamesPlayed + 1,
    wins: profile.wins + (win ? 1 : 0),
    losses: profile.losses + (win ? 0 : 1),
  };

  const withPoints = addPoints(updated, pointsEarned);
  const withXP = addXP(withPoints, xpEarned);

  return syncTier(withXP);
}

// ─────────────────────────────────────────────
// 🎯 TIER PROGRESSION
// ─────────────────────────────────────────────

export function calculateTier(points: number): PlayerTier {
  if (points >= 1500) return 'champions';
  if (points >= 700) return 'pro';
  if (points >= 300) return 'division-ii';
  if (points >= 100) return 'division-iii';
  return 'training';
}

// ─────────────────────────────────────────────
// 🔄 SYNC PROFILE TIER
// ─────────────────────────────────────────────

export function syncTier(profile: PlayerProfile): PlayerProfile {
  return {
    ...profile,
    tier: calculateTier(profile.points),
  };
}