import { io, Socket } from "socket.io-client";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const API_URL = BASE ? `${window.location.origin}${BASE}` : window.location.origin;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      path: `${BASE}/api/socket.io`,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(playerId: string): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
    s.once("connect", () => {
      s.emit("player:connect", { playerId });
    });
  } else {
    s.emit("player:connect", { playerId });
  }
  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
}
