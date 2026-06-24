import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, Flame, TrendingUp, Zap, Sparkles } from "lucide-react";

import { useGame } from "@/contexts/GameContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { getSocket } from "@/lib/socket";
import GuestBanner from "@/components/GuestBanner";

import ProfileBar from "@/components/profile/ProfileBar";
import CreatePost from "@/components/social/CreatePost";
import FeaturedPlayers from "@/components/social/FeaturedPlayers";
import PostCard from "@/components/social/PostCard";

import {
  getCommunityPosts, addPost, createPost, getLikedPostIds,
  type CommunityPost, type PostType,
} from "@/lib/community";
import { checkPostSpam } from "@/lib/anti-cheat";
import { getCommentCounts } from "@/lib/comments";
import { api, getStoredPlayerId } from "@/lib/apiClient";

type FeedTab = "new" | "hot" | "trending";

const TABS: { id: FeedTab; label: string; icon: typeof Flame }[] = [
  { id: "new",      label: "New",      icon: Sparkles  },
  { id: "hot",      label: "Hot",      icon: Flame     },
  { id: "trending", label: "Trending", icon: TrendingUp },
];

function mapApiPost(p: any, likedIds: string[]): CommunityPost {
  return {
    id: p.id,
    authorId: p.authorId,
    authorName: p.username,
    authorLevel: p.level,
    authorFame: 0,
    content: p.content ?? "",
    imageUrl: p.imageUrl ?? undefined,
    type: (p.type as PostType) ?? "text",
    timestamp: new Date(p.createdAt).getTime(),
    likes: p.likes ?? 0,
    likedByMe: likedIds.includes(p.id),
    boosted: false,
    boostExpiry: null,
  };
}

export default function Community() {
  const { username, level, fame, lastPostTime, setLastPostTime, addFame, isGuest } = useGame();
  const { subscribeCommunity, connected } = useRealtime();
  const usernameRef = useRef(username);
  useEffect(() => { usernameRef.current = username; }, [username]);

  const [posts, setPosts]                 = useState<CommunityPost[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [tab, setTab]                     = useState<FeedTab>("new");
  const [liveFlash, setLiveFlash]         = useState(false);
  const [loading, setLoading]             = useState(true);

  const currentPlayerId = getStoredPlayerId() ?? undefined;

  useEffect(() => {
    subscribeCommunity();

    api.community.posts(50)
      .then(apiPosts => {
        const likedIds = getLikedPostIds();
        const mapped = apiPosts.map(p => mapApiPost(p, likedIds));
        setPosts(mapped);
        const counts: Record<string, number> = {};
        apiPosts.forEach(p => { counts[p.id] = p.replies ?? 0; });
        setCommentCounts(counts);
      })
      .catch(() => {
        setPosts(getCommunityPosts());
        setCommentCounts(getCommentCounts());
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const s = getSocket();

    s.on("community:new_post", (post: any) => {
      const postAuthor = post.authorId ?? post.username;
      if (postAuthor && postAuthor === usernameRef.current) return;

      const likedIds = getLikedPostIds();
      const localPost: CommunityPost = mapApiPost(post, likedIds);
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
    const withImage: CommunityPost = imageUrl ? { ...post, imageUrl } : post;
    const updated = addPost(withImage);
    setPosts(prev => [withImage, ...prev.filter(p => p.id !== withImage.id)]);
    setLastPostTime(Date.now());
    addFame(2);

    getSocket().emit("community:post", {
      authorId: username,
      username,
      level,
      content: post.content,
      imageUrl: imageUrl ?? null,
      type: post.type,
    });
  }

  function handleLikeChange(postId: string, liked: boolean) {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, likedByMe: liked, likes: liked ? p.likes + 1 : Math.max(0, p.likes - 1) } : p
    ));
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

      {/* ── Body ── */}
      <div className="max-w-md mx-auto pt-4 space-y-5">

        {isGuest && (
          <div className="px-4">
            <GuestBanner />
          </div>
        )}

        <CreatePost onPost={handleNewPost} />
        <FeaturedPlayers />

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

        <div className="px-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : tab === "trending" && sorted.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-2">🔥</div>
              <p className="text-sm">No trending posts in the last 24 hours</p>
            </div>
          ) : (
            sorted.map((post, idx) => (
              <PostCard
                key={post.id}
                post={post}
                commentCount={commentCounts[post.id] ?? 0}
                currentUser={username}
                currentLevel={level}
                currentPlayerId={currentPlayerId}
                onLikeChange={handleLikeChange}
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
