import { io, Socket } from "socket.io-client";

// ─────────────────────────────────────────────
// 🌐 SkillLeague Socket Client
// ─────────────────────────────────────────────

let socket: Socket | null = null;

export function connectSocket(_playerId?: string | null): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
    });
  }

  return socket;
}

// ─────────────────────────────────────────────
// 🎮 SOCKET EVENTS
// ─────────────────────────────────────────────

export const SocketEvents = {
  JOIN_MATCH: "join_match",
  START_MATCH: "start_match",
  SEND_ANSWER: "send_answer",
  MATCH_UPDATE: "match_update",
  MATCH_END: "match_end",
};

// 🔁 للحفاظ على التوافق مع الكود القديم
export const getSocket = connectSocket;