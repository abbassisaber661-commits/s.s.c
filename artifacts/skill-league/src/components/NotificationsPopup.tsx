import { useEffect, useState } from "react";
import { useRealtime } from "@/contexts/RealtimeContext";

export default function NotificationsPopup() {
  const { pushNotifs, markNotifRead } = useRealtime();
  const [current, setCurrent] = useState<any | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!pushNotifs.length) return;

    const notif = pushNotifs[0];
    setCurrent(notif);

    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);

      setTimeout(() => {
        markNotifRead(notif.id);
        setCurrent(null);
      }, 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, [pushNotifs]);

  if (!current) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: visible ? 20 : 0,
        right: 20,
        transform: visible ? "translateY(0)" : "translateY(-20px)",
        opacity: visible ? 1 : 0,
        transition: "all 0.3s ease",
        background: "rgba(20,20,20,0.95)",
        color: "#fff",
        padding: "14px 16px",
        borderRadius: 12,
        minWidth: 260,
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
        zIndex: 9999,
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {current.type === "like" && "❤️"}
        {current.type === "comment" && "💬"}
        {current.type === "follow" && "👤"}
        {current.type === "system" && "🔔"}

        {current.title}
      </div>

      <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
        {current.body}
      </div>
    </div>
  );
}