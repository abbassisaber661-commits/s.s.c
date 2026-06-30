import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, MessageSquare, UserX, Users, UserPlus, Loader2 } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import Avatar from "@/components/Avatar";

interface FollowingEntry {
  id: string;
  username: string;
  level?: number;
}

export default function FriendsPage() {
  const [, navigate] = useLocation();
  const { authUser } = useGame();
  const [friends, setFriends] = useState<FollowingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const myId = authUser?.uid ?? getStoredPlayerId();

  useEffect(() => {
    if (!myId) { setLoading(false); return; }
    setLoading(true);
    api.followers.listFollowing(myId, myId)
      .then(entries => {
        setFriends(entries.map(e => ({ id: e.id, username: e.username, level: e.level })));
      })
      .catch(() => setFriends([]))
      .finally(() => setLoading(false));
  }, [myId]);

  async function handleUnfollow(theirId: string) {
    if (!myId) return;
    await api.followers.unfollow(theirId, myId).catch(() => {});
    setFriends(prev => prev.filter(f => f.id !== theirId));
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#111111] pb-28">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#E5E5E5] shadow-sm px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="p-2 rounded-xl hover:bg-[#F5F5F7] transition-colors active:scale-90"
        >
          <ArrowLeft className="w-5 h-5 text-[#111111]" />
        </button>
        <Users className="w-5 h-5 text-[#FFD60A]" />
        <h1 className="text-lg font-black flex-1 text-[#111111]">Following</h1>
        {!loading && (
          <span className="text-xs text-[#666666] bg-[#F5F5F7] border border-[#E5E5E5] px-2.5 py-1 rounded-full font-bold">
            {friends.length}
          </span>
        )}
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-5">

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#FFD60A]" />
          </div>
        ) : friends.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 text-[#666666] space-y-3"
          >
            <div className="text-5xl">👥</div>
            <p className="font-black text-base text-[#111111]">Not following anyone yet</p>
            <p className="text-sm">Head to the Social feed and tap <strong>Follow</strong> on any post!</p>
            <button
              onClick={() => navigate('/social')}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFD60A] text-black text-sm font-bold active:scale-95 transition-transform"
            >
              <UserPlus className="w-4 h-4" />
              Go to Social Feed
            </button>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {friends.map((f, i) => (
              <FriendCard
                key={f.id} entry={f} index={i}
                onMessage={() => navigate(`/chat/${encodeURIComponent(f.username)}`)}
                onUnfollow={() => handleUnfollow(f.id)}
                onProfile={() => navigate(`/user/${encodeURIComponent(f.username)}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FriendCard({
  entry, index, onMessage, onUnfollow, onProfile,
}: {
  entry: FollowingEntry; index: number;
  onMessage: () => void; onUnfollow: () => void; onProfile: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-3 p-3 rounded-2xl border border-[#E5E5E5] bg-white shadow-sm"
    >
      <button onClick={onProfile} className="active:scale-90 transition-transform">
        <Avatar username={entry.username} size="lg" shape="rounded-xl" />
      </button>

      <div className="flex-1 min-w-0">
        <button
          onClick={onProfile}
          className="text-sm font-bold truncate hover:text-[#111111] transition-colors block text-left text-[#111111]"
        >
          {entry.username}
        </button>
        {entry.level !== undefined && (
          <p className="text-xs text-[#666666]">Level {entry.level}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onMessage}
          className="p-2 rounded-xl bg-[#FFD60A]/10 text-[#111111] hover:bg-[#FFD60A]/20 transition-colors active:scale-90"
          title="Message"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        <button
          onClick={onUnfollow}
          className="p-2 rounded-xl bg-[#F5F5F7] border border-[#E5E5E5] text-[#666666] hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors active:scale-90"
          title="Unfollow"
        >
          <UserX className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
