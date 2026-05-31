import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeft, Bell, CheckCheck, MessageSquare, Send, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  getNotifications, markAllRead, markRead,
  unreadCount, getAge, type Notification,
} from "@/lib/messages";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useGame } from "@/contexts/GameContext";

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

type Tab = 'notifications' | 'live_chat';

export default function Messages() {
  const { username, authUser } = useGame();
  const { dmMessages, sendDm, connected, pushNotifs } = useRealtime();

  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [tab, setTab] = useState<Tab>('notifications');
  const [chatTarget, setChatTarget] = useState('');
  const [chatMsg, setChatMsg] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const unread = unreadCount(notifs);

  useEffect(() => { setNotifs(getNotifications()); }, []);

  // Merge push notifs into local list
  useEffect(() => {
    if (!pushNotifs.length) return;
    setNotifs(getNotifications());
  }, [pushNotifs.length]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dmMessages]);

  function handleMarkAll() { setNotifs(markAllRead()); }
  function handleRead(id: string) { setNotifs(markRead(id)); }

  function handleSendChat() {
    if (!chatMsg.trim() || !chatTarget.trim()) return;
    sendDm(chatTarget.trim(), chatTarget.trim(), authUser?.uid ?? username, username, chatMsg.trim());
    setChatMsg('');
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-10 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="p-1 rounded-lg hover:bg-card active:scale-95 transition-transform">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <Bell className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold flex-1">الرسائل</h1>

        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${connected ? 'bg-green-500/10 text-green-400' : 'bg-muted text-muted-foreground'}`}>
          <Wifi className="w-3 h-3" />
          {connected ? 'مباشر' : 'غير متصل'}
        </div>

        {tab === 'notifications' && unread > 0 && (
          <button onClick={handleMarkAll}
            className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:text-primary/80 transition-colors">
            <CheckCheck className="w-4 h-4" />
            قراءة الكل
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-card border-b border-border px-4 py-2">
        <button onClick={() => setTab('notifications')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'notifications' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
          <Bell className="w-3.5 h-3.5" />
          الإشعارات
          {unread > 0 && <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{unread}</span>}
        </button>
        <button onClick={() => setTab('live_chat')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'live_chat' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
          <MessageSquare className="w-3.5 h-3.5" />
          دردشة مباشرة
          {dmMessages.length > 0 && <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto max-w-md mx-auto w-full px-4 pt-4">

        {/* NOTIFICATIONS TAB */}
        {tab === 'notifications' && (
          <div className="space-y-2">
            {unread > 0 && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                {unread} إشعار{unread > 1 ? 'ات' : ''} غير مقروء{unread > 1 ? 'ة' : ''}
              </motion.div>
            )}

            {notifs.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">لا توجد إشعارات بعد</p>
              </div>
            )}

            <AnimatePresence>
              {notifs.map((n, idx) => (
                <motion.div key={n.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => handleRead(n.id)}
                  className={`rounded-2xl border bg-card p-4 cursor-pointer transition-all hover:bg-card/80 active:scale-[0.99] ${!n.read ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
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
                        {!n.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground/60">{getAge(n.timestamp)}</span>
                        {n.actionUrl && (
                          <Link href={n.actionUrl}>
                            <Button size="sm" variant="outline" className="text-xs h-6 px-2">عرض →</Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="rounded-2xl border border-border/40 bg-card/40 p-3 text-xs text-muted-foreground text-center">
              تظهر هنا الإشعارات للكؤوس وترقيات المستوى ومكافآت الموسم تلقائيًا
            </div>
          </div>
        )}

        {/* LIVE CHAT TAB */}
        {tab === 'live_chat' && (
          <div className="flex flex-col h-[calc(100vh-200px)]">
            {!connected && (
              <div className="text-center py-4 text-sm text-muted-foreground bg-muted/20 rounded-xl mb-4">
                ⚠️ غير متصل بالخادم المباشر
              </div>
            )}

            {/* Target input */}
            <div className="mb-3">
              <input
                value={chatTarget}
                onChange={e => setChatTarget(e.target.value)}
                placeholder="معرّف اللاعب المستلم..."
                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-3">
              {dmMessages.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">لا رسائل بعد</p>
                  <p className="text-xs mt-1 opacity-60">الرسائل تصل فورًا في الوقت الفعلي</p>
                </div>
              )}
              {dmMessages.map((msg, i) => {
                const isMe = msg.fromId === (authUser?.uid ?? username);
                return (
                  <motion.div key={msg.id ?? i}
                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
                      {!isMe && <div className="text-xs font-bold mb-1 opacity-70">{msg.fromName}</div>}
                      <p>{msg.content}</p>
                      <div className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                value={chatMsg}
                onChange={e => setChatMsg(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSendChat(); }}
                placeholder="اكتب رسالة..."
                maxLength={500}
                className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleSendChat}
                disabled={!chatMsg.trim() || !chatTarget.trim() || !connected}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 active:scale-95 transition-transform">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
