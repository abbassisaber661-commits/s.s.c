import React, { useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Zap, Crown, Search, Hash, Bell } from "lucide-react";

import { useGame } from "@/contexts/GameContext";
import { useSocialFeed } from "@/hooks/social/useSocialFeed";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import GuestBanner from "@/components/GuestBanner";
import Avatar from "@/components/Avatar";
import StoryBar from "@/components/social/StoryBar";
import CreatePost from "@/components/social/CreatePost";
import FeaturedPlayers from "@/components/social/FeaturedPlayers";
import PostCard from "@/components/social/PostCard";
import { SectionHeader, HashtagPill } from "@/components/social/SocialComponents";

export default function SocialPage() {
  const [, navigate] = useLocation();
  const { username, level, isGuest } = useGame();

  const {
    posts,
    trendingPosts,
    commentCounts,
    trendingHashtags,
    notifBadge,
    liveFlash,
    createPost,
    handleLike,
    handleCommentUpdate,
    setNotifBadge,
  } = useSocialFeed();

  const currentPlayerId = undefined;

  // ================= MEMO =================
  const feedPosts = useMemo(() => posts, [posts]);
  const hotPosts = useMemo(() => trendingPosts, [trendingPosts]);

  // ================= NAVIGATION =================
  const go = useCallback((path: string) => navigate(path), [navigate]);

  const goToNotifications = useCallback(() => {
    setNotifBadge(0);
    navigate("/notifications");
  }, [navigate, setNotifBadge]);

  const goToHashtag = useCallback(
    (tag: string) => {
      const clean = tag.replace(/^#/, "");
      navigate(`/hashtag/${clean}`);
    },
    [navigate]
  );

  // ================= HEADER =================
  const Header = useMemo(
    () => (
      <div className="sticky top-0 z-20 flex items-center gap-2 px-3 py-2 bg-white border-b">
        <h1 className="flex-1 font-bold">🌍 Community</h1>

        <AnimatePresence>
          {liveFlash && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs px-2 py-1 bg-green-100 rounded-full"
            >
              New
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={() => go("/search")}>
          <Search />
        </button>

        <button onClick={goToNotifications} className="relative">
          <Bell />
          {notifBadge > 0 && (
            <span className="absolute -top-2 -right-2 text-xs bg-red-500 text-white rounded-full px-1">
              {notifBadge}
            </span>
          )}
        </button>

        <button onClick={() => go("/trending")}>
          <TrendingUp />
        </button>

        <button onClick={() => go("/profile")}>
          <Avatar username={username} size="sm" />
        </button>

        <LanguageSwitcher compact />
      </div>
    ),
    [liveFlash, notifBadge, username, navigate, goToNotifications]
  );

  // ================= RENDER =================
  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {Header}

      <div className="max-w-md mx-auto space-y-3 pt-3">
        {/* STORY */}
        <StoryBar />

        {/* GUEST */}
        {isGuest && <GuestBanner />}

        {/* CREATE POST */}
        <CreatePost
          username={username}
          onPost={createPost}
          onAvatarClick={() => go("/profile")}
        />

        {/* HASHTAGS */}
        {trendingHashtags.length > 0 && (
          <section>
            <SectionHeader icon={<Hash />} label="Trending Hashtags" />
            <div className="flex gap-2 overflow-x-auto px-3">
              {trendingHashtags.map((h) => (
                <HashtagPill
                  key={h.tag}
                  tag={h.tag}
                  count={h.postCount}
                  onClick={() => goToHashtag(h.tag)}
                />
              ))}
            </div>
          </section>
        )}

        {/* TRENDING */}
        <section>
          <SectionHeader icon={<TrendingUp />} label="Trending" />

          {hotPosts.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              لا توجد منشورات رائجة حالياً
            </p>
          ) : (
            <div className="space-y-3 px-3">
              {hotPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  commentCount={commentCounts[post.id] ?? 0}
                  currentUser={username}
                  currentLevel={level}
                  currentPlayerId={currentPlayerId}
                  onLikeChange={handleLike}
                  onCommentCountChange={handleCommentUpdate}
                />
              ))}
            </div>
          )}
        </section>

        {/* FEED */}
        <section>
          <SectionHeader icon={<Zap />} label="Feed" />

          {feedPosts.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              لا توجد منشورات بعد، كن أول من ينشر!
            </p>
          ) : (
            <div className="space-y-3 px-3">
              {feedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  commentCount={commentCounts[post.id] ?? 0}
                  currentUser={username}
                  currentLevel={level}
                  currentPlayerId={currentPlayerId}
                  onLikeChange={handleLike}
                  onCommentCountChange={handleCommentUpdate}
                />
              ))}
            </div>
          )}
        </section>

        {/* TOP PLAYERS */}
        <section>
          <SectionHeader icon={<Crown />} label="Top Players" />
          <FeaturedPlayers />
        </section>
      </div>
    </div>
  );
}