import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  getNotifications, markAllRead, markRead,
  unreadCount, getAge, type Notification,
} from "@/lib/messages";

const TYPE_COLOR: Record<string, string> = {
  system:           '#3AB4FF',
  pvp_result:       '#FF3A5E',
  tournament:       '#FFD700',
  trophy:           '#FFD700',
  level_up:         '#2EE87A',
  weekly_complete:  '#FF9B3A',
  season_reward:    '#B44FFF',
  community_like:   '#FF6B35',
  verified:         '#3AB4FF',
};

export default function Messages() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const unread = unreadCount(notifs);

  useEffect(() => { setNotifs(getNotifications()); }, []);

  function handleMarkAll() {
    setNotifs(markAllRead());
  }

  function handleRead(id: string) {
    setNotifs(markRead(id));
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-10">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="p-1 rounded-lg hover:bg-card active:scale-95 transition-transform">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <Bell className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold flex-1">Messages</h1>
        {unread > 0 && (
          <button onClick={handleMarkAll}
            className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:text-primary/80 transition-colors">
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-2">

        {/* Unread summary */}
        {unread > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary"
          >
            {unread} unread message{unread > 1 ? 's' : ''}
          </motion.div>
        )}

        {notifs.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No messages yet</p>
          </div>
        )}

        <AnimatePresence>
          {notifs.map((n, idx) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              onClick={() => handleRead(n.id)}
              className={`rounded-2xl border bg-card p-4 cursor-pointer transition-all hover:bg-card/80 active:scale-[0.99] ${!n.read ? 'border-primary/30 bg-primary/5' : 'border-border'}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: `${TYPE_COLOR[n.type] ?? '#3AB4FF'}20` }}>
                  {n.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {n.title}
                    </span>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground/60">{getAge(n.timestamp)}</span>
                    {n.actionUrl && (
                      <Link href={n.actionUrl}>
                        <Button size="sm" variant="outline" className="text-xs h-6 px-2">
                          View →
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Info footer */}
        <div className="rounded-2xl border border-border/40 bg-card/40 p-3 text-xs text-muted-foreground text-center">
          Notifications for trophies, level-ups, and season rewards appear here automatically
        </div>
      </div>
    </div>
  );
}
