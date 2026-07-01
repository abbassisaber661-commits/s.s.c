import { Server as HttpServer } from "http";
import { Server as IOServer, Socket } from "socket.io";
import { db, pvpMatchesTable, playersTable, notificationsTable, postsTable, messagesTable, coinTransactionsTable } from "@workspace/db";
import { desc, eq, and, or, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Arena Config (server-authoritative entry costs & reward multipliers) ──────

interface ArenaConfig {
  entryCost:       number;
  winMultiplier:   number;
  drawMultiplier:  number;
  eloK:            number;
  displayName:     string;
}

const ARENA_CONFIG: Record<string, ArenaConfig> = {
  training:  { entryCost: 0,   winMultiplier: 1.5, drawMultiplier: 0.5, eloK: 16, displayName: "Training"  },
  bronze:    { entryCost: 0,   winMultiplier: 1.5, drawMultiplier: 0.5, eloK: 16, displayName: "Bronze"    },
  coin:      { entryCost: 50,  winMultiplier: 2.5, drawMultiplier: 0.8, eloK: 24, displayName: "Coin"      },
  silver:    { entryCost: 50,  winMultiplier: 2.5, drawMultiplier: 0.8, eloK: 24, displayName: "Silver"    },
  pro:       { entryCost: 200, winMultiplier: 3.0, drawMultiplier: 1.0, eloK: 32, displayName: "Pro"       },
  elite:     { entryCost: 200, winMultiplier: 3.0, drawMultiplier: 1.0, eloK: 32, displayName: "Elite"     },
  champion:  { entryCost: 500, winMultiplier: 4.0, drawMultiplier: 1.2, eloK: 48, displayName: "Champion"  },
};

const DEFAULT_ARENA: ArenaConfig = { entryCost: 0, winMultiplier: 2.0, drawMultiplier: 0.7, eloK: 24, displayName: "Standard" };

function getArenaConfig(leagueId: string): ArenaConfig {
  return ARENA_CONFIG[leagueId?.toLowerCase()] ?? DEFAULT_ARENA;
}

// ─── LP / Division Helpers ────────────────────────────────────────────────────

function computeLP(elo: number): { lp: number; leagueDivision: string } {
  if (elo < 1100) {
    return { lp: Math.max(0, Math.min(1000, Math.round((elo - 800) / 300 * 1000))), leagueDivision: "training" };
  } else if (elo < 1400) {
    return { lp: Math.max(0, Math.min(1000, Math.round((elo - 1100) / 300 * 1000))), leagueDivision: "coin" };
  } else if (elo < 1700) {
    return { lp: Math.max(0, Math.min(1000, Math.round((elo - 1400) / 300 * 1000))), leagueDivision: "pro" };
  } else {
    return { lp: Math.max(0, Math.min(1000, Math.round((elo - 1700) / 400 * 1000))), leagueDivision: "champion" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────

interface QueueEntry {
  socketId: string;
  playerId: string;
  playerName: string;
  playerLevel: number;
  playerElo: number;
  leagueId: string;
  stake: number;
  stakeDeducted: boolean;
  joinedAt: number;
}

interface PvpRoomPlayer {
  socketId: string;
  playerId: string;
  name: string;
  level: number;
  elo: number;
  score: number;
  correct: number;
  errors: number;
  streak: number;
  answeredCurrentRound: boolean;
  lastAnswerTime: number;
  answerSpeeds: number[];
}

interface PvpRoom {
  roomId: string;
  leagueId: string;
  stake: number;
  playerA: PvpRoomPlayer;
  playerB: PvpRoomPlayer;
  currentChallenge: any | null;
  roundNumber: number;
  roundStartTime: number;
  status: "countdown" | "playing" | "finished";
  roundTimer: ReturnType<typeof setTimeout> | null;
  gameTimer: ReturnType<typeof setTimeout> | null;
  startTime: number;
  duration: number;
}

// ─── Anti-Cheat ───────────────────────────────────────────────────────────────

interface AntiCheatState {
  sessionStart: number;
  answers: number[];
  suspiciousCount: number;
  lastFlagged: number;
}

const antiCheatMap = new Map<string, AntiCheatState>();

function checkAntiCheat(
  socketId: string,
  responseMs: number,
  score: number,
): { ok: boolean; reason?: string } {
  const MIN_HUMAN_MS = 120;

  if (responseMs < MIN_HUMAN_MS) {
    return { ok: false, reason: "too_fast" };
  }

  let state = antiCheatMap.get(socketId);
  if (!state) {
    state = { sessionStart: Date.now(), answers: [], suspiciousCount: 0, lastFlagged: 0 };
    antiCheatMap.set(socketId, state);
  }

  state.answers.push(responseMs);
  if (state.answers.length > 20) state.answers.shift();

  if (state.answers.length >= 5) {
    const avg = state.answers.reduce((a, b) => a + b, 0) / state.answers.length;
    if (avg < 200) {
      state.suspiciousCount++;
      if (state.suspiciousCount >= 3) {
        return { ok: false, reason: "inhuman_speed" };
      }
    }
  }

  return { ok: true };
}

// ─── Challenge Generator ───────────────────────────────────────────────────────

const COLORS = [
  { id: "red",    name: "أحمر",   hex: "#EF4444" },
  { id: "blue",   name: "أزرق",   hex: "#3B82F6" },
  { id: "green",  name: "أخضر",   hex: "#22C55E" },
  { id: "yellow", name: "أصفر",   hex: "#EAB308" },
  { id: "purple", name: "بنفسجي", hex: "#A855F7" },
  { id: "orange", name: "برتقالي",hex: "#F97316" },
];

function generateChallenge(optionCount = 4) {
  const shuffled = [...COLORS].sort(() => Math.random() - 0.5);
  const options = shuffled.slice(0, optionCount);
  const target = options[Math.floor(Math.random() * options.length)];
  const isStroop = Math.random() < 0.5;
  const displayColor = isStroop
    ? COLORS.filter((c) => c.id !== target.id)[Math.floor(Math.random() * (COLORS.length - 1))]
    : target;

  return {
    id: Math.random().toString(36).slice(2),
    type: isStroop ? "stroop" : "match",
    target,
    displayColor,
    options,
    question: isStroop ? `اضغط على: ${target.name}` : "اضغط على اللون المطابق",
    timeoutMs: 2500,
  };
}

// ─── Bot AI ───────────────────────────────────────────────────────────────────

type BotDifficulty = "easy" | "medium" | "hard";

function getBotDifficulty(leagueId: string): BotDifficulty {
  return leagueId === "elite" ? "hard" : leagueId === "silver" ? "medium" : "easy";
}

function getBotAccuracy(diff: BotDifficulty): number {
  return { easy: 0.50, medium: 0.73, hard: 0.92 }[diff];
}

function getBotReaction(diff: BotDifficulty, challengeType: string, avgResponseMs?: number): number {
  const base = { easy: 1800, medium: 1100, hard: 550 }[diff];
  const jitter = (Math.random() - 0.5) * 400;
  const memExtra = challengeType === "memory" ? 400 : 0;

  let adaptive = 0;
  if (avgResponseMs && diff === "hard") {
    adaptive = avgResponseMs < 600 ? -100 : 100;
  }

  return Math.max(180, base + jitter + memExtra + adaptive);
}

const BOT_NAMES: Record<BotDifficulty, string[]> = {
  easy:   ["SlowBot_E", "EasyAI_1", "Beginner_X", "Novice_Bot", "LearnAI_3"],
  medium: ["MindBot_M", "MidAI_7",  "SmartBot_2", "AveragePro", "SteadyAI"],
  hard:   ["MasterAI",  "EliteBot_H","OmegaMind",  "ApexAI_X",  "UltraCore"],
};

function makeBotPlayer(playerLevel: number, playerElo: number, leagueId: string): PvpRoomPlayer {
  const diff = getBotDifficulty(leagueId);
  const offsets = { easy: -4, medium: 0, hard: 4 };
  const eloOffsets = { easy: -80, medium: 0, hard: 80 };
  const names = BOT_NAMES[diff];

  return {
    socketId: "bot",
    playerId: "bot",
    name: names[Math.floor(Math.random() * names.length)],
    level: Math.max(1, Math.min(100, playerLevel + offsets[diff] + Math.floor(Math.random() * 3) - 1)),
    elo: Math.max(800, playerElo + eloOffsets[diff] + Math.floor(Math.random() * 40) - 20),
    score: 0,
    correct: 0,
    errors: 0,
    streak: 0,
    answeredCurrentRound: false,
    lastAnswerTime: 0,
    answerSpeeds: [],
  };
}

function scorePvpAnswer(correct: boolean, elapsedMs: number, timeoutMs: number, streak: number): number {
  if (!correct) return -2;
  const speedBonus = Math.round(Math.max(0, (timeoutMs - elapsedMs) / timeoutMs) * 5);
  const streakBonus = streak >= 3 ? 5 : 0;
  return 10 + speedBonus + streakBonus;
}

// ─── State ────────────────────────────────────────────────────────────────────

const matchmakingQueue = new Map<string, QueueEntry>();
const rooms = new Map<string, PvpRoom>();
const playerSockets = new Map<string, string>();

// Leaderboard broadcast interval
let lbInterval: ReturnType<typeof setInterval> | null = null;

// ─── Exported IO instance (for notification service) ──────────────────────────
let ioInstance: IOServer | null = null;
export function getIO(): IOServer | null { return ioInstance; }

// ─── Rank notification tracking (top-10 ELO) ──────────────────────────────────
const previousTop10: Set<string> = new Set();

// ─── DB Leaderboard Broadcast ─────────────────────────────────────────────────

async function broadcastLeaderboard(io: IOServer) {
  try {
    const rows = await db.select({
      id:                 playersTable.id,
      username:           playersTable.username,
      avatar:             playersTable.avatar,
      level:              playersTable.level,
      elo:                playersTable.elo,
      fame:               playersTable.fame,
      pvpWins:            playersTable.pvpWins,
      verificationStatus: playersTable.verificationStatus,
    }).from(playersTable).orderBy(desc(playersTable.elo)).limit(50);

    if (rows.length > 0) {
      io.emit("leaderboard:update", rows);

      // ── Rank-change notifications: detect new top-10 entrants ──
      const currentTop10 = new Set(rows.slice(0, 10).map((r) => r.id));
      for (const playerId of currentTop10) {
        if (!previousTop10.has(playerId)) {
          // Player just entered top 10 — find their rank
          const rank = rows.findIndex((r) => r.id === playerId) + 1;
          // Fire-and-forget — import notification service lazily to avoid circular dep
          import("../lib/notificationService.js").then(({ createNotification }) => {
            createNotification({
              playerId,
              type: "rank",
              title: "🏆 دخلت أفضل 10!",
              body: `أنت الآن في المرتبة #${rank} على لوحة المتصدرين`,
              data: { rank },
            }).catch(() => {});
          }).catch(() => {});
        }
      }
      // Update tracking set
      previousTop10.clear();
      for (const id of currentTop10) previousTop10.add(id);
    }
  } catch (err: unknown) {
    // Silently skip if tables are not yet created (cold start / schema not pushed yet)
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("relation") && msg.includes("does not exist")) return;
    logger.error({ err }, "leaderboard broadcast error");
  }
}

// ─── Queue Processing ─────────────────────────────────────────────────────────

function nanoid6() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function processQueue(io: IOServer) {
  const entries = Array.from(matchmakingQueue.values());
  const now = Date.now();

  for (let i = 0; i < entries.length; i++) {
    const a = entries[i];
    if (!matchmakingQueue.has(a.socketId)) continue;

    const waitMs = now - a.joinedAt;

    let matched: QueueEntry | null = null;
    for (let j = i + 1; j < entries.length; j++) {
      const b = entries[j];
      if (!matchmakingQueue.has(b.socketId)) continue;
      if (b.leagueId !== a.leagueId) continue;
      const eloDiff = Math.abs(a.playerElo - b.playerElo);
      const eloCap = waitMs > 10000 ? 400 : 200;
      if (eloDiff <= eloCap) {
        matched = b;
        break;
      }
    }

    if (matched) {
      matchmakingQueue.delete(a.socketId);
      matchmakingQueue.delete(matched.socketId);
      createRoom(io, a, matched);
    } else if (waitMs > 12000) {
      matchmakingQueue.delete(a.socketId);
      createBotRoom(io, a);
    }
  }
}

function createRoom(io: IOServer, playerA: QueueEntry, playerB: QueueEntry) {
  const roomId = `room_${nanoid6()}`;

  const makePlayer = (q: QueueEntry): PvpRoomPlayer => ({
    socketId: q.socketId,
    playerId: q.playerId,
    name: q.playerName,
    level: q.playerLevel,
    elo: q.playerElo,
    score: 0, correct: 0, errors: 0, streak: 0,
    answeredCurrentRound: false, lastAnswerTime: 0, answerSpeeds: [],
  });

  const room: PvpRoom = {
    roomId,
    leagueId: playerA.leagueId,
    stake: playerA.stake,
    playerA: makePlayer(playerA),
    playerB: makePlayer(playerB),
    currentChallenge: null,
    roundNumber: 0,
    roundStartTime: 0,
    status: "countdown",
    roundTimer: null,
    gameTimer: null,
    startTime: 0,
    duration: 60,
  };

  rooms.set(roomId, room);

  const sA = io.sockets.sockets.get(playerA.socketId);
  const sB = io.sockets.sockets.get(playerB.socketId);

  sA?.join(roomId);
  sB?.join(roomId);

  io.to(roomId).emit("match:found", {
    roomId,
    isBot: false,
    playerA: { name: playerA.playerName, level: playerA.playerLevel, elo: playerA.playerElo },
    playerB: { name: playerB.playerName, level: playerB.playerLevel, elo: playerB.playerElo },
  });

  logger.info({ roomId, playerA: playerA.playerId, playerB: playerB.playerId }, "PvP room created");

  setTimeout(() => startRoom(io, roomId), 3000);
}

function createBotRoom(io: IOServer, player: QueueEntry) {
  const roomId = `room_${nanoid6()}`;
  const bot = makeBotPlayer(player.playerLevel, player.playerElo, player.leagueId);

  const room: PvpRoom = {
    roomId,
    leagueId: player.leagueId,
    stake: player.stake,
    playerA: {
      socketId: player.socketId,
      playerId: player.playerId,
      name: player.playerName,
      level: player.playerLevel,
      elo: player.playerElo,
      score: 0, correct: 0, errors: 0, streak: 0,
      answeredCurrentRound: false, lastAnswerTime: 0, answerSpeeds: [],
    },
    playerB: bot,
    currentChallenge: null,
    roundNumber: 0,
    roundStartTime: 0,
    status: "countdown",
    roundTimer: null,
    gameTimer: null,
    startTime: 0,
    duration: 60,
  };

  rooms.set(roomId, room);

  const sock = io.sockets.sockets.get(player.socketId);
  sock?.join(roomId);

  io.to(roomId).emit("match:found", {
    roomId,
    isBot: true,
    botDifficulty: getBotDifficulty(player.leagueId),
    playerA: { name: player.playerName, level: player.playerLevel, elo: player.playerElo },
    playerB: { name: bot.name, level: bot.level, elo: bot.elo },
  });

  logger.info({ roomId, player: player.playerId, bot: bot.name }, "Bot room created");

  setTimeout(() => startRoom(io, roomId), 3000);
}

function startRoom(io: IOServer, roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.status = "playing";
  room.startTime = Date.now();

  room.gameTimer = setTimeout(() => endRoom(io, roomId), room.duration * 1000);

  io.to(roomId).emit("match:start", { roomId, duration: room.duration });

  nextRound(io, roomId);
}

function nextRound(io: IOServer, roomId: string) {
  const room = rooms.get(roomId);
  if (!room || room.status !== "playing") return;

  const challenge = generateChallenge(4);
  room.currentChallenge = challenge;
  room.roundNumber++;
  room.roundStartTime = Date.now();
  room.playerA.answeredCurrentRound = false;
  room.playerB.answeredCurrentRound = false;

  io.to(roomId).emit("round:new", { challenge, roundNumber: room.roundNumber });

  if (room.playerB.socketId === "bot") {
    const diff = getBotDifficulty(room.leagueId);
    const playerAvgSpeed = room.playerA.answerSpeeds.length > 0
      ? room.playerA.answerSpeeds.reduce((a, b) => a + b, 0) / room.playerA.answerSpeeds.length
      : undefined;
    const botMs = getBotReaction(diff, challenge.type, playerAvgSpeed);
    const botAcc = getBotAccuracy(diff);
    const botCorrect = Math.random() < botAcc;

    room.roundTimer = setTimeout(() => {
      if (!room || room.status !== "playing") return;
      if (room.playerB.answeredCurrentRound) return;

      const pts = scorePvpAnswer(botCorrect, botMs, challenge.timeoutMs, room.playerB.streak);
      room.playerB.score = Math.max(0, room.playerB.score + pts);
      if (botCorrect) { room.playerB.correct++; room.playerB.streak++; }
      else { room.playerB.errors++; room.playerB.streak = 0; }
      room.playerB.answeredCurrentRound = true;

      io.to(roomId).emit("round:bot_answer", {
        correct: botCorrect,
        scoreB: room.playerB.score,
        streakB: room.playerB.streak,
      });

      setTimeout(() => {
        if (!room.playerA.answeredCurrentRound) {
          room.playerA.errors++;
          room.playerA.streak = 0;
          room.playerA.answeredCurrentRound = true;
          io.to(roomId).emit("round:timeout", {
            scoreA: room.playerA.score,
            scoreB: room.playerB.score,
          });
        }
        setTimeout(() => nextRound(io, roomId), 400);
      }, 700);
    }, botMs);
  } else {
    room.roundTimer = setTimeout(() => {
      if (!room || room.status !== "playing") return;
      if (!room.playerA.answeredCurrentRound) {
        room.playerA.errors++;
        room.playerA.streak = 0;
        room.playerA.answeredCurrentRound = true;
      }
      if (!room.playerB.answeredCurrentRound) {
        room.playerB.errors++;
        room.playerB.streak = 0;
        room.playerB.answeredCurrentRound = true;
      }
      io.to(roomId).emit("round:timeout", {
        scoreA: room.playerA.score,
        scoreB: room.playerB.score,
      });
      setTimeout(() => nextRound(io, roomId), 400);
    }, challenge.timeoutMs + 500);
  }
}

function endRoom(io: IOServer, roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  if (room.roundTimer) clearTimeout(room.roundTimer);
  if (room.gameTimer) clearTimeout(room.gameTimer);
  room.status = "finished";

  const isBot = room.playerB.socketId === "bot";
  const won   = room.playerA.score > room.playerB.score;
  const draw  = room.playerA.score === room.playerB.score;

  // ── Arena Config ─────────────────────────────────────────────────────────
  const arena = getArenaConfig(room.leagueId);

  // ── ELO calculation (K from arena config) ────────────────────────────────
  const K          = isBot ? arena.eloK / 2 : arena.eloK;
  const expectedA  = 1 / (1 + Math.pow(10, (room.playerB.elo - room.playerA.elo) / 400));
  const scoreVal   = won ? 1 : draw ? 0.5 : 0;
  const eloChange  = Math.round(K * (scoreVal - expectedA));

  // ── Arena coin reward (uses arena multipliers, stake already pre-deducted) ─
  // Since stake was pre-deducted at queue entry, coinsNet here is PURELY winnings
  const coinsWon  = won  ? Math.round(room.stake * arena.winMultiplier)
                  : draw ? Math.round(room.stake * arena.drawMultiplier)
                  : 0;
  // coinsNet = net change from the PRE-DEDUCTED state
  // If won: player gets coinsWon back (stake already gone) → net = coinsWon
  // If lost/draw 0: player already lost stake → net = 0 here (stake was pre-deducted)
  const coinsNet  = coinsWon;   // stake was already deducted at queue entry

  // ── XP (scales with arena tier + real vs bot) ────────────────────────────
  const xpGained = isBot
    ? (won ? 60  : draw ? 20 : 8)
    : (won ? 120 + (arena.eloK - 16) * 2 : draw ? 50 : 25);

  // ── LP computation for player A ──────────────────────────────────────────
  const newEloA   = Math.max(800, room.playerA.elo + eloChange);
  const { lp: newLpA, leagueDivision: newDivA } = computeLP(newEloA);
  const lpChangeA = newLpA - computeLP(room.playerA.elo).lp;

  io.to(roomId).emit("match:end", {
    roomId,
    scoreA:            room.playerA.score,
    scoreB:            room.playerB.score,
    correctA:          room.playerA.correct,
    correctB:          room.playerB.correct,
    won,
    draw,
    isBot,
    leagueId:          room.leagueId,
    stake:             room.stake,
    coinReward:        coinsWon,
    coinsNet,
    eloChange,
    xpGained,
    newLp:             newLpA,
    lpChange:          lpChangeA,
    newLeagueDivision: newDivA,
  });

  logger.info({ roomId, scoreA: room.playerA.score, scoreB: room.playerB.score, won, eloChange, coinsNet, newDivA }, "Match ended");

  // ── Persist to DB (fire-and-forget) ──────────────────────────────────────
  ;(async () => {
    try {
      const matchId  = `${roomId}_${Date.now()}`;
      const winnerId = won ? room.playerA.playerId : draw ? null : (isBot ? "bot" : room.playerB.playerId);

      // Compute player B LP/division for storage
      const bWon        = !won && !draw;
      const bDraw       = draw;
      const bEloChange  = Math.round(K * ((1 - scoreVal) - (1 - expectedA)));
      const bCoinsWon   = bWon  ? Math.round(room.stake * arena.winMultiplier)
                        : bDraw ? Math.round(room.stake * arena.drawMultiplier)
                        : 0;
      const bCoinsNet   = bCoinsWon;
      const bXp         = isBot ? 0 : (bWon ? 120 + (arena.eloK - 16) * 2 : bDraw ? 50 : 25);
      const newEloB     = Math.max(800, room.playerB.elo + bEloChange);
      const { lp: newLpB, leagueDivision: newDivB } = computeLP(newEloB);

      await db.insert(pvpMatchesTable).values({
        id:           matchId,
        playerAId:    room.playerA.playerId,
        playerBId:    isBot ? "bot" : room.playerB.playerId,
        winnerId,
        playerAScore: room.playerA.score,
        playerBScore: room.playerB.score,
        leagueId:     room.leagueId,
        matchType:    isBot ? "bot" : "pvp",
        duration:     room.duration,
        coinsStake:   room.stake,
        eloChangeA:   eloChange,
        eloChangeB:   isBot ? 0 : bEloChange,
        coinsWonA:    coinsWon,
        coinsWonB:    isBot ? 0 : bCoinsWon,
        xpGainedA:    xpGained,
        xpGainedB:    isBot ? 0 : bXp,
        finishedAt:   new Date(),
      }).onConflictDoNothing();

      // ── Update real player A stats in DB ──────────────────────────────
      if (room.playerA.playerId && room.playerA.playerId !== "bot") {
        const [aRow] = await db.update(playersTable)
          .set({
            elo:            sql`GREATEST(800, ${playersTable.elo} + ${eloChange})`,
            lp:             newLpA,
            leagueDivision: newDivA,
            coins:          sql`GREATEST(0, ${playersTable.coins} + ${coinsNet})`,
            xp:             sql`${playersTable.xp} + ${xpGained}`,
            pvpWins:        won  ? sql`${playersTable.pvpWins} + 1`   : playersTable.pvpWins,
            pvpLosses:      (!won && !draw) ? sql`${playersTable.pvpLosses} + 1` : playersTable.pvpLosses,
            pvpWinStreak:   won  ? sql`${playersTable.pvpWinStreak} + 1` : sql`0`,
            bestPvpStreak:  won  ? sql`GREATEST(${playersTable.bestPvpStreak}, ${playersTable.pvpWinStreak} + 1)` : playersTable.bestPvpStreak,
            matchesPlayed:  sql`${playersTable.matchesPlayed} + 1`,
            matchesWon:     won  ? sql`${playersTable.matchesWon} + 1` : playersTable.matchesWon,
            updatedAt:      new Date(),
            lastActiveAt:   new Date(),
          })
          .where(eq(playersTable.id, room.playerA.playerId))
          .returning({ coins: playersTable.coins });

        if (coinsWon > 0) {
          await db.insert(coinTransactionsTable).values({
            id:          `${matchId}_a`,
            playerId:    room.playerA.playerId,
            amount:      coinsWon,
            type:        "win",
            source:      isBot ? "bot_match" : "pvp_match",
            description: `${isBot ? "Bot" : "PvP"} match ${arena.displayName} — ${won ? "win" : "draw"} reward`,
            balanceAfter: aRow?.coins ?? 0,
          }).onConflictDoNothing();
        }
      }

      // ── Update real player B stats in DB (non-bot PvP) ─────────────────
      // Note: bWon/bDraw/bEloChange/bCoinsWon/bCoinsNet/bXp/newLpB/newDivB
      //       are all computed above before the pvpMatchesTable insert
      if (!isBot && room.playerB.playerId && room.playerB.playerId !== "bot") {
        const [bRow] = await db.update(playersTable)
          .set({
            elo:            sql`GREATEST(800, ${playersTable.elo} + ${bEloChange})`,
            lp:             newLpB,
            leagueDivision: newDivB,
            coins:          sql`GREATEST(0, ${playersTable.coins} + ${bCoinsNet})`,
            xp:             sql`${playersTable.xp} + ${bXp}`,
            pvpWins:        bWon  ? sql`${playersTable.pvpWins} + 1`   : playersTable.pvpWins,
            pvpLosses:      (!bWon && !bDraw) ? sql`${playersTable.pvpLosses} + 1` : playersTable.pvpLosses,
            pvpWinStreak:   bWon  ? sql`${playersTable.pvpWinStreak} + 1` : sql`0`,
            bestPvpStreak:  bWon  ? sql`GREATEST(${playersTable.bestPvpStreak}, ${playersTable.pvpWinStreak} + 1)` : playersTable.bestPvpStreak,
            matchesPlayed:  sql`${playersTable.matchesPlayed} + 1`,
            matchesWon:     bWon  ? sql`${playersTable.matchesWon} + 1` : playersTable.matchesWon,
            updatedAt:      new Date(),
            lastActiveAt:   new Date(),
          })
          .where(eq(playersTable.id, room.playerB.playerId))
          .returning({ coins: playersTable.coins });

        if (bCoinsWon > 0) {
          await db.insert(coinTransactionsTable).values({
            id:          `${matchId}_b`,
            playerId:    room.playerB.playerId,
            amount:      bCoinsWon,
            type:        "win",
            source:      "pvp_match",
            description: `PvP match ${arena.displayName} — ${bWon ? "win" : "draw"} reward`,
            balanceAfter: bRow?.coins ?? 0,
          }).onConflictDoNothing();
        }
      }

      // ── Broadcast fresh leaderboard after match concludes ──────────────
      await broadcastLeaderboard(io);

    } catch (err) {
      logger.error({ err }, "endRoom DB persistence error");
    }
  })();

  setTimeout(() => rooms.delete(roomId), 30000);
}

// ─── Socket.io Setup ──────────────────────────────────────────────────────────

export function setupSocketIO(server: HttpServer): IOServer {
  const io = new IOServer(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/socket.io",
    transports: ["websocket", "polling"],
  });
  ioInstance = io;

  setInterval(() => processQueue(io), 1000);

  if (!lbInterval) {
    // Delay first broadcast by 10s to allow DB to be ready after cold start
    setTimeout(() => {
      broadcastLeaderboard(io);
      lbInterval = setInterval(() => broadcastLeaderboard(io), 10000);
    }, 10000);
  }

  io.on("connection", (socket: Socket) => {
    logger.info({ socketId: socket.id }, "Socket connected");

    let connectedPlayerId: string | null = null;

    socket.on("player:connect", ({ playerId }: { playerId: string }) => {
      connectedPlayerId = playerId;
      playerSockets.set(playerId, socket.id);
      socket.join(`player:${playerId}`);
      socket.emit("player:connected", { ok: true });
      logger.info({ playerId, socketId: socket.id }, "Player connected");
    });

    // ─── Matchmaking ──────────────────────────────────────────────────────

    socket.on("matchmaking:join", async (data: {
      playerId: string; playerName: string; playerLevel: number;
      playerElo: number; leagueId: string; stake: number;
    }) => {
      const arena  = getArenaConfig(data.leagueId);
      // Server is authoritative: always use configured entry cost, ignore client stake
      const stake  = arena.entryCost;
      let stakeDeducted = false;

      if (stake > 0 && data.playerId && data.playerId !== "bot") {
        try {
          const [player] = await db.select({ coins: playersTable.coins })
            .from(playersTable).where(eq(playersTable.id, data.playerId)).limit(1);

          if (!player || player.coins < stake) {
            socket.emit("matchmaking:error", { reason: "insufficient_coins", required: stake, have: player?.coins ?? 0 });
            return;
          }

          // Pre-deduct stake so coins are reserved while player waits in queue
          await db.update(playersTable)
            .set({ coins: sql`GREATEST(0, ${playersTable.coins} - ${stake})` })
            .where(eq(playersTable.id, data.playerId));

          await db.insert(coinTransactionsTable).values({
            id:          `stake_${Date.now()}_${data.playerId.slice(-6)}`,
            playerId:    data.playerId,
            amount:      -stake,
            type:        "stake",
            source:      "arena_entry",
            description: `Arena entry reserved: ${arena.displayName}`,
            balanceAfter: player.coins - stake,
          }).onConflictDoNothing();

          stakeDeducted = true;
        } catch (err) {
          logger.error({ err }, "matchmaking:join stake deduction error");
          socket.emit("matchmaking:error", { reason: "server_error" });
          return;
        }
      }

      const entry: QueueEntry = {
        socketId: socket.id,
        playerId: data.playerId,
        playerName: data.playerName,
        playerLevel: data.playerLevel,
        playerElo: data.playerElo,
        leagueId: data.leagueId,
        stake,
        stakeDeducted,
        joinedAt: Date.now(),
      };
      matchmakingQueue.set(socket.id, entry);
      socket.emit("matchmaking:searching", { leagueId: data.leagueId, stake });
      logger.info({ playerId: data.playerId, leagueId: data.leagueId, stake, stakeDeducted }, "Player joined queue");
    });

    socket.on("matchmaking:cancel", async () => {
      const entry = matchmakingQueue.get(socket.id);
      matchmakingQueue.delete(socket.id);

      // Refund pre-deducted stake
      if (entry?.stakeDeducted && entry.stake > 0 && entry.playerId !== "bot") {
        try {
          await db.update(playersTable)
            .set({ coins: sql`${playersTable.coins} + ${entry.stake}` })
            .where(eq(playersTable.id, entry.playerId));
          await db.insert(coinTransactionsTable).values({
            id:          `refund_${Date.now()}_${entry.playerId.slice(-6)}`,
            playerId:    entry.playerId,
            amount:      entry.stake,
            type:        "refund",
            source:      "arena_cancel",
            description: `Arena entry refunded: ${entry.leagueId}`,
            balanceAfter: 0,
          }).onConflictDoNothing();
        } catch (err) {
          logger.error({ err }, "matchmaking:cancel refund error");
        }
      }

      socket.emit("matchmaking:cancelled");
    });

    // ─── PvP Answers ──────────────────────────────────────────────────────

    socket.on("round:answer", (data: { roomId: string; colorId: string; elapsedMs: number }) => {
      const room = rooms.get(data.roomId);
      if (!room || room.status !== "playing") return;

      const isPlayerA = room.playerA.socketId === socket.id;
      const player = isPlayerA ? room.playerA : room.playerB;

      if (player.answeredCurrentRound) return;

      const ac = checkAntiCheat(socket.id, data.elapsedMs, player.score);
      if (!ac.ok) {
        socket.emit("anticheat:warning", { reason: ac.reason });
        return;
      }

      const challenge = room.currentChallenge;
      if (!challenge) return;

      const correct = data.colorId === challenge.target.id;
      const pts = scorePvpAnswer(correct, data.elapsedMs, challenge.timeoutMs, player.streak);

      player.score = Math.max(0, player.score + pts);
      if (correct) { player.correct++; player.streak++; }
      else { player.errors++; player.streak = 0; }
      player.answeredCurrentRound = true;
      player.lastAnswerTime = Date.now();
      player.answerSpeeds.push(data.elapsedMs);
      if (player.answerSpeeds.length > 10) player.answerSpeeds.shift();

      if (room.roundTimer) clearTimeout(room.roundTimer);

      io.to(data.roomId).emit("round:answered", {
        by: isPlayerA ? "A" : "B",
        correct,
        scoreA: room.playerA.score,
        scoreB: room.playerB.score,
        streakA: room.playerA.streak,
        streakB: room.playerB.streak,
        elapsedMs: data.elapsedMs,
      });

      if (room.playerA.answeredCurrentRound && room.playerB.answeredCurrentRound) {
        setTimeout(() => nextRound(io, data.roomId), 600);
      } else if (room.playerB.socketId === "bot") {
        // bot answer already scheduled
      } else {
        room.roundTimer = setTimeout(() => {
          if (!room.playerA.answeredCurrentRound) { room.playerA.errors++; room.playerA.streak = 0; room.playerA.answeredCurrentRound = true; }
          if (!room.playerB.answeredCurrentRound) { room.playerB.errors++; room.playerB.streak = 0; room.playerB.answeredCurrentRound = true; }
          io.to(data.roomId).emit("round:timeout", { scoreA: room.playerA.score, scoreB: room.playerB.score });
          setTimeout(() => nextRound(io, data.roomId), 400);
        }, 2000);
      }
    });

    socket.on("match:forfeit", (data: { roomId: string }) => {
      const room = rooms.get(data.roomId);
      if (!room) return;
      endRoom(io, data.roomId);
    });

    // ─── Live Chat ────────────────────────────────────────────────────────

    socket.on("chat:message", async (data: {
      fromId: string; fromName: string; toId: string; content: string; roomType: "dm" | "room";
    }) => {
      if (!data.content?.trim() || data.content.length > 500) return;

      const ac = checkAntiCheat(socket.id + "_chat", 500, 0);
      if (!ac.ok) {
        socket.emit("chat:error", { reason: "rate_limited" });
        return;
      }

      const msg = {
        id: Math.random().toString(36).slice(2),
        fromId: data.fromId,
        fromName: data.fromName,
        toId: data.toId,
        content: data.content.trim(),
        createdAt: new Date().toISOString(),
      };

      if (data.roomType === "dm") {
        const targetSocketId = playerSockets.get(data.toId);
        if (targetSocketId) {
          io.to(targetSocketId).emit("chat:dm", msg);
        }
        socket.emit("chat:dm:sent", msg);

        try {
          await db.insert(messagesTable).values({
            id: msg.id,
            fromId: data.fromId,
            toId: data.toId,
            content: msg.content,
          });
        } catch (err) {
          logger.error({ err }, "chat:message db error");
        }
      } else {
        io.to(data.toId).emit("chat:room", msg);
      }
    });

    // ─── Community Live ───────────────────────────────────────────────────

    socket.on("community:subscribe", () => {
      socket.join("community:feed");
    });

    socket.on("community:post", async (data: {
      authorId: string; username: string; level: number; content: string; imageUrl?: string | null; type: string;
    }) => {
      const hasContent = typeof data.content === "string" && data.content.trim().length > 0;
      const hasImage   = typeof data.imageUrl === "string" && data.imageUrl.length > 0;
      if (!hasContent && !hasImage) return;
      if (hasContent && data.content.length > 500) return;

      try {
        const [post] = await db.insert(postsTable).values({
          id: Math.random().toString(36).slice(2),
          authorId: data.authorId,
          username: data.username,
          level: data.level,
          content: hasContent ? data.content.trim() : "",
          imageUrl: hasImage ? data.imageUrl! : null,
          type: data.type || "text",
          meta: {},
        }).returning();

        io.to("community:feed").emit("community:new_post", post);
      } catch (err) {
        logger.error({ err }, "community:post error");
      }
    });

    socket.on("community:like", async (data: { postId: string; playerId: string; liked: boolean }) => {
      io.to("community:feed").emit("community:like_update", {
        postId: data.postId,
        playerId: data.playerId,
        liked: data.liked,
      });
    });

    // ─── Notifications Push ───────────────────────────────────────────────

    socket.on("notification:send", async (data: {
      toPlayerId: string; type: string; title: string; body: string;
    }) => {
      const targetSocketId = playerSockets.get(data.toPlayerId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("notification:push", {
          id: Math.random().toString(36).slice(2),
          type: data.type,
          title: data.title,
          body: data.body,
          createdAt: new Date().toISOString(),
        });
      }
    });

    // ─── Leaderboard ──────────────────────────────────────────────────────

    socket.on("leaderboard:subscribe", async () => {
      socket.join("leaderboard");
      // Send immediate snapshot on subscribe
      try {
        const rows = await db.select({
          id:                 playersTable.id,
          username:           playersTable.username,
          avatar:             playersTable.avatar,
          level:              playersTable.level,
          elo:                playersTable.elo,
          fame:               playersTable.fame,
          pvpWins:            playersTable.pvpWins,
          verificationStatus: playersTable.verificationStatus,
        }).from(playersTable).orderBy(desc(playersTable.elo)).limit(50);
        if (rows.length > 0) socket.emit("leaderboard:update", rows);
      } catch (err) {
        logger.error({ err }, "leaderboard:subscribe snapshot error");
      }
    });

    // ─── Tournament Live ──────────────────────────────────────────────────

    socket.on("tournament:subscribe", ({ tournamentId }: { tournamentId: string }) => {
      socket.join(`tournament:${tournamentId}`);
    });

    socket.on("tournament:bracket_update", (data: { tournamentId: string; bracket: any }) => {
      io.to(`tournament:${data.tournamentId}`).emit("tournament:bracket", data.bracket);
    });

    // ─── Disconnect ───────────────────────────────────────────────────────

    socket.on("disconnect", async () => {
      const queueEntry = matchmakingQueue.get(socket.id);
      matchmakingQueue.delete(socket.id);
      antiCheatMap.delete(socket.id);
      antiCheatMap.delete(socket.id + "_chat");

      if (connectedPlayerId) {
        playerSockets.delete(connectedPlayerId);
      }

      // Refund pre-deducted stake if player was still in queue (never matched)
      if (queueEntry?.stakeDeducted && queueEntry.stake > 0 && queueEntry.playerId !== "bot") {
        try {
          await db.update(playersTable)
            .set({ coins: sql`${playersTable.coins} + ${queueEntry.stake}` })
            .where(eq(playersTable.id, queueEntry.playerId));
          await db.insert(coinTransactionsTable).values({
            id:          `refund_dc_${Date.now()}_${queueEntry.playerId.slice(-6)}`,
            playerId:    queueEntry.playerId,
            amount:      queueEntry.stake,
            type:        "refund",
            source:      "arena_disconnect",
            description: `Arena entry refunded (disconnected): ${queueEntry.leagueId}`,
            balanceAfter: 0,
          }).onConflictDoNothing();
          logger.info({ playerId: queueEntry.playerId, stake: queueEntry.stake }, "Stake refunded on disconnect");
        } catch (err) {
          logger.error({ err }, "disconnect stake refund error");
        }
      }

      for (const [roomId, room] of rooms) {
        if (room.playerA.socketId === socket.id || room.playerB.socketId === socket.id) {
          if (room.status === "playing") {
            endRoom(io, roomId);
          }
        }
      }

      logger.info({ socketId: socket.id }, "Socket disconnected");
    });
  });

  return io;
}
