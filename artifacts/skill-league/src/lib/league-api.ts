/**
 * league-api.ts
 * ─────────────
 * Typed fetch wrapper for the SkillLeague league-system backend.
 */

const BASE    = (import.meta.env.BASE_URL?.replace(/\/$/, '') || '') + '/api/league-system';
const ECON    = (import.meta.env.BASE_URL?.replace(/\/$/, '') || '') + '/api/economy';
const MATCHES = (import.meta.env.BASE_URL?.replace(/\/$/, '') || '') + '/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as Record<string, string>).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Types (mirror backend) ─────────────────────────────────────────────────

export type LeagueId    = 'coins' | 'pro' | 'elite' | 'champion';
export type MatchResult = 'win' | 'draw' | 'loss';
export type MatchStatus = 'upcoming' | 'available' | 'played' | 'missed';

export interface League {
  id:          LeagueId;
  name:        string;
  entryCostPi: number;   // 0 = free (Training), else Pi required
  difficulty:  string;
  color:          string;
  icon:           string;
  description:    string;
  nextLeague:     LeagueId | null;
  prevLeague:     LeagueId | null;
  slotCount:      number;
}

export interface Season {
  id:               string;
  number:           number;
  leagueId:         LeagueId;
  startAt:          string;
  endAt:            string;
  status:           'active' | 'ended' | 'upcoming';
  prizePool:        number;
  participantCount: number;
  createdAt:        string;
  totalRounds:      number;   // Total rounds in season (30)
  currentRound:     number;   // Current active round (1-based)
  lastSimRound:     number;   // Last round simulated for bots
  botsSeeded:       boolean;
}

export interface SeasonEntry {
  id:                string;
  seasonId:          string;
  leagueId:          LeagueId;
  playerId:          string;
  playerName:        string;
  wins:              number;
  draws:             number;
  losses:            number;
  points:            number;
  goalsFor:          number;
  goalsAgainst:      number;
  prizeEarned:       number;
  position:          number | null;
  promoted:          boolean;
  promotedToLeague:  LeagueId | null;
  relegated:         boolean;
  relegatedToLeague: LeagueId | null;
  joinedAt:          string;
}

export interface SeasonMatch {
  id:            string;
  seasonId:      string;
  leagueId:      LeagueId;
  playerId:      string;
  matchNumber:   number;
  scheduledDay:  number;
  opponentName:  string;
  status:        MatchStatus;
  result:        MatchResult | null;
  playerScore:   number | null;
  opponentScore: number | null;
  pointsEarned:  number;
  playedAt:      string | null;
}

export interface PrizeBreakdownItem {
  rank:   number;
  pct:    number;
  amount: number;
}

export interface PlayerStatus {
  active:  Array<{ season: Season; entry: SeasonEntry; league: League }>;
  history: Array<{ season: Season; entry: SeasonEntry; league: League }>;
}

export interface ActiveLeagueInfo {
  leagueId: LeagueId;
  entry:    SeasonEntry;
  season:   Season;
}

// ── API calls ──────────────────────────────────────────────────────────────

export const leagueApi = {
  /** List all 4 leagues. */
  getLeagues: () => apiFetch<League[]>(BASE + '/leagues'),

  /** Active season for a league. */
  getSeason: (leagueId: LeagueId) => apiFetch<Season>(BASE + `/leagues/${leagueId}/season`),

  /** Standings for a league's active season. */
  getStandings: (leagueId: LeagueId, seasonId?: string) => {
    const q = seasonId ? `?seasonId=${seasonId}` : '';
    return apiFetch<SeasonEntry[]>(BASE + `/leagues/${leagueId}/standings${q}`);
  },

  /** Prize pool breakdown for a league. */
  getPrizePool: (leagueId: LeagueId) =>
    apiFetch<{ season: Season; breakdown: PrizeBreakdownItem[] }>(BASE + `/leagues/${leagueId}/prize-pool`),

  /** Join a league (gem check and deduction handled server-side). */
  joinLeague: (leagueId: LeagueId, playerId: string, playerName: string) =>
    apiFetch<{ entry: SeasonEntry; matches: SeasonMatch[] }>(BASE + `/leagues/${leagueId}/join`, {
      method: 'POST',
      body: JSON.stringify({ playerId, playerName }),
    }),

  /** Player's current league memberships + history. */
  getPlayerStatus: (playerId: string) =>
    apiFetch<PlayerStatus>(BASE + `/players/${playerId}/status`),

  /** The single league the player is actively competing in this season (one-per-season). */
  getPlayerActiveLeague: (playerId: string) =>
    apiFetch<ActiveLeagueInfo | null>(BASE + `/players/${playerId}/active-league`),

  /** Player's match schedule (all active leagues or specific season). */
  getPlayerMatches: (playerId: string, seasonId?: string) => {
    const q = seasonId ? `?seasonId=${seasonId}` : '';
    return apiFetch<SeasonMatch[]>(BASE + `/players/${playerId}/matches${q}`);
  },

  /** Player's entry in a specific league. */
  getPlayerEntry: (playerId: string, leagueId: LeagueId) =>
    apiFetch<SeasonEntry | null>(BASE + `/players/${playerId}/entry/${leagueId}`),

  /** Play (simulate) a match. Passes playerName so progression can be tracked. */
  playMatch: (matchId: string, playerId: string, playerName = 'Player') =>
    apiFetch<SeasonMatch>(BASE + `/matches/${matchId}/play`, {
      method: 'POST',
      body: JSON.stringify({ playerId, playerName }),
    }),

  /** List all tournaments (open, full, upcoming). */
  getTournaments: () => apiFetch<Tournament[]>(MATCHES + '/tournaments'),
};

// ── Tournament type ─────────────────────────────────────────────────────────

export interface Tournament {
  id:           string;
  name:         string;
  type:         string;
  status:       string;
  size:         number;
  rewardCoins:  number;
  rewardXp:     number;
  participants: string[];
  startAt:      string | null;
  endAt:        string | null;
  createdAt:    string;
}
