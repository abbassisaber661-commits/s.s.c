import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, Flame, TrendingUp, Zap, Sparkles } from "lucide-react";

import { useGame } from "@/contexts/GameContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { getSocket } from "@/lib/socket";
import GuestBanner from "@/components/GuestBanner";

import ProfileBar from "@/components/social/ProfileBar";
import CreatePost from "@/components/social/CreatePost";
import FeaturedPlayers from "@/components/social/FeaturedPlayers";
import PostCard from "@/components/social/PostCard";

import {
  getCommunityPosts, addPost, createPost,
  type CommunityPost,
} from "@/lib/community";
import { checkPostSpam } from "@/lib/anti-cheat";
import {
  getCommentCounts, getAllReactions,
  type PostReactions, type ReactionType,
} from "@/lib/comments";

type FeedTab = "new" | "hot" | "trending";

const TABS: { id: FeedTab; label: string; icon: typeof Flame }[] = [
  { id: "new",      label: "New",      icon: Sparkles  },
  { id: "hot",      label: "Hot",      icon: Flame     },
  { id: "trending", label: "Trending", icon: TrendingUp },
];

function emptyReactions(postId: string): PostReactions {
  return {
    postId,
    counts: { "❤️": 0, "🔥": 0, "😂": 0, "💪": 0, "🤯": 0, "👏": 0, "👍": 0 } as Record<ReactionType, number>,
    mine: null,
  };
}

export default function Community() {
  const { username, level, fame, lastPostTime, setLastPostTime, addFame, isGuest } = useGame();
  const { subscribeCommunity, connected } = useRealtime();

  const [posts, setPosts]               = useState<CommunityPost[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [reactions, setReactions]       = useState<Record<string, PostReactions>>({});
  const [tab, setTab]                   = useState<FeedTab>("new");
  const [liveFlash, setLiveFlash]       = useState(false);

  useEffect(() => {
    setPosts(getCommunityPosts());
    setCommentCounts(getCommentCounts());
    setReactions(getAllReactions());
    subscribeCommunity();
  }, []);

  useEffect(() => {
    const s = getSocket();

    s.on("community:new_post", (post: any) => {
      const localPost: CommunityPost = {
        id: post.id,
        authorId: post.authorId,
        authorName: post.username ?? post.authorName ?? "Player",
        authorLevel: post.level ?? 1,
        authorFame: post.authorFame ?? 0,
        content: post.content,
        type: post.type ?? "text",
        likes: 0,
        likedByMe: false,
        boosted: false,
        boostExpiry: null,
        timestamp: post.createdAt ? new Date(post.createdAt).getTime() : Date.now(),
      };
      setPosts(prev => [localPost, ...prev]);
      setLiveFlash(true);
      setTimeout(() => setLiveFlash(false), 2500);
    });

    s.on("community:like_update", (data: { postId: string; liked: boolean }) => {
      setPosts(prev =>
        prev.map(p =>
          p.id === data.postId
            ? { ...p, likes: Math.max(0, p.likes + (data.liked ? 1 : -1)) }
            : p,
        ),
      );
    });

    return () => {
      s.off("community:new_post");
      s.off("community:like_update");
    };
  }, []);

  function handleNewPost(content: string, imageUrl?: string) {
    const check = checkPostSpam(content, lastPostTime);
    if (check.spam) return;

    const post = createPost(username, level, fame, content, "text");
    const withImage = imageUrl ? { ...post, imageUrl } : post;
    const updated = addPost(withImage as CommunityPost);
    setPosts(updated);
    setLastPostTime(Date.now());
    addFame(2);

    getSocket().emit("community:post", {
      authorId: username,
      username,
      level,
      content: post.content,
      type: post.type,
    });
  }

  function handleReactionChange(postId: string, updated: PostReactions) {
    setReactions(prev => ({ ...prev, [postId]: updated }));
    if (updated.mine) addFame(1);
  }

  function handleCommentCountChange(postId: string, delta: number) {
    setCommentCounts(prev => ({ ...prev, [postId]: (prev[postId] ?? 0) + delta }));
  }

  const now = Date.now();

  const sorted: CommunityPost[] = (() => {
    switch (tab) {
      case "hot":
        return [...posts].sort((a, b) => {
          if (a.boosted && !b.boosted) return -1;
          if (!a.boosted && b.boosted) return 1;
          return b.likes - a.likes;
        });
      case "trending":
        return [...posts]
          .filter(p => p.timestamp > now - 24 * 3_600_000)
          .sort((a, b) =>
            (b.likes * 2 + (b.timestamp > now - 3_600_000 ? 5 : 0)) -
            (a.likes * 2 + (a.timestamp > now - 3_600_000 ? 5 : 0)),
          );
      default:
        return [...posts].sort((a, b) => b.timestamp - a.timestamp);
    }
  })();

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <ProfileBar />

        {/* Tab bar */}
        <div className="flex items-center gap-1.5 px-4 py-2">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  tab === t.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground hover:bg-card/80"
                }`}
              >
                <Icon size={11} />
                {t.label}
              </button>
            );
          })}

          <div className="flex-1" />

          {/* Live indicator */}
          <AnimatePresence>
            {liveFlash && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-[11px] text-green-400 bg-green-400/10 px-2 py-1 rounded-full"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                New post!
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full ${
              connected ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground"
            }`}
          >
            <Wifi className="w-3 h-3" />
            {connected ? "Live" : "Offline"}
          </div>
        </div>
      </div>

      {/* ── Page body ── */}
      <div className="max-w-md mx-auto pt-4 space-y-5">

        {isGuest && (
          <div className="px-4">
            <GuestBanner />
          </div>
        )}

        {/* Create post */}
        <CreatePost onPost={handleNewPost} />

        {/* Featured Players */}
        <FeaturedPlayers />

        {/* Divider */}
        <div className="px-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-muted-foreground font-bold flex items-center gap-1">
              <Zap className="w-3 h-3 text-primary" />
              {tab === "trending" ? `${sorted.length} trending` : `${posts.length} posts`}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </div>

        {/* Feed */}
        <div className="px-4 space-y-3">
          {tab === "trending" && sorted.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-2">🔥</div>
              <p className="text-sm">No trending posts in the last 24 hours</p>
            </div>
          ) : (
            sorted.map((post, idx) => (
              <PostCard
                key={post.id}
                post={post}
                reactions={reactions[post.id] ?? emptyReactions(post.id)}
                commentCount={commentCounts[post.id] ?? 0}
                currentUser={username}
                currentLevel={level}
                onReactionChange={handleReactionChange}
                onCommentCountChange={handleCommentCountChange}
                index={idx}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
