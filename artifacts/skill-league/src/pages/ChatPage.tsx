import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Phone, Video, MoreVertical } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { getSocialLeague } from "@/lib/socialLeague";
import { api, getStoredPlayerId, type ApiMessage } from "@/lib/apiClient";
import { useRealtime } from "@/contexts/RealtimeContext";
import Avatar from "@/components/Avatar";

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

  const them = decodeURIComponent(params?.username ?? "");

  const myId  = getStoredPlayerId();
  const [theirId, setTheirId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [draft, setDraft]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [sending, setSending]   = useState(false);
  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const league = getSocialLeague(myLevel);
  void league;

  const { dmMessages } = useRealtime();

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
    if (!theirId || dmMessages.length === 0) return;
    const latest = dmMessages[dmMessages.length - 1];
    if (
      latest &&
      ((latest.fromId === theirId && latest.toId === myId) ||
       (latest.fromId === myId && latest.toId === theirId))
    ) {
      const asDisplay: DisplayMessage = {
        id: latest.id,
        fromId: latest.fromId,
        toId: latest.toId,
        text: latest.content,
        timestamp: new Date(latest.createdAt).getTime(),
        read: false,
      };
      setMessages(prev => {
        if (prev.some(m => m.id === latest.id)) return prev;
        return [...prev, asDisplay];
      });
      if (latest.toId === myId) {
        api.messages.read(latest.id).catch(() => {});
      }
    }
  }, [dmMessages.length, theirId, myId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    if (!draft.trim() || !myId || !theirId || sending) return;
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
    <div className="flex flex-col h-screen" style={{ background: "#F0F2F5" }}>

      {/* ── Header ── */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4 py-3 z-20"
        style={{
          background: "#FFFFFF",
          borderBottom: "1px solid #E4E6EB",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <button
          onClick={() => navigate('/messages')}
          className="p-2 rounded-xl hover:bg-gray-100 active:scale-90 transition-all flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>

        {/* Avatar with online dot */}
        <div className="relative flex-shrink-0">
          <Avatar username={them} size="sm" shape="rounded-xl" />
          {theirId && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
              style={{ background: "#22C55E" }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <button
            onClick={() => theirId ? navigate(`/profile/${theirId}`) : navigate(`/search?q=${encodeURIComponent(them)}`)}
            className="font-black text-sm hover:text-blue-600 transition-colors block truncate text-left"
            style={{ color: "#050505" }}
          >
            {them}
          </button>
          <span className="text-[11px] font-medium" style={{ color: theirId ? "#22C55E" : "#65676B" }}>
            {theirId ? '🟢 Active now' : 'Looking up…'}
          </span>
        </div>
      </div>

      {/* ── Message list ── */}
      {(
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {loading && (
            <div className="flex justify-center py-8">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                className="w-6 h-6 rounded-full border-2 border-t-transparent"
                style={{ borderColor: "#FFD60A", borderTopColor: "transparent" }}
              />
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#FFF8DC" }}>
                <span className="text-3xl">👋</span>
              </div>
              <p className="font-black text-base" style={{ color: "#050505" }}>Say hello!</p>
              <p className="text-sm text-center" style={{ color: "#65676B" }}>Start your conversation with <strong>{them}</strong></p>
            </div>
          )}

          {!loading && groupMessages(messages).map(group => (
            <div key={group.date} className="space-y-1">
              {/* Date divider */}
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px" style={{ background: "#E4E6EB" }} />
                <span
                  className="text-[11px] font-semibold px-3 py-1 rounded-full"
                  style={{ background: "#E4E6EB", color: "#65676B" }}
                >
                  {group.date}
                </span>
                <div className="flex-1 h-px" style={{ background: "#E4E6EB" }} />
              </div>

              {group.items.map((msg, i) => {
                const isMe       = msg.fromId === myId;
                const showAvatar = !isMe && (i === 0 || group.items[i - 1]?.fromId !== msg.fromId);
                const isLast     = i === group.items.length - 1 || group.items[i + 1]?.fromId !== msg.fromId;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.15 }}
                    className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} ${i > 0 && group.items[i - 1]?.fromId === msg.fromId ? 'mt-0.5' : 'mt-2'}`}
                  >
                    {/* Incoming avatar */}
                    {!isMe && (
                      <div className="w-7 flex-shrink-0 mb-1">
                        {showAvatar ? (
                          <Avatar username={them} size="xs" shape="rounded-lg" />
                        ) : null}
                      </div>
                    )}

                    <div className={`flex flex-col gap-0.5 max-w-[72%] ${isMe ? 'items-end' : 'items-start'}`}>
                      <div
                        className="px-4 py-2.5 text-sm leading-relaxed break-words"
                        style={{
                          background: isMe ? "#FFD60A" : "#FFFFFF",
                          color: "#000000",
                          border: isMe ? "none" : "1px solid #E4E6EB",
                          borderRadius: isMe
                            ? isLast ? "20px 20px 4px 20px" : "20px 20px 20px 20px"
                            : isLast ? "20px 20px 20px 4px" : "20px 20px 20px 20px",
                          opacity: msg.pending ? 0.65 : 1,
                          boxShadow: isMe ? "0 1px 2px rgba(0,0,0,0.1)" : "0 1px 2px rgba(0,0,0,0.06)",
                          fontWeight: 400,
                        }}
                      >
                        {msg.text}
                      </div>

                      {/* Timestamp + read receipt — only show on last in sequence */}
                      {isLast && (
                        <span
                          className="text-[10px] px-1"
                          style={{ color: "#65676B" }}
                        >
                          {msg.pending ? 'Sending…' : getMsgAge(msg.timestamp)}
                          {isMe && !msg.pending && (
                            <span className="ml-1" style={{ color: msg.read ? "#1877F2" : "#65676B" }}>
                              {msg.read ? '✓✓' : '✓'}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}

      {/* ── Input bar ── */}
      {(
        <div
          className="flex-shrink-0 px-4 py-3"
          style={{
            background: "#FFFFFF",
            borderTop: "1px solid #E4E6EB",
          }}
        >
          <div className="flex items-center gap-2 max-w-md mx-auto">
            <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-full"
              style={{ background: "#F0F2F5", border: "1px solid #E4E6EB" }}>
              <input
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={theirId ? `Message ${them}…` : `Looking up ${them}…`}
                maxLength={500}
                disabled={!theirId || sending}
                className="flex-1 bg-transparent text-sm focus:outline-none disabled:opacity-50"
                style={{ color: "#050505" }}
              />
            </div>

            <button
              onClick={handleSend}
              disabled={!draft.trim() || !theirId || sending}
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-all disabled:opacity-40"
              style={{ background: "#FFD60A" }}
            >
              <Send className="w-4 h-4" style={{ color: "#000000" }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
