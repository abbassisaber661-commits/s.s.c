import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, MessageSquare, Wifi, Plus, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useGame } from "@/contexts/GameContext";
import { api, getStoredPlayerId, type ApiMessage } from "@/lib/apiClient";
import { getMsgAge } from "@/lib/chat";
import Avatar from "@/components/Avatar";

interface DmConvo {
  partnerId: string;
  partnerUsername: string;
  lastMessage: string;
  lastTimestamp: string;
  unread: number;
}

export default function Messages() {
  const { username } = useGame();
  const { connected, dmMessages } = useRealtime();
  const [, navigate] = useLocation();

  const playerId = getStoredPlayerId();

  const [convos, setConvos] = useState<DmConvo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  async function loadConversations() {
    if (!playerId) { setLoading(false); return; }
    setLoading(true);
    try {
      const msgs: ApiMessage[] = await api.messages.inbox(playerId);

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
          lastMessage: last?.content ?? "",
          lastTimestamp: last?.createdAt ?? "",
          unread: pMsgs.filter(m => !m.read && m.toId === playerId).length,
        };
      }).sort((a, b) =>
        new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
      );

      setConvos(built);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, [playerId]);

  // Update convos when new DMs arrive via socket
  useEffect(() => {
    if (dmMessages.length === 0 || !playerId) return;
    const latest = dmMessages[dmMessages.length - 1];
    if (!latest) return;
    const partnerId = latest.fromId === playerId ? latest.toId : latest.fromId;
    setConvos(prev => {
      const existing = prev.find(c => c.partnerId === partnerId);
      if (existing) {
        return prev
          .map(c =>
            c.partnerId === partnerId
              ? {
                  ...c,
                  lastMessage: latest.content,
                  lastTimestamp: latest.createdAt,
                  unread: latest.toId === playerId ? c.unread + 1 : c.unread,
                }
              : c
          )
          .sort((a, b) =>
            new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
          );
      }
      // New conversation partner — reload to get their info
      loadConversations();
      return prev;
    });
  }, [dmMessages.length]);

  const filtered = searchQuery.trim()
    ? convos.filter(c =>
        c.partnerUsername.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : convos;

  const totalUnread = convos.reduce((s, c) => s + c.unread, 0);

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
          onClick={() => navigate("/feed")}
          className="p-2 rounded-xl hover:bg-gray-100 active:scale-90 transition-all flex-shrink-0"
          aria-label="Back to Social"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>

        <MessageSquare className="w-5 h-5 flex-shrink-0" style={{ color: "#FFD60A" }} />
        <h1 className="text-lg font-black flex-1" style={{ color: "#050505" }}>
          Messages
          {totalUnread > 0 && (
            <span
              className="ml-2 px-2 py-0.5 rounded-full text-xs font-black text-white"
              style={{ background: "#EF4444" }}
            >
              {totalUnread}
            </span>
          )}
        </h1>

        <div
          className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold"
          style={connected
            ? { background: "#DCFCE7", color: "#16A34A" }
            : { background: "#F3F4F6", color: "#9CA3AF" }}
        >
          <Wifi className="w-3 h-3" />
          {connected ? "Live" : "Offline"}
        </div>
      </div>

      {/* ── Search bar ── */}
      <div
        className="px-4 py-2 sticky z-10"
        style={{ top: "57px", background: "#FFFFFF", borderBottom: "1px solid #E4E6EB" }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search conversations…"
            className="w-full pl-9 pr-4 py-2 rounded-full text-sm bg-gray-100 border border-gray-200 focus:outline-none focus:border-yellow-400"
            style={{ color: "#050505" }}
          />
        </div>
      </div>

      {/* ── Conversations ── */}
      <div className="flex-1 max-w-md mx-auto w-full px-4 pt-3">

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              className="w-7 h-7 rounded-full border-2 border-t-transparent"
              style={{ borderColor: "#FFD60A", borderTopColor: "transparent" }}
            />
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-16 gap-4"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "#FFF8DC" }}
            >
              <MessageSquare className="w-9 h-9" style={{ color: "#D97706" }} />
            </div>
            <div className="text-center">
              <p className="font-black text-base" style={{ color: "#050505" }}>
                {searchQuery ? "No results found" : "No conversations yet"}
              </p>
              <p className="text-sm mt-1" style={{ color: "#65676B" }}>
                {searchQuery
                  ? `Nobody matches "${searchQuery}"`
                  : "Find players in the Social feed and start chatting."}
              </p>
            </div>
            {!searchQuery && (
              <button
                onClick={() => navigate("/feed")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold active:scale-95 transition-transform"
                style={{ background: "#FFD60A", color: "#000000" }}
              >
                <Plus className="w-4 h-4" />
                Find people
              </button>
            )}
          </motion.div>
        )}

        {/* Conversation list */}
        {!loading && filtered.length > 0 && (
          <AnimatePresence>
            <div className="space-y-1.5">
              {filtered.map((conv, i) => (
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
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <Avatar username={conv.partnerUsername} size="lg" shape="rounded-xl" />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                      style={{ background: "#22C55E" }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-sm font-bold truncate"
                        style={{ color: "#050505" }}
                      >
                        {conv.partnerUsername}
                      </span>
                      {conv.lastTimestamp && (
                        <span className="text-[10px] flex-shrink-0 ml-1" style={{ color: "#65676B" }}>
                          {getMsgAge(new Date(conv.lastTimestamp).getTime())}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5 gap-2">
                      <p
                        className="text-xs truncate"
                        style={{
                          color: conv.unread > 0 ? "#050505" : "#65676B",
                          fontWeight: conv.unread > 0 ? 600 : 400,
                        }}
                      >
                        {conv.lastMessage || "No messages yet"}
                      </p>
                      {conv.unread > 0 && (
                        <span
                          className="flex-shrink-0 w-5 h-5 rounded-full text-black text-[10px] font-black flex items-center justify-center"
                          style={{ background: "#FFD60A" }}
                        >
                          {conv.unread > 9 ? "9+" : conv.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
