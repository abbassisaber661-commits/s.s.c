export type ChallengeType = 'score' | 'accuracy' | 'streak';

export interface DailyChallenge {
  id: string;
  icon: string;
  type: ChallengeType;
  target: number;
  league: string | null;
  rewardDN: number;
  rewardElo: number;
}

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0;
    return s / 0x100000000;
  };
}

function dateToSeed(date: string): number {
  return date.split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1) * 31, 7);
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

export function getDailyChallenges(date: string): DailyChallenge[] {
  const rand = lcg(dateToSeed(date));

  const scoreTargets   = [60, 80, 100, 120, 150, 180];
  const accTargets     = [60, 65, 70, 75, 80, 85];
  const streakTargets  = [3, 4, 5, 6, 7, 8];
  const leagues        = [null, 'training', 'bronze', null];

  return [
    {
      id: `${date}_1`, icon: '⚡', type: 'score',
      target: pick(scoreTargets, rand),
      league: pick(leagues, rand),
      rewardDN: 25, rewardElo: 5,
    },
    {
      id: `${date}_2`, icon: '🎯', type: 'accuracy',
      target: pick(accTargets, rand),
      league: null,
      rewardDN: 30, rewardElo: 8,
    },
    {
      id: `${date}_3`, icon: '🔥', type: 'streak',
      target: pick(streakTargets, rand),
      league: null,
      rewardDN: 40, rewardElo: 10,
    },
  ];
}

export function isChallengeComplete(
  challenge: DailyChallenge,
  leagueId: string,
  score: number,
  accuracy: number,
  streak: number,
): boolean {
  if (challenge.league && challenge.league !== leagueId) return false;
  if (challenge.type === 'score')    return score    >= challenge.target;
  if (challenge.type === 'accuracy') return accuracy >= challenge.target;
  if (challenge.type === 'streak')   return streak   >= challenge.target;
  return false;
}

export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}
