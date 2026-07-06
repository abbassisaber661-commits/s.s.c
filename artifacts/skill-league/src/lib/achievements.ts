import type { PlayerData } from './storage';

export interface AchievementDef {
  id: string;
  icon: string;
  name: string;
  nameAr: string;
  desc: string;
  descAr: string;
  rewardDN: number;
  rewardXp: number;
  rewardElo: number;
  tier: 'bronze' | 'silver' | 'gold' | 'legendary';
  category: 'matches' | 'leagues' | 'streaks' | 'elo' | 'skills' | 'daily' | 'pvp' | 'journey' | 'social';
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // ── Matches ─────────────────────────────────────────────────────────────────
  { id: 'first_win',   icon: '🏅', tier: 'bronze', category: 'matches', rewardDN: 30,  rewardXp: 50,   rewardElo: 0,  name: 'First Win',      nameAr: 'الانتصار الأول',   desc: 'Complete your first match',   descAr: 'أتمم مبارياتك الأولى' },
  { id: 'match_10',   icon: '🎮', tier: 'bronze', category: 'matches', rewardDN: 20,  rewardXp: 80,   rewardElo: 0,  name: '10 Matches',     nameAr: '10 مباريات',       desc: 'Play 10 matches',             descAr: 'العب 10 مباريات' },
  { id: 'match_50',   icon: '💪', tier: 'silver', category: 'matches', rewardDN: 50,  rewardXp: 200,  rewardElo: 10, name: 'Veteran',        nameAr: 'محارب قديم',       desc: 'Play 50 matches',             descAr: 'العب 50 مباراة' },
  { id: 'match_100',  icon: '🏆', tier: 'gold',   category: 'matches', rewardDN: 150, rewardXp: 500,  rewardElo: 20, name: 'Century',        nameAr: 'المئة',            desc: 'Play 100 matches',            descAr: 'العب 100 مباراة' },
  { id: 'match_250',  icon: '⚡', tier: 'gold',   category: 'matches', rewardDN: 300, rewardXp: 1000, rewardElo: 30, name: 'Machine',        nameAr: 'آلة اللعب',        desc: 'Play 250 matches',            descAr: 'العب 250 مباراة' },
  { id: 'win_10',     icon: '🌟', tier: 'silver', category: 'matches', rewardDN: 80,  rewardXp: 200,  rewardElo: 15, name: '10 Victories',   nameAr: '10 انتصارات',      desc: 'Win 10 matches',              descAr: 'فز في 10 مباريات' },
  { id: 'win_50',     icon: '💎', tier: 'gold',   category: 'matches', rewardDN: 200, rewardXp: 600,  rewardElo: 25, name: '50 Victories',   nameAr: '50 انتصاراً',      desc: 'Win 50 matches',              descAr: 'فز في 50 مباراة' },

  // ── Leagues ─────────────────────────────────────────────────────────────────
  { id: 'bronze_unlocked', icon: '🥉', tier: 'bronze', category: 'leagues', rewardDN: 50,  rewardXp: 100,  rewardElo: 15, name: 'Bronze League',  nameAr: 'دوري البرونز',   desc: 'Unlock the Bronze League',  descAr: 'افتح دوري البرونز' },
  { id: 'silver_unlocked', icon: '🥈', tier: 'silver', category: 'leagues', rewardDN: 100, rewardXp: 250,  rewardElo: 25, name: 'Silver League',  nameAr: 'دوري الفضة',     desc: 'Unlock the Silver League',  descAr: 'افتح دوري الفضة' },
  { id: 'elite_unlocked',  icon: '🥇', tier: 'gold',   category: 'leagues', rewardDN: 200, rewardXp: 600,  rewardElo: 50, name: 'Elite League',   nameAr: 'دوري النخبة',    desc: 'Unlock the Elite League',   descAr: 'افتح دوري النخبة' },

  // ── In-match streaks ─────────────────────────────────────────────────────────
  { id: 'streak_5',  icon: '🔥', tier: 'bronze',    category: 'streaks', rewardDN: 20,  rewardXp: 60,   rewardElo: 5,  name: 'On Fire',       nameAr: 'مشتعل',          desc: '5-streak in one match',     descAr: 'سلسلة 5 في مباراة' },
  { id: 'streak_10', icon: '⚡', tier: 'silver',    category: 'streaks', rewardDN: 40,  rewardXp: 150,  rewardElo: 10, name: 'Lightning',     nameAr: 'البرق',          desc: '10-streak in one match',    descAr: 'سلسلة 10 في مباراة' },
  { id: 'streak_20', icon: '💫', tier: 'gold',      category: 'streaks', rewardDN: 80,  rewardXp: 300,  rewardElo: 20, name: 'Unstoppable',   nameAr: 'لا يُوقَف',      desc: '20-streak in one match',    descAr: 'سلسلة 20 في مباراة' },

  // ── Login streaks ────────────────────────────────────────────────────────────
  { id: 'login_3',   icon: '📅', tier: 'bronze', category: 'streaks', rewardDN: 50,  rewardXp: 100,  rewardElo: 0, name: '3-Day Streak',   nameAr: '3 أيام متتالية',  desc: 'Log in 3 days in a row',    descAr: 'سجّل الدخول 3 أيام' },
  { id: 'login_7',   icon: '🗓️', tier: 'silver', category: 'streaks', rewardDN: 150, rewardXp: 300,  rewardElo: 5, name: 'Weekly Loyal',   nameAr: 'وفي الأسبوع',     desc: 'Log in 7 days in a row',    descAr: 'سجّل الدخول أسبوعاً' },
  { id: 'login_30',  icon: '🌙', tier: 'gold',   category: 'streaks', rewardDN: 500, rewardXp: 1000, rewardElo: 15, name: 'Monthly Master', nameAr: 'سيد الشهر',       desc: 'Log in 30 days in a row',   descAr: 'سجّل الدخول 30 يوماً' },

  // ── ELO ──────────────────────────────────────────────────────────────────────
  { id: 'elo_1100', icon: '⭐', tier: 'bronze',    category: 'elo', rewardDN: 30,  rewardXp: 100,  rewardElo: 0, name: 'Rising Star',   nameAr: 'نجم صاعد',       desc: 'Reach 1100 ELO',            descAr: 'بلغ 1100 ELO' },
  { id: 'elo_1200', icon: '🌟', tier: 'silver',    category: 'elo', rewardDN: 60,  rewardXp: 250,  rewardElo: 0, name: 'Pro Player',    nameAr: 'لاعب محترف',     desc: 'Reach 1200 ELO',            descAr: 'بلغ 1200 ELO' },
  { id: 'elo_1350', icon: '💙', tier: 'gold',      category: 'elo', rewardDN: 120, rewardXp: 500,  rewardElo: 0, name: 'Expert',        nameAr: 'خبير',            desc: 'Reach 1350 ELO',            descAr: 'بلغ 1350 ELO' },
  { id: 'elo_1500', icon: '👑', tier: 'gold',      category: 'elo', rewardDN: 200, rewardXp: 800,  rewardElo: 0, name: 'Champion',      nameAr: 'بطل',             desc: 'Reach 1500 ELO',            descAr: 'بلغ 1500 ELO' },
  { id: 'elo_1700', icon: '🔱', tier: 'legendary', category: 'elo', rewardDN: 500, rewardXp: 2000, rewardElo: 0, name: 'Grand Master',  nameAr: 'الأستاذ الكبير', desc: 'Reach 1700 ELO',            descAr: 'بلغ 1700 ELO' },

  // ── Skills ───────────────────────────────────────────────────────────────────
  { id: 'accuracy_80', icon: '🎯', tier: 'silver', category: 'skills', rewardDN: 40,  rewardXp: 150, rewardElo: 10, name: 'Sharpshooter', nameAr: 'الرماية',       desc: '80 accuracy skill',         descAr: 'مهارة دقة 80' },
  { id: 'accuracy_95', icon: '🔭', tier: 'gold',   category: 'skills', rewardDN: 80,  rewardXp: 300, rewardElo: 20, name: 'Perfect Eye',  nameAr: 'العين الحادة',  desc: '95 accuracy skill',         descAr: 'مهارة دقة 95' },

  // ── Daily ────────────────────────────────────────────────────────────────────
  { id: 'daily_1',  icon: '📅', tier: 'bronze', category: 'daily', rewardDN: 25,  rewardXp: 50,   rewardElo: 5,  name: 'Daily Starter', nameAr: 'بداية يومية',  desc: 'Complete a daily challenge', descAr: 'أتمم تحدياً يومياً' },
  { id: 'daily_10', icon: '📆', tier: 'silver', category: 'daily', rewardDN: 75,  rewardXp: 200,  rewardElo: 15, name: 'Daily Regular', nameAr: 'المنتظم',       desc: '10 daily challenges total',  descAr: '10 تحديات يومية' },
  { id: 'daily_30', icon: '🗓️', tier: 'gold',   category: 'daily', rewardDN: 200, rewardXp: 600,  rewardElo: 25, name: 'Daily Fanatic', nameAr: 'عاشق اليوميات', desc: '30 daily challenges total',  descAr: '30 تحدياً يومياً' },

  // ── PvP ──────────────────────────────────────────────────────────────────────
  { id: 'pvp_first',  icon: '⚔️', tier: 'bronze',    category: 'pvp', rewardDN: 50,  rewardXp: 100,  rewardElo: 10, name: 'First Duel',    nameAr: 'أول مبارزة',    desc: 'Win your first PvP match',   descAr: 'فز في أول مباراة PvP' },
  { id: 'pvp_10',     icon: '🗡️', tier: 'silver',    category: 'pvp', rewardDN: 100, rewardXp: 300,  rewardElo: 20, name: 'Duelist',       nameAr: 'المبارز',       desc: 'Win 10 PvP matches',         descAr: 'فز في 10 مباريات PvP' },
  { id: 'pvp_50',     icon: '⚔️', tier: 'gold',      category: 'pvp', rewardDN: 300, rewardXp: 800,  rewardElo: 40, name: 'Gladiator',     nameAr: 'المقاتل',       desc: 'Win 50 PvP matches',         descAr: 'فز في 50 مباراة PvP' },
  { id: 'tournament_1',icon:'🏆', tier: 'silver',    category: 'pvp', rewardDN: 200, rewardXp: 400,  rewardElo: 30, name: 'Champion',      nameAr: 'بطل البطولة',   desc: 'Win a tournament',           descAr: 'فز في بطولة' },

  // ── Journey milestones ───────────────────────────────────────────────────────
  { id: 'journey_competitor', icon: '⚔️', tier: 'bronze',    category: 'journey', rewardDN: 150,  rewardXp: 300,  rewardElo: 15, name: 'Competitor',  nameAr: 'منافس',  desc: 'Reach Competitor tier',    descAr: 'بلغ مرتبة منافس' },
  { id: 'journey_pro',        icon: '🌟', tier: 'silver',    category: 'journey', rewardDN: 400,  rewardXp: 800,  rewardElo: 25, name: 'Pro',         nameAr: 'محترف', desc: 'Reach Pro tier',           descAr: 'بلغ مرتبة محترف' },
  { id: 'journey_elite',      icon: '💎', tier: 'gold',      category: 'journey', rewardDN: 800,  rewardXp: 1500, rewardElo: 35, name: 'Elite',       nameAr: 'نخبة',  desc: 'Reach Elite tier',         descAr: 'بلغ مرتبة نخبة' },
  { id: 'journey_legend',     icon: '👑', tier: 'legendary', category: 'journey', rewardDN: 2000, rewardXp: 5000, rewardElo: 50, name: 'Legend',      nameAr: 'أسطورة',desc: 'Reach Legend tier',        descAr: 'بلغ مرتبة أسطورة' },
];

function meetsCondition(id: string, data: PlayerData): boolean {
  const streak = (data as any).loginStreak?.currentStreak ?? 0;
  switch (id) {
    case 'first_win':          return data.matchesWon >= 1;
    case 'match_10':           return data.matchesPlayed >= 10;
    case 'match_50':           return data.matchesPlayed >= 50;
    case 'match_100':          return data.matchesPlayed >= 100;
    case 'match_250':          return data.matchesPlayed >= 250;
    case 'win_10':             return data.matchesWon >= 10;
    case 'win_50':             return data.matchesWon >= 50;
    case 'bronze_unlocked':    return data.unlockedLeagues.includes('bronze');
    case 'silver_unlocked':    return data.unlockedLeagues.includes('silver');
    case 'elite_unlocked':     return data.unlockedLeagues.includes('elite');
    case 'streak_5':           return data.bestStreak >= 5;
    case 'streak_10':          return data.bestStreak >= 10;
    case 'streak_20':          return data.bestStreak >= 20;
    case 'login_3':            return streak >= 3;
    case 'login_7':            return streak >= 7;
    case 'login_30':           return streak >= 30;
    case 'elo_1100':           return data.elo >= 1100;
    case 'elo_1200':           return data.elo >= 1200;
    case 'elo_1350':           return data.elo >= 1350;
    case 'elo_1500':           return data.elo >= 1500;
    case 'elo_1700':           return data.elo >= 1700;
    case 'accuracy_80':        return data.skillAccuracy >= 80;
    case 'accuracy_95':        return data.skillAccuracy >= 95;
    case 'daily_1':            return data.dailyChallengesCompleted >= 1;
    case 'daily_10':           return data.dailyChallengesCompleted >= 10;
    case 'daily_30':           return (data.dailyChallengesCompleted ?? 0) >= 30;
    case 'pvp_first':          return data.pvpWins >= 1;
    case 'pvp_10':             return data.pvpWins >= 10;
    case 'pvp_50':             return data.pvpWins >= 50;
    case 'tournament_1':       return data.tournamentWins >= 1;
    case 'journey_competitor': return data.level >= 5  && data.elo >= 1050 && data.matchesPlayed >= 10;
    case 'journey_pro':        return data.level >= 15 && data.elo >= 1150 && data.matchesPlayed >= 30;
    case 'journey_elite':      return data.level >= 30 && data.elo >= 1250 && data.matchesPlayed >= 75;
    case 'journey_legend':     return data.level >= 50 && data.elo >= 1400 && data.matchesPlayed >= 150;
    default:                   return false;
  }
}

export function checkNewAchievements(prev: PlayerData, next: PlayerData): AchievementDef[] {
  const already = new Set(prev.achievements.map(a => a.id));
  return ACHIEVEMENT_DEFS.filter(d => !already.has(d.id) && meetsCondition(d.id, next));
}
