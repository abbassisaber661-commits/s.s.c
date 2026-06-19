import { useEffect, useState, useCallback, useRef } from "react";
import { fetchPosts, createPost as apiCreatePost } from "@/services/social/posts.service";
import { fetchTrendingHashtags, fetchNotifications } from "@/services/social/social.service";
import { getSocket } from "@/lib/socket";
import { useGame } from "@/contexts/GameContext";
import type { Post } from "@/types/social";

interface UseSocialFeedOptions {
  limit?: number;
  enableRealtime?: boolean;
}

export function useSocialFeed(options: UseSocialFeedOptions = {}) {
  const { limit = 30, enableRealtime = true } = options;
  const { username, level, addFame, setLastPostTime } = useGame();

  // ================= STATE =================
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [trendingHashtags, setTrendingHashtags] = useState<{ tag: string; postCount: number }[]>([]);
  const [notifBadge, setNotifBadge] = useState(0);
  const [liveFlash, setLiveFlash] = useState(false);

  // ================= REFS =================
  const usernameRef = useRef(username);
  const pageRef = useRef(1);
  const initRef = useRef(false);

  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  // ================= LOAD =================
  const load = useCallback(
    async (reset = true) => {
      try {
        setLoading(true);

        if (reset) pageRef.current = 1;

        const [postsData, hashtags, notifs] = await Promise.all([
          fetchPosts(limit, pageRef.current), // ✅ FIX: pagination restored
          fetchTrendingHashtags(),
          fetchNotifications(),
        ]);

        setPosts((prev) => (reset ? (postsData as unknown as Post[]) : [...prev, ...(postsData as unknown as Post[])]));
        setHasNextPage(postsData.length === limit);

        pageRef.current += 1;

        const counts: Record<string, number> = {};
        postsData.forEach((p: any) => {
          counts[p.id] = p.replies ?? 0;
        });

        setCommentCounts((prev) => (reset ? counts : { ...prev, ...counts }));
        setTrendingHashtags(hashtags);
        setNotifBadge(notifs);
      } catch (err) {
        console.error("Failed to load feed:", err);
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  // ================= NEXT PAGE =================
  const fetchNextPage = useCallback(async () => {
    if (isFetchingNextPage || !hasNextPage) return;

    setIsFetchingNextPage(true);
    try {
      await load(false);
    } finally {
      setIsFetchingNextPage(false);
    }
  }, [hasNextPage, load, isFetchingNextPage]);

  // ================= INIT =================
  useEffect(() => {
    if (!enableRealtime || initRef.current) return;

    initRef.current = true;
    load(true);
  }, [enableRealtime, load]);

  // ================= SOCKET =================
  useEffect(() => {
    if (!enableRealtime) return;

    const socket = getSocket();

    const handleNewPost = (post: any) => {
      if (post.authorId === usernameRef.current) return;

      setPosts((prev) => [post, ...prev]);
      setLiveFlash(true);
      setTimeout(() => setLiveFlash(false), 2000);
    };

    const handleLikeUpdate = ({ postId, liked }: any) => {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                likedByMe: liked,
                likes: liked ? p.likes + 1 : Math.max(0, p.likes - 1),
              }
            : p
        )
      );
    };

    const handleCommentUpdate = ({ postId }: any) => {
      setCommentCounts((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? 0) + 1,
      }));
    };

    socket.on("community:post", handleNewPost);
    socket.on("community:like", handleLikeUpdate);
    socket.on("community:comment", handleCommentUpdate);

    return () => {
      socket.off("community:post", handleNewPost);
      socket.off("community:like", handleLikeUpdate);
      socket.off("community:comment", handleCommentUpdate);
    };
  }, [enableRealtime]);

  // ================= CREATE POST =================
  const createPost = useCallback(
    async (content: string, imageUrl?: string) => {
      try {
        const newPost = await apiCreatePost({
          content,
          imageUrl,
          username, // ✅ FIX: restored
          level,    // ✅ FIX: restored
        });

        setPosts((prev) => [(newPost as unknown as Post), ...prev]);
        addFame(2);
        setLastPostTime(Date.now());

        getSocket().emit("community:post", newPost);
      } catch (err) {
        console.error("Failed to create post:", err);
      }
    },
    [username, level, addFame, setLastPostTime]
  );

  // ================= ACTIONS =================
  const handleLike = useCallback((postId: string, liked: boolean) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              likedByMe: liked,
              likes: liked ? p.likes + 1 : Math.max(0, p.likes - 1),
            }
          : p
      )
    );
  }, []);

  const handleCommentUpdate = useCallback((postId: string, delta: number) => {
    setCommentCounts((prev) => ({
      ...prev,
      [postId]: (prev[postId] ?? 0) + delta,
    }));
  }, []);

  const reload = useCallback(() => load(true), [load]);

  // ================= RETURN =================
  return {
    posts,
    loading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    reload,

    commentCounts,
    trendingHashtags,
    notifBadge,
    liveFlash,

    createPost,
    handleLike,
    handleCommentUpdate,
    setNotifBadge,
  };
}