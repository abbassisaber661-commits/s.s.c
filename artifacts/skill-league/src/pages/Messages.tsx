import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Bell, CheckCheck, MessageSquare, Wifi, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useGame } from "@/contexts/GameContext";
import { api, getStoredPlayerId, type ApiNotification, type ApiMessage } from "@/lib/apiClient";
import { getFriendsList } from "@/lib/friends";
import { getMsgAge } from "@/lib/chat";
import Avatar from "@/components/Avatar";

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
    <div className="min-h-screen flex flex-col pb-24" style={{ background: "#F0F2F5" }}>

      {/* ── Header ── */}
      <div
        className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3"
        style={{
          background: "#FFFFFF",
          borderBottom: "1px solid #E4E6EB",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <button
          onClick={() => window.history.length > 1 ? navigate(-1 as any) : navigate("/feed")}
          className="p-2 rounded-xl hover:bg-gray-100 active:scale-90 transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>

        <MessageSquare className="w-5 h-5" style={{ color: "#FFD60A" }} />
        <h1 className="text-lg font-black flex-1" style={{ color: "#050505" }}>Messages</h1>

        <div
          className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold"
          style={connected
            ? { background: "#DCFCE7", color: "#16A34A" }
            : { background: "#F3F4F6", color: "#9CA3AF" }}
        >
          <Wifi className="w-3 h-3" />
          {connected ? 'Live' : 'Offline'}
        </div>

        {tab === 'notifications' && notifUnread > 0 && (
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg active:scale-95 transition-transform"
            style={{ background: "#FFF8DC", color: "#92400E" }}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            All read
          </button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div
        className="flex px-4 py-2 gap-2 sticky z-10"
        style={{
          top: "57px",
          background: "#FFFFFF",
          borderBottom: "1px solid #E4E6EB",
        }}
      >
        <button
          onClick={() => setTab('dms')}
          className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold transition-all active:scale-95"
          style={tab === 'dms'
            ? { background: "#FFD60A", color: "#000000" }
            : { background: "#F0F2F5", color: "#65676B" }}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          DMs
          {dmUnread > 0 && (
            <span
              className="w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center font-black"
              style={{ background: "#EF4444" }}
            >
              {dmUnread}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('notifications')}
          className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold transition-all active:scale-95"
          style={tab === 'notifications'
            ? { background: "#FFD60A", color: "#000000" }
            : { background: "#F0F2F5", color: "#65676B" }}
        >
          <Bell className="w-3.5 h-3.5" />
          Notifications
          {notifUnread > 0 && (
            <span
              className="w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center font-black"
              style={{ background: "#EF4444" }}
            >
              {notifUnread}
            </span>
          )}
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 max-w-md mx-auto w-full px-4 pt-4">
        <AnimatePresence mode="wait">

          {/* ── DMs TAB ── */}
          {tab === 'dms' && (
            <motion.div key="dms" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">

              {/* Friends quick-start bar */}
              {friends.length > 0 && (
                <div
                  className="rounded-2xl p-3"
                  style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}
                >
                  <p className="text-[11px] font-black mb-2.5 uppercase tracking-wider" style={{ color: "#65676B" }}>
                    Start a conversation
                  </p>
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                    {friends.map(f => (
                      <button
                        key={f.username}
                        onClick={() => navigate(`/chat/${encodeURIComponent(f.username)}`)}
                        className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-90 transition-transform"
                      >
                        <div className="relative">
                          <Avatar username={f.username} size="lg" shape="rounded-xl" />
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                            style={{ background: "#22C55E" }}
                          />
                        </div>
                        <span className="text-[10px] font-bold w-12 text-center truncate" style={{ color: "#65676B" }}>
                          {f.username.replace(/\d+$/, '')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversation list */}
              {convos.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-4">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "#FFF8DC" }}>
                    <MessageSquare className="w-9 h-9" style={{ color: "#D97706" }} />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-base" style={{ color: "#050505" }}>No conversations yet</p>
                    <p className="text-sm mt-1" style={{ color: "#65676B" }}>Add friends from the Social feed,<br/>then message them here.</p>
                  </div>
                  <button
                    onClick={() => navigate('/social')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold active:scale-95 transition-transform"
                    style={{ background: "#FFD60A", color: "#000000" }}
                  >
                    <Plus className="w-4 h-4" />
                    Find people
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {convos.map((conv, i) => (
                    <motion.button
                      key={conv.partnerId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => navigate(`/chat/${encodeURIComponent(conv.partnerUsername)}`)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all active:scale-[0.98]"
                      style={{
                        background: "#FFFFFF",
                        border: conv.unread > 0 ? "1px solid #FFD60A" : "1px solid #E4E6EB",
                        boxShadow: conv.unread > 0 ? "0 0 0 1px #FFD60A20" : "none",
                      }}
                    >
                      {/* Avatar with online indicator */}
                      <div className="relative flex-shrink-0">
                        <Avatar username={conv.partnerUsername} size="lg" shape="rounded-xl" />
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                          style={{ background: "#22C55E" }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span
                            className="text-sm font-bold truncate"
                            style={{ color: "#050505" }}
                          >
                            {conv.partnerUsername}
                          </span>
                          {conv.lastTimestamp && (
                            <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: "#65676B" }}>
                              {getMsgAge(new Date(conv.lastTimestamp).getTime())}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p
                            className="text-xs truncate"
                            style={{
                              color: conv.unread > 0 ? "#050505" : "#65676B",
                              fontWeight: conv.unread > 0 ? 600 : 400,
                            }}
                          >
                            {conv.lastMessage || 'No messages yet'}
                          </p>
                          {conv.unread > 0 && (
                            <span
                              className="flex-shrink-0 ml-2 w-5 h-5 rounded-full text-black text-[10px] font-black flex items-center justify-center"
                              style={{ background: "#FFD60A" }}
                            >
                              {conv.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── NOTIFICATIONS TAB ── */}
          {tab === 'notifications' && (
            <motion.div key="notifs" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
              {notifsLoading && (
                <div className="flex justify-center py-8">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    className="w-6 h-6 rounded-full border-2 border-t-transparent"
                    style={{ borderColor: "#FFD60A", borderTopColor: "transparent" }}
                  />
                </div>
              )}

              {!notifsLoading && notifUnread > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl px-4 py-3 text-sm font-semibold"
                  style={{ background: "#FFF8DC", border: "1px solid #FCD34D", color: "#92400E" }}
                >
                  🔔 {notifUnread} unread notification{notifUnread !== 1 ? 's' : ''}
                </motion.div>
              )}

              {!notifsLoading && notifs.length === 0 && (
                <div className="flex flex-col items-center py-16 gap-3">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#F3F4F6" }}>
                    <Bell className="w-7 h-7" style={{ color: "#9CA3AF" }} />
                  </div>
                  <p className="text-sm font-bold" style={{ color: "#050505" }}>No notifications yet</p>
                  <p className="text-xs" style={{ color: "#65676B" }}>Likes, comments, follows and mentions appear here.</p>
                </div>
              )}

              <AnimatePresence>
                {notifs.map((n, idx) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    onClick={() => handleRead(n.id)}
                    className="rounded-2xl p-4 cursor-pointer transition-all active:scale-[0.99]"
                    style={{
                      background: !n.read ? "#FFFBEB" : "#FFFFFF",
                      border: !n.read ? "1px solid #FCD34D" : "1px solid #E4E6EB",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ backgroundColor: `${TYPE_COLOR[n.type] ?? '#3AB4FF'}20` }}
                      >
                        {NOTIF_ICON[n.type] ?? '🎮'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-bold"
                            style={{ color: "#050505" }}
                          >
                            {n.title}
                          </span>
                          {!n.read && (
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: "#FFD60A" }}
                            />
                          )}
                        </div>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#65676B" }}>{n.body}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs" style={{ color: "#9CA3AF" }}>{getAge(n.createdAt)}</span>
                          {!!n.data?.postId && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-6 px-2 active:scale-95"
                              style={{ borderColor: "#FFD60A", color: "#000", fontWeight: 700 }}
                              onClick={() => navigate("/feed")}
                            >
                              View →
                            </Button>
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
