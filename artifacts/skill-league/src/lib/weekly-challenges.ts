export type WeeklyMissionType =
  | 'play_matches'
  | 'win_pvp'
  | 'earn_coins'
  | 'reach_streak'
  | 'win_tournament'
  | 'achieve_accuracy';

export interface WeeklyMission {
  id: string;
  icon: string;
  title: string;
  description: string;
  type: WeeklyMissionType;
  target: number;
  rewardCoins: number;
  rewardXp: number;
}

export interface WeeklyChallengeState {
  week: string;
  completedIds: string[];
  progress: Partial<Record<WeeklyMissionType, number>>;
}

function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    )
  );
}

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function getWeekString(date = new Date()): string {
  return `${date.getFullYear()}-W${String(getWeekNumber(date)).padStart(2, '0')}`;
}

export function getWeeklyMissions(weekStr: string): WeeklyMission[] {
  const seed = weekStr
    .split('')
    .reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1) * 97, 13);
  const r = lcg(seed);

  const matchTarget   = Math.floor(r() * 6) + 8;
  const pvpTarget     = Math.floor(r() * 4) + 3;
  const coinsTarget   = Math.floor(r() * 150) + 200;
  const streakTarget  = Math.floor(r() * 4) + 5;
  const accTarget     = Math.floor(r() * 15) + 70;

  return [
    {
      id: `${weekStr}_matches`,
      icon: '🎮',
      title: 'Game Addict',
      description: `Play ${matchTarget} matches this week`,
      type: 'play_matches',
      target: matchTarget,
      rewardCoins: 100,
      rewardXp: 150,
    },
    {
      id: `${weekStr}_pvp`,
      icon: '⚔️',
      title: 'Warrior',
      description: `Win ${pvpTarget} PvP battles`,
      type: 'win_pvp',
      target: pvpTarget,
      rewardCoins: 200,
      rewardXp: 300,
    },
    {
      id: `${weekStr}_coins`,
      icon: '💰',
      title: 'Coin Hunter',
      description: `Earn ${coinsTarget} coins`,
      type: 'earn_coins',
      target: coinsTarget,
      rewardCoins: 150,
      rewardXp: 200,
    },
    {
      id: `${weekStr}_streak`,
      icon: '🔥',
      title: 'Streak King',
      description: `Hit a ${streakTarget}-answer streak in one match`,
      type: 'reach_streak',
      target: streakTarget,
      rewardCoins: 75,
      rewardXp: 120,
    },
    {
      id: `${weekStr}_accuracy`,
      icon: '🎯',
      title: 'Sharpshooter',
      description: `Finish a match with ${accTarget}%+ accuracy`,
      type: 'achieve_accuracy',
      target: accTarget,
      rewardCoins: 80,
      rewardXp: 130,
    },
  ];
}

export function getMissionProgress(
  state: WeeklyChallengeState,
  mission: WeeklyMission,
): number {
  if (state.week !== getWeekString()) return 0;
  return state.progress[mission.type] ?? 0;
}

export function isMissionComplete(
  state: WeeklyChallengeState,
  mission: WeeklyMission,
): boolean {
  return state.completedIds.includes(mission.id);
}

export function checkWeeklyCompletions(
  state: WeeklyChallengeState,
  missions: WeeklyMission[],
): { newlyCompleted: WeeklyMission[]; coinsReward: number; xpReward: number } {
  const newlyCompleted: WeeklyMission[] = [];
  let coinsReward = 0;
  let xpReward = 0;

  for (const m of missions) {
    if (state.completedIds.includes(m.id)) continue;
    const progress = state.progress[m.type] ?? 0;
    if (progress >= m.target) {
      newlyCompleted.push(m);
      coinsReward += m.rewardCoins;
      xpReward    += m.rewardXp;
    }
  }

  return { newlyCompleted, coinsReward, xpReward };
}
