import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useGame } from "@/contexts/GameContext";
import { useT, isRTL } from "@/lib/i18n";
import { api, type ApiNotification } from "@/lib/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Bell, BellOff, CheckCheck } from "lucide-react";
import { playTap } from "@/lib/sounds";
import { getNotifications, markAllRead, markRead, type Notification } from "@/lib/messages";

const TYPE_ICON: Record<string, string> = {
  match:        '⚔️',
  level_up:     '⬆️',
  trophy:       '🏆',
  achievement:  '🎖️',
  tournament:   '🥇',
  message:      '💬',
  season_reward:'🌀',
  boost:        '⚡',
  verified:     '✓',
  system:       '🔔',
  pvp:          '⚔️',
  weekly:       '📅',
};

type MergedNotif =
  | (Notification & { source: 'local' })
  | (ApiNotification & { source: 'db' });

function fmt(ts: number | string): string {
  const t = typeof ts === 'string' ? new Date(ts).getTime() : ts;
  const diff = Date.now() - t;
  if (diff < 60_000)    return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function Notifications() {
  const { language, authUser } = useGame();
  const t = useT(language);
  const rtl = isRTL(language);

  const [localNotifs, setLocalNotifs] = useState<Notification[]>(getNotifications());
  const [dbNotifs, setDbNotifs]       = useState<ApiNotification[]>([]);
  const [loading, setLoading]         = useState(false);
  const [dbReadIds, setDbReadIds]     = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authUser?.uid) return;
    setLoading(true);
    api.notifications.list(authUser.uid)
      .then(n => setDbNotifs(n))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authUser?.uid]);

  const allNotifs: MergedNotif[] = [
    ...localNotifs.map(n => ({ ...n, source: 'local' as const })),
    ...dbNotifs.map(n => ({ ...n, source: 'db' as const })),
  ].sort((a, b) => {
    const ta = a.source === 'local' ? a.timestamp : new Date(a.createdAt).getTime();
    const tb = b.source === 'local' ? b.timestamp : new Date(b.createdAt).getTime();
    return tb - ta;
  });

  const unread = allNotifs.filter(n =>
    n.source === 'local' ? !n.read : (!n.read && !dbReadIds.has(n.id))
  ).length;

  const handleMarkAllRead = () => {
    playTap();
    setLocalNotifs(markAllRead());
    if (authUser?.uid) api.notifications.readAll(authUser.uid).catch(() => {});
    setDbReadIds(new Set(dbNotifs.map(n => n.id)));
  };

  const handleMarkDbRead = (id: string) => {
    api.notifications.markRead(id).catch(() => {});
    setDbReadIds(prev => new Set([...prev, id]));
  };

  const handleMarkLocalRead = (id: string) => {
    setLocalNotifs(markRead(id));
  };

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/60 px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="p-2 rounded-xl hover:bg-card active:scale-95 transition-all" onClick={playTap}>
            <ChevronLeft className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} />
          </button>
        </Link>
        <div className="flex-1 flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-black">
            {t('notifications_title')}
          </h1>
          {unread > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">
              {unread}
            </span>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors active:scale-95 px-2 py-1.5 rounded-lg hover:bg-card">
            <CheckCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Mark all read</span>
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-w-md mx-auto px-4 pt-4 space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent"
            />
          </div>
        )}

        {!loading && allNotifs.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
            <BellOff className="w-12 h-12 opacity-30" />
            <p className="text-sm">{t('no_notifications')}</p>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {allNotifs.map((n, idx) => {
            const isDb   = n.source === 'db';
            const isRead = isDb ? (n.read || dbReadIds.has(n.id)) : n.read;
            const icon   = TYPE_ICON[(n as any).type ?? 'system'] ?? '🔔';
            const ts     = isDb
              ? new Date((n as ApiNotification).createdAt).getTime()
              : (n as Notification).timestamp;

            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: rtl ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => {
                  if (!isRead) {
                    if (isDb) handleMarkDbRead(n.id);
                    else handleMarkLocalRead(n.id);
                  }
                }}
                className={`relative rounded-2xl border p-4 flex items-start gap-3 transition-all ${
                  isRead
                    ? 'bg-card border-border opacity-70'
                    : 'bg-card border-primary/20 cursor-pointer hover:border-primary/40'
                }`}>
                {!isRead && (
                  <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary" />
                )}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: 'hsl(var(--primary)/0.1)' }}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold leading-snug">{n.title}</p>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{fmt(ts)}</span>
                  </div>
                  {n.body && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.body}</p>
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
