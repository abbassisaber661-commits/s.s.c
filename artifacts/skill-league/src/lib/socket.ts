// src/lib/socket.ts
import { io, Socket } from "socket.io-client";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const API_URL = BASE
  ? `${window.location.origin}${BASE}`
  : window.location.origin;

let socket: Socket | null = null;
let isConnecting = false;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      path: `${BASE}/api/socket.io`,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      autoConnect: false,
      forceNew: false,
    });
  }
  return socket;
}

/**
 * Connect once safely (prevents duplicate connect + duplicate events)
 */
export function connectSocket(playerId: string): Socket {
  const s = getSocket();

  if (isConnecting) return s;
  isConnecting = true;

  const emitConnect = () => {
    s.emit("player:connect", { playerId });
  };

  if (!s.connected) {
    s.connect();

    s.once("connect", () => {
      emitConnect();
      isConnecting = false;
    });

    s.once("connect_error", () => {
      isConnecting = false;
    });
  } else {
    emitConnect();
    isConnecting = false;
  }

  return s;
}

/**
 * Safe disconnect (prevents memory leaks in SPA)
 */
export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    isConnecting = false;
  }
}