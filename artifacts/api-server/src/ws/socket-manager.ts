import { Server as HttpServer } from "http";
import { Server as IOServer, Socket } from "socket.io";
import { db, pvpMatchesTable, playersTable, notificationsTable, postsTable, messagesTable } from "@workspace/db";
import { desc, eq, and, or } from "drizzle-orm";
import { logger } from "../lib/logger.js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QueueEntry {
  socketId: string;
  playerId: string;
  playerName: string;
  playerLevel: number;
  playerElo: number;
  leagueId: string;
  stake: number;
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

  const won = room.playerA.score > room.playerB.score;
  const draw = room.playerA.score === room.playerB.score;

  io.to(roomId).emit("match:end", {
    roomId,
    scoreA: room.playerA.score,
    scoreB: room.playerB.score,
    correctA: room.playerA.correct,
    correctB: room.playerB.correct,
    won,
    draw,
    isBot: room.playerB.socketId === "bot",
    leagueId: room.leagueId,
    stake: room.stake,
  });

  logger.info({ roomId, scoreA: room.playerA.score, scoreB: room.playerB.score }, "Match ended");

  setTimeout(() => rooms.delete(roomId), 30000);
}

// ─── Socket.io Setup ──────────────────────────────────────────────────────────

export function setupSocketIO(server: HttpServer): IOServer {
  const io = new IOServer(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/socket.io",
    transports: ["websocket", "polling"],
  });

  setInterval(() => processQueue(io), 1000);

  if (!lbInterval) {
    lbInterval = setInterval(async () => {
      try {
        const rows = await db
          .select({
            id: playersTable.id,
            username: playersTable.username,
            level: playersTable.level,
            elo: playersTable.elo,
            fame: playersTable.fame,
            pvpWins: playersTable.pvpWins,
            avatar: playersTable.avatar,
            verificationStatus: playersTable.verificationStatus,
          })
          .from(playersTable)
          .orderBy(desc(playersTable.elo))
          .limit(50);
        io.emit("leaderboard:update", rows);
      } catch (err) {
        logger.error({ err }, "leaderboard broadcast error");
      }
    }, 15000);
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

    socket.on("matchmaking:join", (data: {
      playerId: string; playerName: string; playerLevel: number;
      playerElo: number; leagueId: string; stake: number;
    }) => {
      const entry: QueueEntry = {
        socketId: socket.id,
        playerId: data.playerId,
        playerName: data.playerName,
        playerLevel: data.playerLevel,
        playerElo: data.playerElo,
        leagueId: data.leagueId,
        stake: data.stake,
        joinedAt: Date.now(),
      };
      matchmakingQueue.set(socket.id, entry);
      socket.emit("matchmaking:searching", { leagueId: data.leagueId });
      logger.info({ playerId: data.playerId, leagueId: data.leagueId }, "Player joined queue");
    });

    socket.on("matchmaking:cancel", () => {
      matchmakingQueue.delete(socket.id);
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
      authorId: string; username: string; level: number; content: string; type: string;
    }) => {
      if (!data.content?.trim() || data.content.length > 500) return;

      try {
        const [post] = await db.insert(postsTable).values({
          id: Math.random().toString(36).slice(2),
          authorId: data.authorId,
          username: data.username,
          level: data.level,
          content: data.content.trim(),
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

    socket.on("leaderboard:subscribe", () => {
      socket.join("leaderboard");
    });

    // ─── Tournament Live ──────────────────────────────────────────────────

    socket.on("tournament:subscribe", ({ tournamentId }: { tournamentId: string }) => {
      socket.join(`tournament:${tournamentId}`);
    });

    socket.on("tournament:bracket_update", (data: { tournamentId: string; bracket: any }) => {
      io.to(`tournament:${data.tournamentId}`).emit("tournament:bracket", data.bracket);
    });

    // ─── Disconnect ───────────────────────────────────────────────────────

    socket.on("disconnect", () => {
      matchmakingQueue.delete(socket.id);
      antiCheatMap.delete(socket.id);
      antiCheatMap.delete(socket.id + "_chat");

      if (connectedPlayerId) {
        playerSockets.delete(connectedPlayerId);
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
