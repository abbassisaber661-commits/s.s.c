import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useState } from "react";

/* ── Type → icon + gradient ── */
const TYPE_META: Record<string, { icon: string; gradient: string }> = {
  gift:         { icon: "🎁", gradient: "linear-gradient(135deg,#a855f7,#ec4899)" },
  gift_sent:    { icon: "🎁", gradient: "linear-gradient(135deg,#8b5cf6,#6366f1)" },
  rank:         { icon: "🏆", gradient: "linear-gradient(135deg,#f59e0b,#ef4444)" },
  dn:           { icon: "💰", gradient: "linear-gradient(135deg,#10b981,#06b6d4)" },
  system:       { icon: "📢", gradient: "linear-gradient(135deg,#3b82f6,#6366f1)" },
  post_like:    { icon: "❤️",  gradient: "linear-gradient(135deg,#ec4899,#f43f5e)" },
  post_comment: { icon: "💬", gradient: "linear-gradient(135deg,#06b6d4,#3b82f6)" },
  follow:       { icon: "👤", gradient: "linear-gradient(135deg,#8b5cf6,#a855f7)" },
  match_start:  { icon: "⚔️", gradient: "linear-gradient(135deg,#ef4444,#f97316)" },
  pvp_win:      { icon: "🏆", gradient: "linear-gradient(135deg,#f59e0b,#22c55e)" },
  rank_up:      { icon: "📈", gradient: "linear-gradient(135deg,#22c55e,#06b6d4)" },
  rank_down:    { icon: "📉", gradient: "linear-gradient(135deg,#ef4444,#f97316)" },
  level_up:     { icon: "⭐", gradient: "linear-gradient(135deg,#f59e0b,#fbbf24)" },
};
const DEFAULT_META = { icon: "🔔", gradient: "linear-gradient(135deg,#6366f1,#8b5cf6)" };

interface ToastItem {
  id: string;
  type: string;
  title: string;
  body: string;
}

export default function LiveNotifToast() {
  const { pushNotifs } = useRealtime();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!pushNotifs.length) return;
    const latest = pushNotifs[0];
    if (seenIds.current.has(latest.id)) return;
    seenIds.current.add(latest.id);

    const toast: ToastItem = {
      id: latest.id,
      type: latest.type,
      title: latest.title,
      body: latest.body,
    };

    setToasts((prev) => [toast, ...prev].slice(0, 5));

    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 5000);

    return () => clearTimeout(timer);
  }, [pushNotifs.length, pushNotifs[0]?.id]);

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "center",
        pointerEvents: "none",
        width: "100%",
        maxWidth: 360,
      }}
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const meta = TYPE_META[toast.type] ?? DEFAULT_META;
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              style={{
                background: "rgba(10,10,20,0.92)",
                backdropFilter: "blur(20px)",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                minWidth: 280,
                maxWidth: 360,
                pointerEvents: "auto",
                cursor: "default",
              }}
            >
              {/* Icon bubble */}
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: meta.gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  flexShrink: 0,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                {meta.icon}
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    lineHeight: 1.3,
                    marginBottom: 2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {toast.title}
                </div>
                <div
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 12,
                    lineHeight: 1.4,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {toast.body}
                </div>
              </div>

              {/* Progress bar */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 5, ease: "linear" }}
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: meta.gradient,
                  transformOrigin: "left",
                  borderRadius: "0 0 16px 16px",
                }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
