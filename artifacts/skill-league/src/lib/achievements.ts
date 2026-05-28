import type { PlayerData } from './storage';

export interface AchievementDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
  rewardCoins: number;
  rewardElo: number;
  tier: 'bronze' | 'silver' | 'gold';
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: 'first_win',       icon: '🏅', tier: 'bronze', rewardCoins: 30,  rewardElo: 0,  name: 'First Win',        desc: 'Complete your first match'             },
  { id: 'match_10',        icon: '🎮', tier: 'bronze', rewardCoins: 20,  rewardElo: 0,  name: '10 Matches',       desc: 'Play 10 matches'                       },
  { id: 'match_50',        icon: '💪', tier: 'silver', rewardCoins: 50,  rewardElo: 10, name: 'Veteran',          desc: 'Play 50 matches'                       },
  { id: 'match_100',       icon: '🏆', tier: 'gold',   rewardCoins: 100, rewardElo: 20, name: 'Century',          desc: 'Play 100 matches'                      },
  { id: 'bronze_unlocked', icon: '🥉', tier: 'bronze', rewardCoins: 50,  rewardElo: 15, name: 'Bronze League',    desc: 'Unlock the Bronze League'              },
  { id: 'silver_unlocked', icon: '🥈', tier: 'silver', rewardCoins: 100, rewardElo: 25, name: 'Silver League',    desc: 'Unlock the Silver League'              },
  { id: 'elite_unlocked',  icon: '🥇', tier: 'gold',   rewardCoins: 200, rewardElo: 50, name: 'Elite League',     desc: 'Unlock the Elite League'               },
  { id: 'streak_5',        icon: '🔥', tier: 'bronze', rewardCoins: 20,  rewardElo: 5,  name: 'On Fire',          desc: 'Achieve a 5-streak in one match'       },
  { id: 'streak_10',       icon: '⚡', tier: 'silver', rewardCoins: 40,  rewardElo: 10, name: 'Lightning',        desc: 'Achieve a 10-streak in one match'      },
  { id: 'streak_20',       icon: '💫', tier: 'gold',   rewardCoins: 80,  rewardElo: 20, name: 'Unstoppable',      desc: 'Achieve a 20-streak in one match'      },
  { id: 'elo_1100',        icon: '⭐', tier: 'bronze', rewardCoins: 30,  rewardElo: 0,  name: 'Rising Star',      desc: 'Reach 1100 ELO rating'                 },
  { id: 'elo_1200',        icon: '🌟', tier: 'silver', rewardCoins: 60,  rewardElo: 0,  name: 'Pro Player',       desc: 'Reach 1200 ELO rating'                 },
  { id: 'elo_1500',        icon: '👑', tier: 'gold',   rewardCoins: 150, rewardElo: 0,  name: 'Champion',         desc: 'Reach 1500 ELO rating'                 },
  { id: 'accuracy_80',     icon: '🎯', tier: 'silver', rewardCoins: 40,  rewardElo: 10, name: 'Sharpshooter',     desc: 'Reach 80 accuracy skill'               },
  { id: 'accuracy_95',     icon: '🔭', tier: 'gold',   rewardCoins: 80,  rewardElo: 20, name: 'Perfect Eye',      desc: 'Reach 95 accuracy skill'               },
  { id: 'daily_1',         icon: '📅', tier: 'bronze', rewardCoins: 25,  rewardElo: 5,  name: 'Daily Starter',    desc: 'Complete a daily challenge'            },
  { id: 'daily_10',        icon: '📆', tier: 'silver', rewardCoins: 75,  rewardElo: 15, name: 'Daily Regular',    desc: 'Complete 10 daily challenges total'    },
];

function meetsCondition(id: string, data: PlayerData): boolean {
  switch (id) {
    case 'first_win':       return data.matchesWon >= 1;
    case 'match_10':        return data.matchesPlayed >= 10;
    case 'match_50':        return data.matchesPlayed >= 50;
    case 'match_100':       return data.matchesPlayed >= 100;
    case 'bronze_unlocked': return data.unlockedLeagues.includes('bronze');
    case 'silver_unlocked': return data.unlockedLeagues.includes('silver');
    case 'elite_unlocked':  return data.unlockedLeagues.includes('elite');
    case 'streak_5':        return data.bestStreak >= 5;
    case 'streak_10':       return data.bestStreak >= 10;
    case 'streak_20':       return data.bestStreak >= 20;
    case 'elo_1100':        return data.elo >= 1100;
    case 'elo_1200':        return data.elo >= 1200;
    case 'elo_1500':        return data.elo >= 1500;
    case 'accuracy_80':     return data.skillAccuracy >= 80;
    case 'accuracy_95':     return data.skillAccuracy >= 95;
    case 'daily_1':         return data.dailyChallengesCompleted >= 1;
    case 'daily_10':        return data.dailyChallengesCompleted >= 10;
    default:                return false;
  }
}

export function checkNewAchievements(prev: PlayerData, next: PlayerData): AchievementDef[] {
  const already = new Set(prev.achievements.map(a => a.id));
  return ACHIEVEMENT_DEFS.filter(d => !already.has(d.id) && meetsCondition(d.id, next));
}
