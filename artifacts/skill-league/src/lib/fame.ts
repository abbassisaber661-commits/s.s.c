export interface FameTitle {
  minFame: number;
  title: string;
  icon: string;
  color: string;
  visibilityBoost: number;
}

export const FAME_TITLES: FameTitle[] = [
  { minFame: 0,    title: 'Unknown',    icon: '👤', color: '#666666', visibilityBoost: 1.0 },
  { minFame: 50,   title: 'Noticed',    icon: '👁️', color: '#A8A9AD', visibilityBoost: 1.1 },
  { minFame: 200,  title: 'Popular',    icon: '⭐', color: '#3AB4FF', visibilityBoost: 1.2 },
  { minFame: 500,  title: 'Influencer', icon: '🌟', color: '#FFD700', visibilityBoost: 1.3 },
  { minFame: 1000, title: 'Celebrity',  icon: '💫', color: '#FF9B3A', visibilityBoost: 1.5 },
  { minFame: 2500, title: 'Superstar',  icon: '🔥', color: '#FF3A5E', visibilityBoost: 1.8 },
  { minFame: 5000, title: 'Legend',     icon: '👑', color: '#B44FFF', visibilityBoost: 2.0 },
];

export function getFameTitle(fame: number): FameTitle {
  const sorted = [...FAME_TITLES].reverse();
  return sorted.find(t => fame >= t.minFame) ?? FAME_TITLES[0];
}

export function getNextFameTitle(fame: number): FameTitle | null {
  const current = getFameTitle(fame);
  const idx = FAME_TITLES.findIndex(t => t.title === current.title);
  return idx < FAME_TITLES.length - 1 ? FAME_TITLES[idx + 1] : null;
}

export function fameProgressPct(fame: number): number {
  const current = getFameTitle(fame);
  const next = getNextFameTitle(fame);
  if (!next) return 100;
  const range = next.minFame - current.minFame;
  const progress = fame - current.minFame;
  return Math.min(100, Math.round((progress / range) * 100));
}

export function fameForPvpWin(winStreak: number): number {
  return 2 + Math.min(winStreak, 10);
}

export function fameForTournamentPlace(place: number): number {
  if (place === 1) return 25;
  if (place === 2) return 12;
  if (place === 3) return 6;
  return 2;
}

export function fameForPostLiked(): number {
  return 1;
}

export function fameForPostBoosted(): number {
  return 5;
}

export function fameForLevelUp(level: number): number {
  if (level % 10 === 0) return 10;
  if (level % 5 === 0) return 4;
  return 1;
}
