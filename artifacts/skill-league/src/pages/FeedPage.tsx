import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Search, MessageCircle, Bell, Users, User, Menu } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { useLocation } from "wouter";

import { useGame } from "@/contexts/GameContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { usePosts, useCreatePost, useLikePost } from "@/hooks/useCommunity";
import { SocialPostCard } from "@/components/social/SocialPostCard";
import { CommentsSheet } from "@/components/social/CommentsSheet";
import { CreatePostModal, type CreatePostData } from "@/components/social/CreatePostModal";
import StoryBar from "@/components/social/StoryBar";
import FeaturedPlayers from "@/components/social/FeaturedPlayers";
import GuestBanner from "@/components/GuestBanner";
import Avatar from "@/components/Avatar";
import { api, getStoredPlayerId } from "@/lib/apiClient";

const PostSkeleton = () => (
  <div className="bg-white rounded-2xl p-4 animate-pulse border border-[#E5E5E5] shadow-sm">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-full bg-[#F5F5F7]" />
      <div className="flex-1">
        <div className="h-3 w-28 bg-[#E5E5E5] rounded mb-1" />
        <div className="h-2 w-20 bg-[#F5F5F7] rounded" />
      </div>
    </div>
    <div className="h-3 w-full bg-[#F5F5F7] rounded mb-2" />
    <div className="h-3 w-4/5 bg-[#F5F5F7] rounded mb-4" />
    <div className="h-40 bg-[#F5F5F7] rounded-xl" />
  </div>
);

const FeedErrorBanner = ({ onRetry }: { onRetry: () => void }) => (
  <div className="p-6 text-center rounded-2xl bg-white border border-[#E5E5E5] shadow-sm">
    <p className="text-red-500 font-semibold mb-1">Unable to load feed</p>
    <p className="text-xs text-[#666666] mb-3">Check your connection and try again.</p>
    <button
      onClick={onRetry}
      className="px-4 py-2 bg-[#FFD60A] text-black rounded-xl text-sm font-semibold hover:bg-[#F5C800] transition-colors"
    >
      Retry
    </button>
  </div>
);

const CreatePostTrigger = ({ username, onOpen }: { username: string; onOpen: () => void }) => (
  <div
    onClick={onOpen}
    className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#E5E5E5] cursor-pointer hover:bg-[#F5F5F7] transition-colors shadow-sm"
  >
    <Avatar username={username} />
    <div className="flex-1 text-sm text-[#666666]">What's on your mind, {username}?</div>
    <button className="w-9 h-9 rounded-xl bg-[#FFD60A] text-black flex items-center justify-center font-bold text-lg hover:bg-[#F5C800] transition-colors">
      +
    </button>
  </div>
);

export default function FeedPage() {
  const { username, isGuest, authUser } = useGame() as any;
  const { connected, pushNotifs } = useRealtime();
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [dmCount, setDmCount] = useState(0);
  const [openCommentPostId, setOpenCommentPostId] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

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

  useEffect(() => {
    if (!playerId) return;
    api.notifications.list(playerId, 20)
      .then(notifs => setNotifCount(notifs.filter(n => !n.read).length))
      .catch(() => {});
    api.messages.inbox(playerId)
      .then(msgs => setDmCount(msgs.filter((m: any) => !m.read && m.toId === playerId).length))
      .catch(() => {});
  }, [playerId]);

  useEffect(() => {
    if (pushNotifs.length > 0) setNotifCount(c => c + 1);
  }, [pushNotifs.length]);

  const posts = useMemo(() => {
    return data?.pages?.flatMap((p) => p.data) ?? [];
  }, [data]);

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
    <div className="min-h-screen bg-[#F5F5F7] pb-24">

      {/* ── Social Top Bar ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#E5E5E5] shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center px-3 py-2.5 gap-1">

          {/* 🔔 Notifications */}
          <button
            onClick={() => navigate("/notifications")}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center text-[#444444] hover:bg-[#F5F5F7] transition-colors"
            aria-label="Notifications"
          >
            <Bell size={19} />
            {notifCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </button>

          {/* ✉️ Messages */}
          <button
            onClick={() => navigate("/messages")}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center text-[#444444] hover:bg-[#F5F5F7] transition-colors"
            aria-label="Messages"
          >
            <MessageCircle size={19} />
            {dmCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                {dmCount > 9 ? "9+" : dmCount}
              </span>
            )}
          </button>

          {/* Friend shortcut */}
          <button
            onClick={() => navigate("/friends")}
            className="px-3 h-8 rounded-xl flex items-center gap-1.5 text-[#444444] text-xs font-semibold hover:bg-[#F5F5F7] transition-colors"
            aria-label="Friends"
          >
            <Users size={15} />
            <span>Friend</span>
          </button>

          {/* 🔎 Search */}
          <button
            onClick={() => navigate("/search")}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#444444] hover:bg-[#F5F5F7] transition-colors"
            aria-label="Search"
          >
            <Search size={19} />
          </button>

          {/* ── "social" label — centered ── */}
          <span className="flex-1 text-center text-sm font-black tracking-tight text-[#111111] select-none pointer-events-none">
            social
          </span>

          {/* 👤 Profile */}
          <button
            onClick={() => navigate("/profile")}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#444444] hover:bg-[#F5F5F7] transition-colors"
            aria-label="Profile"
          >
            <User size={19} />
          </button>

          {/* ☰ Settings */}
          <button
            onClick={() => navigate("/settings")}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#444444] hover:bg-[#F5F5F7] transition-colors"
            aria-label="Settings"
          >
            <Menu size={19} />
          </button>

        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {isGuest && <GuestBanner />}

        {/* Stories */}
        <StoryBar />

        {/* Create post trigger */}
        <CreatePostTrigger username={username || "You"} onOpen={() => setIsOpen(true)} />

        {/* Featured Players */}
        <FeaturedPlayers />

        {isError && (
          <FeedErrorBanner onRetry={refetch} />
        )}

        {isLoading && !isError && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <PostSkeleton key={i} />)}
          </div>
        )}

        {!isLoading && !isError && posts.length === 0 && (
          <div className="text-center py-16 text-[#666666]">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-semibold text-[#111111]">No posts yet</p>
            <p className="text-sm mt-1">Be the first to share something!</p>
          </div>
        )}

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
                  commentCount={commentCounts[post.id] ?? post.replyCount ?? 0}
                  onLikeChange={handleLike}
                  onCommentClick={(postId) => setOpenCommentPostId(postId)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        <div ref={ref} className="h-6" />

        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <Loader2 className="animate-spin text-[#FFD60A]" />
          </div>
        )}

        {!hasNextPage && posts.length > 0 && !isFetchingNextPage && (
          <p className="text-center text-xs text-[#666666] py-4">You're all caught up ✨</p>
        )}
      </div>

      <CreatePostModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={handleCreate}
      />

      {openCommentPostId && (
        <CommentsSheet
          postId={openCommentPostId}
          isOpen={!!openCommentPostId}
          onClose={() => setOpenCommentPostId(null)}
          initialCount={
            commentCounts[openCommentPostId] ??
            (posts.find((p) => p.id === openCommentPostId)?.replyCount ?? 0)
          }
          onCountChange={(delta) => {
            setCommentCounts((prev) => ({
              ...prev,
              [openCommentPostId]: (prev[openCommentPostId] ?? posts.find((p) => p.id === openCommentPostId)?.replyCount ?? 0) + delta,
            }));
          }}
        />
      )}
    </div>
  );
}
