export const XP_PER_LEVEL = 200;
export const MAX_LEVEL = 100;

export function xpForLevel(level: number): number {
  return Math.floor(XP_PER_LEVEL * Math.pow(level, 1.15));
}

export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) total += xpForLevel(i);
  return total;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  let accumulated = 0;
  while (level < MAX_LEVEL) {
    const needed = xpForLevel(level);
    if (accumulated + needed > xp) break;
    accumulated += needed;
    level++;
  }
  return level;
}

export function xpProgressInLevel(xp: number): { current: number; needed: number; pct: number } {
  const level = levelFromXp(xp);
  const base = totalXpForLevel(level);
  const current = xp - base;
  const needed = xpForLevel(level);
  return { current, needed, pct: Math.min(100, Math.round((current / needed) * 100)) };
}

export function xpForMatch(score: number, accuracy: number, isWin: boolean, streak: number): number {
  let base = 20;
  base += Math.floor(score / 15);
  base += Math.floor(accuracy / 20) * 5;
  if (isWin) base += 30;
  if (streak >= 3) base += 10;
  if (streak >= 5) base += 15;
  return base;
}

export function xpForPvpWin(opponentLevel: number, playerLevel: number): number {
  const diff = opponentLevel - playerLevel;
  const base = 80;
  const bonus = Math.max(0, diff * 5);
  return base + bonus;
}

export function xpForTournamentPlace(place: number, totalPlayers: number): number {
  if (place === 1) return 300 + totalPlayers * 10;
  if (place === 2) return 200 + totalPlayers * 5;
  if (place === 3) return 120;
  return 40;
}

export const LEVEL_TITLES: { minLevel: number; title: string; color: string }[] = [
  { minLevel: 1,  title: 'Newcomer',     color: '#A8A9AD' },
  { minLevel: 5,  title: 'Learner',      color: '#3AB4FF' },
  { minLevel: 10, title: 'Competitor',   color: '#2EE87A' },
  { minLevel: 20, title: 'Fighter',      color: '#FFD93D' },
  { minLevel: 30, title: 'Challenger',   color: '#FF9B3A' },
  { minLevel: 40, title: 'Fast Thinker', color: '#FF3A5E' },
  { minLevel: 50, title: 'Expert',       color: '#B44FFF' },
  { minLevel: 60, title: 'Master',       color: '#FFD700' },
  { minLevel: 70, title: 'Word King',    color: '#FF6B35' },
  { minLevel: 85, title: 'Champion',     color: '#00D4FF' },
  { minLevel: 95, title: 'Legend',       color: '#FF3A5E' },
  { minLevel: 100, title: 'IMMORTAL',    color: '#FFD700' },
];

export function getLevelTitle(level: number): { title: string; color: string } {
  const match = [...LEVEL_TITLES].reverse().find(t => level >= t.minLevel);
  return match ?? LEVEL_TITLES[0];
}

export const TROPHIES: {
  id: string; name: string; icon: string; desc: string;
  condition: (stats: TrophyStats) => boolean;
}[] = [
  { id: 'first_pvp_win',    name: 'First Blood',     icon: '⚔️',  desc: 'Win your first PvP match', condition: s => s.pvpWins >= 1 },
  { id: 'pvp_5_wins',       name: 'Battle-Tested',   icon: '🛡️',  desc: 'Win 5 PvP matches',        condition: s => s.pvpWins >= 5 },
  { id: 'pvp_25_wins',      name: 'Warlord',         icon: '⚡',  desc: 'Win 25 PvP matches',       condition: s => s.pvpWins >= 25 },
  { id: 'level_10',         name: 'Rising Star',     icon: '🌟',  desc: 'Reach Level 10',            condition: s => s.level >= 10 },
  { id: 'level_50',         name: 'Halfway Hero',    icon: '💎',  desc: 'Reach Level 50',            condition: s => s.level >= 50 },
  { id: 'level_100',        name: 'Immortal',        icon: '👑',  desc: 'Reach Level 100',           condition: s => s.level >= 100 },
  { id: 'tournament_win',   name: 'Champion',        icon: '🏆',  desc: 'Win a tournament',         condition: s => s.tournamentWins >= 1 },
  { id: 'win_streak_5',     name: 'On Fire',         icon: '🔥',  desc: '5 wins in a row',           condition: s => s.pvpWinStreak >= 5 },
  { id: 'win_streak_10',    name: 'Unstoppable',     icon: '💥',  desc: '10 wins in a row',          condition: s => s.pvpWinStreak >= 10 },
  { id: 'coins_1000',       name: 'Moneybags',       icon: '💰',  desc: 'Hold 1000+ coins',          condition: s => s.coins >= 1000 },
];

export interface TrophyStats {
  pvpWins: number;
  pvpWinStreak: number;
  level: number;
  tournamentWins: number;
  coins: number;
}

export function checkNewTrophies(stats: TrophyStats, earnedIds: string[]): typeof TROPHIES {
  return TROPHIES.filter(t => !earnedIds.includes(t.id) && t.condition(stats));
}
