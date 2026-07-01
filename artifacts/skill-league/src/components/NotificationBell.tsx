import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRealtime } from "@/contexts/RealtimeContext";
import NotificationPanel from "./NotificationPanel";

export default function NotificationBell() {
  const { unreadCount } = useRealtime();
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  /* Pulse animation when a new notification arrives */
  useEffect(() => {
    if (unreadCount > 0) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 1200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [unreadCount]);

  return (
    <>
      {/* ── Bell Button ── */}
      <div style={{ position: "relative", display: "inline-flex" }}>
        <motion.button
          onClick={() => setOpen(true)}
          animate={pulse ? { scale: [1, 1.2, 1] } : { scale: 1 }}
          transition={{ duration: 0.4 }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            position: "relative",
          }}
          aria-label="Notifications"
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>🔔</span>

          {/* Unread badge */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                key="badge"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  background: "linear-gradient(135deg,#ef4444,#f97316)",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
                  boxShadow: "0 2px 8px rgba(239,68,68,0.6)",
                  border: "1.5px solid rgba(0,0,0,0.4)",
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pulse ring on new notification */}
          {pulse && (
            <motion.div
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.8 }}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 14,
                border: "2px solid #a855f7",
                pointerEvents: "none",
              }}
            />
          )}
        </motion.button>
      </div>

      {/* ── Notification Panel ── */}
      <NotificationPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
