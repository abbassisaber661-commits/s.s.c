import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { connectSocket } from "@/lib/socket";
import { Socket } from "socket.io-client";
import { RealtimeContext } from "./RealtimeContext";

/* ───────────── TYPES ───────────── */

export interface RealtimeNotif {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read?: boolean;
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

/* ───────────── PROVIDER ───────────── */

export function RealtimeProvider({
  children,
  playerId,
}: {
  children: ReactNode;
  playerId: string | null;
}) {
  const [connected, setConnected] = useState(false);
  const [liveLeaderboard, setLiveLeaderboard] = useState<LiveLeaderEntry[]>([]);
  const [pushNotifs, setPushNotifs] = useState<RealtimeNotif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dmMessages, setDmMessages] = useState<ChatMessage[]>([]);

  const socketRef = useRef<Socket | null>(null);

  /* ───────────── SOCKET ───────────── */

  useEffect(() => {
    if (!playerId) return;

    const socket = connectSocket(playerId);
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("leaderboard:update", (data: LiveLeaderEntry[]) => {
      setLiveLeaderboard(data);
    });

    socket.on("notification:push", (notif: RealtimeNotif) => {
      setPushNotifs((prev) => {
        const exists = prev.some((n) => n.id === notif.id);
        if (exists) return prev;
        setUnreadCount((c) => c + 1);
        return [notif, ...prev].slice(0, 100);
      });
    });

    socket.on("chat:dm", (msg: ChatMessage) => {
      setDmMessages((prev) => [...prev, msg]);
    });

    socket.on("chat:dm:sent", (msg: ChatMessage) => {
      setDmMessages((prev) => [...prev, msg]);
    });

    /* ───────────── CLEANUP ───────────── */

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("leaderboard:update");
      socket.off("notification:push");
      socket.off("chat:dm");
      socket.off("chat:dm:sent");
      socket.disconnect();
    };
  }, [playerId]);

  /* ───────────── ACTIONS ───────────── */

  const subscribeLeaderboard = useCallback(() => {
    socketRef.current?.emit("leaderboard:subscribe");
  }, []);

  const subscribeCommunity = useCallback(() => {
    socketRef.current?.emit("community:subscribe");
  }, []);

  const sendDm = useCallback(
    (
      toId: string,
      _toName: string,
      fromId: string,
      fromName: string,
      content: string
    ) => {
      socketRef.current?.emit("chat:message", {
        fromId,
        fromName,
        toId,
        content,
        roomType: "dm",
      });
    },
    []
  );

  const sendNotification = useCallback(
    (toPlayerId: string, type: string, title: string, body: string) => {
      socketRef.current?.emit("notification:send", {
        toPlayerId,
        type,
        title,
        body,
      });
    },
    []
  );

  const clearDmMessages = useCallback(() => {
    setDmMessages([]);
  }, []);

  /* ───────────── NOTIFICATIONS CONTROL ───────────── */

  const markNotifRead = useCallback((id: string) => {
    setPushNotifs((prev) => {
      const exists = prev.some((n) => n.id === id);
      if (exists) setUnreadCount((c) => Math.max(0, c - 1));
      return prev.filter((n) => n.id !== id);
    });
  }, []);

  const clearNotifications = useCallback(() => {
    setPushNotifs([]);
    setUnreadCount(0);
  }, []);

  /* ───────────── PROVIDER VALUE ───────────── */

  return (
    <RealtimeContext.Provider
      value={{
        connected,
        liveLeaderboard,
        pushNotifs,
        unreadCount,
        dmMessages,
        clearDmMessages,
        sendDm,
        sendNotification,
        subscribeLeaderboard,
        subscribeCommunity,
        markNotifRead,
        clearNotifications,
        socket: socketRef.current,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}
