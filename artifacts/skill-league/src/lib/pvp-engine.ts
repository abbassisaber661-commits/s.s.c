import { generateChallenge, Challenge, LEAGUES, LeagueId } from './game-engine';

export interface PvpPlayer {
  id: string;
  name: string;
  score: number;
  correct: number;
  errors: number;
  streak: number;
  isBot: boolean;
  level: number;
}

export interface PvpRound {
  challenge: Challenge;
  playerAnswered: string | null;
  botAnswered: string | null;
  playerCorrect: boolean | null;
  botCorrect: boolean | null;
  playerTimeMs: number | null;
  botTimeMs: number | null;
}

export interface PvpMatchState {
  phase: 'countdown' | 'playing' | 'round_result' | 'finished';
  timeLeft: number;
  rounds: PvpRound[];
  currentRound: PvpRound | null;
  player: PvpPlayer;
  opponent: PvpPlayer;
  winner: 'player' | 'opponent' | 'draw' | null;
  leagueId: LeagueId;
}

const BOT_NAMES = [
  'SwiftEagle47', 'BrightFox12', 'SharpWolf88', 'QuickTiger33',
  'BoldHawk55', 'KeenArrow21', 'FastStar09', 'SmartBolt77',
  'NeonBlade', 'CryptoMind', 'PixelSniper', 'DataStorm',
];

export function createBotOpponent(leagueId: LeagueId, playerLevel: number): PvpPlayer {
  const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  const levelRange = Math.max(1, playerLevel - 5);
  const level = levelRange + Math.floor(Math.random() * 10);
  return { id: 'bot', name, score: 0, correct: 0, errors: 0, streak: 0, isBot: true, level };
}

export function getBotAccuracy(leagueId: LeagueId): number {
  const base: Record<string, number> = {
    training: 0.70,
    bronze:   0.75,
    silver:   0.82,
    elite:    0.90,
  };
  return base[leagueId] ?? 0.75;
}

export function getBotReactionMs(leagueId: LeagueId, challengeType: string): number {
  const base: Record<string, number> = {
    training: 1400,
    bronze:   1100,
    silver:   850,
    elite:    600,
  };
  const b = base[leagueId] ?? 1000;
  const jitter = (Math.random() - 0.5) * 400;
  const memExtra = challengeType === 'memory' ? 300 : 0;
  return Math.max(200, b + jitter + memExtra);
}

export function scorePvpAnswer(
  correct: boolean,
  timeMs: number,
  timeoutMs: number,
  currentStreak: number,
  challengeType: string,
): number {
  if (!correct) return -2;
  const base = challengeType === 'memory' ? 20 : 10;
  const streakBonus = Math.floor(currentStreak / 3) * 5;
  const speedBonus = Math.round(((timeoutMs - timeMs) / timeoutMs) * 8);
  return base + streakBonus + Math.max(0, speedBonus);
}

export const PVP_GAME_DURATION = 60;
export const PVP_ROUND_RESULT_DELAY = 1200;

export interface RoomType { id: 'public' | 'private' | 'tournament'; label: string; icon: string; desc: string }
export const ROOM_TYPES: RoomType[] = [
  { id: 'public',     label: 'Public Room',     icon: '🌍', desc: 'Jump in with random players' },
  { id: 'private',    label: 'Private Room',    icon: '🔒', desc: 'Invite friends with a code' },
  { id: 'tournament', label: 'Tournament Room', icon: '🏆', desc: 'Compete in a bracket' },
];

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export interface TournamentPlayer {
  id: string;
  name: string;
  level: number;
  isPlayer: boolean;
  score?: number;
  eliminated?: boolean;
}

export interface TournamentMatch {
  id: string;
  round: number;
  playerA: TournamentPlayer | null;
  playerB: TournamentPlayer | null;
  winner: TournamentPlayer | null;
  played: boolean;
}

export interface TournamentBracket {
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  rounds: number;
  currentRound: number;
  champion: TournamentPlayer | null;
  rewards: { coins: number; xp: number; trophy: boolean };
}

const TOURNAMENT_BOT_NAMES = [
  'AlphaStrike', 'BetaBlast', 'GammaPulse', 'DeltaForce',
  'EpsilonEdge', 'ZetaZap', 'EtaElite', 'ThetaTank',
  'IotaIce', 'KappaKing', 'LambdaLord', 'MuMaster',
  'NuNinja', 'XiXtreme', 'OmniOmega',
];

export function createTournamentBracket(
  playerName: string,
  playerLevel: number,
  size: 8 | 16 = 8,
): TournamentBracket {
  const player: TournamentPlayer = { id: 'player', name: playerName, level: playerLevel, isPlayer: true };
  const bots: TournamentPlayer[] = TOURNAMENT_BOT_NAMES
    .slice(0, size - 1)
    .map((name, i) => ({
      id: `bot_${i}`,
      name,
      level: Math.max(1, playerLevel + Math.floor((Math.random() - 0.5) * 20)),
      isPlayer: false,
    }));

  const players = [player, ...bots].sort(() => Math.random() - 0.5);
  const rounds = Math.log2(size);
  const matches: TournamentMatch[] = [];

  for (let i = 0; i < size / 2; i++) {
    matches.push({
      id: `r1_m${i}`,
      round: 1,
      playerA: players[i * 2],
      playerB: players[i * 2 + 1],
      winner: null,
      played: false,
    });
  }

  const rewardMap: Record<number, { coins: number; xp: number; trophy: boolean }> = {
    8:  { coins: 500,  xp: 300,  trophy: true  },
    16: { coins: 1000, xp: 600,  trophy: true  },
  };

  return {
    players,
    matches,
    rounds,
    currentRound: 1,
    champion: null,
    rewards: rewardMap[size],
  };
}

export function simulateBotMatch(a: TournamentPlayer, b: TournamentPlayer): TournamentPlayer {
  const aSkill = a.level + Math.random() * 20;
  const bSkill = b.level + Math.random() * 20;
  return aSkill >= bSkill ? a : b;
}

export function advanceTournamentRound(bracket: TournamentBracket): TournamentBracket {
  const updated = { ...bracket, matches: [...bracket.matches] };
  const roundMatches = updated.matches.filter(m => m.round === updated.currentRound && !m.played);

  for (const match of roundMatches) {
    if (!match.playerA || !match.playerB) continue;
    if (!match.playerA.isPlayer && !match.playerB.isPlayer) {
      const winner = simulateBotMatch(match.playerA, match.playerB);
      match.winner = winner;
      match.played = true;
    }
  }

  const allCurrentPlayed = updated.matches
    .filter(m => m.round === updated.currentRound)
    .every(m => m.played);

  if (allCurrentPlayed) {
    const winners = updated.matches
      .filter(m => m.round === updated.currentRound)
      .map(m => m.winner)
      .filter(Boolean) as TournamentPlayer[];

    if (winners.length === 1) {
      updated.champion = winners[0];
    } else {
      const nextRound = updated.currentRound + 1;
      for (let i = 0; i < winners.length; i += 2) {
        updated.matches.push({
          id: `r${nextRound}_m${Math.floor(i / 2)}`,
          round: nextRound,
          playerA: winners[i] ?? null,
          playerB: winners[i + 1] ?? null,
          winner: null,
          played: false,
        });
      }
      updated.currentRound = nextRound;
    }
  }

  return updated;
}
