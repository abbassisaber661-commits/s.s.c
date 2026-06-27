import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, MessageSquare, UserX, Users, UserPlus } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { getFriendsList, unfriend, type FriendEntry } from "@/lib/friends";
import { getSocialLeague } from "@/lib/socialLeague";
import Avatar from "@/components/Avatar";

export default function FriendsPage() {
  const [, navigate] = useLocation();
  const { username }  = useGame();
  const [friends, setFriends] = useState<FriendEntry[]>([]);

  useEffect(() => {
    setFriends(getFriendsList(username));
  }, [username]);

  function handleUnfriend(them: string) {
    unfriend(username, them);
    setFriends(getFriendsList(username));
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("~/")} className="p-2 rounded-xl hover:bg-muted transition-colors active:scale-90">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Users className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-black flex-1">Friends</h1>
        <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-bold">
          {friends.length}
        </span>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-5">

        {friends.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 text-muted-foreground space-y-3">
            <div className="text-5xl">👥</div>
            <p className="font-black text-base text-foreground">No friends yet</p>
            <p className="text-sm">Head to the Social feed and tap <strong>+ Add</strong> on any post!</p>
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
                key={f.username} entry={f} index={i}
                onMessage={() => navigate(`/chat/${encodeURIComponent(f.username)}`)}
                onUnfriend={() => handleUnfriend(f.username)}
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
  entry, index, onMessage, onUnfriend, onProfile,
}: {
  entry: FriendEntry; index: number;
  onMessage: () => void; onUnfriend: () => void; onProfile: () => void;
}) {
  const { username } = entry;
  const league       = getSocialLeague(10);
  void league;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card"
    >
      {/* Avatar */}
      <button onClick={onProfile} className="active:scale-90 transition-transform">
        <Avatar username={username} size="lg" shape="rounded-xl" />
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <button onClick={onProfile} className="text-sm font-bold truncate hover:text-primary transition-colors block text-left">
          {username}
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onMessage}
          className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors active:scale-90"
          title="Message"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        <button
          onClick={onUnfriend}
          className="p-2 rounded-xl bg-muted text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors active:scale-90"
          title="Unfriend"
        >
          <UserX className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
