import { motion } from "framer-motion";
import { Crown, Trophy, Medal } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { api } from "@/lib/apiClient";
import Avatar from "@/components/Avatar";

interface FeaturedPlayer {
  id:       string;
  username: string;
  avatar:   string;
  level:    number;
  elo:      number;
  pvpWins:  number;
}

const RANK_STYLE = [
  { icon: Crown,  iconColor: "#F59E0B", badge: "#FFF8E1", badgeBorder: "#F59E0B", rankLabel: "🥇 #1" },
  { icon: Trophy, iconColor: "#94A3B8", badge: "#F8FAFC", badgeBorder: "#94A3B8", rankLabel: "🥈 #2" },
  { icon: Medal,  iconColor: "#B45309", badge: "#FFFBEB", badgeBorder: "#B45309", rankLabel: "🥉 #3" },
];

const SkeletonRow = () => (
  <div className="flex items-center gap-3 px-4 py-3">
    <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
    <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
    <div className="flex-1 space-y-1.5">
      <div className="h-3 bg-gray-200 animate-pulse rounded w-24" />
      <div className="h-2.5 bg-gray-100 animate-pulse rounded w-16" />
    </div>
    <div className="w-16 h-6 bg-gray-200 animate-pulse rounded-full" />
  </div>
);

export default function FeaturedPlayers() {
  const [, navigate] = useLocation();
  const [players, setPlayers] = useState<FeaturedPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.players.leaderboard(3)
      .then(data => {
        const list: FeaturedPlayer[] = Array.isArray(data)
          ? data
          : ((data as any).players ?? []);
        setPlayers(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="mx-4 rounded-xl overflow-hidden"
      style={{ background: "#FFFFFF", boxShadow: "0 1px 2px rgba(0,0,0,0.1)", border: "1px solid #E4E6EB" }}
    >
      {/* Card header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid #E4E6EB" }}
      >
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-black" style={{ color: "#050505" }}>Top Players</span>
        </div>
        <span className="text-xs font-semibold" style={{ color: "#1877F2" }}>This Week</span>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="divide-y" style={{ borderColor: "#F0F2F5" }}>
          {[0, 1, 2].map(i => <SkeletonRow key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && players.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-xs text-gray-400">No leaderboard data yet</p>
        </div>
      )}

      {/* Players list — real API data only */}
      {!loading && players.length > 0 && (
        <div className="divide-y" style={{ borderColor: "#F0F2F5" }}>
          {players.slice(0, 3).map((player, i) => {
            const rank     = RANK_STYLE[i];
            const RankIcon = rank.icon;

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => navigate(`/profile/${player.id}`)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                {/* Rank badge */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border"
                  style={{ background: rank.badge, borderColor: rank.badgeBorder + "50" }}
                >
                  <RankIcon className="w-4 h-4" style={{ color: rank.iconColor } as any} />
                </div>

                {/* Avatar */}
                <div className="flex-shrink-0">
                  <Avatar username={player.username} size="sm" shape="rounded-xl" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate" style={{ color: "#050505" }}>
                    {player.username}
                  </div>
                  <div className="text-[11px]" style={{ color: "#65676B" }}>
                    Lv.{player.level} · {player.pvpWins} wins
                  </div>
                </div>

                {/* ELO chip */}
                <div
                  className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold text-white"
                  style={{ background: "#1877F2" }}
                >
                  {player.elo} ELO
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Footer CTA */}
      <div
        className="px-4 py-2.5 text-center"
        style={{ borderTop: "1px solid #E4E6EB" }}
      >
        <span className="text-xs font-semibold" style={{ color: "#1877F2" }}>
          View Full Leaderboard →
        </span>
      </div>
    </div>
  );
}
