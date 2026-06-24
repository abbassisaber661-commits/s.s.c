import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Bell, CheckCheck, MessageSquare, Wifi, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useGame } from "@/contexts/GameContext";
import { api, getStoredPlayerId, type ApiNotification, type ApiMessage } from "@/lib/apiClient";
import { getFriendsList } from "@/lib/friends";
import { getMsgAge } from "@/lib/chat";
import Avatar from "@/components/Avatar";

function isOnline(username: string): boolean {
  const hash = username.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return (hash + new Date().getHours()) % 3 !== 0;
}

const NOTIF_ICON: Record<string, string> = {
  like: '❤️', comment: '💬', follow: '👤', mention: '📢',
  system: '🎮', pvp_result: '⚔️', tournament: '🏆', trophy: '🏅',
  level_up: '⬆️', weekly_complete: '📋', season_reward: '🌀',
  community_like: '❤️', verified: '✅',
};

const TYPE_COLOR: Record<string, string> = {
  system:          '#3AB4FF',
  pvp_result:      '#FF3A5E',
  tournament:      '#FFD700',
  trophy:          '#FFD700',
  level_up:        '#2EE87A',
  weekly_complete: '#FF9B3A',
  season_reward:   '#B44FFF',
  community_like:  '#FF6B35',
  verified:        '#3AB4FF',
  like:            '#FF6B35',
  comment:         '#3AB4FF',
  follow:          '#2EE87A',
  mention:         '#B44FFF',
};

function getAge(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  if (h < 24)  return `${h}h ago`;
  return `${d}d ago`;
}

interface DmConvo {
  partnerId: string;
  partnerUsername: string;
  lastMessage: string;
  lastTimestamp: string;
  unread: number;
}

type Tab = 'dms' | 'notifications';

export default function Messages() {
  const { username } = useGame();
  const { connected } = useRealtime();
  const [, navigate]  = useLocation();

  const playerId = getStoredPlayerId();

  const [tab, setTab]     = useState<Tab>('dms');
  const [notifs, setNotifs] = useState<ApiNotification[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [convos, setConvos] = useState<DmConvo[]>([]);
  const [dmUnread, setDmUnread] = useState(0);

  const notifUnread = notifs.filter(n => !n.read).length;

  useEffect(() => {
    if (!playerId) return;

    setNotifsLoading(true);
    api.notifications.list(playerId, 50)
      .then(setNotifs)
      .catch(() => {})
      .finally(() => setNotifsLoading(false));

    api.messages.inbox(playerId)
      .then(async (msgs: ApiMessage[]) => {
        setDmUnread(msgs.filter(m => !m.read).length);

        const byPartner: Record<string, ApiMessage[]> = {};
        for (const msg of msgs) {
          const partnerId = msg.fromId === playerId ? msg.toId : msg.fromId;
          byPartner[partnerId] = [...(byPartner[partnerId] ?? []), msg];
        }

        const partnerIds = Object.keys(byPartner);
        const partnerInfos = await Promise.all(
          partnerIds.map(id => api.players.get(id).catch(() => null))
        );

        const built: DmConvo[] = partnerIds.map((pid, i) => {
          const pMsgs = byPartner[pid];
          const last = pMsgs[0];
          const player = partnerInfos[i];
          return {
            partnerId: pid,
            partnerUsername: player?.username ?? pid.slice(0, 8),
            lastMessage: last?.content ?? '',
            lastTimestamp: last?.createdAt ?? '',
            unread: pMsgs.filter(m => !m.read && m.toId === playerId).length,
          };
        }).sort((a, b) =>
          new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
        );

        setConvos(built);
      })
      .catch(() => {});
  }, [playerId]);

  async function handleMarkAll() {
    if (!playerId) return;
    await api.notifications.readAll(playerId).catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }

  async function handleRead(id: string) {
    await api.notifications.markRead(id).catch(() => {});
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  const friends = getFriendsList(username);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="p-2 rounded-xl hover:bg-muted transition-colors active:scale-90">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <MessageSquare className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-black flex-1">Messages</h1>

        <div className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full ${connected ? 'bg-green-500/10 text-green-400' : 'bg-muted text-muted-foreground'}`}>
          <Wifi className="w-3 h-3" />
          {connected ? 'Live' : 'Offline'}
        </div>

        {tab === 'notifications' && notifUnread > 0 && (
          <button onClick={handleMarkAll} className="flex items-center gap-1 text-xs text-primary font-bold hover:opacity-80">
            <CheckCheck className="w-4 h-4" />
            All read
          </button>
        )}
      </div>

      {/* ── Tabs ─────────────────────────────────────────── */}
      <div className="flex bg-card border-b border-border px-4 py-2 gap-2 sticky top-[57px] z-10">
        <button
          onClick={() => setTab('dms')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'dms' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          DMs
          {dmUnread > 0 && (
            <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{dmUnread}</span>
          )}
        </button>
        <button
          onClick={() => setTab('notifications')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'notifications' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Bell className="w-3.5 h-3.5" />
          Notifications
          {notifUnread > 0 && (
            <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{notifUnread}</span>
          )}
        </button>
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      <div className="flex-1 max-w-md mx-auto w-full px-4 pt-4">
        <AnimatePresence mode="wait">

          {/* DMs TAB */}
          {tab === 'dms' && (
            <motion.div key="dms" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">

              {/* Start a conversation from friends list */}
              {friends.length > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] text-muted-foreground font-bold mb-2">START A CONVERSATION</p>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                    {friends.map(f => {
                      const online = isOnline(f.username);
                      return (
                        <button
                          key={f.username}
                          onClick={() => navigate(`/chat/${encodeURIComponent(f.username)}`)}
                          className="flex flex-col items-center gap-1 flex-shrink-0 active:scale-90 transition-transform"
                        >
                          <Avatar username={f.username} size="lg" shape="rounded-xl" online={online} />
                          <span className="text-[10px] font-bold text-muted-foreground w-12 text-center truncate">
                            {f.username.replace(/\d+$/, '')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* API-backed conversation list */}
              {convos.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground space-y-3">
                  <MessageSquare className="w-12 h-12 mx-auto opacity-30" />
                  <p className="font-bold text-foreground">No conversations yet</p>
                  <p className="text-sm">Add friends from the Social feed, then message them here.</p>
                  <button onClick={() => navigate('/social')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold mt-1 active:scale-95 transition-transform">
                    <Plus className="w-4 h-4" />
                    Find people
                  </button>
                </div>
              ) : (
                convos.map((conv, i) => {
                  const online = isOnline(conv.partnerUsername);
                  return (
                    <motion.button
                      key={conv.partnerId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => navigate(`/chat/${encodeURIComponent(conv.partnerUsername)}`)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border bg-card text-left transition-all active:scale-[0.98] hover:bg-card/80 ${conv.unread > 0 ? 'border-primary/40' : 'border-border'}`}
                    >
                      <Avatar username={conv.partnerUsername} size="lg" shape="rounded-xl" online={online} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-bold truncate ${conv.unread > 0 ? 'text-foreground' : 'text-foreground/80'}`}>
                            {conv.partnerUsername}
                          </span>
                          {conv.lastTimestamp && (
                            <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                              {getMsgAge(new Date(conv.lastTimestamp).getTime())}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className={`text-xs truncate ${conv.unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                            {conv.lastMessage || 'No messages yet'}
                          </p>
                          {conv.unread > 0 && (
                            <span className="flex-shrink-0 ml-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center">
                              {conv.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })
              )}
            </motion.div>
          )}

          {/* NOTIFICATIONS TAB */}
          {tab === 'notifications' && (
            <motion.div key="notifs" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
              {notifsLoading && (
                <div className="flex justify-center py-8">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}

              {!notifsLoading && notifUnread > 0 && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                  {notifUnread} unread notification{notifUnread !== 1 ? 's' : ''}
                </motion.div>
              )}

              {!notifsLoading && notifs.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-bold">No notifications yet</p>
                  <p className="text-xs mt-1 opacity-70">Likes, comments, follows and mentions appear here.</p>
                </div>
              )}

              <AnimatePresence>
                {notifs.map((n, idx) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    onClick={() => handleRead(n.id)}
                    className={`rounded-2xl border bg-card p-4 cursor-pointer transition-all hover:bg-card/80 active:scale-[0.99] ${!n.read ? 'border-primary/30 bg-primary/5' : 'border-border'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ backgroundColor: `${TYPE_COLOR[n.type] ?? '#3AB4FF'}20` }}>
                        {NOTIF_ICON[n.type] ?? '🎮'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {n.title}
                          </span>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground/60">{getAge(n.createdAt)}</span>
                          {!!n.data?.postId && (
                            <Link href="/social">
                              <Button size="sm" variant="outline" className="text-xs h-6 px-2">View →</Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
