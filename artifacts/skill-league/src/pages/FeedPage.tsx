import React, { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Users, Flame, Clock, Loader2, Wifi } from "lucide-react";
import { useInView } from "react-intersection-observer";

import { useGame } from "@/contexts/GameContext";
import { useRealtime } from "@/contexts/RealtimeContext";

import { usePosts, useCreatePost, useLikePost } from "@/hooks/useCommunity";

import { SocialPostCard } from "@/components/social/SocialPostCard";
import { CreatePostModal, type CreatePostData } from "@/components/social/CreatePostModal";
import StoryBar from "@/components/social/StoryBar";
import FeaturedPlayers from "@/components/social/FeaturedPlayers";
import GuestBanner from "@/components/GuestBanner";
import Avatar from "@/components/Avatar";

type FeedType = "fyp" | "following" | "trending" | "latest";

const TABS: { id: FeedType; label: string; icon: React.ElementType }[] = [
  { id: "fyp", label: "For You", icon: Sparkles },
  { id: "following", label: "Following", icon: Users },
  { id: "trending", label: "Trending", icon: Flame },
  { id: "latest", label: "Latest", icon: Clock },
];

const PostSkeleton = () => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 animate-pulse border border-gray-100 dark:border-gray-800">
    <div className="h-3 w-32 bg-gray-300 rounded mb-2" />
    <div className="h-3 w-24 bg-gray-200 rounded mb-4" />
    <div className="h-40 bg-gray-200 rounded-xl" />
  </div>
);

const CreatePostTrigger = ({ username, onOpen }: { username: string; onOpen: () => void }) => (
  <div
    onClick={onOpen}
    className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-gray-900 border cursor-pointer"
  >
    <Avatar username={username} />
    <div className="flex-1 text-sm text-gray-400">What’s on your mind?</div>
    <button className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center">
      +
    </button>
  </div>
);

export default function FeedPage() {
  const { username, isGuest } = useGame() as any;
  const { connected } = useRealtime();

  const [tab, setTab] = useState<FeedType>("fyp");
  const [isOpen, setIsOpen] = useState(false);

  const { ref, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = usePosts(tab);

  const { mutate: createPost } = useCreatePost();
  const { mutate: likePost } = useLikePost();

  // flatten safely
  const posts = useMemo(() => {
    return data?.pages?.flatMap((p) => p.data) ?? [];
  }, [data]);

  // infinite scroll
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleCreate = useCallback(
    async (payload: CreatePostData): Promise<void> => {
      createPost({
        content: payload.content,
        imageUrls: payload.imageUrls,
        type: (payload.format as import("@/shared/community").PostType) || "text",
      });

      setIsOpen(false);
      setTab("latest");
    },
    [createPost]
  );

  const handleLike = useCallback(
    (postId: string, liked: boolean) => {
      likePost({ postId, like: liked });
    },
    [likePost]
  );

  if (isError) {
    return (
      <div className="p-4 text-center text-red-500">
        Failed to load feed
        <button
          onClick={() => refetch()}
          className="block mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b">
        <div className="flex justify-between px-4 py-3">
          <h1 className="font-bold text-blue-600">SkillLeague</h1>

          <div className="flex items-center gap-2 text-xs">
            <Wifi size={14} className={connected ? "text-green-500" : "text-red-500"} />
            {connected ? "Live" : "Offline"}
          </div>
        </div>

        <div className="flex overflow-x-auto px-2 gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1 rounded-lg text-sm ${
                tab === t.id ? "bg-blue-500 text-white" : "text-gray-500"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {isGuest && <GuestBanner />}
        <StoryBar />

        <CreatePostTrigger username={username} onOpen={() => setIsOpen(true)} />
        <FeaturedPlayers />

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <PostSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            <AnimatePresence>
              {posts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <SocialPostCard
                    post={post}
                    commentCount={post.replyCount || 0}
                    onLikeChange={handleLike}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            <div ref={ref} className="h-6" />

            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-blue-500" />
              </div>
            )}
          </>
        )}
      </div>

      <CreatePostModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}