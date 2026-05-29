import React, {
  createContext, useContext, useEffect, useRef,
  useState, useCallback, ReactNode,
} from "react";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import { Socket } from "socket.io-client";

export interface RealtimeNotif {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface LiveLeaderEntry {
  id: string;
  username: string;
  level: number;
  elo: number;
  fame: number;
  pvpWins: number;
  avatar: string;
  verificationStatus: string;
}

export interface ChatMessage {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  content: string;
  createdAt: string;
}

interface RealtimeCtx {
  connected: boolean;
  liveLeaderboard: LiveLeaderEntry[];
  pushNotifs: RealtimeNotif[];
  dmMessages: ChatMessage[];
  clearDmMessages: () => void;
  sendDm: (toId: string, toName: string, fromId: string, fromName: string, content: string) => void;
  sendNotification: (toPlayerId: string, type: string, title: string, body: string) => void;
  subscribeLeaderboard: () => void;
  subscribeCommunity: () => void;
  markNotifRead: (id: string) => void;
  socket: Socket | null;
}

const Ctx = createContext<RealtimeCtx | null>(null);

export function RealtimeProvider({ children, playerId }: { children: ReactNode; playerId: string | null }) {
  const [connected, setConnected] = useState(false);
  const [liveLeaderboard, setLiveLeaderboard] = useState<LiveLeaderEntry[]>([]);
  const [pushNotifs, setPushNotifs] = useState<RealtimeNotif[]>([]);
  const [dmMessages, setDmMessages] = useState<ChatMessage[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!playerId) return;

    const s = connectSocket(playerId);
    socketRef.current = s;

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    s.on("leaderboard:update", (data: LiveLeaderEntry[]) => {
      setLiveLeaderboard(data);
    });

    s.on("notification:push", (notif: RealtimeNotif) => {
      setPushNotifs(prev => [notif, ...prev].slice(0, 50));
    });

    s.on("chat:dm", (msg: ChatMessage) => {
      setDmMessages(prev => [...prev, msg]);
    });

    s.on("chat:dm:sent", (msg: ChatMessage) => {
      setDmMessages(prev => [...prev, msg]);
    });

    return () => {
      s.off("connect");
      s.off("disconnect");
      s.off("leaderboard:update");
      s.off("notification:push");
      s.off("chat:dm");
      s.off("chat:dm:sent");
    };
  }, [playerId]);

  const subscribeLeaderboard = useCallback(() => {
    getSocket().emit("leaderboard:subscribe");
  }, []);

  const subscribeCommunity = useCallback(() => {
    getSocket().emit("community:subscribe");
  }, []);

  const sendDm = useCallback((toId: string, _toName: string, fromId: string, fromName: string, content: string) => {
    getSocket().emit("chat:message", {
      fromId, fromName, toId, content, roomType: "dm",
    });
  }, []);

  const sendNotification = useCallback((toPlayerId: string, type: string, title: string, body: string) => {
    getSocket().emit("notification:send", { toPlayerId, type, title, body });
  }, []);

  const clearDmMessages = useCallback(() => setDmMessages([]), []);

  const markNotifRead = useCallback((id: string) => {
    setPushNotifs(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <Ctx.Provider value={{
      connected,
      liveLeaderboard,
      pushNotifs,
      dmMessages,
      clearDmMessages,
      sendDm,
      sendNotification,
      subscribeLeaderboard,
      subscribeCommunity,
      markNotifRead,
      socket: socketRef.current,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRealtime must be used inside RealtimeProvider");
  return ctx;
}
