/**
 * bot-simulator.ts
 * ─────────────────
 * Simulates real bot vs bot matches every 3 minutes.
 *
 * Each tick:
 *   1. Fetches bot players from DB
 *   2. Pairs them up and simulates real match scores
 *   3. Applies the EXACT same LP + Coins formulas used in matches.ts
 *   4. Creates actual pvp_matches records in the database
 *   5. Updates LP, leagueDivision, wins, losses, coins, matchesPlayed for both bots
 *   6. Simulates standings matches for league-system bots
 *
 * Bot skill levels (derived from skillAccuracy in DB):
 *   🔴 Elite        skillAccuracy ≥ 87  — ~65% win rate
 *   🟠 Advanced     skillAccuracy 68-86 — ~55% win rate
 *   🟡 Intermediate skillAccuracy 50-67 — ~45% win rate
 *   🟢 Beginner     skillAccuracy < 50  — ~30% win rate
 *
 * PROTECTED: LP rules, XP system, Coins system, Puzzle, Match Logic,
 * Question Engine, Division Rules, Economy — never modified here.
 */

import { db, pvpMatchesTable, playersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { logger } from "./logger.js";
import type { LeagueId } from "./league-store.js";

// ── Types ─────────────────────────────────────────────────────────────────────

type SkillLevel = "elite" | "advanced" | "intermediate" | "beginner";

interface BotSnapshot {
  id: string;
  username: string;
  lp: number | null;
  coins: number | null;
  skillAccuracy: number | null;
  matchesPlayed: number | null;
  matchesWon: number | null;
  pvpWins: number | null;
  pvpLosses: number | null;
  pvpWinStreak: number | null;
  bestPvpStreak: number | null;
}

// ── Skill level definitions ───────────────────────────────────────────────────

/** Derive skill level from the bot's skillAccuracy attribute stored in DB. */
function skillLevelFromAccuracy(accuracy: number): SkillLevel {
  if (accuracy >= 87) return "elite";
  if (accuracy >= 68) return "advanced";
  if (accuracy >= 50) return "intermediate";
  return "beginner";
}

/** Score / accuracy / streak ranges per skill level used to generate match data. */
const SKILL_PARAMS: Record<
  SkillLevel,
  { scoreRange: [number, number]; accuracyRange: [number, number]; streakRange: [number, number] }
> = {
  elite:        { scoreRange: [700, 1000], accuracyRange: [0.85, 1.00], streakRange: [5, 10] },
  advanced:     { scoreRange: [500, 800],  accuracyRange: [0.70, 0.90], streakRange: [3,  8] },
  intermediate: { scoreRange: [300, 600],  accuracyRange: [0.50, 0.75], streakRange: [1,  5] },
  beginner:     { scoreRange: [100, 400],  accuracyRange: [0.30, 0.60], streakRange: [0,  3] },
};

/** Win / draw probabilities for league-standings bots per skill level. */
const STANDINGS_WIN_PROB:  Record<SkillLevel, number> = { elite: 0.65, advanced: 0.55, intermediate: 0.45, beginner: 0.30 };
const STANDINGS_DRAW_PROB: Record<SkillLevel, number> = { elite: 0.12, advanced: 0.15, intermediate: 0.18, beginner: 0.20 };

/** Maps league-standings bot names to skill levels (mirrors seed.ts bot data). */
const STANDINGS_BOT_SKILL: Record<string, SkillLevel> = {
  NeonRacer:  "elite",   ByteWolf:    "advanced",     PixelFox:    "advanced",
  SwiftArrow: "advanced", DataStrike: "intermediate", QuickByte:   "intermediate",
  CodeSniper: "intermediate", NetRunner: "beginner",  FlashMind:   "beginner",
  StarKnight: "elite",   CosmicAce:   "elite",        QuantumK:    "elite",
  IronFox:    "advanced", SkyKing:    "intermediate", BrainWave:   "advanced",
  GridHawk:   "intermediate", NeonPulse: "advanced",  LightSpeed:  "intermediate",
  TopTier:    "intermediate", FastHand: "beginner",   DataDash:    "intermediate",
  KiwiBot:    "beginner", CobraK:     "intermediate", ZetaBot:     "beginner",
  StarQ:      "intermediate", BlazeFire: "beginner",  NovaX:       "beginner",
  PiMaster:   "beginner", CodeStrike: "beginner",     WildCard:    "beginner",
  RedAlert:   "beginner", BlueStar:   "beginner",     DarkMatter:  "beginner",
  // aliased names used in league-store.ts BOT_NAMES
  Nova_X:     "beginner", SwiftOne:   "intermediate",
};

// ── LP / Coins formulas — mirrors matches.ts exactly (do NOT alter) ───────────

function getTier(lp: number): string {
  if (lp >= 500) return "champion";
  if (lp >= 300) return "pro";
  if (lp >= 100) return "coin";
  return "training";
}

const TIER_MIN_LP:  Record<string, number>  = { training: 0, coin: 100, pro: 300, champion: 500 };
const TIER_PENALTY: Record<string, boolean> = { training: false, coin: true, pro: true, champion: true };

function calcLpDelta(
  currentLp: number,
  result: { score: number; rank: number; bestStreak: number; correctPct: number },
): { newLp: number; delta: number } {
  const oldTier = getTier(currentLp);
  let delta = 0;

  if      (result.rank === 1)          delta += 25;
  else if (result.rank === 2)          delta += 12;
  else if (result.rank === 3)          delta += 5;
  else if (TIER_PENALTY[oldTier])      delta -= 8;

  if      (result.score >= 900)        delta += 20;
  else if (result.score >= 700)        delta += 15;
  else if (result.score >= 500)        delta += 10;
  else if (result.score >= 300)        delta += 5;

  if      (result.bestStreak >= 7)     delta += 15;
  else if (result.bestStreak >= 5)     delta += 10;
  else if (result.bestStreak >= 3)     delta += 5;

  if      (result.correctPct >= 1.0)   delta += 10;
  else if (result.correctPct >= 0.9)   delta += 6;
  else if (result.correctPct >= 0.7)   delta += 3;

  let newLp = Math.max(0, currentLp + delta);
  if (TIER_PENALTY[oldTier]) newLp = Math.max(TIER_MIN_LP[oldTier] ?? 0, newLp);

  return { newLp, delta };
}

function calcCoinsForMatch(score: number, rank: number, accuracyFraction: number, tier: string): number {
  let coins = 1;
  if      (rank === 1) coins += 3;
  else if (rank === 2) coins += 2;
  else if (rank === 3) coins += 1;
  if      (accuracyFraction >= 1.0) coins += 2;
  else if (accuracyFraction >= 0.8) coins += 1;
  if (tier !== "training") {
    const base     = Math.floor(score / 12);
    const winBonus = rank === 1 ? 60 : rank === 2 ? 30 : rank === 3 ? 10 : 0;
    coins += base + winBonus;
  }
  return coins;
}

// ── Random helpers ────────────────────────────────────────────────────────────

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
function randRange(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
function randFloat(min: number, max: number): number {
  return parseFloat((min + Math.random() * (max - min)).toFixed(3));
}

// ── Core: simulate one real bot vs bot match ──────────────────────────────────

async function simulateBotMatch(botA: BotSnapshot, botB: BotSnapshot): Promise<void> {
  const skillA  = skillLevelFromAccuracy(botA.skillAccuracy ?? 50);
  const skillB  = skillLevelFromAccuracy(botB.skillAccuracy ?? 50);
  const paramsA = SKILL_PARAMS[skillA];
  const paramsB = SKILL_PARAMS[skillB];

  // Generate realistic match performance for each bot
  const scoreA   = randRange(...paramsA.scoreRange);
  const scoreB   = randRange(...paramsB.scoreRange);
  const accA     = randFloat(...paramsA.accuracyRange);
  const accB     = randFloat(...paramsB.accuracyRange);
  const streakA  = randInt(...paramsA.streakRange);
  const streakB  = randInt(...paramsB.streakRange);

  const rankA    = scoreA >= scoreB ? 1 : 2;
  const rankB    = scoreB >  scoreA ? 1 : 2;
  const winnerId = scoreA >= scoreB ? botA.id : botB.id;
  const isWinA   = rankA === 1;
  const isWinB   = rankB === 1;

  const lpA    = botA.lp    ?? 0;
  const lpB    = botB.lp    ?? 0;
  const tierA  = getTier(lpA);
  const tierB  = getTier(lpB);

  // Apply exact same LP / Coins formulas as matches.ts
  const lpResultA = calcLpDelta(lpA, { score: scoreA, rank: rankA, bestStreak: streakA, correctPct: accA });
  const lpResultB = calcLpDelta(lpB, { score: scoreB, rank: rankB, bestStreak: streakB, correctPct: accB });
  const coinsA    = calcCoinsForMatch(scoreA, rankA, accA, tierA);
  const coinsB    = calcCoinsForMatch(scoreB, rankB, accB, tierB);

  // Record the match in the database
  try {
    await db.insert(pvpMatchesTable).values({
      id:           randomUUID(),
      playerAId:    botA.id,
      playerBId:    botB.id,
      winnerId,
      playerAScore: scoreA,
      playerBScore: scoreB,
      leagueId:     tierA,
      matchType:    "bot_sim",
      duration:     30 + randInt(0, 30),
      rounds:       [],
      coinsStake:   0,
      coinsWonA:    coinsA,
      coinsWonB:    coinsB,
      xpGainedA:    0,
      xpGainedB:    0,
      eloChangeA:   lpResultA.delta,
      eloChangeB:   lpResultB.delta,
      finishedAt:   new Date(),
    });
  } catch {
    // Non-critical — continue updating player stats even if insert fails
  }

  // Update bot A — LP, division, wins/losses, coins, streaks, activity
  const streakNewA = isWinA ? (botA.pvpWinStreak ?? 0) + 1 : 0;
  await db.update(playersTable).set({
    lp:             lpResultA.newLp,
    leagueDivision: getTier(lpResultA.newLp),
    coins:          (botA.coins ?? 0) + coinsA,
    matchesPlayed:  (botA.matchesPlayed ?? 0) + 1,
    matchesWon:     (botA.matchesWon   ?? 0) + (isWinA ? 1 : 0),
    pvpWins:        (botA.pvpWins      ?? 0) + (isWinA ? 1 : 0),
    pvpLosses:      (botA.pvpLosses    ?? 0) + (isWinA ? 0 : 1),
    pvpWinStreak:   streakNewA,
    bestPvpStreak:  Math.max(botA.bestPvpStreak ?? 0, streakNewA),
    lastActiveAt:   new Date(),
    updatedAt:      new Date(),
  }).where(eq(playersTable.id, botA.id));

  // Update bot B — LP, division, wins/losses, coins, streaks, activity
  const streakNewB = isWinB ? (botB.pvpWinStreak ?? 0) + 1 : 0;
  await db.update(playersTable).set({
    lp:             lpResultB.newLp,
    leagueDivision: getTier(lpResultB.newLp),
    coins:          (botB.coins ?? 0) + coinsB,
    matchesPlayed:  (botB.matchesPlayed ?? 0) + 1,
    matchesWon:     (botB.matchesWon   ?? 0) + (isWinB ? 1 : 0),
    pvpWins:        (botB.pvpWins      ?? 0) + (isWinB ? 1 : 0),
    pvpLosses:      (botB.pvpLosses    ?? 0) + (isWinB ? 0 : 1),
    pvpWinStreak:   streakNewB,
    bestPvpStreak:  Math.max(botB.bestPvpStreak ?? 0, streakNewB),
    lastActiveAt:   new Date(),
    updatedAt:      new Date(),
  }).where(eq(playersTable.id, botB.id));
}

// ── League standings bot seeding ──────────────────────────────────────────────

/**
 * Fixed permanent bot roster per league — locked counts:
 *   coins   (Training/Div III) = 16 bots
 *   pro     (Division II)      = 16 bots
 *   elite   (Professional)     = 20 bots
 *   champion (Champions)       = 25 bots
 * Never change these counts or re-seed automatically after botsSeeded=true.
 */
const FIXED_ROSTERS: Record<string, string[]> = {
  coins: [
    "Nova_X","BlazeFire","StarQ","KiwiBot","CobraK",
    "SkyKing","FastHand","PiMaster","ZetaBot","CodeStrike",
    "RedAlert","BlueStar","DarkMatter","WildCard","FlashMind","LightSpeed",
  ],                                                                                // 16 bots — LOCKED
  pro: [
    "NeonRacer","SwiftArrow","DataStrike","QuickByte","CodeSniper",
    "NetRunner","StarKnight","CosmicAce","IronFox","BrainWave",
    "GridHawk","NeonPulse","TopTier","DataDash","CobraK","PixelFox",
  ],                                                                                // 16 bots — LOCKED
  elite: [
    "NeonRacer","ByteWolf","PixelFox","SwiftArrow","DataStrike","StarKnight",
    "CosmicAce","QuantumK","IronFox","BrainWave","NeonPulse","CodeSniper",
    "GridHawk","QuickByte","FlashMind","SwiftOne","TopTier","DataDash","StarQ","LightSpeed",
  ],                                                                                // 20 bots — LOCKED
  champion: [
    "NeonRacer","StarKnight","CosmicAce","QuantumK","ByteWolf","PixelFox",
    "SwiftArrow","DataStrike","IronFox","BrainWave","NeonPulse","CodeSniper",
    "QuickByte","FlashMind","GridHawk","LightSpeed","TopTier","DataDash",
    "CobraK","StarQ","BlazeFire","WildCard","BlueStar","SwiftOne","ZetaBot",
  ],                                                                                // 25 bots — LOCKED
};

const LEAGUE_DATA_FILE = process.env.LEAGUE_DATA_FILE ?? resolve("data/leagues.json");

interface StoreEntry {
  id: string; seasonId: string; leagueId: string; playerId: string;
  playerName: string; wins: number; draws: number; losses: number;
  points: number; goalsFor: number; goalsAgainst: number;
  prizeEarned: number; position: number | null;
  promoted: boolean; promotedToLeague: string | null;
  relegated: boolean; relegatedToLeague: string | null;
  joinedAt: string;
}
interface LeagueStoreSeason {
  id: string;
  leagueId: string;
  status: string;
  participantCount: number;
  startAt: string;
  totalRounds: number;
  lastSimRound: number;
  botsSeeded: boolean;
}
interface LeagueStore {
  schemaVersion: number; leagues: unknown[];
  seasons: LeagueStoreSeason[];
  entries: StoreEntry[]; matches: unknown[];
}

function readLeagueStore(): LeagueStore | null {
  if (!existsSync(LEAGUE_DATA_FILE)) return null;
  try { return JSON.parse(readFileSync(LEAGUE_DATA_FILE, "utf8")); }
  catch { return null; }
}
function writeLeagueStore(data: LeagueStore): void {
  try { writeFileSync(LEAGUE_DATA_FILE, JSON.stringify(data, null, 2), "utf8"); }
  catch (err) { logger.error({ err }, "bot-simulator: failed to write league store"); }
}

/**
 * Seed the fixed bot roster for each active league season.
 * Idempotent — skips leagues where botsSeeded=true.
 * All bots start at 0/0/0 for a clean season; rounds fill up naturally over 30 days.
 */
export function seedBotStandings(): void {
  const store = readLeagueStore();
  if (!store) return;

  const leagueIds: LeagueId[] = ["coins", "pro", "elite", "champion"];
  let changed = false;

  for (const leagueId of leagueIds) {
    const season = store.seasons.find(s => s.leagueId === leagueId && s.status === "active");
    if (!season) continue;
    if (season.botsSeeded) continue; // Already seeded — do NOT touch

    const roster = FIXED_ROSTERS[leagueId] ?? [];
    const existingIds = new Set(
      store.entries.filter(e => e.seasonId === season.id).map(e => e.playerId)
    );

    for (const name of roster) {
      const playerId = `bot_standings_${leagueId}_${name.toLowerCase()}`;
      if (existingIds.has(playerId)) continue;

      store.entries.push({
        id:               randomUUID(),
        seasonId:         season.id,
        leagueId,
        playerId,
        playerName:       name,
        wins: 0, draws: 0, losses: 0,
        points: 0, goalsFor: 0, goalsAgainst: 0,
        prizeEarned: 0, position: null,
        promoted: false, promotedToLeague: null,
        relegated: false, relegatedToLeague: null,
        joinedAt: season.startAt ?? new Date().toISOString(),
      });
      changed = true;
    }

    season.botsSeeded = true;
    season.participantCount = store.entries.filter(e => e.seasonId === season.id).length;
    changed = true;
  }

  if (changed) {
    writeLeagueStore(store);
    logger.info("bot-simulator: seeded fixed bot standings");
  }
}

// ── Round-based simulation helpers ───────────────────────────────────────────

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

function lcgRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; };
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rng = lcgRng(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function applyBotMatchResult(
  botA: StoreEntry, botB: StoreEntry,
  skillA: SkillLevel, skillB: SkillLevel,
): void {
  const winProbA  = STANDINGS_WIN_PROB[skillA];
  const winProbB  = STANDINGS_WIN_PROB[skillB];
  const drawProb  = (STANDINGS_DRAW_PROB[skillA] + STANDINGS_DRAW_PROB[skillB]) / 2;
  const totalWin  = winProbA + winProbB;
  const normWinA  = (winProbA / totalWin) * (1 - drawProb);
  const r         = Math.random();

  if (r < normWinA) {
    botA.wins++; botA.points += 3;
    const s = 1 + randInt(0, 2); const c = Math.floor(Math.random() * s);
    botA.goalsFor += s; botA.goalsAgainst += c;
    botB.losses++;
    botB.goalsFor += c; botB.goalsAgainst += s;
  } else if (r < normWinA + drawProb) {
    const g = 1 + randInt(0, 1);
    botA.draws++; botA.points++; botA.goalsFor += g; botA.goalsAgainst += g;
    botB.draws++; botB.points++; botB.goalsFor += g; botB.goalsAgainst += g;
  } else {
    botB.wins++; botB.points += 3;
    const s = 1 + randInt(0, 2); const c = Math.floor(Math.random() * s);
    botB.goalsFor += s; botB.goalsAgainst += c;
    botA.losses++;
    botA.goalsFor += c; botA.goalsAgainst += s;
  }
}

/**
 * Simulate standings rounds for one league.
 * Each call advances from lastSimRound to currentRound (1 match per bot per round).
 * Returns true if any rounds were simulated.
 */
function simulateRoundsForLeague(store: LeagueStore, leagueId: LeagueId): boolean {
  const season = store.seasons.find(s => s.leagueId === leagueId && s.status === "active");
  if (!season || !season.botsSeeded) return false;

  const totalRounds    = season.totalRounds ?? 30;
  const lastSimRound   = season.lastSimRound ?? 0;
  const seasonStartMs  = new Date(season.startAt).getTime();
  const elapsed        = Date.now() - seasonStartMs;
  const currentRound   = Math.min(totalRounds, Math.floor(elapsed / 86_400_000) + 1);

  if (currentRound <= lastSimRound) return false;

  const botEntries = store.entries.filter(
    e => e.seasonId === season.id && e.playerId.startsWith("bot_standings_")
  );
  if (botEntries.length === 0) return false;

  for (let round = lastSimRound + 1; round <= currentRound; round++) {
    const shuffled = seededShuffle(botEntries, hashStr(`${season.id}::r${round}`));

    // Pair adjacent bots for this round — each bot plays exactly 1 match
    for (let i = 0; i + 1 < shuffled.length; i += 2) {
      const botA   = shuffled[i];
      const botB   = shuffled[i + 1];
      const skillA = STANDINGS_BOT_SKILL[botA.playerName] ?? "intermediate";
      const skillB = STANDINGS_BOT_SKILL[botB.playerName] ?? "intermediate";
      applyBotMatchResult(botA, botB, skillA, skillB);
    }

    // Odd bot out: plays against a virtual opponent
    if (shuffled.length % 2 === 1) {
      const bot   = shuffled[shuffled.length - 1];
      const skill = STANDINGS_BOT_SKILL[bot.playerName] ?? "intermediate";
      const wp    = STANDINGS_WIN_PROB[skill];
      const dp    = STANDINGS_DRAW_PROB[skill];
      const r     = Math.random();
      if (r < wp) {
        bot.wins++; bot.points += 3;
        bot.goalsFor += 1 + randInt(0, 1); bot.goalsAgainst += Math.floor(Math.random() * 2);
      } else if (r < wp + dp) {
        bot.draws++; bot.points++;
        const g = 1 + randInt(0, 1); bot.goalsFor += g; bot.goalsAgainst += g;
      } else {
        bot.losses++;
        bot.goalsFor += Math.floor(Math.random() * 2); bot.goalsAgainst += 1 + randInt(0, 1);
      }
    }
  }

  season.lastSimRound = currentRound;
  return true;
}

// ── Main simulation tick ──────────────────────────────────────────────────────

async function simulateTick(): Promise<void> {
  try {
    // Fetch all bot players with fields needed for match simulation
    const bots = await db
      .select({
        id:            playersTable.id,
        username:      playersTable.username,
        lp:            playersTable.lp,
        coins:         playersTable.coins,
        skillAccuracy: playersTable.skillAccuracy,
        matchesPlayed: playersTable.matchesPlayed,
        matchesWon:    playersTable.matchesWon,
        pvpWins:       playersTable.pvpWins,
        pvpLosses:     playersTable.pvpLosses,
        pvpWinStreak:  playersTable.pvpWinStreak,
        bestPvpStreak: playersTable.bestPvpStreak,
      })
      .from(playersTable);

    const botPlayers = bots.filter(b => b.id.startsWith("sl_bot_"));
    if (botPlayers.length >= 2) {
      // Shuffle bots and pair them up — simulate 1-2 real pvp matches per tick
      const shuffled   = [...botPlayers].sort(() => Math.random() - 0.5);
      const matchCount = 1 + randInt(0, 1);
      let simulated    = 0;
      for (let i = 0; i + 1 < shuffled.length && simulated < matchCount; i += 2) {
        await simulateBotMatch(shuffled[i], shuffled[i + 1]);
        simulated++;
      }
      logger.debug({ matchCount: simulated }, "bot-simulator: pvp tick complete");
    }

    // Simulate standings rounds (round-based: 1 match per bot per virtual day)
    const lstore = readLeagueStore();
    if (lstore) {
      let changed = false;
      for (const leagueId of ["coins", "pro", "elite", "champion"] as LeagueId[]) {
        if (simulateRoundsForLeague(lstore, leagueId)) changed = true;
      }
      if (changed) writeLeagueStore(lstore);
    }
  } catch (err) {
    logger.error({ err }, "bot-simulator: tick error");
  }
}

// ── Scheduler ────────────────────────────────────────────────────────────────

const TICK_INTERVAL_MS = 30 * 60 * 1000; // every 30 minutes (round-based simulation)

let _interval: ReturnType<typeof setInterval> | null = null;

export function startBotSimulator(): void {
  if (_interval) return;

  // Seed fixed bot standings (idempotent via botsSeeded flag)
  try { seedBotStandings(); }
  catch (err) { logger.error({ err }, "bot-simulator: initial seed error"); }

  // First tick after 45 seconds (give DB time to fully initialise)
  // This immediately catches up any missed rounds since season start
  setTimeout(() => { simulateTick().catch(() => {}); }, 45_000);

  // Then every 30 minutes
  _interval = setInterval(() => { simulateTick().catch(() => {}); }, TICK_INTERVAL_MS);

  logger.info({ intervalMs: TICK_INTERVAL_MS }, "Bot simulator started (round-based, 30-min tick)");
}
