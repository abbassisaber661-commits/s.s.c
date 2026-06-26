import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Wifi, Search, MessageSquare, Bell, Globe } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { useLocation } from "wouter";

import { useGame } from "@/contexts/GameContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { usePosts, useCreatePost, useLikePost } from "@/hooks/useCommunity";
import { SocialPostCard } from "@/components/social/SocialPostCard";
import { CreatePostModal, type CreatePostData } from "@/components/social/CreatePostModal";
import StoryBar from "@/components/social/StoryBar";
import FeaturedPlayers from "@/components/social/FeaturedPlayers";
import GuestBanner from "@/components/GuestBanner";
import Avatar from "@/components/Avatar";
import LanguageSelector from "@/components/LanguageSelector";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import type { Language } from "@/lib/i18n";

const PostSkeleton = () => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 animate-pulse border border-gray-100 dark:border-gray-800">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className="flex-1">
        <div className="h-3 w-28 bg-gray-300 dark:bg-gray-600 rounded mb-1" />
        <div className="h-2 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
    <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2" />
    <div className="h-3 w-4/5 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
    <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
  </div>
);

const FeedErrorBanner = ({ onRetry }: { onRetry: () => void }) => (
  <div className="p-6 text-center rounded-2xl bg-white dark:bg-gray-900 border border-red-100 dark:border-red-900/30">
    <p className="text-red-500 font-semibold mb-1">Unable to load feed</p>
    <p className="text-xs text-gray-400 mb-3">Check your connection and try again.</p>
    <button
      onClick={onRetry}
      className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors"
    >
      Retry
    </button>
  </div>
);

const CreatePostTrigger = ({ username, onOpen }: { username: string; onOpen: () => void }) => (
  <div
    onClick={onOpen}
    className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors shadow-sm"
  >
    <Avatar username={username} />
    <div className="flex-1 text-sm text-gray-400 dark:text-gray-500">What's on your mind, {username}?</div>
    <button className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold text-lg hover:bg-blue-600 transition-colors">
      +
    </button>
  </div>
);

export default function FeedPage() {
  const { username, isGuest, language, setLanguage, authUser } = useGame() as any;
  const { connected, pushNotifs } = useRealtime();
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [dmCount, setDmCount] = useState(0);

  const { ref, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = usePosts("fyp");

  const { mutate: createPost } = useCreatePost();
  const { mutate: likePost } = useLikePost();

  const playerId = getStoredPlayerId();

  // Load unread counts for nav badges
  useEffect(() => {
    if (!playerId) return;
    api.notifications.list(playerId, 20)
      .then(notifs => setNotifCount(notifs.filter(n => !n.read).length))
      .catch(() => {});
    api.messages.inbox(playerId)
      .then(msgs => setDmCount(msgs.filter((m: any) => !m.read && m.toId === playerId).length))
      .catch(() => {});
  }, [playerId]);

  // Bump notif count on live push
  useEffect(() => {
    if (pushNotifs.length > 0) setNotifCount(c => c + 1);
  }, [pushNotifs.length]);

  // Flatten posts safely
  const posts = useMemo(() => {
    return data?.pages?.flatMap((p) => p.data) ?? [];
  }, [data]);

  // Infinite scroll
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleCreate = useCallback(
    async (payload: CreatePostData): Promise<void> => {
      const pid = getStoredPlayerId();
      createPost({
        authorId: pid ?? undefined,
        username:  username || undefined,
        content:   payload.content,
        imageUrl:  payload.imageUrls?.[0],
        type: (payload.format as import("@/shared/community").PostType) || "text",
      });
      setIsOpen(false);
    },
    [createPost, username]
  );

  const handleLike = useCallback(
    (postId: string, liked: boolean) => {
      likePost({ postId, like: liked });
    },
    [likePost]
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">

      {/* ── Professional Top Navigation Bar ───────────────── */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="font-black text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent select-none">
              SkillLeague
            </span>
            <div className={`w-2 h-2 rounded-full ml-1 ${connected ? "bg-green-400" : "bg-red-400"}`} title={connected ? "Live" : "Offline"} />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1">

            {/* Search */}
            <button
              onClick={() => navigate("/search")}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Search"
            >
              <Search size={20} />
            </button>

            {/* Messages */}
            <button
              onClick={() => navigate("/messages")}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Messages"
            >
              <MessageSquare size={20} />
              {dmCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                  {dmCount > 9 ? "9+" : dmCount}
                </span>
              )}
            </button>

            {/* Notifications */}
            <button
              onClick={() => navigate("/notifications")}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {notifCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </button>

            {/* Language */}
            <div className="ml-1">
              <LanguageSelector
                current={(language as Language) ?? "en"}
                onChange={(lang: Language) => setLanguage(lang)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {isGuest && <GuestBanner />}

        {/* Stories */}
        <StoryBar />

        {/* Create post trigger */}
        <CreatePostTrigger username={username || "You"} onOpen={() => setIsOpen(true)} />

        {/* Featured Players */}
        <FeaturedPlayers />

        {/* Feed error — auto-retries are handled by React Query (retry:3);
            this button is shown only after all retries exhausted */}
        {isError && (
          <FeedErrorBanner onRetry={refetch} />
        )}

        {/* Loading skeletons */}
        {isLoading && !isError && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <PostSkeleton key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && posts.length === 0 && (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-semibold">No posts yet</p>
            <p className="text-sm mt-1">Be the first to share something!</p>
          </div>
        )}

        {/* Posts */}
        {!isLoading && (
          <AnimatePresence>
            {posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <SocialPostCard
                  post={post}
                  commentCount={post.replyCount || 0}
                  onLikeChange={handleLike}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={ref} className="h-6" />

        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <Loader2 className="animate-spin text-blue-500" />
          </div>
        )}

        {/* End of feed */}
        {!hasNextPage && posts.length > 0 && !isFetchingNextPage && (
          <p className="text-center text-xs text-gray-400 py-4">You're all caught up ✨</p>
        )}
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
