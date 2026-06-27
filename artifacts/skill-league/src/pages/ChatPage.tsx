import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Lock } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { getFriendStatus } from "@/lib/friends";
import { getSocialLeague } from "@/lib/socialLeague";
import { api, getStoredPlayerId, type ApiMessage } from "@/lib/apiClient";
import Avatar from "@/components/Avatar";

function isOnline(username: string): boolean {
  const hash = username.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return (hash + new Date().getHours()) % 3 !== 0;
}

function getMsgAge(ts: number): string {
  const diff  = Date.now() - ts;
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return 'now';
  if (mins < 60)  return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

interface DisplayMessage {
  id: string;
  fromId: string;
  toId: string;
  text: string;
  timestamp: number;
  read: boolean;
  pending?: boolean;
}

export default function ChatPage() {
  const [, params]   = useRoute("/chat/:username");
  const [, navigate] = useLocation();
  const { username: me, level: myLevel } = useGame();

  const them    = decodeURIComponent(params?.username ?? "");
  const status  = getFriendStatus(me, them);
  const canChat = status === 'friends' || status === 'pending_sent';

  const myId  = getStoredPlayerId();
  const [theirId, setTheirId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [draft, setDraft]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [sending, setSending]   = useState(false);
  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const online = isOnline(them);
  const league = getSocialLeague(myLevel);
  void league;

  useEffect(() => {
    if (!them) return;
    api.social.search(them, 'users').then(r => {
      const users = r.users as any[];
      const found = users.find(u => u.username?.toLowerCase() === them.toLowerCase());
      if (found?.id) setTheirId(found.id);
    }).catch(() => {});
  }, [them]);

  useEffect(() => {
    if (!myId || !theirId) return;
    setLoading(true);
    api.messages.thread(myId, theirId)
      .then((msgs: ApiMessage[]) => {
        const mapped: DisplayMessage[] = msgs.map(m => ({
          id: m.id,
          fromId: m.fromId,
          toId: m.toId,
          text: m.content,
          timestamp: new Date(m.createdAt).getTime(),
          read: m.read,
        }));
        setMessages(mapped);
        const unread = msgs.filter(m => m.toId === myId && !m.read);
        unread.forEach(m => api.messages.read(m.id).catch(() => {}));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [myId, theirId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    if (!draft.trim() || !canChat || !myId || !theirId || sending) return;
    const text = draft.trim();
    setSending(true);

    const tempId = `tmp_${Date.now()}`;
    const optimistic: DisplayMessage = {
      id: tempId,
      fromId: myId,
      toId: theirId,
      text,
      timestamp: Date.now(),
      read: false,
      pending: true,
    };
    setMessages(prev => [...prev, optimistic]);
    setDraft("");
    inputRef.current?.focus();

    try {
      const created = await api.messages.send({ fromId: myId, toId: theirId, content: text });
      setMessages(prev => prev.map(m =>
        m.id === tempId
          ? { id: created.id, fromId: created.fromId, toId: created.toId, text: created.content, timestamp: new Date(created.createdAt).getTime(), read: created.read }
          : m
      ));
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  function groupMessages(msgs: DisplayMessage[]) {
    const groups: { date: string; items: DisplayMessage[] }[] = [];
    for (const msg of msgs) {
      const d     = new Date(msg.timestamp);
      const label = d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
      const last  = groups.at(-1);
      if (last && last.date === label) last.items.push(msg);
      else groups.push({ date: label, items: [msg] });
    }
    return groups;
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-background/95 backdrop-blur border-b border-border z-20">
        <button
          onClick={() => navigate('/messages')}
          className="p-2 rounded-xl hover:bg-muted transition-colors active:scale-90"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <Avatar username={them} size="sm" shape="rounded-xl" online={online} />

        <div className="flex-1 min-w-0">
          <button
            onClick={() => theirId ? navigate(`/profile/${theirId}`) : navigate(`/search?q=${encodeURIComponent(them)}`)}
            className="font-bold text-sm hover:text-primary transition-colors block truncate text-left"
          >
            {them}
          </button>
          <span className={`text-[11px] font-medium ${online ? 'text-green-400' : 'text-muted-foreground'}`}>
            {online ? '🟢 Online' : '⚫ Offline'}
          </span>
        </div>
      </div>

      {/* ── Not friends wall ──────────────────────────────── */}
      {!canChat && (
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4 max-w-xs"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-black text-lg">Add Friend First</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You can only message players you're friends with. Find <strong>{them}</strong> on the Social feed and send a friend request.
            </p>
            <button
              onClick={() => navigate('/social')}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm active:scale-95 transition-transform"
            >
              Go to Social Feed
            </button>
          </motion.div>
        </div>
      )}

      {/* ── Message list ──────────────────────────────────── */}
      {canChat && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {loading && (
            <div className="flex justify-center py-8">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <div className="text-4xl">👋</div>
              <p className="font-bold text-foreground">Start the conversation</p>
              <p className="text-sm">Say hello to {them}!</p>
            </div>
          )}

          {!loading && groupMessages(messages).map(group => (
            <div key={group.date} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-[10px] text-muted-foreground font-medium px-2">{group.date}</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              {group.items.map((msg, i) => {
                const isMe       = msg.fromId === myId;
                const showAvatar = !isMe && (i === 0 || group.items[i - 1]?.fromId !== msg.fromId);

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.18 }}
                    className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isMe && (
                      <div className={showAvatar ? 'opacity-100' : 'opacity-0 pointer-events-none'}>
                        <Avatar username={them} size="xs" shape="rounded-lg" />
                      </div>
                    )}

                    <div className={`max-w-[72%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                          isMe
                            ? `bg-primary text-primary-foreground rounded-br-sm${msg.pending ? ' opacity-60' : ''}`
                            : 'bg-card border border-border rounded-bl-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className={`text-[10px] px-1 ${isMe ? 'text-right text-muted-foreground' : 'text-muted-foreground'}`}>
                        {msg.pending ? 'Sending…' : getMsgAge(msg.timestamp)}
                        {isMe && !msg.pending && <span className="ml-1">{msg.read ? ' ✓✓' : ' ✓'}</span>}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}

      {/* ── Input bar ─────────────────────────────────────── */}
      {canChat && (
        <div className="flex-shrink-0 border-t border-border bg-background/95 backdrop-blur px-4 py-3">
          <div className="flex items-center gap-2 max-w-md mx-auto">
            <Avatar username={me} size="xs" shape="rounded-lg" />
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={theirId ? `Message ${them}…` : `Looking up ${them}…`}
              maxLength={500}
              disabled={!theirId || sending}
              className="flex-1 bg-card border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim() || !theirId || sending}
              className="w-10 h-10 flex items-center justify-center rounded-xl disabled:opacity-40 active:scale-90 transition-all"
              style={{ background: 'hsl(var(--primary))' }}
            >
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
