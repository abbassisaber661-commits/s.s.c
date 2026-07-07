import type { PlayerData } from './storage';

export type JourneyTier =
  | 'beginner'
  | 'competitor'
  | 'pro'
  | 'elite'
  | 'legend';

export interface JourneyTierDef {
  id: JourneyTier;
  ar: string;
  icon: string;
  color: string;
  glow: string;
  minLevel: number;
  minElo: number;
  minMatches: number;
  rewardDN: number;
  rewardXp: number;
  perks: string[];
}

export const JOURNEY_TIERS: JourneyTierDef[] = [
  {
    id: 'beginner',
    ar: 'مبتدئ',
    icon: '🌱',
    color: '#6b7280',
    glow: 'rgba(107,114,128,0.3)',
    minLevel: 1, minElo: 0, minMatches: 0,
    rewardDN: 0, rewardXp: 0,
    perks: ['العب في دوري التدريب', 'تحديات يومية أساسية'],
  },
  {
    id: 'competitor',
    ar: 'منافس',
    icon: '⚔️',
    color: '#CD7F32',
    glow: 'rgba(205,127,50,0.35)',
    minLevel: 5, minElo: 1050, minMatches: 10,
    rewardDN: 150, rewardXp: 300,
    perks: ['فتح دوري البرونز', 'مباريات PvP', 'مكافآت أسبوعية'],
  },
  {
    id: 'pro',
    ar: 'محترف',
    icon: '🌟',
    color: '#A8A9AD',
    glow: 'rgba(168,169,173,0.35)',
    minLevel: 15, minElo: 1150, minMatches: 30,
    rewardDN: 400, rewardXp: 800,
    perks: ['فتح دوري الفضة', 'بطولات مميزة', 'شارة Pro'],
  },
  {
    id: 'elite',
    ar: 'نخبة',
    icon: '💎',
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.35)',
    minLevel: 30, minElo: 1250, minMatches: 75,
    rewardDN: 800, rewardXp: 1500,
    perks: ['فتح دوري النخبة', 'مهام VIP', 'ترتيب الأبطال'],
  },
  {
    id: 'legend',
    ar: 'أسطورة',
    icon: '👑',
    color: '#FFD700',
    glow: 'rgba(255,215,0,0.4)',
    minLevel: 50, minElo: 1400, minMatches: 150,
    rewardDN: 2000, rewardXp: 5000,
    perks: ['كل المزايا', 'لقب Legend', 'مكافأة Pi مميزة', 'إطار ذهبي'],
  },
];

export function getJourneyTier(data: PlayerData): JourneyTierDef {
  const sorted = [...JOURNEY_TIERS].reverse();
  return sorted.find(t =>
    data.level >= t.minLevel &&
    data.elo >= t.minElo &&
    data.matchesPlayed >= t.minMatches
  ) ?? JOURNEY_TIERS[0];
}

export function getNextJourneyTier(current: JourneyTierDef): JourneyTierDef | null {
  const idx = JOURNEY_TIERS.findIndex(t => t.id === current.id);
  return idx < JOURNEY_TIERS.length - 1 ? JOURNEY_TIERS[idx + 1] : null;
}

export function journeyProgress(data: PlayerData, next: JourneyTierDef): {
  level: number; elo: number; matches: number; overall: number;
} {
  const cur = getJourneyTier(data);
  const levelPct   = Math.min(100, Math.round(((data.level - cur.minLevel) / Math.max(1, next.minLevel - cur.minLevel)) * 100));
  const eloPct     = Math.min(100, Math.round(((data.elo - cur.minElo) / Math.max(1, next.minElo - cur.minElo)) * 100));
  const matchesPct = Math.min(100, Math.round(((data.matchesPlayed - cur.minMatches) / Math.max(1, next.minMatches - cur.minMatches)) * 100));
  const overall    = Math.round((levelPct + eloPct + matchesPct) / 3);
  return { level: levelPct, elo: eloPct, matches: matchesPct, overall };
}

// Smart mission suggestions based on player profile
export interface SmartMission {
  icon: string;
  title: string;
  desc: string;
  priority: 'high' | 'medium' | 'low';
  reward: string;
}

export function getSmartMissions(data: PlayerData): SmartMission[] {
  const missions: SmartMission[] = [];
  const next = getNextJourneyTier(getJourneyTier(data));

  if (!next) {
    missions.push({ icon: '👑', title: 'أنت أسطورة!', desc: 'بلغت أعلى مستوى في الرحلة', priority: 'high', reward: 'حافظ على مكانتك' });
    return missions;
  }

  // Level gap
  if (data.level < next.minLevel) {
    const gap = next.minLevel - data.level;
    missions.push({
      icon: '⬆️', title: `ارفع مستواك +${gap}`,
      desc: `تحتاج إلى المستوى ${next.minLevel} للترقي إلى ${next.ar}`,
      priority: gap <= 3 ? 'high' : 'medium', reward: '+XP من كل مباراة',
    });
  }

  // ELO gap
  if (data.elo < next.minElo) {
    const gap = next.minElo - data.elo;
    missions.push({
      icon: '📈', title: `اكسب ${gap} ELO`,
      desc: `ELO الحالي: ${data.elo} | المطلوب: ${next.minElo}`,
      priority: gap <= 50 ? 'high' : 'medium', reward: 'انتصر في مباريات PvP',
    });
  }

  // Matches gap
  if (data.matchesPlayed < next.minMatches) {
    const gap = next.minMatches - data.matchesPlayed;
    missions.push({
      icon: '🎮', title: `العب ${gap} مباراة`,
      desc: `المباريات الحالية: ${data.matchesPlayed} | المطلوب: ${next.minMatches}`,
      priority: gap <= 5 ? 'high' : 'low', reward: 'XP + DN$',
    });
  }

  // Accuracy improvement
  if (data.skillAccuracy < 70) {
    missions.push({
      icon: '🎯', title: 'حسِّن دقتك',
      desc: `دقتك الحالية ${data.skillAccuracy}% — ركّز على التحديات اليومية`,
      priority: 'medium', reward: '+ELO + إنجاز الدقة',
    });
  }

  // PvP suggestion
  if (data.pvpWins < 5 && data.level >= 3) {
    missions.push({
      icon: '⚔️', title: 'خُض معارك PvP',
      desc: 'الانتصارات في PvP تُضاعف مكافآت ELO و DN$',
      priority: 'medium', reward: 'ELO كامل + DN$ مضاعفة',
    });
  }

  return missions.slice(0, 4);
}

// VIP Pi missions
export interface PiVipMission {
  id: string;
  icon: string;
  title: string;
  desc: string;
  piCost: number;
  rewardDN: number;
  rewardXp: number;
  rewardBadge?: string;
  minTier: JourneyTier;
}

export const PI_VIP_MISSIONS: PiVipMission[] = [
  {
    id: 'vip_xp_boost', icon: '⚡', title: 'XP مضاعف لـ 24 ساعة',
    desc: 'احصل على ضعف XP لمدة يوم كامل من كل مبارياتك',
    piCost: 1, rewardDN: 0, rewardXp: 0, rewardBadge: '⚡',
    minTier: 'competitor',
  },
  {
    id: 'vip_elite_challenge', icon: '💎', title: 'تحدي النخبة الخاص',
    desc: 'مباراة خاصة ضد أقوى البوتات مع مكافأة حصرية',
    piCost: 2, rewardDN: 500, rewardXp: 1000, rewardBadge: '💎',
    minTier: 'elite',
  },
  {
    id: 'vip_coin_boost', icon: '🪙', title: 'مضاعف DN$ لـ 48 ساعة',
    desc: 'كل DN$ المكتسبة تُضاعَف لمدة يومين',
    piCost: 3, rewardDN: 0, rewardXp: 0, rewardBadge: '💰',
    minTier: 'pro',
  },
  {
    id: 'vip_legend_badge', icon: '👑', title: 'شارة Supporter',
    desc: 'شارة حصرية تُظهر دعمك لمنصة S.S.C',
    piCost: 5, rewardDN: 1000, rewardXp: 2000, rewardBadge: '🌟',
    minTier: 'competitor',
  },
];
