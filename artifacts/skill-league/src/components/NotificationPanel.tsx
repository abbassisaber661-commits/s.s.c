import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useGame } from "@/contexts/GameContext";
import { api } from "@/lib/apiClient";

/* ── Type metadata ── */
const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  gift:         { icon: "🎁", color: "#a855f7", label: "هدية" },
  gift_sent:    { icon: "🎁", color: "#8b5cf6", label: "أرسلت هدية" },
  rank:         { icon: "🏆", color: "#f59e0b", label: "ترتيب" },
  dn:           { icon: "💰", color: "#10b981", label: "رصيد" },
  system:       { icon: "📢", color: "#3b82f6", label: "نظام" },
  post_like:    { icon: "❤️", color: "#ec4899", label: "إعجاب" },
  post_comment: { icon: "💬", color: "#06b6d4", label: "تعليق" },
  follow:       { icon: "👤", color: "#8b5cf6", label: "متابع" },
  match_start:  { icon: "⚔️", color: "#ef4444", label: "مباراة" },
  pvp_win:      { icon: "🏆", color: "#22c55e", label: "فوز" },
  rank_up:      { icon: "📈", color: "#22c55e", label: "ترقية" },
  rank_down:    { icon: "📉", color: "#ef4444", label: "تراجع" },
  level_up:     { icon: "⭐", color: "#f59e0b", label: "مستوى" },
};
const DEFAULT_META = { icon: "🔔", color: "#6366f1", label: "إشعار" };

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `${mins}د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}س`;
  const days = Math.floor(hrs / 24);
  return `${days}ي`;
}

interface ApiNotif {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ open, onClose }: Props) {
  const { authUser } = useGame();
  const { pushNotifs, unreadCount, clearNotifications } = useRealtime();
  const queryClient = useQueryClient();

  const playerId = authUser?.uid ?? "";

  /* ── Fetch persisted notifications from API ── */
  const { data: apiNotifs = [], refetch } = useQuery({
    queryKey: ["notifications", playerId],
    queryFn: () => api.notifications.list(playerId, 60),
    enabled: !!playerId && open,
    staleTime: 30_000,
  });

  /* Refetch when panel opens */
  useEffect(() => {
    if (open && playerId) refetch();
  }, [open, playerId]);

  /* Merge API + real-time notifications, dedupe by id */
  const rtMap = new Map(pushNotifs.map((n) => [n.id, n]));
  const merged: ApiNotif[] = [
    ...pushNotifs.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      read: n.read ?? false,
      createdAt: n.createdAt,
      data: n.data,
    })),
    ...apiNotifs
      .filter((n) => !rtMap.has(n.id))
      .map((n) => ({
        id: n.id,
        type: n.type ?? "",
        title: n.title ?? "",
        body: n.body ?? n.content ?? "",
        read: n.read,
        createdAt: String(n.createdAt),
        data: n.data,
      })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  /* ── Mark all read ── */
  const handleMarkAll = useCallback(async () => {
    if (!playerId) return;
    try {
      await api.notifications.readAll(playerId);
      clearNotifications();
      queryClient.setQueryData(["notifications", playerId], (old: ApiNotif[] | undefined) =>
        (old ?? []).map((n) => ({ ...n, read: true }))
      );
    } catch {}
  }, [playerId, clearNotifications, queryClient]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              top: "var(--topbar-h, 52px)",
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 9998,
            }}
          />

          {/* Panel — starts below the fixed top bar (52 px authenticated / 88 px guest) */}
          <motion.div
            key="panel"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 32 }}
            style={{
              position: "fixed",
              top: "var(--topbar-h, 52px)",
              right: 0,
              bottom: 0,
              width: "min(380px, 95vw)",
              background: "rgba(8,8,18,0.96)",
              backdropFilter: "blur(24px)",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              zIndex: 10000,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* ── Header ── */}
            <div
              style={{
                padding: "20px 20px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "linear-gradient(180deg,rgba(99,102,241,0.1),transparent)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>🔔</span>
                <div>
                  <div style={{ color: "#fff", fontWeight: 800, fontSize: 17 }}>
                    الإشعارات
                  </div>
                  {unreadCount > 0 && (
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                      {unreadCount} غير مقروء
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAll}
                    style={{
                      background: "rgba(99,102,241,0.2)",
                      border: "1px solid rgba(99,102,241,0.4)",
                      borderRadius: 8,
                      color: "#a5b4fc",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "6px 10px",
                      cursor: "pointer",
                    }}
                  >
                    قراءة الكل
                  </button>
                )}
                <button
                  onClick={onClose}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 16,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* ── List ── */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "8px 0",
              }}
            >
              {merged.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    gap: 12,
                    opacity: 0.5,
                  }}
                >
                  <span style={{ fontSize: 48 }}>🔕</span>
                  <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
                    لا توجد إشعارات
                  </div>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {merged.map((notif, idx) => {
                    const meta = TYPE_META[notif.type] ?? DEFAULT_META;
                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.25 }}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 14,
                          padding: "14px 20px",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          background: !notif.read
                            ? `linear-gradient(90deg, rgba(${hexToRgb(meta.color)},0.08), transparent)`
                            : "transparent",
                          position: "relative",
                        }}
                      >
                        {/* Unread dot */}
                        {!notif.read && (
                          <div
                            style={{
                              position: "absolute",
                              left: 8,
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: meta.color,
                              boxShadow: `0 0 6px ${meta.color}`,
                            }}
                          />
                        )}

                        {/* Icon */}
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 14,
                            background: `rgba(${hexToRgb(meta.color)},0.15)`,
                            border: `1px solid rgba(${hexToRgb(meta.color)},0.3)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 20,
                            flexShrink: 0,
                          }}
                        >
                          {meta.icon}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              color: notif.read ? "rgba(255,255,255,0.7)" : "#fff",
                              fontWeight: notif.read ? 500 : 700,
                              fontSize: 13,
                              lineHeight: 1.4,
                              marginBottom: 3,
                            }}
                          >
                            {notif.title}
                          </div>
                          {notif.body && (
                            <div
                              style={{
                                color: "rgba(255,255,255,0.45)",
                                fontSize: 12,
                                lineHeight: 1.4,
                              }}
                            >
                              {notif.body}
                            </div>
                          )}
                        </div>

                        {/* Time */}
                        <div
                          style={{
                            color: "rgba(255,255,255,0.3)",
                            fontSize: 11,
                            flexShrink: 0,
                            paddingTop: 2,
                          }}
                        >
                          {timeAgo(notif.createdAt)}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* ── Footer gradient ── */}
            <div
              style={{
                height: 60,
                background: "linear-gradient(0deg,rgba(8,8,18,1) 40%,transparent)",
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                pointerEvents: "none",
              }}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* Hex → "r,g,b" for rgba() */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "99,102,241";
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}
