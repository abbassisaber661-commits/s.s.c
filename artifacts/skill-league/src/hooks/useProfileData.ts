import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/apiClient";
import type { ProfileData, Post } from "@/types/profile";

// ============================================================
// Types
// ============================================================
interface PostsState {
  pages: Post[][];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

// ============================================================
// Cache مع صلاحية
// ============================================================
interface CacheEntry {
  data: ProfileData;
  timestamp: number;
}
const CACHE_TTL = 5 * 60 * 1000; // 5 دقائق
const profileCache = new Map<string, CacheEntry>();

// ============================================================
// Hook
// ============================================================
export function useProfileData(userId: string) {
  // ---------- Profile ----------
  const [profile, setProfile] = useState<ProfileData | null>(() => {
    const entry = profileCache.get(userId);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.data;
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ---------- Posts ----------
  const [postsState, setPostsState] = useState<PostsState>({
    pages: [],
    hasNextPage: false,
    isFetchingNextPage: false,
  });

  const pageRef = useRef(1);
  const abortRef = useRef<AbortController | null>(null);

  // ============================================================
  // جلب البروفايل + الصفحة الأولى
  // ============================================================
  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      setIsError(true);
      setErrorMessage("معرف المستخدم غير موجود");
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const profileRes = await api.social.profile(userId);

      if (!profileRes) {
        throw new Error("الملف الشخصي غير موجود");
      }

      const mappedProfile: ProfileData = {
        id: profileRes.playerId,
        username: profileRes.username ?? "مستخدم",
        level: profileRes.level ?? 1,
        postsCount: profileRes.postsCount ?? 0,
        followers: profileRes.followersCount ?? 0,
        following: profileRes.followingCount ?? 0,
        avatar: undefined,
        cover: undefined,
        bio: undefined,
        reelsCount: 0,
        savedCount: 0,
        isFollowing: false,
      };

      profileCache.set(userId, { data: mappedProfile, timestamp: Date.now() });
      setProfile(mappedProfile);

      setPostsState({
        pages: [],
        hasNextPage: false,
        isFetchingNextPage: false,
      });

      pageRef.current = 1;
    } catch (err) {
      console.error("useProfileData fetch error:", err);
      setIsError(true);
      setErrorMessage(err instanceof Error ? err.message : "حدث خطأ أثناء جلب البيانات");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // ============================================================
  // جلب الصفحة التالية
  // ============================================================
  const fetchNextPage = useCallback(async () => {
    if (postsState.isFetchingNextPage || !postsState.hasNextPage) return;

    setPostsState((prev) => ({ ...prev, isFetchingNextPage: true }));

    try {
      // ========== حساب nextPage من عدد الصفحات الحالية ==========
      const nextPage = postsState.pages.length + 1;

      setPostsState((prev) => ({
        ...prev,
        hasNextPage: false,
        isFetchingNextPage: false,
      }));

      pageRef.current = nextPage;
    } catch (err) {
      console.error("useProfileData fetchNextPage error:", err);
      setPostsState((prev) => ({ ...prev, isFetchingNextPage: false }));
    }
  }, [userId, postsState.isFetchingNextPage, postsState.hasNextPage, postsState.pages.length]);

  // ============================================================
  // التهيئة
  // ============================================================
  useEffect(() => {
    fetchProfile();
    return () => abortRef.current?.abort();
  }, [fetchProfile]);

  // ============================================================
  // القيمة المُرجَعة
  // ============================================================
  return {
    profile,
    posts: postsState.pages.flat(),
    isLoading,
    isError,
    errorMessage,
    refetch: fetchProfile,
    fetchNextPage,
    hasNextPage: postsState.hasNextPage,
    isFetchingNextPage: postsState.isFetchingNextPage,
  };
}