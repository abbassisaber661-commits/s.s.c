// ─── League Tier Definitions ──────────────────────────────────────────────────

export type LeagueTier = 'training' | 'coin' | 'pro' | 'champion';

export interface LeagueDef {
  id:            LeagueTier;
  name:          string;
  emoji:         string;
  color:         string;
  glowColor:     string;
  bgGradient:    string;
  minLp:         number;   // total LP floor for this tier
  maxLp:         number;   // total LP ceiling (-1 = unlimited)
  description:   string;
  perks:         string[];
  penaltyOnLoss: boolean;
}

export const LEAGUE_DEFS: Record<LeagueTier, LeagueDef> = {
  training: {
    id: 'training', name: 'Training', emoji: '🎯',
    color: '#3AB4FF', glowColor: 'rgba(58,180,255,0.18)',
    bgGradient: 'linear-gradient(135deg,#3AB4FF12,#3AB4FF04)',
    minLp: 0, maxLp: 99, penaltyOnLoss: false,
    description: 'Entry level. Learn the mechanics with zero risk.',
    perks: ['No LP loss on defeat', 'XP bonus +10%', 'Unlimited attempts'],
  },
  coin: {
    id: 'coin', name: 'Coin League', emoji: '🪙',
    color: '#FFD93D', glowColor: 'rgba(255,217,61,0.18)',
    bgGradient: 'linear-gradient(135deg,#FFD93D12,#FF8C4204)',
    minLp: 100, maxLp: 299, penaltyOnLoss: true,
    description: 'Main competitive league. Earn coins every win.',
    perks: ['Coin rewards per match', 'Weekly leaderboard prize', 'LP ranking badge'],
  },
  pro: {
    id: 'pro', name: 'Pro League', emoji: '🏆',
    color: '#2EE87A', glowColor: 'rgba(46,232,122,0.18)',
    bgGradient: 'linear-gradient(135deg,#2EE87A12,#2EE87A04)',
    minLp: 300, maxLp: 499, penaltyOnLoss: true,
    description: 'Top ranked players only. Higher stakes, bigger rewards.',
    perks: ['Premium coin rewards', 'Exclusive Pro badge', 'Tournament access'],
  },
  champion: {
    id: 'champion', name: 'Champion', emoji: '👑',
    color: '#B44FFF', glowColor: 'rgba(180,79,255,0.18)',
    bgGradient: 'linear-gradient(135deg,#B44FFF12,#3AB4FF04)',
    minLp: 500, maxLp: -1, penaltyOnLoss: true,
    description: 'Elite only. The pinnacle of SkillLeague competition.',
    perks: ['Prestige crown badge', 'Max Pi rewards', 'Season finals access'],
  },
};

export const TIER_ORDER: LeagueTier[] = ['training', 'coin', 'pro', 'champion'];

// ─── Player League Stats ──────────────────────────────────────────────────────

export interface LeagueStats {
  lp:              number;      // cumulative LP (determines tier)
  weeklyLp:        number;      // LP earned this week
  weekStart:       string;      // YYYY-MM-DD of current week's Monday
  matchesPlayed:   number;
  wins:            number;      // rank-1 finishes
  topThree:        number;      // rank 1-3 finishes
  bestScore:       number;
  bestStreak:      number;
  totalCoinsEarned:number;
  lastMatchDate:   string | null;
}

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1); // Monday
  d.setDate(diff); d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

const STORAGE_KEY = 'sl_league_v2';

export function loadLeagueStats(): LeagueStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as LeagueStats;
      if (s.weekStart !== getWeekStart()) {
        s.weeklyLp = 0;
        s.weekStart = getWeekStart();
        saveLeagueStats(s);
      }
      return s;
    }
  } catch { /* ignore */ }
  return {
    lp: 0, weeklyLp: 0, weekStart: getWeekStart(),
    matchesPlayed: 0, wins: 0, topThree: 0,
    bestScore: 0, bestStreak: 0, totalCoinsEarned: 0,
    lastMatchDate: null,
  };
}

export function saveLeagueStats(s: LeagueStats): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ─── Tier Helpers ─────────────────────────────────────────────────────────────

export function getTier(lp: number): LeagueTier {
  if (lp >= 500) return 'champion';
  if (lp >= 300) return 'pro';
  if (lp >= 100) return 'coin';
  return 'training';
}

export function getLpInTier(lp: number): number {
  return lp - LEAGUE_DEFS[getTier(lp)].minLp;
}

export function getTierRange(tier: LeagueTier): number {
  const def = LEAGUE_DEFS[tier];
  return def.maxLp === -1 ? 100 : def.maxLp - def.minLp + 1;
}

export function getLpProgress(lp: number): number {
  const tier = getTier(lp);
  return Math.min(1, getLpInTier(lp) / getTierRange(tier));
}

// ─── LP Change Calculation ────────────────────────────────────────────────────

export interface MatchResultInput {
  score:      number;
  rank:       number;      // 1–5
  bestStreak: number;
  correctPct: number;      // 0–1
}

export interface LpChange {
  delta:       number;
  breakdown:   Array<{ label: string; pts: number }>;
  promoted:    boolean;
  demoted:     boolean;
  oldTier:     LeagueTier;
  newTier:     LeagueTier;
  oldLp:       number;
  newLp:       number;
  coinsEarned: number;
}

export function calcLpChange(stats: LeagueStats, result: MatchResultInput): LpChange {
  const oldTier = getTier(stats.lp);
  const def     = LEAGUE_DEFS[oldTier];
  const breakdown: Array<{ label: string; pts: number }> = [];

  // Base result
  if (result.rank === 1) {
    breakdown.push({ label: 'Win',         pts: 25 });
  } else if (result.rank === 2) {
    breakdown.push({ label: '2nd place',   pts: 12 });
  } else if (result.rank === 3) {
    breakdown.push({ label: '3rd place',   pts: 5  });
  } else if (def.penaltyOnLoss) {
    breakdown.push({ label: 'Loss',        pts: -8 });
  }

  // Score bonuses
  if (result.score >= 900)      breakdown.push({ label: 'Perfect score',   pts: 20 });
  else if (result.score >= 700) breakdown.push({ label: 'Excellent score', pts: 15 });
  else if (result.score >= 500) breakdown.push({ label: 'Great score',     pts: 10 });
  else if (result.score >= 300) breakdown.push({ label: 'Good score',      pts: 5  });

  // Streak bonus
  if (result.bestStreak >= 7)      breakdown.push({ label: 'Legendary streak', pts: 15 });
  else if (result.bestStreak >= 5) breakdown.push({ label: 'Epic streak',      pts: 10 });
  else if (result.bestStreak >= 3) breakdown.push({ label: 'Hot streak',       pts: 5  });

  // Accuracy bonus
  if (result.correctPct >= 1.0)       breakdown.push({ label: 'Flawless',       pts: 10 });
  else if (result.correctPct >= 0.9)  breakdown.push({ label: 'High accuracy',  pts: 6  });
  else if (result.correctPct >= 0.7)  breakdown.push({ label: 'Good accuracy',  pts: 3  });

  const delta   = breakdown.reduce((s, b) => s + b.pts, 0);
  const oldLp   = stats.lp;

  // Apply and clamp
  let newLp = Math.max(0, oldLp + delta);
  if (def.penaltyOnLoss) {
    newLp = Math.max(def.minLp, newLp); // can't drop below tier floor
  }

  const newTier   = getTier(newLp);
  const oldRank   = TIER_ORDER.indexOf(oldTier);
  const newRank   = TIER_ORDER.indexOf(newTier);
  const promoted  = newRank > oldRank;
  const demoted   = newRank < oldRank;

  // Coin rewards (Coin League and above only)
  let coinsEarned = 0;
  if (oldTier !== 'training') {
    const base   = Math.floor(result.score / 12);
    const winBonus = result.rank === 1 ? 60 : result.rank === 2 ? 30 : result.rank === 3 ? 10 : 0;
    coinsEarned  = base + winBonus;
  }

  return { delta, breakdown, promoted, demoted, oldTier, newTier, oldLp, newLp, coinsEarned };
}

export function applyLpChange(stats: LeagueStats, change: LpChange, result: MatchResultInput): LeagueStats {
  return {
    ...stats,
    lp:               change.newLp,
    weeklyLp:         stats.weeklyLp + Math.max(0, change.delta),
    matchesPlayed:    stats.matchesPlayed + 1,
    wins:             stats.wins + (result.rank === 1 ? 1 : 0),
    topThree:         stats.topThree + (result.rank <= 3 ? 1 : 0),
    bestScore:        Math.max(stats.bestScore, result.score),
    bestStreak:       Math.max(stats.bestStreak, result.bestStreak),
    totalCoinsEarned: stats.totalCoinsEarned + change.coinsEarned,
    lastMatchDate:    new Date().toISOString(),
  };
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export interface LeaderboardRow {
  id:       string;
  name:     string;
  avatar:   string;
  lp:       number;
  tier:     LeagueTier;
  matches:  number;
  wins:     number;
  isPlayer: boolean;
}

const SEED_PLAYERS: Array<{ name: string; avatar: string; lp: number; matches: number; wins: number }> = [
  { name: 'NovaMind',  avatar: '🤖', lp: 612, matches: 94, wins: 71 },
  { name: 'BlazeFire', avatar: '🔥', lp: 587, matches: 87, wins: 64 },
  { name: 'StarQ',     avatar: '⭐', lp: 544, matches: 82, wins: 58 },
  { name: 'ZeroTwo',   avatar: '🦊', lp: 512, matches: 78, wins: 53 },
  { name: 'CipherX',   avatar: '🎭', lp: 487, matches: 74, wins: 50 },
  { name: 'LunaWave',  avatar: '🌙', lp: 451, matches: 70, wins: 46 },
  { name: 'DragonPi',  avatar: '🐉', lp: 432, matches: 68, wins: 44 },
  { name: 'KiwiBot',   avatar: '🥝', lp: 401, matches: 63, wins: 39 },
  { name: 'NeonFlash', avatar: '⚡', lp: 378, matches: 59, wins: 35 },
  { name: 'CosmicK',   avatar: '🚀', lp: 352, matches: 55, wins: 32 },
  { name: 'AlphaWind', avatar: '🌪️', lp: 329, matches: 51, wins: 28 },
  { name: 'PrismaQ',   avatar: '🔮', lp: 301, matches: 48, wins: 25 },
  { name: 'VoidStep',  avatar: '🌌', lp: 278, matches: 44, wins: 22 },
  { name: 'NightOwl',  avatar: '🦉', lp: 245, matches: 41, wins: 19 },
  { name: 'BlazeKid',  avatar: '🌟', lp: 198, matches: 38, wins: 16 },
  { name: 'TechNova',  avatar: '💡', lp: 167, matches: 34, wins: 13 },
  { name: 'CloudX',    avatar: '☁️', lp: 142, matches: 30, wins: 11 },
  { name: 'MintByte',  avatar: '💚', lp: 118, matches: 27, wins:  9 },
  { name: 'CoolCat',   avatar: '😺', lp:  87, matches: 22, wins:  7 },
  { name: 'NewPlayer', avatar: '🐣', lp:  34, matches: 12, wins:  3 },
];

export function getLeaderboard(playerName: string, playerStats: LeagueStats): LeaderboardRow[] {
  const rows: LeaderboardRow[] = SEED_PLAYERS.map((p, i) => ({
    id: `seed_${i}`, name: p.name, avatar: p.avatar,
    lp: p.lp, tier: getTier(p.lp),
    matches: p.matches, wins: p.wins, isPlayer: false,
  }));
  rows.push({
    id: 'player', name: playerName, avatar: '👤',
    lp: playerStats.lp, tier: getTier(playerStats.lp),
    matches: playerStats.matchesPlayed, wins: playerStats.wins,
    isPlayer: true,
  });
  return rows.sort((a, b) => b.lp - a.lp);
}

export function getPlayerGlobalRank(playerName: string, playerStats: LeagueStats): number {
  return getLeaderboard(playerName, playerStats).findIndex(r => r.isPlayer) + 1;
}
