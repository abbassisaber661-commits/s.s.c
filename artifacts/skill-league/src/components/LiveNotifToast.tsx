import { useEffect } from "react";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useToast } from "@/hooks/use-toast";

const ICONS: Record<string, string> = {
  match_start: "⚔️",
  pvp_win: "🏆",
  rank_up: "📈",
  rank_down: "📉",
  tournament: "🥊",
  trophy: "🏅",
  level_up: "⭐",
  coins: "🪙",
  default: "🔔",
};

export default function LiveNotifToast() {
  const { pushNotifs, markNotifRead } = useRealtime();
  const { toast } = useToast();

  useEffect(() => {
    if (!pushNotifs.length) return;
    const latest = pushNotifs[0];
    const icon = ICONS[latest.type] ?? ICONS.default;
    toast({
      title: `${icon} ${latest.title}`,
      description: latest.body,
      duration: 4000,
    });
    markNotifRead(latest.id);
  }, [pushNotifs.length]);

  return null;
}
