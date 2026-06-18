import { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Send, Wifi } from "lucide-react";
import { motion } from "framer-motion";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useGame } from "@/contexts/GameContext";

export default function Chat() {
  const [, go] = useLocation();
  const [, params] = useRoute<{ username: string }>("/chat/:username");
  const recipient = params?.username ?? "";

  const { dmMessages, sendDm, connected } = useRealtime();
  const { username, authUser } = useGame();

  const [chatMsg, setChatMsg] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dmMessages]);

  function handleSend() {
    if (!chatMsg.trim() || !recipient || !connected) return;
    sendDm(
      recipient,
      recipient,
      authUser?.uid ?? username,
      username,
      chatMsg.trim()
    );
    setChatMsg("");
  }

  const initials = recipient ? recipient.slice(0, 2).toUpperCase() : "??";

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-20">
        <button
          onClick={() => go(-1 as any)}
          className="p-2 rounded-xl hover:bg-card active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="w-9 h-9 rounded-2xl bg-primary/20 flex items-center justify-center text-sm font-black text-primary flex-shrink-0">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{recipient}</div>
          <div
            className={`text-xs flex items-center gap-1 ${
              connected ? "text-green-400" : "text-muted-foreground"
            }`}
          >
            <Wifi className="w-3 h-3" />
            {connected ? "Online" : "Offline"}
          </div>
        </div>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {!connected && (
          <div className="text-center py-3 text-sm text-muted-foreground bg-muted/20 rounded-xl mb-2">
            ⚠️ Not connected — messages cannot be sent right now
          </div>
        )}

        {dmMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground py-24">
            <span className="text-5xl">💬</span>
            <p className="text-sm font-semibold">Start a conversation</p>
            <p className="text-xs opacity-60">
              Chatting with{" "}
              <span className="font-bold text-foreground">{recipient}</span>
            </p>
          </div>
        )}

        {dmMessages.map((msg, i) => {
          const isMe = msg.fromId === (authUser?.uid ?? username);
          return (
            <motion.div
              key={msg.id ?? i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm ${
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border border-border rounded-bl-sm"
                }`}
              >
                {!isMe && (
                  <div className="text-xs font-bold mb-1 opacity-70">
                    {msg.fromName}
                  </div>
                )}
                <p>{msg.content}</p>
                <div
                  className={`text-[10px] mt-1 ${
                    isMe
                      ? "text-primary-foreground/60"
                      : "text-muted-foreground"
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </motion.div>
          );
        })}

        <div ref={chatEndRef} />
      </div>

      {/* Send input */}
      <div className="px-4 py-3 border-t border-border bg-background flex gap-2 pb-safe">
        <input
          value={chatMsg}
          onChange={(e) => setChatMsg(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder={`Message ${recipient}…`}
          maxLength={500}
          className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          onClick={handleSend}
          disabled={!chatMsg.trim() || !connected}
          className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-40 active:scale-95 transition-transform flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
