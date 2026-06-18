import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useGame } from "@/contexts/GameContext";
import { useT, isRTL } from "@/lib/i18n";
import { api, type ApiNotification } from "@/lib/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Bell, BellOff, CheckCheck } from "lucide-react";
import { playTap } from "@/lib/sounds";
import { getNotifications, markAllRead, markRead, type Notification } from "@/lib/messages";
import { useRealtime } from "@/contexts/RealtimeContext";

/* ───────────── ICONS ───────────── */

const TYPE_ICON: Record<string, string> = {
  match: "⚔️",
  level_up: "⬆️",
  trophy: "🏆",
  achievement: "🎖️",
  tournament: "🥇",
  message: "💬",
  season_reward: "🌀",
  boost: "⚡",
  verified: "✓",
  system: "🔔",
  pvp: "⚔️",
  weekly: "📅",
  like: "❤️",
  comment: "💬",
  share: "🔁",
  follow: "👤",
  mention: "📢",
};

/* ───────────── TIME FORMAT ───────────── */

function fmt(ts: number | string) {
  const t = typeof ts === "string" ? new Date(ts).getTime() : ts;
  const diff = Date.now() - t;

  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

/* ───────────── COMPONENT ───────────── */

export default function Notifications() {
  const { language, authUser } = useGame();
  const t = useT(language);
  const rtl = isRTL(language);

  const { pushNotifs } = useRealtime();

  const [localNotifs, setLocalNotifs] = useState<Notification[]>(getNotifications());
  const [dbNotifs, setDbNotifs] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbReadIds, setDbReadIds] = useState<Set<string>>(new Set());

  /* ───────────── REFRESH LOCAL ───────────── */
  useEffect(() => {
    setLocalNotifs(getNotifications());
  }, [pushNotifs.length]);

  /* ───────────── LOAD DB NOTIFS ───────────── */
  useEffect(() => {
    if (!authUser?.uid) return;

    setLoading(true);

    api.notifications
      .list(authUser.uid)
      .then(setDbNotifs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authUser?.uid]);

  /* ───────────── MERGED NOTIFS ───────────── */
  const allNotifs = useMemo(() => {
    return [
      ...localNotifs.map((n) => ({ ...n, source: "local" as const })),
      ...dbNotifs.map((n) => ({ ...n, source: "db" as const })),
    ].sort((a, b) => {
      const ta =
        a.source === "local"
          ? a.timestamp
          : new Date(a.createdAt).getTime();

      const tb =
        b.source === "local"
          ? b.timestamp
          : new Date(b.createdAt).getTime();

      return tb - ta;
    });
  }, [localNotifs, dbNotifs]);

  /* ───────────── UNREAD COUNT ───────────── */
  const unread = useMemo(() => {
    return allNotifs.filter((n: any) =>
      n.source === "local"
        ? !n.read
        : !n.read && !dbReadIds.has(n.id)
    ).length;
  }, [allNotifs, dbReadIds]);

  /* ───────────── ACTIONS ───────────── */
  const handleMarkAllRead = () => {
    playTap();
    setLocalNotifs(markAllRead());

    if (authUser?.uid) {
      api.notifications.readAll(authUser.uid).catch(() => {});
    }

    setDbReadIds(new Set(dbNotifs.map((n) => n.id)));
  };

  const handleMarkDbRead = (id: string) => {
    api.notifications.markRead(id).catch(() => {});
    setDbReadIds((prev) => new Set([...prev, id]));
  };

  const handleMarkLocalRead = (id: string) => {
    setLocalNotifs(markRead(id));
  };

  /* ───────────── RENDER ───────────── */

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="min-h-screen bg-background pb-24">
      
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button onClick={playTap} className="p-2 rounded-xl hover:bg-card">
            <ChevronLeft className={`w-5 h-5 ${rtl ? "rotate-180" : ""}`} />
          </button>
        </Link>

        <div className="flex-1 flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-black">
            {t("notifications_title")}
          </h1>

          {unread > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-red-500 text-white">
              {unread}
            </span>
          )}
        </div>

        {unread > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg hover:bg-card"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all
          </button>
        )}
      </div>

      {/* LIST */}
      <div className="max-w-md mx-auto px-4 pt-4 space-y-2">

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && allNotifs.length === 0 && (
          <div className="flex flex-col items-center py-16 opacity-60">
            <BellOff className="w-12 h-12 mb-2" />
            <p className="text-sm">{t("no_notifications")}</p>
          </div>
        )}

        <AnimatePresence>
          {allNotifs.map((n: any, idx) => {
            const isDb = n.source === "db";
            const isRead = isDb ? (n.read || dbReadIds.has(n.id)) : n.read;
            const icon = TYPE_ICON[n.type ?? "system"] ?? "🔔";

            const ts =
              n.source === "local"
                ? n.timestamp
                : new Date(n.createdAt).getTime();

            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: rtl ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-4 rounded-2xl border flex gap-3 relative ${
                  isRead ? "opacity-70" : "border-primary/20"
                }`}
                onClick={() => {
                  if (!isRead) {
                    isDb ? handleMarkDbRead(n.id) : handleMarkLocalRead(n.id);
                  }
                }}
              >
                {!isRead && (
                  <div className="absolute top-3 right-3 w-2 h-2 bg-primary rounded-full" />
                )}

                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10">
                  {icon}
                </div>

                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="font-bold text-sm">{n.title}</p>
                    <span className="text-[10px] opacity-60">
                      {fmt(ts)}
                    </span>
                  </div>

                  <p className="text-xs opacity-70 mt-1">
                    {n.body}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}