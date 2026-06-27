import { useState, useEffect, useCallback, useRef } from "react";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import type { ProfileData, Post } from "@/types/profile";

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

/** Evict a specific userId from the in-memory profile cache */
export function bustProfileCache(userId: string) {
  profileCache.delete(userId);
}

export function useProfileData(userId: string) {
  const safeUserId = userId || "1";

  const [profile, setProfile] = useState<ProfileData | null>(() => {
    const cached = profileCache.get(safeUserId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(!profileCache.has(safeUserId));
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [postsState, setPostsState] = useState<PostsState>({
    pages: [],
    hasNextPage: false,
    isFetchingNextPage: false,
  });

  const abortRef = useRef<AbortController | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!safeUserId) return;

    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      // The backend returns both the new { player, followers, following, posts }
      // shape AND flat stats for backward compatibility
      const res = await api.social.profile(safeUserId) as any;

      if (!res) throw new Error("Profile not found");

      // Handle new shape: { player: ApiPlayer, followers, following, posts }
      const p = res.player ?? res;

      // Fetch real isFollowing from the followers API
      const viewerId = getStoredPlayerId();
      let isFollowing = false;
      if (viewerId && viewerId !== (p.id ?? safeUserId)) {
        try {
          const followData = await api.followers.get(p.id ?? safeUserId, viewerId);
          isFollowing = followData.isFollowing;
        } catch {}
      }

      const mapped: ProfileData = {
        id:          p.id ?? safeUserId,
        username:    p.username ?? res.username ?? "User",
        level:       p.level   ?? res.level    ?? 1,
        postsCount:  res.postsCount ?? res.posts?.length ?? 0,
        followers:   res.followers  ?? res.followersCount ?? 0,
        following:   res.following  ?? res.followingCount ?? 0,

        avatar:  p.avatar  ?? res.avatar  ?? null,
        cover:   p.cover   ?? res.cover   ?? null,
        bio:     p.bio     ?? res.bio     ?? "",

        reelsCount: 0,
        savedCount: 0,
        isFollowing,

        // Optional enriched stats
        totalLikes:       res.likesReceived    ?? 0,
        joinedAt:         res.joinedAt         ?? undefined,
      };

      profileCache.set(safeUserId, { data: mapped, timestamp: Date.now() });
      setProfile(mapped);

      // Load initial posts if returned
      if (res.posts && Array.isArray(res.posts) && res.posts.length > 0) {
        const mappedPosts: Post[] = res.posts.map((p: any) => ({
          id:        p.id,
          authorId:  p.authorId ?? safeUserId,
          content:   p.content ?? "",
          imageUrl:  p.imageUrl ?? null,
          type:      p.type ?? "text",
          timestamp: p.createdAt ? new Date(p.createdAt).getTime() : Date.now(),
          likes:     p.likes ?? 0,
          likedByMe: p.likedByMe ?? false,
          replyCount: p.replies ?? 0,
          isPinned:  false,
          isSaved:   false,
        }));
        setPostsState({
          pages: [mappedPosts],
          hasNextPage: false,
          isFetchingNextPage: false,
        });
      } else {
        setPostsState({ pages: [], hasNextPage: false, isFetchingNextPage: false });
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
      setIsError(true);
      setErrorMessage("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, [safeUserId]);

  const fetchNextPage = useCallback(async () => {
    if (postsState.isFetchingNextPage || !postsState.hasNextPage) return;
    setPostsState((prev) => ({ ...prev, isFetchingNextPage: true }));
    // Pagination not yet implemented for profile posts beyond initial 20
    setPostsState((prev) => ({ ...prev, isFetchingNextPage: false, hasNextPage: false }));
  }, [postsState]);

  useEffect(() => {
    fetchProfile();
    return () => abortRef.current?.abort();
  }, [fetchProfile]);

  return {
    profile,
    posts: postsState.pages.flat(),

    isLoading,
    isError,
    errorMessage,

    refetch:           fetchProfile,
    fetchNextPage,
    hasNextPage:       postsState.hasNextPage,
    isFetchingNextPage: postsState.isFetchingNextPage,
  };
}
