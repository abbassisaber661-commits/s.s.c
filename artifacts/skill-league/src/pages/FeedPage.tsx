/**
 * FeedPage — Unified Social Feed
 * ────────────────────────────────
 * 4 feed tabs: For You / Following / Trending / Latest
 * Infinite scroll, skeleton loading, real-time updates, algorithm-ready.
 */
import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Users, Flame, Clock, Plus, Wifi, RefreshCcw, Loader2, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { useGame } from "@/contexts/GameContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { getSocket } from "@/lib/socket";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import {
  getCommunityPosts, addPost, createPost, getLikedPostIds,
  type CommunityPost, type PostType,
} from "@/lib/community";
import { rankPosts, type FeedType, extractTrendingHashtags } from "@/lib/feedAlgorithm";
import { getCommentCounts } from "@/lib/comments";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

import { SocialPostCard } from "@/components/social/SocialPostCard";
import { CreatePostModal, type CreatePostData } from "@/components/social/CreatePostModal";
import StoryBar from "@/components/social/StoryBar";
import FeaturedPlayers from "@/components/social/FeaturedPlayers";
import GuestBanner from "@/components/GuestBanner";
import Avatar from "@/components/Avatar";

const PAGE_SIZE = 10;

type Tab = { id: FeedType; label: string; icon: React.ElementType };

const TABS: Tab[] = [
  { id: "fyp",       label: "For You",   icon: Sparkles  },
  { id: "following", label: "Following", icon: Users     },
  { id: "trending",  label: "Trending",  icon: Flame     },
  { id: "latest",    label: "Latest",    icon: Clock     },
];

// ── Skeleton ──────────────────────────────────────────────────────
const PostSkeleton = memo(() => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-3 animate-pulse">
    <div className="flex items-center gap-2.5">
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className="space-y-1.5">
        <div className="h-3.5 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-2.5 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>
    </div>
    <div className="space-y-1.5">
      <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded" />
      <div className="h-3 w-3/4 bg-gray-100 dark:bg-gray-800 rounded" />
    </div>
    <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl" />
    <div className="flex gap-4">
      <div className="h-8 flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      <div className="h-8 flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      <div className="h-8 flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl" />
    </div>
  </div>
));
PostSkeleton.displayName = "PostSkeleton";

// ── Trending hashtags strip ───────────────────────────────────────
const TrendingStrip = memo(({ posts }: { posts: CommunityPost[] }) => {
  const tags = extractTrendingHashtags(posts).slice(0, 8);
  if (!tags.length) return null;
  return (
    <div className="px-4 py-2">
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Trending</p>
      <div className="flex gap-1.5 flex-wrap">
        {tags.map(({ tag }) => (
          <span key={tag} className="text-xs px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full font-semibold">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
});
TrendingStrip.displayName = "TrendingStrip";

// ── Create post trigger ───────────────────────────────────────────
const CreatePostTrigger = memo(({ username, onOpen }: { username: string; onOpen(): void }) => (
  <div
    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
    onClick={onOpen}
  >
    <Avatar username={username} />
    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-400">
      What's on your mind?
    </div>
    <button
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      className="w-9 h-9 rounded-xl bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center flex-shrink-0 transition-colors"
    >
      <Plus size={18} />
    </button>
  </div>
));
CreatePostTrigger.displayName = "CreatePostTrigger";

// ── Main page ─────────────────────────────────────────────────────
function mapApiPost(p: any, likedIds: string[]): CommunityPost {
  return {
    id:         p.id,
    authorId:   p.authorId,
    authorName: p.username,
    authorLevel: p.level,
    authorFame:  0,
    content:    p.content ?? "",
    imageUrl:   p.imageUrl ?? undefined,
    type:       (p.type as PostType) ?? "text",
    timestamp:  new Date(p.createdAt).getTime(),
    likes:      p.likes ?? 0,
    likedByMe:  likedIds.includes(p.id),
    boosted:    false,
    boostExpiry: null,
  };
}

export default function FeedPage() {
  const gameCtx = useGame() as any;
  const { username, level, fame, isGuest } = gameCtx;
  const setLastPostTime = (gameCtx.setLastPostTime ?? (() => {})) as (t: number) => void;
  const addFame         = (gameCtx.addFame ?? (() => {})) as (n: number) => void;
  const { subscribeCommunity, connected } = useRealtime();
  const usernameRef = useRef(username);
  useEffect(() => { usernameRef.current = username; }, [username]);

  const [tab,           setTab]           = useState<FeedType>("fyp");
  const [allPosts,      setAllPosts]      = useState<CommunityPost[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [loading,       setLoading]       = useState(true);
  const [page,          setPage]          = useState(1);
  const [liveFlash,     setLiveFlash]     = useState(false);
  const [isCreateOpen,  setIsCreateOpen]  = useState(false);
  const [newPostCount,  setNewPostCount]  = useState(0);
  const playerId = getStoredPlayerId() ?? undefined;

  // Initial load
  useEffect(() => {
    subscribeCommunity();
    setLoading(true);
    api.community.posts(50)
      .then((apiPosts) => {
        const likedIds = getLikedPostIds();
        const mapped = apiPosts.map((p: any) => mapApiPost(p, likedIds));
        setAllPosts(mapped);
        const counts: Record<string, number> = {};
        apiPosts.forEach((p: any) => { counts[p.id] = p.replies ?? 0; });
        setCommentCounts(counts);
      })
      .catch(() => {
        setAllPosts(getCommunityPosts());
        setCommentCounts(getCommentCounts());
      })
      .finally(() => setLoading(false));
  }, []);

  // Real-time
  useEffect(() => {
    const s = getSocket();
    s.on("community:new_post", (post: any) => {
      const me = usernameRef.current;
      if (post.authorId === me || post.username === me) return;
      const likedIds = getLikedPostIds();
      setAllPosts((prev) => [mapApiPost(post, likedIds), ...prev]);
      setNewPostCount((n) => n + 1);
      setLiveFlash(true);
      setTimeout(() => setLiveFlash(false), 3000);
    });
    s.on("community:like_update", ({ postId, liked }: any) => {
      setAllPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, likes: Math.max(0, p.likes + (liked ? 1 : -1)) } : p
        )
      );
    });
    return () => { s.off("community:new_post"); s.off("community:like_update"); };
  }, []);

  // Tab change resets page
  useEffect(() => { setPage(1); }, [tab]);

  // Feed computation
  const ranked = rankPosts(allPosts, tab);
  const visible = ranked.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < ranked.length;

  // Infinite scroll
  const { sentinelRef } = useInfiniteScroll({
    onLoadMore:  () => setPage((p) => p + 1),
    hasNextPage: hasMore,
    isFetching:  false,
  });

  // Post creation
  const handleCreate = useCallback(async (data: CreatePostData) => {
    const socket = getSocket();
    const post = createPost(username, level, fame, data.content, "text");
    const withImage: CommunityPost = data.imageUrls[0]
      ? { ...post, imageUrl: data.imageUrls[0] }
      : post;
    addPost(withImage);
    setAllPosts((prev) => [withImage, ...prev]);
    setLastPostTime(Date.now());
    addFame(2);
    socket.emit("community:post", {
      authorId: username, username, level,
      content: post.content,
      imageUrl: data.imageUrls[0] ?? null,
      type: post.type,
    });
    setTab("latest");
  }, [username, level, fame, setLastPostTime, addFame]);

  const handleLikeChange = useCallback((postId: string, liked: boolean) => {
    setAllPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, likedByMe: liked, likes: liked ? p.likes + 1 : Math.max(0, p.likes - 1) } : p
      )
    );
  }, []);

  const handleCommentUpdate = useCallback((postId: string, delta: number) => {
    setCommentCounts((prev) => ({ ...prev, [postId]: (prev[postId] ?? 0) + delta }));
  }, []);

  const handleDelete = useCallback((postId: string) => {
    setAllPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        {/* Platform bar */}
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            SkillLeague
          </h1>
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {liveFlash && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1 text-[11px] text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                  Live
                </motion.div>
              )}
            </AnimatePresence>
            <div className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full ${connected ? "bg-green-50 dark:bg-green-900/20 text-green-500" : "bg-gray-100 dark:bg-gray-800 text-gray-400"}`}>
              <Wifi size={11} />
              {connected ? "Live" : "Offline"}
            </div>
          </div>
        </div>

        {/* Feed tabs */}
        <div className="flex overflow-x-auto scrollbar-none px-1 pb-0">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap",
                  "transition-colors flex-shrink-0",
                  active ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                <Icon size={13} />
                {t.label}
                {active && (
                  <motion.div
                    layoutId="feed-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {isGuest && <GuestBanner />}

        {/* Stories */}
        <StoryBar />

        {/* New posts banner */}
        <AnimatePresence>
          {newPostCount > 0 && (
            <motion.button
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              onClick={() => { setNewPostCount(0); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-2xl transition-colors"
            >
              <RefreshCcw size={14} />
              {newPostCount} new post{newPostCount !== 1 ? "s" : ""} — tap to refresh
            </motion.button>
          )}
        </AnimatePresence>

        {/* Create post trigger */}
        <CreatePostTrigger username={username} onOpen={() => setIsCreateOpen(true)} />

        {/* Trending hashtags (only on trending tab) */}
        {tab === "trending" && <TrendingStrip posts={allPosts} />}

        {/* Featured players */}
        <FeaturedPlayers />

        {/* Post list */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {[1, 2, 3].map((i) => <PostSkeleton key={i} />)}
            </motion.div>
          ) : visible.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-20 text-center"
            >
              <TrendingUp size={48} className="text-gray-200 dark:text-gray-700 mb-3" />
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                {tab === "trending" ? "No trending posts in the last 24h" : "No posts yet"}
              </p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="mt-4 px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Be the first to post
              </button>
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {visible.map((post) => (
                <SocialPostCard
                  key={post.id}
                  post={post}
                  commentCount={commentCounts[post.id] ?? 0}
                  onLikeChange={handleLikeChange}
                  onCommentCountChange={handleCommentUpdate}
                  onDelete={handleDelete}
                />
              ))}

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} />

              {hasMore && (
                <div className="flex justify-center py-4">
                  <Loader2 size={22} className="animate-spin text-gray-400" />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create post modal */}
      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}

// Inline cn since we're in this file
function cn(...args: (string | boolean | undefined)[]): string {
  return args.filter(Boolean).join(" ");
}
