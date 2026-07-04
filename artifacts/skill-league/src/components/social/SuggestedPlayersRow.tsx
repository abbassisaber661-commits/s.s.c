import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Check } from "lucide-react";
import { useLocation } from "wouter";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import Avatar from "@/components/Avatar";

interface SuggestedPlayer {
  id: string;
  username: string;
  avatar?: string;
  level: number;
}

export default function SuggestedPlayersRow() {
  const [, navigate] = useLocation();
  const [players, setPlayers] = useState<SuggestedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.players
      .leaderboard(10)
      .then((data: any) => {
        const list: SuggestedPlayer[] = Array.isArray(data) ? data : data?.players ?? [];
        setPlayers(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleFollow = async (targetId: string) => {
    const viewerId = getStoredPlayerId();
    if (!viewerId) return;
    setFollowed((prev) => ({ ...prev, [targetId]: true }));
    try {
      await api.followers.follow(targetId, viewerId);
    } catch {
      setFollowed((prev) => ({ ...prev, [targetId]: false }));
    }
  };

  return (
    <div
      className="mx-4 rounded-xl overflow-hidden"
      style={{ background: "#FFFFFF", boxShadow: "0 1px 2px rgba(0,0,0,0.1)", border: "1px solid #E4E6EB" }}
    >
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid #E4E6EB" }}
      >
        <Users className="w-4 h-4" style={{ color: "#1877F2" }} />
        <span className="text-sm font-black" style={{ color: "#050505" }}>Suggested Players</span>
      </div>

      <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-hide">
        {loading &&
          [1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16">
              <div className="w-14 h-14 rounded-full bg-gray-100 animate-pulse" />
              <div className="h-2 w-10 bg-gray-100 animate-pulse rounded" />
            </div>
          ))}

        {!loading && players.length === 0 && (
          <p className="text-xs text-gray-400 py-2">No suggestions right now</p>
        )}

        {!loading &&
          players.map((player) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16"
            >
              <div
                onClick={() => navigate(`/profile/${player.id}`)}
                className="cursor-pointer"
              >
                <Avatar username={player.username} avatar={player.avatar} size="lg" />
              </div>
              <span className="text-[11px] font-semibold truncate max-w-[64px]" style={{ color: "#050505" }}>
                {player.username}
              </span>
              <button
                onClick={() => handleFollow(player.id)}
                disabled={!!followed[player.id]}
                className="w-full px-2 py-1 rounded-full text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                style={
                  followed[player.id]
                    ? { background: "#E4E6EB", color: "#050505" }
                    : { background: "#1877F2", color: "#FFFFFF" }
                }
              >
                {followed[player.id] ? (
                  <>
                    <Check className="w-3 h-3" /> Following
                  </>
                ) : (
                  "Follow"
                )}
              </button>
            </motion.div>
          ))}
      </div>
    </div>
  );
}
