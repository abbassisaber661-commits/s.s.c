export interface SocialLeague {
  name: string;
  color: string;
  icon: string;
  minLevel: number;
}

const LEAGUES: SocialLeague[] = [
  { name: 'Champion', color: '#ef4444', icon: '👑', minLevel: 40 },
  { name: 'Elite',    color: '#a78bfa', icon: '⚡', minLevel: 30 },
  { name: 'Gold',     color: '#FFD700', icon: '🥇', minLevel: 20 },
  { name: 'Silver',   color: '#A8A9AD', icon: '🥈', minLevel: 10 },
  { name: 'Bronze',   color: '#CD7F32', icon: '🥉', minLevel: 1  },
];

export function getSocialLeague(level: number): SocialLeague {
  for (const league of LEAGUES) {
    if (level >= league.minLevel) return league;
  }
  return LEAGUES[LEAGUES.length - 1];
}
