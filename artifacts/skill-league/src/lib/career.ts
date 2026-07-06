export interface CareerMilestone {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  requirement: (stats: CareerStats) => boolean;
  reward: { dn: number; xp: number; badge?: string };
  order: number;
}

export interface CareerTier {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  color: string;
  minLevel: number;
  minElo: number;
  description: string;
  descriptionAr: string;
  perks: string[];
  perksAr: string[];
}

export interface CareerStats {
  level: number;
  elo: number;
  matchesPlayed: number;
  pvpWins: number;
  tournamentWins: number;
  achievementCount: number;
  dn: number;
  bestStreak: number;
  fame: number;
}

export const CAREER_TIERS: CareerTier[] = [
  {
    id: 'rookie',
    name: 'Rookie',
    nameAr: 'مبتدئ',
    icon: '🌱',
    color: '#84cc16',
    minLevel: 1,
    minElo: 0,
    description: 'Just starting your journey',
    descriptionAr: 'بداية رحلتك',
    perks: ['Access to all game modes', 'Daily rewards'],
    perksAr: ['الوصول لجميع أوضاع اللعب', 'مكافآت يومية'],
  },
  {
    id: 'prospect',
    name: 'Prospect',
    nameAr: 'واعد',
    icon: '🌿',
    color: '#22c55e',
    minLevel: 10,
    minElo: 1100,
    description: 'Showing promise and skill',
    descriptionAr: 'تُظهر وعداً ومهارة',
    perks: ['Unlock silver league', 'Weekly mission bonuses'],
    perksAr: ['فتح الدوري الفضي', 'مكافآت المهمات الأسبوعية'],
  },
  {
    id: 'competitor',
    name: 'Competitor',
    nameAr: 'منافس',
    icon: '⚔️',
    color: '#3b82f6',
    minLevel: 20,
    minElo: 1250,
    description: 'A genuine competitor on the rise',
    descriptionAr: 'منافس حقيقي في صعود',
    perks: ['Tournament access', 'Ranked PvP bonuses', 'Career achievements badge'],
    perksAr: ['الوصول للبطولات', 'مكافآت PvP المصنّفة', 'شارة إنجازات المسيرة'],
  },
  {
    id: 'veteran',
    name: 'Veteran',
    nameAr: 'محارب قديم',
    icon: '🛡️',
    color: '#f59e0b',
    minLevel: 35,
    minElo: 1400,
    description: 'Battle-hardened with experience',
    descriptionAr: 'مُصلَّب بالتجارب والمعارك',
    perks: ['Elite league access', 'Veteran badge', 'Bonus clan coins', 'Priority in events'],
    perksAr: ['الوصول للدوري النخبوي', 'شارة المحارب القديم', 'عملات فريق إضافية', 'أولوية في الأحداث'],
  },
  {
    id: 'elite',
    name: 'Elite',
    nameAr: 'نخبوي',
    icon: '💎',
    color: '#8b5cf6',
    minLevel: 50,
    minElo: 1600,
    description: 'Among the best players in the league',
    descriptionAr: 'من أفضل اللاعبين في الدوري',
    perks: ['All elite perks', 'Diamond frame unlocked', 'Elite social badge', 'Top leaderboard access'],
    perksAr: ['جميع امتيازات النخبة', 'فتح الإطار الألماسي', 'شارة اجتماعية نخبوية', 'الوصول لأعلى لوحة المتصدرين'],
  },
  {
    id: 'legend',
    name: 'Legend',
    nameAr: 'أسطورة',
    icon: '⚡',
    color: '#06b6d4',
    minLevel: 65,
    minElo: 1750,
    description: 'A true legend of the game',
    descriptionAr: 'أسطورة حقيقية في اللعبة',
    perks: ['Legend title', 'Legendary frame', 'Season rewards doubled', 'Community Hall of Fame'],
    perksAr: ['لقب الأسطورة', 'الإطار الأسطوري', 'مكافآت الموسم مضاعفة', 'قاعة المشاهير'],
  },
  {
    id: 'champion',
    name: 'Champion',
    nameAr: 'بطل',
    icon: '👑',
    color: '#f59e0b',
    minLevel: 80,
    minElo: 1900,
    description: 'The pinnacle of competitive excellence',
    descriptionAr: 'قمة التميز التنافسي',
    perks: ['Champion title', 'Crown frame', 'All bonuses maxed', 'Exclusive champion tournaments', 'Hall of Champions'],
    perksAr: ['لقب البطل', 'إطار التاج', 'جميع المكافآت في الحد الأقصى', 'بطولات البطل الحصرية', 'قاعة الأبطال'],
  },
];

export const CAREER_MILESTONES: CareerMilestone[] = [
  { id: 'first_match',      title: 'First Steps',         titleAr: 'الخطوات الأولى',   description: 'Play your first match',            descriptionAr: 'العب مباراتك الأولى',          icon: '👣', requirement: s => s.matchesPlayed >= 1,     reward: { dn: 50,   xp: 100  }, order: 1  },
  { id: 'first_pvp_win',    title: 'PvP Initiation',       titleAr: 'انطلاقة PvP',      description: 'Win your first PvP match',         descriptionAr: 'اربح مباراة PvP الأولى',       icon: '⚔️', requirement: s => s.pvpWins >= 1,           reward: { dn: 100,  xp: 200  }, order: 2  },
  { id: 'level10',          title: 'Rising Star',          titleAr: 'نجم صاعد',          description: 'Reach Level 10',                  descriptionAr: 'الوصول للمستوى 10',            icon: '⭐', requirement: s => s.level >= 10,            reward: { dn: 200,  xp: 400  }, order: 3  },
  { id: 'elo1200',          title: 'Ranked Player',        titleAr: 'لاعب مصنّف',       description: 'Reach 1200 ELO',                  descriptionAr: 'الوصول لـ 1200 نقطة ELO',     icon: '📊', requirement: s => s.elo >= 1200,            reward: { dn: 300,  xp: 600  }, order: 4  },
  { id: 'pvp_10',           title: 'PvP Veteran',          titleAr: 'محارب PvP',        description: 'Win 10 PvP matches',               descriptionAr: 'اربح 10 مباريات PvP',          icon: '🏅', requirement: s => s.pvpWins >= 10,          reward: { dn: 400,  xp: 800  }, order: 5  },
  { id: 'tournament_win',   title: 'Tournament Victor',    titleAr: 'بطل البطولة',      description: 'Win your first tournament',        descriptionAr: 'اربح بطولتك الأولى',          icon: '🏆', requirement: s => s.tournamentWins >= 1,    reward: { dn: 600,  xp: 1200 }, order: 6  },
  { id: 'level25',          title: 'Experienced',          titleAr: 'متمرس',             description: 'Reach Level 25',                  descriptionAr: 'الوصول للمستوى 25',            icon: '🌟', requirement: s => s.level >= 25,            reward: { dn: 500,  xp: 1000 }, order: 7  },
  { id: 'elo1400',          title: 'Elite Contender',      titleAr: 'منافس نخبوي',      description: 'Reach 1400 ELO',                  descriptionAr: 'الوصول لـ 1400 نقطة ELO',     icon: '💎', requirement: s => s.elo >= 1400,            reward: { dn: 700,  xp: 1400 }, order: 8  },
  { id: 'pvp_50',           title: 'PvP Warrior',          titleAr: 'محارب PvP متمرس', description: 'Win 50 PvP matches',               descriptionAr: 'اربح 50 مباراة PvP',          icon: '⚔️', requirement: s => s.pvpWins >= 50,          reward: { dn: 1000, xp: 2000 }, order: 9  },
  { id: 'level50',          title: 'Half Century',         titleAr: 'نصف قرن',          description: 'Reach Level 50',                  descriptionAr: 'الوصول للمستوى 50',            icon: '👑', requirement: s => s.level >= 50,            reward: { dn: 1500, xp: 3000 }, order: 10 },
  { id: 'elo1600',          title: 'Legend Territory',     titleAr: 'أرض الأساطير',     description: 'Reach 1600 ELO',                  descriptionAr: 'الوصول لـ 1600 نقطة ELO',     icon: '⚡', requirement: s => s.elo >= 1600,            reward: { dn: 2000, xp: 4000 }, order: 11 },
  { id: 'pvp_100',          title: 'PvP Legend',           titleAr: 'أسطورة PvP',       description: 'Win 100 PvP matches',              descriptionAr: 'اربح 100 مباراة PvP',         icon: '🌟', requirement: s => s.pvpWins >= 100,         reward: { dn: 2500, xp: 5000 }, order: 12 },
  { id: 'matches_500',      title: 'Road to Legend',       titleAr: 'طريق الأسطورة',    description: 'Play 500 matches',                 descriptionAr: 'العب 500 مباراة',             icon: '🛣️', requirement: s => s.matchesPlayed >= 500,   reward: { coins: 3000, xp: 6000 }, order: 13 },
  { id: 'elo1800',          title: 'Champion\'s Path',     titleAr: 'طريق البطل',       description: 'Reach 1800 ELO — true champion',   descriptionAr: 'الوصول لـ 1800 ELO — بطل حقيقي', icon: '🏆', requirement: s => s.elo >= 1800,         reward: { coins: 5000, xp: 10000}, order: 14 },
];

const MILESTONES_KEY = 'skill_league_career_milestones';

export function getClaimedMilestones(): string[] {
  try { return JSON.parse(localStorage.getItem(MILESTONES_KEY) || '[]'); } catch { return []; }
}

export function claimMilestone(id: string) {
  const claimed = getClaimedMilestones();
  if (!claimed.includes(id)) {
    claimed.push(id);
    localStorage.setItem(MILESTONES_KEY, JSON.stringify(claimed));
  }
}

export function getCurrentCareerTier(stats: CareerStats): CareerTier {
  let tier = CAREER_TIERS[0];
  for (const t of CAREER_TIERS) {
    if (stats.level >= t.minLevel && stats.elo >= t.minElo) tier = t;
    else break;
  }
  return tier;
}

export function getNextCareerTier(stats: CareerStats): CareerTier | null {
  const current = getCurrentCareerTier(stats);
  const idx = CAREER_TIERS.findIndex(t => t.id === current.id);
  return CAREER_TIERS[idx + 1] ?? null;
}

export function getCareerProgress(stats: CareerStats, next: CareerTier | null): number {
  if (!next) return 100;
  const current = getCurrentCareerTier(stats);
  const levelRange = next.minLevel - current.minLevel;
  const eloRange   = next.minElo   - current.minElo;
  const levelPct   = levelRange > 0 ? Math.min(1, (stats.level - current.minLevel) / levelRange) : 1;
  const eloPct     = eloRange   > 0 ? Math.min(1, (stats.elo   - current.minElo)   / eloRange)   : 1;
  return Math.round(Math.min(levelPct, eloPct) * 100);
}
