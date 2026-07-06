export interface Season {
  number: number;
  name: string;
  startDate: string;
  endDate: string;
  theme: string;
  color: string;
}

export interface SeasonRecord {
  seasonNumber: number;
  seasonName: string;
  finalElo: number;
  rank: string;
  rankColor: string;
  dnEarned: number;
  xpEarned: number;
}

export type SeasonRankName = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Legend';

export interface SeasonTier {
  rank: SeasonRankName;
  minElo: number;
  color: string;
  icon: string;
  endRewardDN: number;
  endRewardXp: number;
  description: string;
}

export const SEASON_TIERS: SeasonTier[] = [
  { rank: 'Bronze',   minElo: 0,    color: '#CD7F32', icon: '🥉', endRewardDN: 50,   endRewardXp: 100,  description: 'Keep climbing!' },
  { rank: 'Silver',   minElo: 1050, color: '#A8A9AD', icon: '🥈', endRewardDN: 150,  endRewardXp: 250,  description: 'Solid player' },
  { rank: 'Gold',     minElo: 1150, color: '#FFD700', icon: '🥇', endRewardDN: 300,  endRewardXp: 500,  description: 'Above average' },
  { rank: 'Platinum', minElo: 1300, color: '#3AB4FF', icon: '💎', endRewardDN: 600,  endRewardXp: 800,  description: 'Elite tier' },
  { rank: 'Diamond',  minElo: 1500, color: '#B44FFF', icon: '💠', endRewardDN: 1000, endRewardXp: 1200, description: 'Top 5%' },
  { rank: 'Legend',   minElo: 1800, color: '#FF3A5E', icon: '👑', endRewardDN: 2000, endRewardXp: 2000, description: 'Best of the best' },
];

export function getSeasonTier(elo: number): SeasonTier {
  const sorted = [...SEASON_TIERS].reverse();
  return sorted.find(t => elo >= t.minElo) ?? SEASON_TIERS[0];
}

export function getNextSeasonTier(elo: number): SeasonTier | null {
  const current = getSeasonTier(elo);
  const idx = SEASON_TIERS.findIndex(t => t.rank === current.rank);
  return idx < SEASON_TIERS.length - 1 ? SEASON_TIERS[idx + 1] : null;
}

const SEASON_NAMES = [
  'Dawn', 'Blaze', 'Storm', 'Frost', 'Ember', 'Thunder',
  'Veil', 'Eclipse', 'Surge', 'Inferno', 'Void', 'Apex',
];

export function getCurrentSeason(): Season {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const totalMonths = (year - 2024) * 12 + month;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  return {
    number: totalMonths + 1,
    name: `Season ${totalMonths + 1}: ${SEASON_NAMES[month % 12]}`,
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    theme: SEASON_NAMES[month % 12],
    color: SEASON_TIERS[totalMonths % SEASON_TIERS.length].color,
  };
}

export function getDaysLeftInSeason(): number {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getSeasonProgress(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime();
  return Math.round(((now.getTime() - start) / (end - start)) * 100);
}

export function buildMockSeasonLeaderboard(playerElo: number, playerName: string) {
  const bots = [
    { name: 'QuantumBolt77', elo: 1920 },
    { name: 'NeonArrow42',   elo: 1810 },
    { name: 'SwiftHawk99',   elo: 1750 },
    { name: 'IronMind55',    elo: 1680 },
    { name: 'StarFox21',     elo: 1590 },
    { name: 'GoldWolf88',    elo: 1430 },
    { name: 'BrightEagle34', elo: 1310 },
    { name: 'SharpBolt12',   elo: 1180 },
    { name: 'QuickTiger66',  elo: 1090 },
  ];
  const entries = bots.map(b => ({ ...b, isPlayer: false }));
  entries.push({ name: playerName, elo: playerElo, isPlayer: true });
  entries.sort((a, b) => b.elo - a.elo);
  return entries.slice(0, 10).map((e, i) => ({ ...e, rank: i + 1 }));
}
