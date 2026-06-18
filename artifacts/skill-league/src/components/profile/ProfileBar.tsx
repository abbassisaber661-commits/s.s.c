import { motion } from "framer-motion";
import { Star, Zap } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { getFameTitle } from "@/lib/fame";
import Avatar from "@/components/Avatar";

export default function ProfileBar() {
  const { username, level, fame, coins } = useGame();
  const fameTitle = getFameTitle(fame);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border"
    >
      <Avatar username={username || 'Player'} size="md" shape="rounded-2xl" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm truncate">{username || "Player"}</span>
          <span className="text-xs" style={{ color: fameTitle.color }}>
            {fameTitle.icon}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Zap className="w-3 h-3 text-yellow-400" />
            Lv.{level}
          </span>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Star className="w-3 h-3 text-purple-400" />
            {fame.toLocaleString()} pts
          </span>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="text-xs text-muted-foreground">Coins</div>
        <div className="text-sm font-black text-yellow-400">💰 {coins.toLocaleString()}</div>
      </div>
    </motion.div>
  );
}
