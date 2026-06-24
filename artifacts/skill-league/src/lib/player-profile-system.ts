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
// 📈 XP SYSTEM (FIXED)
// ─────────────────────────────────────────────

export function addXP(profile: PlayerProfile, gainedXP: number): PlayerProfile {
  let xp = profile.xp + gainedXP;
  let level = profile.level;

  let required = getXPForNextLevel(level);

  while (xp >= required) {
    xp -= required;
    level += 1;
    required = getXPForNextLevel(level);
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

// ─────────────────────────────────────────────
// 🎮 MATCH RESULT UPDATE (FIXED ORDER)
// ─────────────────────────────────────────────

export function updateMatchResult(
  profile: PlayerProfile,
  win: boolean,
  pointsEarned: number,
  xpEarned: number,
): PlayerProfile {
  let updated: PlayerProfile = {
    ...profile,
    gamesPlayed: profile.gamesPlayed + 1,
    wins: profile.wins + (win ? 1 : 0),
    losses: profile.losses + (win ? 0 : 1),
  };

  // 🟢 apply points first
  updated = addPoints(updated, pointsEarned);

  // 🟢 then XP
  updated = addXP(updated, xpEarned);

  // 🟢 then tier sync (IMPORTANT)
  updated = syncTier(updated);

  return updated;
}