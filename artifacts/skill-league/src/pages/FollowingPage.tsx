import React, { useState, useMemo, useEffect, useRef, useCallback, memo } from "react";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Search, X, UserCheck, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import type { FollowEntry } from "@/types/profile";

const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-gray-200 dark:bg-gray-700 rounded", className)} />
);

const SkeletonItem = () => (
  <div className="flex items-center gap-3 px-4 py-3">
    <Shimmer className="w-11 h-11 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Shimmer className="h-4 w-28 rounded" />
      <Shimmer className="h-3 w-20 rounded" />
    </div>
    <Shimmer className="h-8 w-22 rounded-lg" />
  </div>
);

interface FollowingItemProps {
  user: FollowEntry;
  index: number;
  viewerId: string;
  onUnfollow: (id: string) => void;
}

const FollowingItem = memo(({ user, index, viewerId, onUnfollow }: FollowingItemProps) => {
  const [, navigate] = useLocation();
  const [following, setFollowing] = useState(user.isFollowing ?? true);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handleToggle = async () => {
    if (!viewerId) { toast.error("Sign in to unfollow"); return; }
    if (following && !confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 2500);
      return;
    }
    setLoading(true);
    try {
      if (following) {
        await api.followers.unfollow(user.id, viewerId);
        setFollowing(false);
        onUnfollow(user.id);
      } else {
        await api.followers.follow(user.id, viewerId);
        setFollowing(true);
        toast.success("Followed");
      }
    } catch {
      toast.error("Action failed");
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.4) }}
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
    >
      <div
        className="relative flex-shrink-0 cursor-pointer"
        onClick={() => navigate(`/profile/${user.id}`)}
      >
        <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
          {user.avatar && !user.avatar.match(/^\p{Emoji}/u) ? (
            <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-base">
              {user.avatar?.match(/^\p{Emoji}/u) ? user.avatar : user.username[0]?.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => navigate(`/profile/${user.id}`)}
      >
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {user.displayName ?? user.username}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          @{user.username} · Lv {user.level}
        </p>
      </div>

      {viewerId && viewerId !== user.id && (
        <button
          onClick={handleToggle}
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold",
            "transition-all duration-200 flex-shrink-0 min-w-[88px] justify-center",
            confirm
              ? "bg-red-100 dark:bg-red-900/30 text-red-500"
              : following
              ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              : "bg-blue-500 text-white",
            "disabled:opacity-60"
          )}
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : confirm ? (
            "Unfollow?"
          ) : following ? (
            <>
              <UserCheck size={12} /> Following
            </>
          ) : (
            <>
              <UserPlus size={12} /> Follow
            </>
          )}
        </button>
      )}
    </motion.div>
  );
});

FollowingItem.displayName = "FollowingItem";

const PAGE_SIZE = 20;

export default function FollowingPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/profile/:userId/following");
  const userId = params?.userId ?? "";
  const viewerId = getStoredPlayerId() ?? "";

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [following, setFollowing] = useState<FollowEntry[]>([]);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    setError(false);
    api.followers.listFollowing(userId, viewerId || undefined)
      .then(data => {
        setFollowing(data);
        setIsLoading(false);
      })
      .catch(() => {
        setError(true);
        setIsLoading(false);
      });
  }, [userId, viewerId]);

  const filtered = useMemo(() => {
    if (!query.trim()) return following;
    const q = query.toLowerCase();
    return following.filter(
      (f) => f.username.toLowerCase().includes(q) || (f.displayName ?? "").toLowerCase().includes(q)
    );
  }, [following, query]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  useEffect(() => {
    if (!loaderRef.current || !hasMore) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setPage((p) => p + 1); },
      { threshold: 0.5 }
    );
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasMore]);

  const handleUnfollow = useCallback((id: string) => {
    setFollowing(prev => prev.filter(f => f.id !== id));
    toast.success("Unfollowed");
  }, []);

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(`/profile/${userId}`)}
            className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white">Following</h1>
            {!isLoading && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{following.length} accounts</p>
            )}
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search following…"
              className="w-full pl-9 pr-8 py-2.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 border border-transparent focus:border-blue-400 focus:outline-none transition-colors"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div>{Array.from({ length: 7 }).map((_, i) => <SkeletonItem key={i} />)}</div>
      ) : error ? (
        <div className="flex flex-col items-center py-20 text-center px-6">
          <span className="text-5xl mb-3">⚠️</span>
          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">Failed to load</p>
          <button
            onClick={() => {
              setError(false);
              setIsLoading(true);
              api.followers.listFollowing(userId, viewerId || undefined)
                .then(data => { setFollowing(data); setIsLoading(false); })
                .catch(() => { setError(true); setIsLoading(false); });
            }}
            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center px-6">
          <span className="text-5xl mb-3">🔍</span>
          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
            {query ? "No results" : "Not following anyone yet"}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {query ? "Try a different search" : "Find players to follow"}
          </p>
        </div>
      ) : (
        <>
          {visible.map((user, i) => (
            <FollowingItem key={user.id} user={user} index={i} viewerId={viewerId} onUnfollow={handleUnfollow} />
          ))}
          {hasMore && (
            <div ref={loaderRef} className="flex justify-center py-6">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
