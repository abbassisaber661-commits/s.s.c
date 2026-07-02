/**
 * league-store.ts
 * ───────────────
 * Self-contained JSON-file store for the SkillLeague league system.
 * No external DB dependency — reads/writes a single JSON file on disk.
 * All business logic (join, simulate match, season end, promotions) lives here.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

// ── Constants ──────────────────────────────────────────────────────────────
const DATA_FILE = process.env.LEAGUE_DATA_FILE ?? resolve('data/leagues.json');

// Ensure the data directory exists on startup
try {
  mkdirSync(dirname(DATA_FILE), { recursive: true });
} catch {
  // already exists — safe to ignore
}

const PRIZE_SPLITS = [0.25, 0.18, 0.14, 0.10, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03];

const SEASON_DAYS = 30;
const MATCHES_PER_SEASON = 30;
// One match per day for 30 days
const DAILY_MATCH_COUNTS = Array.from({ length: 30 }, () => 1);

// Promotion / relegation cut-offs (fraction of participants) — LOCKED at 20%
const PROMOTION_PCT  = 0.20;
const RELEGATION_PCT = 0.20;

const BOT_NAMES = [
  'Tom Nakamura','Sara Novak','Tariq Ibrahim','Sana Malik','Ivan Petrov','Omar Silva',
  'Karim Hassan','Amara Osei','Anya Smirnova','Lena Muller','Priya Sharma','Ryan Chen',
  'Carlos Mendez','Yuna Kim','Ethan Williams','Diego Fernandez','Leo Zhang','Elena Petrov',
  'Ben Foster','Mia Johnson',
];


// ── Types ──────────────────────────────────────────────────────────────────

export type LeagueId   = 'coins' | 'pro' | 'elite' | 'champion';
export type Difficulty = 'easy'  | 'medium' | 'hard' | 'expert';
export type SeasonStatus = 'active' | 'ended' | 'upcoming';
export type MatchStatus  = 'upcoming' | 'available' | 'played' | 'missed';
export type MatchResult  = 'win' | 'draw' | 'loss';

/** Maps league IDs to economy-engine tier strings. */
export const LEAGUE_TO_ECONOMY_TIER: Record<LeagueId, string> = {
  coins:    'div3',
  pro:      'div2',
  elite:    'pro',
  champion: 'champions',
};

/** Gem cost to subscribe to a league (aligned with economy engine). */
export const LEAGUE_GEM_COST: Record<LeagueId, number> = {
  coins:    0,
  pro:      1,
  elite:    2,
  champion: 4,
};

export interface League {
  id:             LeagueId;
  name:           string;
  entryType:      'coins' | 'pi';
  entryCostPi:    number;    // Pi entry (0 for Coins league)
  entryCostCoins: number;    // Coin entry (for Coins league; 0 for Pi leagues)
  entryCostGems:  number;    // Gem entry cost (0/1/2/4)
  difficulty:     Difficulty;
  color:          string;
  icon:           string;
  description:    string;
  nextLeague:     LeagueId | null;
  prevLeague:     LeagueId | null;
  slotCount:      number;    // lobby size (20 for coins/pro, 8 for elite/champion)
}

/** Snapshot entry saved for each participant when a season ends. */
export interface FinalRanking {
  position:     number;
  playerId:     string;
  playerName:   string;
  points:       number;
  wins:         number;
  draws:        number;
  losses:       number;
  goalsFor:     number;
  goalsAgainst: number;
  lpAtEnd:      number | null;  // LP captured from DB at season end (null for bots)
  promoted:     boolean;
  relegated:    boolean;
  toLeague:     LeagueId | null;
}

export interface Season {
  id:               string;
  name:             string;   // e.g. "Season 1 — Coins League"
  number:           number;
  leagueId:         LeagueId;
  startAt:          string;   // ISO
  endAt:            string;   // ISO (startAt + 30 days)
  endedAt:          string | null; // actual timestamp when season was closed
  status:           SeasonStatus;
  prizePool:        number;   // Pi accumulated from entries
  participantCount: number;
  createdAt:        string;
  totalRounds:      number;   // Total rounds in season (30)
  lastSimRound:     number;   // Last round simulated for standings bots
  botsSeeded:       boolean;  // Whether fixed bots have been seeded
  finalRankings:    FinalRanking[]; // populated when season ends (snapshot)
}

export interface SeasonEntry {
  id:                  string;
  seasonId:            string;
  leagueId:            LeagueId;
  playerId:            string;
  playerName:          string;
  wins:                number;
  draws:               number;
  losses:              number;
  points:              number;     // wins*3 + draws*1
  goalsFor:            number;
  goalsAgainst:        number;
  prizeEarned:         number;     // Pi
  position:            number | null;
  promoted:            boolean;
  promotedToLeague:    LeagueId | null;
  relegated:           boolean;
  relegatedToLeague:   LeagueId | null;
  joinedAt:            string;
}

export interface SeasonMatch {
  id:            string;
  seasonId:      string;
  leagueId:      LeagueId;
  playerId:      string;
  matchNumber:   number;     // 1–20
  scheduledDay:  number;     // 1–7
  opponentName:  string;
  status:        MatchStatus;
  result:        MatchResult | null;
  playerScore:   number | null;
  opponentScore: number | null;
  pointsEarned:  number;
  playedAt:      string | null;
}

interface Store {
  schemaVersion: number;
  leagues:       League[];
  seasons:       Season[];
  entries:       SeasonEntry[];
  matches:       SeasonMatch[];
}

// ── Default leagues ────────────────────────────────────────────────────────

function makeLeagues(): League[] {
  return [
    {
      id: 'coins', name: 'Coins League',
      entryType: 'coins', entryCostPi: 0, entryCostCoins: 500,
      entryCostGems: 0,
      difficulty: 'easy', color: '#22d3ee', icon: '🥉',
      description: 'Free entry. Beginner tier — earn your first gems here.',
      nextLeague: 'pro', prevLeague: null, slotCount: 16,
    },
    {
      id: 'pro', name: 'Pro League',
      entryType: 'pi', entryCostPi: 0.5, entryCostCoins: 0,
      entryCostGems: 1,
      difficulty: 'medium', color: '#a78bfa', icon: '🥈',
      description: 'Requires 1 💎 gem. Medium difficulty. Real prize pool.',
      nextLeague: 'elite', prevLeague: 'coins', slotCount: 16,
    },
    {
      id: 'elite', name: 'Elite League',
      entryType: 'pi', entryCostPi: 0.75, entryCostCoins: 0,
      entryCostGems: 2,
      difficulty: 'hard', color: '#f59e0b', icon: '🥇',
      description: 'Requires 2 💎 gems. Hard puzzles for serious competitors.',
      nextLeague: 'champion', prevLeague: 'pro', slotCount: 20,
    },
    {
      id: 'champion', name: 'Champion League',
      entryType: 'pi', entryCostPi: 1.0, entryCostCoins: 0,
      entryCostGems: 4,
      difficulty: 'expert', color: '#ef4444', icon: '👑',
      description: 'Requires 4 💎 gems. Expert level. Highest prize pool.',
      nextLeague: null, prevLeague: 'elite', slotCount: 25,
    },
  ];
}

function makeActiveSeason(leagueId: LeagueId, number: number): Season {
  const leagueNames: Record<LeagueId, string> = {
    coins: 'Training League', pro: 'Division II', elite: 'Professional', champion: 'Champions',
  };
  const startAt = new Date().toISOString();
  const endAt   = new Date(Date.now() + SEASON_DAYS * 86_400_000).toISOString();
  return {
    id: randomUUID(),
    name: `Season ${number} — ${leagueNames[leagueId]}`,
    number,
    leagueId,
    startAt, endAt, endedAt: null,
    status: 'active',
    prizePool: 0, participantCount: 0,
    createdAt: startAt,
    totalRounds: SEASON_DAYS,
    lastSimRound: 0,
    botsSeeded: false,
    finalRankings: [],
  };
}

function defaultStore(): Store {
  const leagues = makeLeagues();
  return {
    schemaVersion: 4,
    leagues,
    seasons: leagues.map(l => makeActiveSeason(l.id, 1)),
    entries: [],
    matches: [],
  };
}

// ── Persistence ────────────────────────────────────────────────────────────

let _store: Store;

function load(): Store {
  if (existsSync(DATA_FILE)) {
    try {
      const raw = JSON.parse(readFileSync(DATA_FILE, 'utf8')) as Store;
      // Migrate v1 → v2: add new league fields if missing
      if (!raw.schemaVersion || raw.schemaVersion < 2) {
        raw.schemaVersion = 2;
        const fresh = makeLeagues();
        raw.leagues = raw.leagues.map(l => {
          const f = fresh.find(x => x.id === l.id);
          return f ? { ...f, ...l, entryCostGems: f.entryCostGems, nextLeague: f.nextLeague, prevLeague: f.prevLeague, slotCount: f.slotCount } : l;
        });
        // Migrate entries: add missing fields
        raw.entries = raw.entries.map(e => ({
          ...e,
          promoted:          e.promoted          ?? false,
          promotedToLeague:  (e as SeasonEntry).promotedToLeague  ?? null,
          relegated:         (e as SeasonEntry).relegated         ?? false,
          relegatedToLeague: (e as SeasonEntry).relegatedToLeague ?? null,
        }));
      }
      // Migrate v2 → v3: add round-tracking fields to seasons + updated slotCounts
      if (raw.schemaVersion < 3) {
        raw.schemaVersion = 3;
        raw.seasons = raw.seasons.map(s => ({
          ...s,
          totalRounds:  (s as Season).totalRounds  ?? SEASON_DAYS,
          lastSimRound: (s as Season).lastSimRound ?? 0,
          botsSeeded:   (s as Season).botsSeeded   ?? false,
        }));
        const freshLeagues = makeLeagues();
        raw.leagues = raw.leagues.map(l => {
          const f = freshLeagues.find(x => x.id === l.id);
          return f ? { ...l, slotCount: f.slotCount } : l;
        });
      }
      // Migrate v3 → v4: add Season name, endedAt, finalRankings
      if (raw.schemaVersion < 4) {
        raw.schemaVersion = 4;
        const leagueNames: Record<string, string> = {
          coins: 'Training League', pro: 'Division II', elite: 'Professional', champion: 'Champions',
        };
        raw.seasons = raw.seasons.map(s => ({
          ...s,
          name:          (s as Season).name          ?? `Season ${s.number} — ${leagueNames[s.leagueId] ?? s.leagueId}`,
          endedAt:       (s as Season).endedAt       ?? null,
          finalRankings: (s as Season).finalRankings ?? [],
        }));
        writeFileSync(DATA_FILE, JSON.stringify(raw, null, 2), 'utf8');
      }
      return raw;
    } catch {
      console.warn('[league-store] corrupt data file — starting fresh');
    }
  }
  return defaultStore();
}

function save() {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(_store, null, 2), 'utf8');
  } catch (err) {
    console.error('[league-store] failed to persist:', err);
  }
}

function store(): Store {
  if (!_store) _store = load();
  return _store;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Current round number (1-based) within the season. Capped at totalRounds. */
export function getSeasonCurrentRound(season: Season): number {
  const elapsed = Date.now() - new Date(season.startAt).getTime();
  return Math.min(season.totalRounds ?? SEASON_DAYS, Math.floor(elapsed / 86_400_000) + 1);
}

function currentSeasonDay(season: Season): number {
  return getSeasonCurrentRound(season);
}

function pickBot(exclude: string): string {
  const pool = BOT_NAMES.filter(n => n !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

function simulateResult(difficulty: Difficulty): {
  result: MatchResult; playerScore: number; opponentScore: number;
} {
  const winProb: Record<Difficulty, number> = { easy: 0.65, medium: 0.50, hard: 0.38, expert: 0.28 };
  const drawProb = 0.18;
  const r = Math.random();

  let result: MatchResult;
  if (r < winProb[difficulty]) result = 'win';
  else if (r < winProb[difficulty] + drawProb) result = 'draw';
  else result = 'loss';

  const top = difficulty === 'easy' ? 4 : 3;
  let playerScore: number, opponentScore: number;

  if (result === 'win') {
    playerScore   = 2 + Math.floor(Math.random() * (top - 1));
    opponentScore = Math.floor(Math.random() * playerScore);
  } else if (result === 'draw') {
    playerScore   = 1 + Math.floor(Math.random() * 3);
    opponentScore = playerScore;
  } else {
    opponentScore = 2 + Math.floor(Math.random() * (top - 1));
    playerScore   = Math.floor(Math.random() * opponentScore);
  }

  return { result, playerScore, opponentScore };
}

function getPoints(result: MatchResult): number {
  return result === 'win' ? 3 : result === 'draw' ? 1 : 0;
}

// ── Public API ─────────────────────────────────────────────────────────────

/** All four leagues. */
export function getLeagues(): League[] {
  return store().leagues;
}

/** Get a specific league. */
export function getLeague(id: LeagueId): League | undefined {
  return store().leagues.find(l => l.id === id);
}

/** Active season for a league; creates one if missing. */
export function getActiveSeason(leagueId: LeagueId): Season | null {
  const s = store();
  let season = s.seasons.find(s => s.leagueId === leagueId && s.status === 'active');
  if (!season) {
    const lastNum = Math.max(0, ...s.seasons.filter(x => x.leagueId === leagueId).map(x => x.number));
    season = makeActiveSeason(leagueId, lastNum + 1);
    s.seasons.push(season);
    save();
  }
  return season;
}

/** All seasons (history) for a league, newest first. */
export function getLeagueSeasons(leagueId: LeagueId): Season[] {
  return store().seasons
    .filter(s => s.leagueId === leagueId)
    .sort((a, b) => b.number - a.number);
}

/** Standings for a season, sorted by points then goal difference. */
export function getStandings(seasonId: string): SeasonEntry[] {
  return store().entries
    .filter(e => e.seasonId === seasonId)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.goalsFor - a.goalsAgainst;
      const gdB = b.goalsFor - b.goalsAgainst;
      return gdB - gdA;
    });
}

/** Player's entry in a specific season. */
export function getPlayerEntry(seasonId: string, playerId: string): SeasonEntry | null {
  return store().entries.find(e => e.seasonId === seasonId && e.playerId === playerId) ?? null;
}

/** All seasons a player is enrolled in. */
export function getPlayerSeasons(playerId: string): Array<{ season: Season; entry: SeasonEntry; league: League }> {
  const s = store();
  return s.entries
    .filter(e => e.playerId === playerId)
    .map(entry => {
      const season = s.seasons.find(s => s.id === entry.seasonId)!;
      const league = s.leagues.find(l => l.id === entry.leagueId)!;
      return { season, entry, league };
    })
    .filter(x => x.season && x.league)
    .sort((a, b) => new Date(b.season.startAt).getTime() - new Date(a.season.startAt).getTime());
}

/**
 * Returns the league the player is currently active in (for this season),
 * or null if they are not subscribed to any league.
 */
export function getPlayerActiveLeague(playerId: string): { leagueId: LeagueId; entry: SeasonEntry; season: Season } | null {
  const s = store();
  // Find any active season entry for this player
  for (const entry of s.entries) {
    if (entry.playerId !== playerId) continue;
    const season = s.seasons.find(x => x.id === entry.seasonId);
    if (season && season.status === 'active') {
      return { leagueId: entry.leagueId, entry, season };
    }
  }
  return null;
}

/**
 * Join a league for the current season.
 * Enforces one-league-per-season across all leagues.
 * Does NOT validate payment or gem deduction — callers must handle that.
 */
export function joinLeague(
  leagueId: LeagueId,
  playerId: string,
  playerName: string,
): { entry: SeasonEntry; matches: SeasonMatch[] } | { error: string; conflictLeague?: LeagueId } {
  const s = store();
  const season = getActiveSeason(leagueId);
  if (!season) return { error: 'no active season' };

  // Check: already in this exact league/season
  const existing = s.entries.find(e => e.seasonId === season.id && e.playerId === playerId);
  if (existing) return { error: 'already joined' };

  // ONE-LEAGUE-PER-SEASON enforcement: check all OTHER active seasons
  const activeElsewhere = getPlayerActiveLeague(playerId);
  if (activeElsewhere && activeElsewhere.leagueId !== leagueId) {
    return {
      error: 'already_in_league',
      conflictLeague: activeElsewhere.leagueId,
    };
  }

  const league = s.leagues.find(l => l.id === leagueId)!;

  // Create entry
  const entry: SeasonEntry = {
    id: randomUUID(), seasonId: season.id, leagueId,
    playerId, playerName,
    wins: 0, draws: 0, losses: 0,
    points: 0, goalsFor: 0, goalsAgainst: 0,
    prizeEarned: 0, position: null,
    promoted: false, promotedToLeague: null,
    relegated: false, relegatedToLeague: null,
    joinedAt: new Date().toISOString(),
  };

  // Create 20 match slots distributed across 7 days
  const matches: SeasonMatch[] = [];
  let matchNum = 1;
  DAILY_MATCH_COUNTS.forEach((count, dayIdx) => {
    const day = dayIdx + 1;
    for (let i = 0; i < count; i++) {
      matches.push({
        id: randomUUID(), seasonId: season.id, leagueId,
        playerId, matchNumber: matchNum++,
        scheduledDay: day,
        opponentName: pickBot(playerName),
        status: 'upcoming',
        result: null,
        playerScore: null, opponentScore: null,
        pointsEarned: 0, playedAt: null,
      });
    }
  });

  // Mark day-1 matches as available immediately
  const currentDay = currentSeasonDay(season);
  matches.forEach(m => {
    if (m.scheduledDay <= currentDay) m.status = 'available';
  });

  s.entries.push(entry);
  s.matches.push(...matches);
  season.participantCount++;
  if (league.entryType === 'pi') season.prizePool += league.entryCostPi;
  save();

  return { entry, matches };
}

/** Player's match schedule for a season. */
export function getPlayerMatches(seasonId: string, playerId: string): SeasonMatch[] {
  const s = store();
  const season = s.seasons.find(x => x.id === seasonId);

  // Refresh status — mark due matches as available, overdue as missed
  const matches = s.matches.filter(m => m.seasonId === seasonId && m.playerId === playerId);
  if (season && season.status === 'active') {
    const currentDay = currentSeasonDay(season);
    let changed = false;
    matches.forEach(m => {
      if (m.status === 'upcoming' && m.scheduledDay <= currentDay) {
        m.status = 'available';
        changed = true;
      }
    });
    if (changed) save();
  }

  return matches.sort((a, b) => a.matchNumber - b.matchNumber);
}

/**
 * Play a match (simulate a puzzle game against a bot).
 * Returns the updated match or an error.
 */
export function playMatch(
  matchId: string,
  playerId: string,
): SeasonMatch | { error: string } {
  const s = store();
  const match = s.matches.find(m => m.id === matchId && m.playerId === playerId);
  if (!match) return { error: 'match not found' };
  if (match.status === 'played')  return { error: 'already played' };
  if (match.status === 'upcoming') return { error: 'match not yet available' };

  const season = s.seasons.find(x => x.id === match.seasonId);
  if (!season || season.status !== 'active') return { error: 'season not active' };

  const league = s.leagues.find(l => l.id === match.leagueId)!;
  const { result, playerScore, opponentScore } = simulateResult(league.difficulty);
  const pts = getPoints(result);

  match.status        = 'played';
  match.result        = result;
  match.playerScore   = playerScore;
  match.opponentScore = opponentScore;
  match.pointsEarned  = pts;
  match.playedAt      = new Date().toISOString();

  // Update entry stats
  const entry = s.entries.find(e => e.seasonId === match.seasonId && e.playerId === playerId);
  if (entry) {
    const played = s.matches.filter(
      m => m.playerId === playerId && m.seasonId === match.seasonId && m.status === 'played',
    );
    entry.wins   = played.filter(m => m.result === 'win').length;
    entry.draws  = played.filter(m => m.result === 'draw').length;
    entry.losses = played.filter(m => m.result === 'loss').length;
    entry.points = entry.wins * 3 + entry.draws;
    entry.goalsFor     = played.reduce((s, m) => s + (m.playerScore ?? 0), 0);
    entry.goalsAgainst = played.reduce((s, m) => s + (m.opponentScore ?? 0), 0);
  }

  save();
  return match;
}

/**
 * Admin / scheduler: end the current season and start a new one.
 * Distributes prizes, assigns positions, marks promotions & relegations.
 * Saves a full FinalRankings snapshot (including LP from DB if lpMap provided).
 *
 * @param leagueId   - Which league to advance
 * @param lpMap      - Optional map of playerId → current LP (fetched from DB by caller)
 */
export function advanceSeason(
  leagueId: LeagueId,
  lpMap: Record<string, number> = {},
): {
  ended: Season;
  newSeason: Season;
  promotedCount: number;
  relegatedCount: number;
  prizes: Record<string, number>;
  promotions: Array<{ playerId: string; playerName: string; fromLeague: LeagueId; toLeague: LeagueId }>;
  relegations: Array<{ playerId: string; playerName: string; fromLeague: LeagueId; toLeague: LeagueId }>;
} | { error: string } {
  const s = store();
  const season = s.seasons.find(x => x.leagueId === leagueId && x.status === 'active');
  if (!season) return { error: 'no active season' };

  // All participants (real players AND bots) are treated equally
  const allEntries = s.entries.filter(e => e.seasonId === season.id);
  const sorted = [...allEntries].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
  });

  const prizes: Record<string, number> = {};
  const totalCount       = sorted.length;
  const promotionCutoff  = totalCount > 0 ? Math.max(1, Math.ceil(totalCount  * PROMOTION_PCT))  : 0;
  const relegationCutoff = totalCount > 0 ? Math.max(0, Math.floor(totalCount * (1 - RELEGATION_PCT))) : 0;
  const league = s.leagues.find(l => l.id === leagueId)!;

  const promotions: Array<{ playerId: string; playerName: string; fromLeague: LeagueId; toLeague: LeagueId }> = [];
  const relegations: Array<{ playerId: string; playerName: string; fromLeague: LeagueId; toLeague: LeagueId }> = [];

  // Assign positions, prizes, promotion & relegation — all participants equally
  sorted.forEach((entry, i) => {
    entry.position = i + 1;

    // Prize (only Pi leagues, only real players)
    if (i < PRIZE_SPLITS.length && season.prizePool > 0 && !entry.playerId.startsWith('bot_standings_')) {
      entry.prizeEarned = parseFloat((season.prizePool * PRIZE_SPLITS[i]).toFixed(4));
      prizes[entry.playerId] = entry.prizeEarned;
    }

    // Promotion (top 20%) — bots and real players alike
    if (i < promotionCutoff && league.nextLeague) {
      entry.promoted = true;
      entry.promotedToLeague = league.nextLeague;
      promotions.push({
        playerId: entry.playerId, playerName: entry.playerName,
        fromLeague: leagueId, toLeague: league.nextLeague,
      });
    }

    // Relegation (bottom 20%) — bots and real players alike, only if not lowest league
    if (i >= relegationCutoff && totalCount > 3 && league.prevLeague) {
      entry.relegated = true;
      entry.relegatedToLeague = league.prevLeague;
      relegations.push({
        playerId: entry.playerId, playerName: entry.playerName,
        fromLeague: leagueId, toLeague: league.prevLeague,
      });
    }
  });

  // ── Build finalRankings snapshot ─────────────────────────────────────────
  season.finalRankings = sorted.map((entry, i): FinalRanking => ({
    position:     i + 1,
    playerId:     entry.playerId,
    playerName:   entry.playerName,
    points:       entry.points,
    wins:         entry.wins,
    draws:        entry.draws,
    losses:       entry.losses,
    goalsFor:     entry.goalsFor,
    goalsAgainst: entry.goalsAgainst,
    lpAtEnd:      lpMap[entry.playerId] ?? null,
    promoted:     entry.promoted,
    relegated:    entry.relegated,
    toLeague:     entry.promotedToLeague ?? entry.relegatedToLeague ?? null,
  }));

  // ── Close season ─────────────────────────────────────────────────────────
  season.status  = 'ended';
  season.endedAt = new Date().toISOString();

  // Mark outstanding matches as missed
  s.matches
    .filter(m => m.seasonId === season.id && m.status !== 'played')
    .forEach(m => { m.status = 'missed'; });

  // ── Start new season ─────────────────────────────────────────────────────
  const lastNum  = Math.max(...s.seasons.filter(x => x.leagueId === leagueId).map(x => x.number));
  const newSeason = makeActiveSeason(leagueId, lastNum + 1);
  s.seasons.push(newSeason);
  save();

  return {
    ended: season,
    newSeason,
    promotedCount:  promotions.length,
    relegatedCount: relegations.length,
    prizes,
    promotions,
    relegations,
  };
}

/** Returns the finalRankings snapshot for a specific ended season. */
export function getSeasonSnapshot(seasonId: string): FinalRanking[] {
  const season = store().seasons.find(s => s.id === seasonId);
  return season?.finalRankings ?? [];
}

/** All seasons across all leagues, newest first. */
export function getAllSeasons(): Season[] {
  return [...store().seasons].sort(
    (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
  );
}

/**
 * Returns active seasons whose endAt has passed — these need auto-advancing.
 * Called by the season scheduler every hour.
 */
export function getExpiredActiveSeasons(): Season[] {
  const now = Date.now();
  return store().seasons.filter(
    s => s.status === 'active' && new Date(s.endAt).getTime() <= now,
  );
}

/**
 * Initialise the league store on server startup.
 * Forces the JSON file to be written to disk if it doesn't exist yet,
 * so that bot-simulator.ts can read it in seedBotStandings().
 */
export function initLeagueStore(): void {
  const s = store();
  // Ensure every league has an active season (creates missing ones + saves)
  const leagueIds: LeagueId[] = ['coins', 'pro', 'elite', 'champion'];
  for (const lid of leagueIds) {
    if (!s.seasons.find(x => x.leagueId === lid && x.status === 'active')) {
      const lastNum = Math.max(0, ...s.seasons.filter(x => x.leagueId === lid).map(x => x.number));
      s.seasons.push(makeActiveSeason(lid, lastNum + 1));
    }
  }
  // Always persist on startup so bot-simulator can read the file
  save();
}

/** Prize pool breakdown for a league's active season. */
export function getPrizeBreakdown(seasonId: string): Array<{ rank: number; pct: number; amount: number }> {
  const season = store().seasons.find(s => s.id === seasonId);
  if (!season) return [];
  return PRIZE_SPLITS.map((pct, i) => ({
    rank: i + 1,
    pct: Math.round(pct * 100),
    amount: parseFloat((season.prizePool * pct).toFixed(4)),
  }));
}

/** Force-refresh match availability for all active seasons. */
export function refreshMatchStatuses(): number {
  const s = store();
  let count = 0;
  const activeSeasions = s.seasons.filter(x => x.status === 'active');
  activeSeasions.forEach(season => {
    const currentDay = currentSeasonDay(season);
    s.matches
      .filter(m => m.seasonId === season.id && m.status === 'upcoming' && m.scheduledDay <= currentDay)
      .forEach(m => { m.status = 'available'; count++; });
  });
  if (count > 0) save();
  return count;
}
