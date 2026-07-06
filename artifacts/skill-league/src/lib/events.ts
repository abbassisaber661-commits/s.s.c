export interface GameEvent {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  type: 'weekly' | 'seasonal' | 'global' | 'special';
  startDate: string;
  endDate: string;
  rewards: EventReward[];
  missions: EventMission[];
  isActive: boolean;
  color: string;
  banner?: string;
}

export interface EventReward {
  rank: string;
  rankAr: string;
  icon: string;
  dn: number;
  xp: number;
  special?: string;
  specialAr?: string;
}

export interface EventMission {
  id: string;
  title: string;
  titleAr: string;
  goal: number;
  type: 'wins' | 'matches' | 'pvp_wins' | 'score' | 'coins';
  reward: { dn: number; xp: number };
}

const PROGRESS_KEY = 'skill_league_event_progress';

export function getEventProgress(): Record<string, Record<string, number>> {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); } catch { return {}; }
}

export function updateEventProgress(eventId: string, missionId: string, delta: number) {
  const data = getEventProgress();
  if (!data[eventId]) data[eventId] = {};
  data[eventId][missionId] = (data[eventId][missionId] || 0) + delta;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
}

function getDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export const ACTIVE_EVENTS: GameEvent[] = [
  {
    id: 'speed_week',
    title: '⚡ Speed Week',
    titleAr: '⚡ أسبوع السرعة',
    description: 'Win the most PvP matches this week to claim top rewards!',
    descriptionAr: 'اربح أكبر عدد من مباريات PvP هذا الأسبوع للحصول على أفضل الجوائز!',
    icon: '⚡',
    type: 'weekly',
    startDate: new Date().toISOString(),
    endDate: getDateOffset(7),
    color: '#f59e0b',
    isActive: true,
    rewards: [
      { rank: '1st', rankAr: 'المركز الأول',  icon: '🥇', dn: 2000, xp: 1000, special: 'Season Winner Title', specialAr: 'لقب بطل الموسم' },
      { rank: '2nd', rankAr: 'المركز الثاني', icon: '🥈', dn: 1200, xp: 600  },
      { rank: '3rd', rankAr: 'المركز الثالث', icon: '🥉', dn: 700,  xp: 350  },
      { rank: 'Top 10', rankAr: 'أفضل 10',    icon: '🏅', dn: 300,  xp: 150  },
    ],
    missions: [
      { id: 'win5',    title: 'Win 5 PvP matches',    titleAr: 'اربح 5 مباريات PvP',   goal: 5,   type: 'pvp_wins', reward: { dn: 100, xp: 50  } },
      { id: 'win15',   title: 'Win 15 PvP matches',   titleAr: 'اربح 15 مباراة PvP',   goal: 15,  type: 'pvp_wins', reward: { dn: 250, xp: 120 } },
      { id: 'win30',   title: 'Win 30 PvP matches',   titleAr: 'اربح 30 مباراة PvP',   goal: 30,  type: 'pvp_wins', reward: { dn: 500, xp: 250 } },
    ],
  },
  {
    id: 'coin_rush',
    title: '💰 Coin Rush',
    titleAr: '💰 سباق العملات',
    description: 'Earn coins to unlock exclusive seasonal rewards!',
    descriptionAr: 'اكسب عملات للحصول على مكافآت موسمية حصرية!',
    icon: '💰',
    type: 'seasonal',
    startDate: new Date().toISOString(),
    endDate: getDateOffset(14),
    color: '#10b981',
    isActive: true,
    rewards: [
      { rank: '1st',    rankAr: 'المركز الأول',  icon: '🥇', dn: 5000, xp: 2000, special: 'Legendary Frame', specialAr: 'إطار أسطوري' },
      { rank: '2nd',    rankAr: 'المركز الثاني', icon: '🥈', dn: 3000, xp: 1200 },
      { rank: '3rd',    rankAr: 'المركز الثالث', icon: '🥉', dn: 1500, xp: 700  },
      { rank: 'Top 50', rankAr: 'أفضل 50',       icon: '🏅', dn: 500,  xp: 200  },
    ],
    missions: [
      { id: 'earn500',   title: 'Earn 500 coins',   titleAr: 'اكسب 500 عملة',   goal: 500,  type: 'coins', reward: { dn: 75,  xp: 40  } },
      { id: 'earn2000',  title: 'Earn 2000 coins',  titleAr: 'اكسب 2000 عملة',  goal: 2000, type: 'coins', reward: { dn: 200, xp: 100 } },
      { id: 'earn5000',  title: 'Earn 5000 coins',  titleAr: 'اكسب 5000 عملة',  goal: 5000, type: 'coins', reward: { dn: 500, xp: 250 } },
    ],
  },
  {
    id: 'global_championship',
    title: '🌍 World Championship',
    titleAr: '🌍 بطولة العالم',
    description: 'The greatest competition of the season. Top players worldwide compete!',
    descriptionAr: 'أعظم منافسة في الموسم. أفضل اللاعبين في العالم يتنافسون!',
    icon: '🌍',
    type: 'global',
    startDate: new Date().toISOString(),
    endDate: getDateOffset(30),
    color: '#8b5cf6',
    isActive: true,
    rewards: [
      { rank: 'Champion',  rankAr: 'البطل',         icon: '👑', dn: 10000, xp: 5000, special: 'Champion Title + Legendary Frame', specialAr: 'لقب بطل + إطار أسطوري' },
      { rank: 'Runner-up', rankAr: 'الوصيف',        icon: '🥈', dn: 6000,  xp: 3000, special: 'Legend Title', specialAr: 'لقب أسطورة' },
      { rank: '3rd Place', rankAr: 'المركز الثالث', icon: '🥉', dn: 3500,  xp: 1500 },
      { rank: 'Top 10',    rankAr: 'أفضل 10',       icon: '🏅', dn: 1500,  xp: 700  },
      { rank: 'Top 100',   rankAr: 'أفضل 100',      icon: '🎖️', dn: 500,   xp: 200  },
    ],
    missions: [
      { id: 'play10',    title: 'Play 10 matches',    titleAr: 'العب 10 مباريات',     goal: 10,  type: 'matches',  reward: { dn: 150,  xp: 75  } },
      { id: 'pvpwin20',  title: 'Win 20 PvP matches', titleAr: 'اربح 20 مباراة PvP',  goal: 20,  type: 'pvp_wins', reward: { dn: 400,  xp: 200 } },
      { id: 'score300',  title: 'Score 300 in a match',titleAr: 'سجّل 300 في مباراة', goal: 300, type: 'score',    reward: { dn: 600,  xp: 300 } },
    ],
  },
];

export function getTimeRemaining(endDate: string): string {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

export function getTimeRemainingAr(endDate: string): string {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return 'انتهى';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days} يوم ${hours} ساعة`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours} ساعة ${mins} دقيقة`;
}
