export interface Title {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  description: string;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirement: (stats: TitleStats) => boolean;
  priority: number;
}

export interface TitleStats {
  level: number;
  elo: number;
  matchesPlayed: number;
  pvpWins: number;
  tournamentWins: number;
  trophyCount: number;
  dnBalance: number;
  pvpWinStreak: number;
  achievementCount: number;
  currentSeasonNumber: number;
  isFounder?: boolean;
}

export const TITLES: Title[] = [
  {
    id: 'founder',
    name: 'Founder',
    nameAr: 'مؤسس',
    icon: '🏛️',
    description: 'One of the first players ever',
    color: '#f59e0b',
    rarity: 'legendary',
    requirement: (s) => s.isFounder === true || s.currentSeasonNumber <= 2,
    priority: 100,
  },
  {
    id: 'season_winner',
    name: 'Season Winner',
    nameAr: 'بطل الموسم',
    icon: '🌀',
    description: 'Won an official season',
    color: '#8b5cf6',
    rarity: 'legendary',
    requirement: (s) => s.tournamentWins >= 3,
    priority: 90,
  },
  {
    id: 'champion',
    name: 'Champion',
    nameAr: 'بطل',
    icon: '🏆',
    description: 'ELO 1800+ and 10+ tournament wins',
    color: '#f59e0b',
    rarity: 'epic',
    requirement: (s) => s.elo >= 1800 && s.tournamentWins >= 10,
    priority: 80,
  },
  {
    id: 'legend',
    name: 'Legend',
    nameAr: 'أسطورة',
    icon: '⚡',
    description: 'Level 50+ and ELO 1600+',
    color: '#06b6d4',
    rarity: 'epic',
    requirement: (s) => s.level >= 50 && s.elo >= 1600,
    priority: 75,
  },
  {
    id: 'top100',
    name: 'Top 100',
    nameAr: 'أفضل 100',
    icon: '💎',
    description: 'Reached ELO 1500+',
    color: '#3b82f6',
    rarity: 'epic',
    requirement: (s) => s.elo >= 1500,
    priority: 70,
  },
  {
    id: 'pvp_master',
    name: 'PvP Master',
    nameAr: 'سيد PvP',
    icon: '⚔️',
    description: '100+ PvP wins',
    color: '#ef4444',
    rarity: 'rare',
    requirement: (s) => s.pvpWins >= 100,
    priority: 60,
  },
  {
    id: 'streak_king',
    name: 'Streak King',
    nameAr: 'ملك السلاسل',
    icon: '🔥',
    description: '10+ PvP win streak',
    color: '#f97316',
    rarity: 'rare',
    requirement: (s) => s.pvpWinStreak >= 10,
    priority: 55,
  },
  {
    id: 'collector',
    name: 'Collector',
    nameAr: 'جامع',
    icon: '🎖️',
    description: '20+ achievements unlocked',
    color: '#10b981',
    rarity: 'rare',
    requirement: (s) => s.achievementCount >= 20,
    priority: 50,
  },
  {
    id: 'veteran',
    name: 'Veteran',
    nameAr: 'محارب قديم',
    icon: '🛡️',
    description: '500+ matches played',
    color: '#64748b',
    rarity: 'common',
    requirement: (s) => s.matchesPlayed >= 500,
    priority: 40,
  },
  {
    id: 'rich',
    name: 'Millionaire',
    nameAr: 'مليونير',
    icon: '💰',
    description: '10,000+ DN$ earned',
    color: '#fbbf24',
    rarity: 'rare',
    requirement: (s) => s.dnBalance >= 10000,
    priority: 45,
  },
  {
    id: 'newcomer',
    name: 'Newcomer',
    nameAr: 'وافد جديد',
    icon: '🌱',
    description: 'Just getting started',
    color: '#84cc16',
    rarity: 'common',
    requirement: (s) => s.matchesPlayed >= 1,
    priority: 1,
  },
];

export function getEarnedTitles(stats: TitleStats): Title[] {
  return TITLES.filter(t => t.requirement(stats)).sort((a, b) => b.priority - a.priority);
}

export function getActiveTitleId(stats: TitleStats, selectedId?: string | null): string | null {
  const earned = getEarnedTitles(stats);
  if (!earned.length) return null;
  if (selectedId && earned.find(t => t.id === selectedId)) return selectedId;
  return earned[0].id;
}

export function getTitleById(id: string): Title | undefined {
  return TITLES.find(t => t.id === id);
}

export const RARITY_COLORS: Record<string, string> = {
  common: '#94a3b8',
  rare: '#3b82f6',
  epic: '#8b5cf6',
  legendary: '#f59e0b',
};
