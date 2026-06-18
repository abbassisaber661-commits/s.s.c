import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, TrendingUp, Zap, Crown, Search, Hash, Bell } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLocation } from "wouter";

import { useGame } from "@/contexts/GameContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { getSocket } from "@/lib/socket";
import { api, getStoredPlayerId, type ApiNotification } from "@/lib/apiClient";
import GuestBanner from "@/components/GuestBanner";
import Avatar from "@/components/Avatar";

import StoryBar from "@/components/social/StoryBar";
import CreatePost from "@/components/social/CreatePost";
import FeaturedPlayers from "@/components/social/FeaturedPlayers";
import PostCard from "@/components/social/PostCard";

import {
  getCommunityPosts, saveCommunityPosts, addPost, createPost, isUserPost, getLikedPostIds,
  type CommunityPost, type PostType,
} from "@/lib/community";
import { checkPostSpam } from "@/lib/anti-cheat";
import { getCommentCounts } from "@/lib/comments";
import { seedPostMeta } from "@/lib/postMeta";

const TRENDING_WINDOW_MS = 24 * 3_600_000;

function SectionHeader({ icon, label, action }: { icon: React.ReactNode; label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-4 mb-3">
      {icon}
      <span className="text-sm font-black uppercase tracking-wider text-[#050505]">{label}</span>
      <div className="flex-1 h-px bg-[#E4E6EB]" />
      {action}
    </div>
  );
}

function HashtagPill({ tag, count, onClick }: { tag: string; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 hover:bg-purple-100"
      style={{ background: "#F0E9FF", color: "#8B5CF6", border: "1px solid #DDD6FE" }}
    >
      <Hash className="w-3 h-3" />
      {tag.replace(/^#/, "")}
      <span className="opacity-60 ml-0.5">({count})</span>
    </button>
  );
}

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

export default function SocialPage() {
  const { username, level, fame, lastPostTime, setLastPostTime, addFame, isGuest } = useGame();
  const { subscribeCommunity, connected } = useRealtime();
  const [, navigate] = useLocation();
  const usernameRef = useRef(username);
  useEffect(() => { usernameRef.current = username; }, [username]);

  const { posts, loading, reload } = useFeed();
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [liveFlash, setLiveFlash]         = useState(false);
  const [trendingHashtags, setTrendingHashtags] = useState<{ tag: string; postCount: number }[]>([]);
  const [notifBadge, setNotifBadge]       = useState(0);

  const currentPlayerId = getStoredPlayerId() ?? undefined;

  useEffect(() => {
    subscribeCommunity();

    const likedIdsPromise = currentPlayerId
      ? api.community.likedByPlayer(currentPlayerId).catch(() => getLikedPostIds())
      : Promise.resolve(getLikedPostIds());

    Promise.all([api.community.posts(50), likedIdsPromise])
      .then(([apiPosts, likedIds]) => {
        const mapped = apiPosts.map(p => mapApiPost(p, likedIds)).filter(isUserPost);
        seedPostMeta(mapped.map(p => p.id));
        saveCommunityPosts(mapped);
        const counts: Record<string, number> = {};
        apiPosts.forEach(p => { counts[p.id] = p.replies ?? 0; });
        setCommentCounts(counts);
      })
      .catch(() => {
        const loaded = getCommunityPosts().filter(isUserPost);
        seedPostMeta(loaded.map(p => p.id));
        setPosts(loaded);
        setCommentCounts(getCommentCounts());
      });

    api.social.hashtagsTrending("24h")
      .then(d => setTrendingHashtags((d.trending ?? []).slice(0, 8)))
      .catch(() => {});

    if (currentPlayerId) {
      api.notifications.list(currentPlayerId, 30)
        .then((notifs: ApiNotification[]) => {
          setNotifBadge(notifs.filter(n => !n.read).length);
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const s = getSocket();

    s.on("community:new_post", (post: any) => {
      const postAuthor = post.authorId ?? post.username;
      if (postAuthor && postAuthor === usernameRef.current) return;

      const likedIds = getLikedPostIds();
      const localPost: CommunityPost = mapApiPost(post, likedIds);
      if (!isUserPost(localPost)) return;
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
    const hasImage = !!imageUrl;

    // Spam / rate-limit check — image-only posts bypass the text-length requirement
    const check = checkPostSpam(content, lastPostTime, hasImage);
    if (check.spam) return;

    // Build local post object (optimistic UI) — imageUrl included from the start
    const withImage = createPost(username, level, fame, content, "text", hasImage ? imageUrl : undefined);
    addPost(withImage);
    setPosts(prev => [withImage, ...prev.filter(p => p.id !== withImage.id)]);
    setLastPostTime(Date.now());
    addFame(2);

    // ── Persist to DB via HTTP (fire-and-forget) ──
    const authorId = getStoredPlayerId() ?? username;
    api.community.create({
      authorId, username, level,
      content,
      imageUrl: hasImage ? imageUrl : undefined,
      type: "text",
    } as any).catch(() => {
      // gracefully ignore — post is already saved locally
    });

    // ── Real-time broadcast via WebSocket ──
    // Send a placeholder imageUrl for socket (skip raw base64 to keep payload small)
    getSocket().emit("community:post", {
      authorId, username, level,
      content: post.content,
      imageUrl: hasImage ? "[image]" : null,
      type: post.type,
    });

    setTimeout(() => {
      api.social.hashtagsTrending("24h")
        .then(d => setTrendingHashtags((d.trending ?? []).slice(0, 8)))
        .catch(() => {});
    }, 500);
  }

  function handleLikeChange(postId: string, liked: boolean) {
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, likedByMe: liked, likes: liked ? p.likes + 1 : Math.max(0, p.likes - 1) }
        : p
    ));
  }

  function handleCommentCountChange(postId: string, delta: number) {
    setCommentCounts(prev => ({ ...prev, [postId]: (prev[postId] ?? 0) + delta }));
  }

  const now = Date.now();

  const feedPosts = [...posts].sort((a, b) => b.timestamp - a.timestamp);

  const trendingPosts = [...posts]
    .filter(p => p.timestamp > now - TRENDING_WINDOW_MS)
    .sort((a, b) =>
      (b.likes * 2 + (b.timestamp > now - 3_600_000 ? 5 : 0)) -
      (a.likes * 2 + (a.timestamp > now - 3_600_000 ? 5 : 0)),
    )
    .slice(0, 3);

  return (
    <div className="min-h-screen pb-28" style={{ background: "#F0F2F5" }}>

      {/* ── Header ── */}
      <div
        className="sticky top-0 z-20 border-b px-3 py-2.5 flex items-center gap-1.5"
        style={{ background: "#FFFFFF", borderColor: "#E4E6EB", boxShadow: "0 2px 4px rgba(0,0,0,0.08)" }}
      >
        <h1 className="text-base font-black flex-1 pl-1" style={{ color: "#050505" }}>🌍 Community</h1>

        <AnimatePresence>
          {liveFlash && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full"
              style={{ background: "#E7F3E8", color: "#2D8A3E" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
              New!
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🔍 Search */}
        <button
          onClick={() => navigate("/search")}
          className="p-2 rounded-xl hover:bg-gray-100 active:scale-90 transition-all"
          style={{ color: "#65676B" }}
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* 🔔 Notifications — badge from DB */}
        <button
          onClick={() => { setNotifBadge(0); navigate("/notifications"); }}
          className="relative p-2 rounded-xl hover:bg-gray-100 active:scale-90 transition-all"
          style={{ color: "#65676B" }}
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {notifBadge > 0 && (
            <span
              className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center text-[9px] font-black text-white leading-none"
              style={{ background: "#E41E3F" }}
            >
              {notifBadge > 99 ? "99+" : notifBadge}
            </span>
          )}
        </button>

        {/* 📈 Trending */}
        <button
          onClick={() => navigate("/trending")}
          className="p-2 rounded-xl hover:bg-gray-100 active:scale-90 transition-all"
          style={{ color: "#65676B" }}
          aria-label="Trending"
        >
          <TrendingUp className="w-5 h-5" />
        </button>

        {/* 👤 Profile Avatar */}
        <button
          onClick={() => navigate("/profile")}
          className="ml-0.5 active:scale-90 transition-transform"
          aria-label="My Profile"
        >
          <Avatar username={username || "?"} size="sm" shape="rounded-full" />
        </button>

        {/* 🌐 Language Switcher */}
        <div className="ml-0.5">
          <LanguageSwitcher compact />
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-3 pt-3">

        {/* ── 1. STORIES ── */}
        <section
          className="rounded-xl overflow-hidden"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
        >
          <StoryBar />
        </section>

        {/* ── Guest banner ── */}
        {isGuest && (
          <div className="px-4">
            <GuestBanner />
          </div>
        )}

        {/* ── Trending Hashtags ── */}
        {trendingHashtags.length > 0 && (
          <section>
            <SectionHeader
              icon={<Hash className="w-4 h-4 text-purple-500" />}
              label="Trending Hashtags"
              action={
                <button onClick={() => navigate("/trending")}
                  className="text-[11px] text-purple-500 font-bold hover:underline">
                  See all
                </button>
              }
            />
            <div className="px-4 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {trendingHashtags.map(h => (
                <HashtagPill
                  key={h.tag}
                  tag={h.tag}
                  count={huseState
              ))}
            </div>
          </section>
        )}

        {/* ── Create post ── */}
        <section
          className="rounded-xl overflow-hidden"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
        >
          <CreatePost
            onPost={handleNewPost}
            username={username}
            onAvatarClick={() => navigate("/profile")}
          />
        </section>

        {/* ── 2. TRENDING POSTS ── */}
        <section>
          <SectionHeader
            icon={<TrendingUp className="w-4 h-4" style={{ color: "#1877F2" }} />}
            label="Trending"
            action={
              <button onClick={() => navigate("/trending")}
                className="text-[11px] text-blue-500 font-bold hover:underline">
                More
              </button>
            }
          />
          {trendingPosts.length === 0 ? (
            <div
              className="mx-4 rounded-xl py-8 text-center"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
            >
              <div className="text-3xl mb-1">🔥</div>
              <p className="text-xs" style={{ color: "#65676B" }}>No trending posts in the last 24 hours</p>
            </div>
          ) : (
            <div className="px-4 space-y-3">
              {trendingPosts.map((post, idx) => (
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
              ))}
            </div>
          )}
        </section>

        {/* ── 3. LEADERBOARD PREVIEW ── */}
        <section>
          <SectionHeader
            icon={<Crown className="w-4 h-4 text-yellow-500" />}
            label="Top Players"
          />
          <FeaturedPlayers />
        </section>

        {/* ── 4. FEED ── */}
        <section>
          <SectionHeader
            icon={<Zap className="w-4 h-4" style={{ color: "#1877F2" }} />}
            label={`Feed · ${feedPosts.length} posts`}
          />
          {feedPosts.length === 0 ? (
            <div
              className="mx-4 rounded-xl py-10 text-center"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
            >
              <div className="text-3xl mb-1">💬</div>
              <p className="text-xs" style={{ color: "#65676B" }}>Be the first to post something!</p>
            </div>
          ) : (
            <div className="px-4 space-y-3 pb-4">
              {feedPosts.map((post, idx) => (
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
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
