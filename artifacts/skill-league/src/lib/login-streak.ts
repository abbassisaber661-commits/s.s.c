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
  rewardCoins: number;
  rewardXp: number;
  milestoneReached: number | null;
}

export function checkAndUpdateStreak(): StreakCheckResult {
  const data = loadStreakData();
  const today = todayStr();
  const yesterday = yesterdayStr();

  if (data.lastLoginDate === today) {
    return { updated: data, isNewDay: false, streakBroken: false, rewardCoins: 0, rewardXp: 0, milestoneReached: null };
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

  const { coins, xp, milestone } = getStreakReward(newStreak);

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
    rewardCoins: coins,
    rewardXp: xp,
    milestoneReached: milestone,
  };
}

export function getStreakReward(streak: number): { coins: number; xp: number; milestone: number | null } {
  const milestones: Record<number, { coins: number; xp: number }> = {
    3:  { coins: 50,   xp: 100  },
    7:  { coins: 150,  xp: 300  },
    14: { coins: 350,  xp: 600  },
    30: { coins: 1000, xp: 2000 },
    60: { coins: 2500, xp: 5000 },
  };

  if (milestones[streak]) {
    return { ...milestones[streak], milestone: streak };
  }

  // Daily base reward (increases with streak)
  const base = Math.min(5 + Math.floor(streak / 3), 20);
  return { coins: base, xp: base * 2, milestone: null };
}

export function getStreakMilestones(): { days: number; coins: number; xp: number; label: string }[] {
  return [
    { days: 1,  coins: 5,    xp: 10,   label: 'يوم واحد' },
    { days: 3,  coins: 50,   xp: 100,  label: '3 أيام 🔥' },
    { days: 7,  coins: 150,  xp: 300,  label: 'أسبوع 🌟' },
    { days: 14, coins: 350,  xp: 600,  label: 'أسبوعان 💎' },
    { days: 30, coins: 1000, xp: 2000, label: 'شهر 👑' },
    { days: 60, coins: 2500, xp: 5000, label: 'شهران 🏆' },
  ];
}
