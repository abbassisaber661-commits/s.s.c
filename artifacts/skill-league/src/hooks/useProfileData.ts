import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/apiClient";
import type { ProfileData, Post } from "@/types/profile";

// ============================
// Types
// ============================
interface PostsState {
  pages: Post[][];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

interface CacheEntry {
  data: ProfileData;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000;
const profileCache = new Map<string, CacheEntry>();

// ============================
// Hook
// ============================
export function useProfileData(userId: string) {
  const safeUserId = userId || "1";

  // ================= Profile =================
  const [profile, setProfile] = useState<ProfileData | null>(() => {
    const cached = profileCache.get(safeUserId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ================= Posts =================
  const [postsState, setPostsState] = useState<PostsState>({
    pages: [],
    hasNextPage: false,
    isFetchingNextPage: false,
  });

  const pageRef = useRef(1);
  const abortRef = useRef<AbortController | null>(null);

  // ================= Fetch Profile =================
  const fetchProfile = useCallback(async () => {
    if (!safeUserId) return;

    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await api.social.profile(safeUserId);

      if (!res) throw new Error("Profile not found");

      const mapped: ProfileData = {
        id: res.playerId,
        username: res.username || "User",
        level: res.level ?? 1,
        postsCount: res.postsCount ?? 0,
        followers: res.followersCount ?? 0,
        following: res.followingCount ?? 0,

        // ✅ مهم جداً: fallback احترافي للصور
        avatar: res.avatar || "/default-avatar.png",
        cover: res.cover || "/default-cover.jpg",

        bio: res.bio || "",
        reelsCount: 0,
        savedCount: 0,
        isFollowing: false,
      };

      profileCache.set(safeUserId, {
        data: mapped,
        timestamp: Date.now(),
      });

      setProfile(mapped);

      setPostsState({
        pages: [],
        hasNextPage: false,
        isFetchingNextPage: false,
      });

      pageRef.current = 1;
    } catch (err) {
      console.error("Profile fetch error:", err);
      setIsError(true);
      setErrorMessage("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, [safeUserId]);

  // ================= Next Page =================
  const fetchNextPage = useCallback(async () => {
    if (postsState.isFetchingNextPage || !postsState.hasNextPage) return;

    setPostsState((prev) => ({
      ...prev,
      isFetchingNextPage: true,
    }));

    try {
      const next = postsState.pages.length + 1;
      pageRef.current = next;

      setPostsState((prev) => ({
        ...prev,
        isFetchingNextPage: false,
        hasNextPage: false,
      }));
    } catch (err) {
      console.error(err);
      setPostsState((prev) => ({
        ...prev,
        isFetchingNextPage: false,
      }));
    }
  }, [postsState]);

  // ================= Init =================
  useEffect(() => {
    fetchProfile();
    return () => abortRef.current?.abort();
  }, [fetchProfile]);

  // ================= Return =================
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