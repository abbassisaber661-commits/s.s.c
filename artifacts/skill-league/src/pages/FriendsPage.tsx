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
    <div className="min-h-screen bg-background text-foreground pb-28">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("~/")} className="p-2 rounded-xl hover:bg-muted transition-colors active:scale-90">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Users className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-black flex-1">Following</h1>
        {!loading && (
          <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-bold">
            {friends.length}
          </span>
        )}
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-5">

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : friends.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 text-muted-foreground space-y-3">
            <div className="text-5xl">👥</div>
            <p className="font-black text-base text-foreground">Not following anyone yet</p>
            <p className="text-sm">Head to the Social feed and tap <strong>Follow</strong> on any post!</p>
            <button
              onClick={() => navigate('/social')}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-95 transition-transform"
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
      className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card"
    >
      <button onClick={onProfile} className="active:scale-90 transition-transform">
        <Avatar username={entry.username} size="lg" shape="rounded-xl" />
      </button>

      <div className="flex-1 min-w-0">
        <button onClick={onProfile} className="text-sm font-bold truncate hover:text-primary transition-colors block text-left">
          {entry.username}
        </button>
        {entry.level !== undefined && (
          <p className="text-xs text-muted-foreground">Level {entry.level}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onMessage}
          className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors active:scale-90"
          title="Message"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        <button
          onClick={onUnfollow}
          className="p-2 rounded-xl bg-muted text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors active:scale-90"
          title="Unfollow"
        >
          <UserX className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
