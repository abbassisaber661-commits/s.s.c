import { motion } from "framer-motion";
import { Crown, Trophy, Medal } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";

interface FeaturedPlayer {
  id: string;
  username: string;
  avatar: string;
  level: number;
  elo: number;
  pvpWins: number;
}

const MOCK_PLAYERS: FeaturedPlayer[] = [
  { id: "fp1", username: "QuantumBolt77", avatar: "⚡", level: 34, elo: 2140, pvpWins: 87 },
  { id: "fp2", username: "SwiftHawk99",   avatar: "🦅", level: 52, elo: 1980, pvpWins: 63 },
  { id: "fp3", username: "NeonArrow42",   avatar: "🎯", level: 28, elo: 1760, pvpWins: 41 },
];

const RANK_STYLE = [
  { icon: Crown,  color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30", label: "#1" },
  { icon: Trophy, color: "text-slate-300",  bg: "bg-slate-400/10 border-slate-400/30",  label: "#2" },
  { icon: Medal,  color: "text-amber-600",  bg: "bg-amber-700/10 border-amber-700/30",  label: "#3" },
];

export default function FeaturedPlayers() {
  const [players, setPlayers] = useState<FeaturedPlayer[]>(MOCK_PLAYERS);

  useEffect(() => {
    api.players.leaderboard(3)
      .then(data => { if (Array.isArray(data) && data.length >= 3) setPlayers(data as any); })
      .catch(() => {});
  }, []);

  const top3 = players.slice(0, 3);

  return (
    <div className="px-4 space-y-2">
      <div className="flex items-center gap-2">
        <Crown className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-bold">Top Players</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {top3.map((player, i) => {
          const rank = RANK_STYLE[i];
          const RankIcon = rank.icon;
          const initials = player.username.slice(0, 2).toUpperCase();

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`rounded-2xl border p-3 text-center space-y-1.5 ${rank.bg}`}
            >
              <div className="flex justify-center">
                <RankIcon className={`w-4 h-4 ${rank.color}`} />
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-primary-foreground mx-auto"
                style={{ background: "hsl(var(--primary))" }}
              >
                {player.avatar && /\p{Emoji}/u.test(player.avatar) ? (
                  <span className="text-lg">{player.avatar}</span>
                ) : (
                  initials
                )}
              </div>
              <div>
                <div className="text-[11px] font-bold truncate">{player.username.split(/\d/)[0]}</div>
                <div className="text-[10px] text-muted-foreground">Lv.{player.level}</div>
                <div className={`text-[10px] font-bold ${rank.color}`}>{player.elo} ELO</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
