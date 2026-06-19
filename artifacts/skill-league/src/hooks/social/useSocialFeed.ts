import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { fetchPosts, createPost as apiCreatePost } from "@/services/social/posts.service";
import { fetchTrendingHashtags, fetchNotifications } from "@/services/social/social.service";
import { translateBatch } from "@/services/translate.service";
import { getSocket } from "@/lib/socket";
import { useGame } from "@/contexts/GameContext";
import { useAppTranslation } from "@/hooks/useTranslation";
import type { Post } from "@/types/social";

// ============================================================
// واجهات إضافية لدعم الترجمة
// ============================================================
interface TranslatedPost extends Post {
  originalContent: string;   // النص الأصلي (دائماً بالإنجليزية)
  translatedContent?: string; // النص المترجم للغة الحالية
}

interface UseSocialFeedOptions {
  limit?: number;
  enableRealtime?: boolean;
}

// ============================================================
// Hook
// ============================================================
export function useSocialFeed(options: UseSocialFeedOptions = {}) {
  const { limit = 30, enableRealtime = true } = options;
  const { username, level, addFame, setLastPostTime } = useGame();
  const { currentLanguage } = useAppTranslation();

  // ================= STATE =================
  const [posts, setPosts] = useState<TranslatedPost[]>([]);
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
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // خريطة الترجمة المؤقتة (حجم محدود)
  const translationCache = useRef<Map<string, string>>(new Map());
  const MAX_CACHE_SIZE = 500;

  // ================= تحديث المرجع =================
  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  // ================= تنظيف الترجمة إذا زاد الحجم =================
  const cleanTranslationCache = useCallback(() => {
    if (translationCache.current.size > MAX_CACHE_SIZE) {
      const keys = Array.from(translationCache.current.keys());
      const toRemove = keys.slice(0, Math.floor(keys.length / 2));
      toRemove.forEach(key => translationCache.current.delete(key));
    }
  }, []);

  // ================= دالة ترجمة قائمة منشورات (Batch) =================
  const translatePostsBatch = useCallback(
    async (postsList: TranslatedPost[]): Promise<TranslatedPost[]> => {
      if (postsList.length === 0) return postsList;

      // نفصل المنشورات التي تحتاج ترجمة (ليست بنفس اللغة)
      const toTranslate = postsList.filter(
        p => p.language !== currentLanguage && p.originalContent
      );

      if (toTranslate.length === 0) return postsList;

      // نبحث في cache أولاً
      const needApi = [];
      const translatedMap = new Map<string, string>();

      for (const post of toTranslate) {
        const cacheKey = `${post.id}_${currentLanguage}`;
        const cached = translationCache.current.get(cacheKey);
        if (cached) {
          translatedMap.set(post.id, cached);
        } else {
          needApi.push(post);
        }
      }

      // نترجم الباقي عبر API (طلب واحد)
      if (needApi.length > 0) {
        const texts = needApi.map(p => p.originalContent);
        try {
          const results = await translateBatch(texts, currentLanguage);
          results.forEach((translated, index) => {
            const post = needApi[index];
            const cacheKey = `${post.id}_${currentLanguage}`;
            translationCache.current.set(cacheKey, translated);
            translatedMap.set(post.id, translated);
          });
          cleanTranslationCache();
        } catch (error) {
          console.error("Batch translation failed:", error);
          // في حال الفشل، نستخدم النص الأصلي
          needApi.forEach(p => translatedMap.set(p.id, p.originalContent));
        }
      }

      // نطبق الترجمة على المنشورات
      return postsList.map(p => {
        if (p.language === currentLanguage) {
          return { ...p, content: p.originalContent, translatedContent: undefined };
        }
        const translated = translatedMap.get(p.id);
        return translated
          ? { ...p, content: translated, translatedContent: translated }
          : p;
      });
    },
    [currentLanguage, cleanTranslationCache]
  );

  // ================= LOAD (مع Batch Translation) =================
  const load = useCallback(
    async (reset = true) => {
      // إلغاء الطلبات السابقة
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        setLoading(true);

        if (reset) pageRef.current = 1;

        const [postsData, hashtags, notifs] = await Promise.all([
          fetchPosts(limit, pageRef.current, signal),
          fetchTrendingHashtags(),
          fetchNotifications(),
        ]);

        // نضمن أن كل منشور يحمل originalContent
        const normalized = postsData.map((p: any) => ({
          ...p,
          originalContent: p.originalContent || p.content,
          language: p.language || 'en',
        }));

        // نترجم الدفعة
        const translated = await translatePostsBatch(normalized);

        setPosts((prev) => (reset ? translated : [...prev, ...translated]));
        setHasNextPage(postsData.length === limit);
        pageRef.current += 1;

        // بناء commentCounts من نفس البيانات
        const counts: Record<string, number> = {};
        translated.forEach((p) => {
          counts[p.id] = (p as any).replies ?? 0;
        });
        setCommentCounts((prev) => (reset ? counts : { ...prev, ...counts }));

        setTrendingHashtags(hashtags);
        setNotifBadge(notifs);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error("Failed to load feed:", err);
        }
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [limit, translatePostsBatch]
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

  // ================= SOCKET (غير متزامن مع ترجمة تدريجية) =================
  useEffect(() => {
    if (!enableRealtime) return;

    const socket = getSocket();

    const handleNewPost = (post: any) => {
      if (post.authorId === usernameRef.current) return;

      const normalized: TranslatedPost = {
        ...post,
        originalContent: post.originalContent || post.content,
        language: post.language || 'en',
      };

      // نضيف المنشور فوراً (بدون ترجمة)
      setPosts((prev) => [normalized, ...prev]);

      // نترجم في الخلفية ونحدث عندما تصل النتيجة
      translatePostsBatch([normalized]).then(([translated]) => {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === translated.id ? translated : p
          )
        );
      });

      setLiveFlash(true);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => {
        setLiveFlash(false);
      }, 2000);
    };

    const handleLikeUpdate = ({ postId, liked }: any) => {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? p.likedByMe === liked
              ? p
              : {
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
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, [enableRealtime, translatePostsBatch]);

  // ================= إعادة الترجمة عند تغيير اللغة =================
  useEffect(() => {
    if (posts.length === 0) return;

    let mounted = true;

    (async () => {
      const translated = await translatePostsBatch(posts);
      if (mounted) {
        setPosts(translated);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [currentLanguage, translatePostsBatch]);

  // ================= CREATE POST =================
  const createPost = useCallback(
    async (content: string, imageUrl?: string) => {
      try {
        const newPost = await apiCreatePost({ content, imageUrl, username, level });
        // المنشور الجديد بلغة المستخدم، نضيفه فوراً
        const normalized: TranslatedPost = {
          ...newPost,
          originalContent: content,
          language: currentLanguage,
        };
        setPosts((prev) => [normalized, ...prev]);
        addFame(2);
        setLastPostTime(Date.now());

        getSocket().emit("community:post", newPost);
      } catch (err) {
        console.error("Failed to create post:", err);
      }
    },
    [username, level, addFame, setLastPostTime, currentLanguage]
  );

  // ================= ACTIONS =================
  const handleLike = useCallback((postId: string, liked: boolean) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? p.likedByMe === liked
            ? p
            : {
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