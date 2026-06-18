export interface ClanMember {
  id: string;
  username: string;
  level: number;
  elo: number;
  role: 'owner' | 'officer' | 'member';
  joinedAt: string;
  weeklyCoins: number;
}

export interface Clan {
  id: string;
  name: string;
  tag: string;
  logo: string;
  description: string;
  level: number;
  xp: number;
  coins: number;
  members: ClanMember[];
  createdAt: string;
  wins: number;
  isPublic: boolean;
  minElo: number;
}

export interface ClanPlayerData {
  clanId: string | null;
  clanName: string | null;
  clanTag: string | null;
  clanRole: 'owner' | 'officer' | 'member' | null;
  clanCoinsContributed: number;
}

const STORAGE_KEY = 'skill_league_clans';
const MY_CLAN_KEY = 'skill_league_my_clan';

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const CLAN_LOGOS = [
  '🦁', '🐯', '🦅', '🐉', '🦊', '🐺', '⚡', '🔥',
  '💎', '🛡️', '⚔️', '🌟', '🏆', '👑', '🎯', '🚀',
];

export const CLAN_LEVELS = [
  { level: 1, name: 'Rookie',   xpRequired: 0,     maxMembers: 10, coinBonus: 0  },
  { level: 2, name: 'Rising',   xpRequired: 500,   maxMembers: 15, coinBonus: 5  },
  { level: 3, name: 'Strong',   xpRequired: 1500,  maxMembers: 20, coinBonus: 10 },
  { level: 4, name: 'Elite',    xpRequired: 3500,  maxMembers: 30, coinBonus: 15 },
  { level: 5, name: 'Legend',   xpRequired: 7500,  maxMembers: 50, coinBonus: 20 },
];

function getClanLevel(xp: number) {
  let current = CLAN_LEVELS[0];
  for (const tier of CLAN_LEVELS) {
    if (xp >= tier.xpRequired) current = tier;
    else break;
  }
  return current;
}

function getNextClanLevel(xp: number) {
  const currentLevel = getClanLevel(xp).level;
  return CLAN_LEVELS.find(t => t.level === currentLevel + 1) ?? null;
}

export function loadClans(): Clan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* */ }
  return generateSampleClans();
}

export function saveClans(clans: Clan[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clans));
}

export function loadMyClanData(): ClanPlayerData {
  try {
    const raw = localStorage.getItem(MY_CLAN_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* */ }
  return { clanId: null, clanName: null, clanTag: null, clanRole: null, clanCoinsContributed: 0 };
}

export function saveMyClanData(data: ClanPlayerData) {
  localStorage.setItem(MY_CLAN_KEY, JSON.stringify(data));
}

export function createClan(name: string, tag: string, logo: string, description: string, ownerUsername: string, ownerLevel: number, ownerElo: number): Clan {
  const clan: Clan = {
    id: generateId(),
    name: name.trim().slice(0, 24),
    tag: tag.trim().slice(0, 5).toUpperCase(),
    logo,
    description: description.trim().slice(0, 80),
    level: 1,
    xp: 0,
    coins: 0,
    members: [{
      id: generateId(),
      username: ownerUsername,
      level: ownerLevel,
      elo: ownerElo,
      role: 'owner',
      joinedAt: new Date().toISOString(),
      weeklyCoins: 0,
    }],
    createdAt: new Date().toISOString(),
    wins: 0,
    isPublic: true,
    minElo: 0,
  };
  const clans = loadClans();
  clans.unshift(clan);
  saveClans(clans);
  return clan;
}

export function joinClan(clanId: string, username: string, level: number, elo: number): boolean {
  const clans = loadClans();
  const clan = clans.find(c => c.id === clanId);
  if (!clan) return false;
  const maxMembers = getClanLevel(clan.xp).maxMembers;
  if (clan.members.length >= maxMembers) return false;
  if (elo < clan.minElo) return false;
  clan.members.push({
    id: generateId(), username, level, elo,
    role: 'member', joinedAt: new Date().toISOString(), weeklyCoins: 0,
  });
  saveClans(clans);
  return true;
}

export function leaveClan(clanId: string, username: string): void {
  const clans = loadClans();
  const clan = clans.find(c => c.id === clanId);
  if (!clan) return;
  clan.members = clan.members.filter(m => m.username !== username);
  if (clan.members.length === 0) {
    const idx = clans.findIndex(c => c.id === clanId);
    if (idx !== -1) clans.splice(idx, 1);
  }
  saveClans(clans);
}

export function contributeClanCoins(clanId: string, username: string, coins: number): void {
  const clans = loadClans();
  const clan = clans.find(c => c.id === clanId);
  if (!clan) return;
  clan.coins += coins;
  clan.xp += Math.floor(coins / 10);
  clan.level = getClanLevel(clan.xp).level;
  const member = clan.members.find(m => m.username === username);
  if (member) member.weeklyCoins += coins;
  saveClans(clans);
}

export function getClanRankings(): Clan[] {
  return loadClans().sort((a, b) => b.coins - a.coins || b.wins - a.wins);
}

export function getClanLevelInfo(clan: Clan) {
  return {
    current: getClanLevel(clan.xp),
    next: getNextClanLevel(clan.xp),
  };
}

function generateSampleClans(): Clan[] {
  return [
    {
      id: 'clan1', name: 'Dragon Squad', tag: 'DRGN', logo: '🐉',
      description: 'Elite players only. We dominate every season.',
      level: 5, xp: 8200, coins: 12400, wins: 87, isPublic: true, minElo: 1400,
      createdAt: '2025-01-15T00:00:00Z',
      members: [
        { id: 'm1', username: 'DragonKing', level: 45, elo: 1850, role: 'owner', joinedAt: '2025-01-15T00:00:00Z', weeklyCoins: 520 },
        { id: 'm2', username: 'SwiftEagle', level: 38, elo: 1720, role: 'officer', joinedAt: '2025-02-01T00:00:00Z', weeklyCoins: 380 },
        { id: 'm3', username: 'NightWolf', level: 31, elo: 1580, role: 'member', joinedAt: '2025-03-10T00:00:00Z', weeklyCoins: 290 },
      ],
    },
    {
      id: 'clan2', name: 'Lion Pride', tag: 'LION', logo: '🦁',
      description: 'Strength in unity. All skill levels welcome.',
      level: 4, xp: 4100, coins: 8600, wins: 54, isPublic: true, minElo: 1100,
      createdAt: '2025-02-20T00:00:00Z',
      members: [
        { id: 'm4', username: 'LionHeart', level: 40, elo: 1680, role: 'owner', joinedAt: '2025-02-20T00:00:00Z', weeklyCoins: 610 },
        { id: 'm5', username: 'BoldFox', level: 29, elo: 1410, role: 'officer', joinedAt: '2025-03-05T00:00:00Z', weeklyCoins: 240 },
      ],
    },
    {
      id: 'clan3', name: 'Storm Hawks', tag: 'STRM', logo: '🦅',
      description: 'Fast. Precise. Unstoppable.',
      level: 3, xp: 2200, coins: 5100, wins: 32, isPublic: true, minElo: 1000,
      createdAt: '2025-04-01T00:00:00Z',
      members: [
        { id: 'm6', username: 'StormRider', level: 25, elo: 1320, role: 'owner', joinedAt: '2025-04-01T00:00:00Z', weeklyCoins: 190 },
      ],
    },
    {
      id: 'clan4', name: 'Phoenix Rise', tag: 'PHNX', logo: '🔥',
      description: 'From ashes we rise. Welcoming all players.',
      level: 2, xp: 800, coins: 2200, wins: 15, isPublic: true, minElo: 800,
      createdAt: '2025-05-01T00:00:00Z',
      members: [
        { id: 'm7', username: 'PhoenixFire', level: 18, elo: 1150, role: 'owner', joinedAt: '2025-05-01T00:00:00Z', weeklyCoins: 130 },
      ],
    },
  ];
}
