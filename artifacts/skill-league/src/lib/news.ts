export interface NewsItem {
  id: string;
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  icon: string;
  type: 'update' | 'event' | 'season' | 'announcement' | 'maintenance';
  date: string;
  isNew: boolean;
  isPinned: boolean;
  actionUrl?: string;
}

const READ_KEY = 'skill_league_news_read';

export function getReadNewsIds(): string[] {
  try { return JSON.parse(localStorage.getItem(READ_KEY) || '[]'); } catch { return []; }
}

export function markNewsRead(id: string) {
  const ids = getReadNewsIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(READ_KEY, JSON.stringify(ids));
  }
}

export function markAllNewsRead() {
  const ids = NEWS_ITEMS.map(n => n.id);
  localStorage.setItem(READ_KEY, JSON.stringify(ids));
}

export function getUnreadCount(): number {
  const readIds = getReadNewsIds();
  return NEWS_ITEMS.filter(n => !readIds.includes(n.id)).length;
}

export const NEWS_ITEMS: NewsItem[] = [
  {
    id: 'news_phase16',
    title: '🚀 Phase 16 — Major Update!',
    titleAr: '🚀 المرحلة السادسة عشرة — تحديث ضخم!',
    body: 'Phase 16 is live! We\'ve added Clans, Titles, Loot Boxes, Daily Rewards with Spin Wheel, VIP system, Global Events, Career Progression, and an AI Coach. This is our biggest update yet — enjoy S.S.C like never before!',
    bodyAr: 'المرحلة 16 هنا! أضفنا الفرق، الألقاب، صناديق النهب، المكافآت اليومية مع عجلة الحظ، نظام VIP، الأحداث العالمية، مسار المهنة، ومساعد الذكاء الاصطناعي. هذا أكبر تحديث لدينا حتى الآن — استمتع بـ S.S.C كما لم يحدث من قبل!',
    icon: '🚀',
    type: 'update',
    date: new Date().toISOString(),
    isNew: true,
    isPinned: true,
    actionUrl: '/',
  },
  {
    id: 'news_worldchamp',
    title: '🌍 World Championship — Registration Open!',
    titleAr: '🌍 بطولة العالم — التسجيل مفتوح!',
    body: 'The biggest tournament in S.S.C history is here! Register now to compete for the Champion title, 10,000 DN$, and the exclusive Legendary Frame. Top 100 players all receive rewards!',
    bodyAr: 'أكبر بطولة في تاريخ S.S.C هنا! سجّل الآن للتنافس على لقب البطل و10,000 DN$ والإطار الأسطوري الحصري. أفضل 100 لاعب يحصلون جميعاً على مكافآت!',
    icon: '🌍',
    type: 'event',
    date: new Date(Date.now() - 86400000).toISOString(),
    isNew: true,
    isPinned: true,
    actionUrl: '/events',
  },
  {
    id: 'news_season3',
    title: '🌀 Season 3 is Now Live!',
    titleAr: '🌀 الموسم الثالث الآن متاح!',
    body: 'Season 3 has officially started! New ELO rankings, seasonal rewards, and exclusive season-limited items in the store. Compete for the Season Winner title before the season ends!',
    bodyAr: 'بدأ الموسم الثالث رسمياً! ترتيبات ELO جديدة، مكافآت موسمية، وعناصر حصرية محدودة بالموسم في المتجر. تنافس على لقب بطل الموسم قبل انتهاء الموسم!',
    icon: '🌀',
    type: 'season',
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    isNew: false,
    isPinned: false,
    actionUrl: '/seasons',
  },
  {
    id: 'news_clans',
    title: '🏰 Clans System Launched!',
    titleAr: '🏰 نظام الفرق انطلق!',
    body: 'Create or join a Clan with your friends! Contribute DN$ to level up your clan, compete in Clan rankings, and unlock exclusive clan rewards. Find your team and dominate together!',
    bodyAr: 'أنشئ أو انضم إلى فريق مع أصدقائك! ساهم بـ DN$ لترقية فريقك، وتنافس في ترتيبات الفرق، وافتح مكافآت الفريق الحصرية. ابحث عن فريقك وسيطر معاً!',
    icon: '🏰',
    type: 'update',
    date: new Date(Date.now() - 3 * 86400000).toISOString(),
    isNew: false,
    isPinned: false,
    actionUrl: '/clans',
  },
  {
    id: 'news_vip',
    title: '👑 VIP Membership is Here!',
    titleAr: '👑 عضوية VIP هنا!',
    body: 'Become a VIP member and enjoy exclusive benefits: VIP badge, premium avatars, exclusive frames, bonus DN$ on every match, early access to new features, and priority in tournaments!',
    bodyAr: 'كن عضواً VIP واستمتع بمزايا حصرية: شارة VIP، أفاتارات مميزة، إطارات حصرية، DN$ إضافية في كل مباراة، وصول مبكر للميزات الجديدة، والأولوية في البطولات!',
    icon: '👑',
    type: 'announcement',
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
    isNew: false,
    isPinned: false,
    actionUrl: '/vip',
  },
  {
    id: 'news_maintenance',
    title: '🔧 Scheduled Maintenance Notice',
    titleAr: '🔧 إشعار صيانة مجدولة',
    body: 'S.S.C will undergo brief maintenance this weekend for performance improvements. Downtime expected: 2 hours. All players will receive 50 bonus DN$ as compensation.',
    bodyAr: 'سيخضع S.S.C لصيانة مختصرة هذا الأسبوع لتحسينات الأداء. وقت التوقف المتوقع: ساعتان. سيحصل جميع اللاعبين على 50 DN$ إضافية كتعويض.',
    icon: '🔧',
    type: 'maintenance',
    date: new Date(Date.now() - 7 * 86400000).toISOString(),
    isNew: false,
    isPinned: false,
  },
];

export const TYPE_COLORS = {
  update:       '#3b82f6',
  event:        '#8b5cf6',
  season:       '#06b6d4',
  announcement: '#f59e0b',
  maintenance:  '#6b7280',
};

export const TYPE_LABELS = {
  en: { update: 'Update', event: 'Event', season: 'Season', announcement: 'News', maintenance: 'System' },
  ar: { update: 'تحديث', event: 'حدث',   season: 'موسم',   announcement: 'خبر',  maintenance: 'نظام'  },
};
