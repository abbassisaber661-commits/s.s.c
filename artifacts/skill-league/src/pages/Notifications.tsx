import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useGame } from "@/contexts/GameContext";
import { useT, isRTL } from "@/lib/i18n";
import { api, type ApiNotification } from "@/lib/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Bell, BellOff, CheckCheck } from "lucide-react";
import { playTap } from "@/lib/sounds";
import { useRealtime } from "@/contexts/RealtimeContext";

const TYPE_ICON: Record<string, string> = {
  match:         "⚔️",
  level_up:      "⬆️",
  trophy:        "🏆",
  achievement:   "🎖️",
  tournament:    "🥇",
  message:       "💬",
  season_reward: "🌀",
  boost:         "⚡",
  verified:      "✓",
  system:        "🔔",
  pvp:           "⚔️",
  weekly:        "📅",
  like:          "❤️",
  comment:       "💬",
  share:         "🔁",
  follow:        "👤",
  mention:       "📢",
};

function fmt(ts: number | string) {
  const t = typeof ts === "string" ? new Date(ts).getTime() : ts;
  const diff = Date.now() - t;
  if (diff < 60_000)      return "just now";
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function resolveActionUrl(n: ApiNotification): string | null {
  const d = n.data as Record<string, unknown> | undefined;
  if (d?.postId)   return `/feed`;
  if (d?.likerId)  return `/feed`;
  if (n.type === "follow" && d?.followerId) return `/profile/${d.followerId}`;
  if (n.type === "mention" && d?.mentionBy) return `/profile/${d.mentionBy}`;
  if (n.type === "comment" && d?.postId)   return `/feed`;
  return null;
}

export default function Notifications() {
  const { language, authUser } = useGame();
  const t = useT(language);
  const rtl = isRTL(language);
  const [, navigate] = useLocation();

  const { pushNotifs } = useRealtime();

  const [dbNotifs, setDbNotifs] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authUser?.uid) return;
    setLoading(true);
    api.notifications
      .list(authUser.uid)
      .then(setDbNotifs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authUser?.uid]);

  const allNotifs = useMemo(() => {
    const pushMapped: ApiNotification[] = pushNotifs.map((p: any) => ({
      id:        p.id ?? `push_${Date.now()}`,
      playerId:  authUser?.uid ?? "",
      type:      p.type ?? "system",
      title:     p.title ?? "",
      body:      p.body ?? "",
      data:      p.data ?? {},
      read:      false,
      createdAt: new Date().toISOString(),
    }));
    return [...pushMapped, ...dbNotifs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [dbNotifs, pushNotifs, authUser?.uid]);

  const unread = useMemo(
    () => allNotifs.filter(n => !n.read && !readIds.has(n.id)).length,
    [allNotifs, readIds]
  );

  const handleMarkAllRead = () => {
    playTap();
    if (authUser?.uid) {
      api.notifications.readAll(authUser.uid).catch(() => {});
    }
    setReadIds(new Set(allNotifs.map(n => n.id)));
  };

  const handleClick = (n: ApiNotification) => {
    if (!readIds.has(n.id) && !n.read) {
      api.notifications.markRead(n.id).catch(() => {});
      setReadIds(prev => new Set([...prev, n.id]));
    }
    const url = resolveActionUrl(n);
    if (url) navigate(url);
  };

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="min-h-screen bg-[#F5F5F7] pb-24">

      {/* HEADER */}
      <div className="sticky top-[52px] z-20 bg-white border-b border-[#E5E5E5] shadow-sm px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => { playTap(); navigate("/feed"); }}
          className="p-2 rounded-xl hover:bg-[#F5F5F7] transition-colors"
        >
          <ChevronLeft className={`w-5 h-5 text-[#111111] ${rtl ? "rotate-180" : ""}`} />
        </button>

        <div className="flex-1 flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#FFD60A]" />
          <h1 className="text-lg font-black text-[#111111]">{t("notifications_title")}</h1>
          {unread > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-red-500 text-white font-bold">
              {unread}
            </span>
          )}
        </div>

        {unread > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl hover:bg-[#F5F5F7] transition-colors text-[#666666] font-semibold border border-[#E5E5E5]"
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
            <div className="w-8 h-8 border-2 border-[#FFD60A] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && allNotifs.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="w-16 h-16 rounded-full bg-[#F5F5F7] flex items-center justify-center">
              <BellOff className="w-8 h-8 text-[#666666]" />
            </div>
            <p className="text-sm font-bold text-[#111111]">{t("no_notifications")}</p>
            <p className="text-xs text-[#666666]">Activity from your network appears here.</p>
          </div>
        )}

        <AnimatePresence>
          {allNotifs.map((n) => {
            const isRead = n.read || readIds.has(n.id);
            const icon   = TYPE_ICON[n.type ?? "system"] ?? "🔔";
            const ts     = new Date(n.createdAt).getTime();
            const actionUrl = resolveActionUrl(n);

            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: rtl ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-4 rounded-2xl border flex gap-3 relative transition-all cursor-pointer ${
                  isRead
                    ? "bg-white border-[#E5E5E5] opacity-80"
                    : "bg-[#FFFBEB] border-[#FFD60A]/40"
                } ${actionUrl ? "hover:shadow-sm" : ""}`}
                onClick={() => handleClick(n)}
              >
                {!isRead && (
                  <div className="absolute top-3 right-3 w-2 h-2 bg-[#FFD60A] rounded-full" />
                )}

                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#F5F5F7] flex-shrink-0 text-lg">
                  {icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-bold text-sm leading-snug text-[#111111]">{n.title}</p>
                    <span className="text-[10px] text-[#666666] flex-shrink-0">{fmt(ts)}</span>
                  </div>
                  <p className="text-xs text-[#666666] mt-1 line-clamp-2">{n.body}</p>
                  {actionUrl && (
                    <span className="inline-block mt-2 text-xs font-bold text-[#111111] border border-[#FFD60A] rounded-lg px-2 py-0.5">
                      View →
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
