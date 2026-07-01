import React, { createContext, useContext } from "react";
import { Socket } from "socket.io-client";
import { LiveLeaderEntry, RealtimeNotif, ChatMessage } from "./RealtimeProvider";

interface RealtimeCtx {
  connected: boolean;
  liveLeaderboard: LiveLeaderEntry[];
  pushNotifs: RealtimeNotif[];
  unreadCount: number;
  dmMessages: ChatMessage[];

  clearDmMessages: () => void;
  sendDm: (
    toId: string,
    toName: string,
    fromId: string,
    fromName: string,
    content: string
  ) => void;

  sendNotification: (
    toPlayerId: string,
    type: string,
    title: string,
    body: string
  ) => void;

  subscribeLeaderboard: () => void;
  subscribeCommunity: () => void;
  markNotifRead: (id: string) => void;
  clearNotifications: () => void;

  socket: Socket | null;
}

export const RealtimeContext = createContext<RealtimeCtx | null>(null);

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error("useRealtime must be used inside RealtimeProvider");
  }
  return ctx;
}
