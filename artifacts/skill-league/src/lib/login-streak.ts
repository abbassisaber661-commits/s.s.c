const STREAK_KEY = 'sl_login_streak';

export interface LoginStreakData {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string;
  totalLoginDays: number;
  claimedDates: string[];
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

const DEFAULT: LoginStreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastLoginDate: '',
  totalLoginDays: 0,
  claimedDates: [],
};

export function loadStreakData(): LoginStreakData {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT };
}

export function saveStreakData(data: LoginStreakData): void {
  localStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

export interface StreakCheckResult {
  updated: LoginStreakData;
  isNewDay: boolean;
  streakBroken: boolean;
  rewardDN: number;
  rewardXp: number;
  milestoneReached: number | null;
}

export function checkAndUpdateStreak(): StreakCheckResult {
  const data = loadStreakData();
  const today = todayStr();
  const yesterday = yesterdayStr();

  if (data.lastLoginDate === today) {
    return { updated: data, isNewDay: false, streakBroken: false, rewardDN: 0, rewardXp: 0, milestoneReached: null };
  }

  let newStreak: number;
  let streakBroken = false;

  if (data.lastLoginDate === yesterday) {
    newStreak = data.currentStreak + 1;
  } else if (data.lastLoginDate === '') {
    newStreak = 1;
  } else {
    newStreak = 1;
    streakBroken = data.currentStreak > 1;
  }

  const longestStreak = Math.max(data.longestStreak, newStreak);
  const totalLoginDays = data.totalLoginDays + 1;

  const { dn, xp, milestone } = getStreakReward(newStreak);

  const updated: LoginStreakData = {
    currentStreak: newStreak,
    longestStreak,
    lastLoginDate: today,
    totalLoginDays,
    claimedDates: [...data.claimedDates, today],
  };

  saveStreakData(updated);

  return {
    updated,
    isNewDay: true,
    streakBroken,
    rewardDN: dn,
    rewardXp: xp,
    milestoneReached: milestone,
  };
}

export function getStreakReward(streak: number): { dn: number; xp: number; milestone: number | null } {
  const milestones: Record<number, { dn: number; xp: number }> = {
    3:  { dn: 3,  xp: 100  },
    7:  { dn: 7,  xp: 300  },
    14: { dn: 14, xp: 600  },
    30: { dn: 30, xp: 2000 },
    60: { dn: 60, xp: 5000 },
  };

  if (milestones[streak]) {
    return { ...milestones[streak], milestone: streak };
  }

  // Daily base reward (increases with streak)
  const base = Math.min(1 + Math.floor(streak / 7), 5);
  return { dn: base, xp: base * 10, milestone: null };
}

export function getStreakMilestones(): { days: number; dn: number; xp: number; label: string }[] {
  return [
    { days: 1,  dn: 1,  xp: 10,   label: 'يوم واحد' },
    { days: 3,  dn: 3,  xp: 100,  label: '3 أيام 🔥' },
    { days: 7,  dn: 7,  xp: 300,  label: 'أسبوع 🌟' },
    { days: 14, dn: 14, xp: 600,  label: 'أسبوعان 💎' },
    { days: 30, dn: 30, xp: 2000, label: 'شهر 👑' },
    { days: 60, dn: 60, xp: 5000, label: 'شهران 🏆' },
  ];
}
