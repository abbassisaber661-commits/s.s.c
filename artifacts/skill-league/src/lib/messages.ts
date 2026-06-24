export type NotifType =
  | 'system'
  | 'pvp_result'
  | 'tournament'
  | 'trophy'
  | 'level_up'
  | 'weekly_complete'
  | 'season_reward'
  | 'community_like'
  | 'verified';

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  icon: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
}

const NOTIFS_KEY = 'sl_notifications';

export function getNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(NOTIFS_KEY);
    if (raw) return JSON.parse(raw) as Notification[];
  } catch { /* ignore */ }
  return getSeedNotifications();
}

export function saveNotifications(notifs: Notification[]) {
  localStorage.setItem(NOTIFS_KEY, JSON.stringify(notifs.slice(0, 50)));
}

export function addNotification(notif: Omit<Notification, 'id' | 'timestamp' | 'read'>): Notification[] {
  const full: Notification = {
    ...notif,
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    read: false,
  };
  const existing = getNotifications();
  const updated = [full, ...existing].slice(0, 50);
  saveNotifications(updated);
  return updated;
}

export function markAllRead(): Notification[] {
  const notifs = getNotifications().map(n => ({ ...n, read: true }));
  saveNotifications(notifs);
  return notifs;
}

export function markRead(id: string): Notification[] {
  const notifs = getNotifications().map(n => n.id === id ? { ...n, read: true } : n);
  saveNotifications(notifs);
  return notifs;
}

export function unreadCount(notifs: Notification[]): number {
  return notifs.filter(n => !n.read).length;
}

export function getAge(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  if (h < 24)  return `${h}h ago`;
  return `${d}d ago`;
}

function getSeedNotifications(): Notification[] {
  const now = Date.now();
  const list: Notification[] = [
    {
      id: 'seed_1', type: 'system', title: 'Welcome to SkillLeague!',
      body: 'Complete your first match to earn coins and XP.',
      icon: '🎮', timestamp: now - 5 * 60_000, read: false, actionUrl: '/leagues',
    },
    {
      id: 'seed_2', type: 'system', title: 'Season 29: Ember is live',
      body: 'Reach Gold rank (1150+ ELO) before the season ends for 300 coins + 500 XP.',
      icon: '🌀', timestamp: now - 30 * 60_000, read: false, actionUrl: '/seasons',
    },
    {
      id: 'seed_3', type: 'system', title: 'New Weekly Missions available',
      body: '5 missions reset this week — up to 605 coins + 900 XP.',
      icon: '📋', timestamp: now - 2 * 3_600_000, read: false, actionUrl: '/daily-challenges',
    },
    {
      id: 'seed_4', type: 'system', title: 'Pi Store is now open!',
      body: 'Buy coin bundles, XP boosts, and cosmetic items using Pi.',
      icon: '🛒', timestamp: now - 6 * 3_600_000, read: true, actionUrl: '/store',
    },
  ];
  saveNotifications(list);
  return list;
}

export function createLevelUpNotif(level: number, title: string): Omit<Notification, 'id' | 'timestamp' | 'read'> {
  return {
    type: 'level_up',
    title: `Level Up! You're now Level ${level}`,
    body: `New title unlocked: ${title}`,
    icon: '⬆️',
    actionUrl: '/profile',
  };
}

export function createTrophyNotif(trophyName: string): Omit<Notification, 'id' | 'timestamp' | 'read'> {
  return {
    type: 'trophy',
    title: `Trophy Unlocked: ${trophyName}`,
    body: '+50 coins added to your wallet',
    icon: '🏅',
    actionUrl: '/profile',
  };
}
