import { useState, useEffect, useCallback, useRef } from "react";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import type { ProfileData } from "@/types/profile";

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

/**
 * Loads profile metadata (player info, followers, following count).
 * Posts are handled separately via usePosts({ authorId }) in ProfilePage.
 */
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
  const [isError, setIsError]     = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!safeUserId) return;

    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await api.social.profile(safeUserId) as any;
      if (!res) throw new Error("Profile not found");

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

      // Map verificationStatus → verification tier for badge display
      const rawStatus: string = p.verificationStatus ?? "none";
      const isVerified: boolean = p.verified === true || p.verified === 1;
      const verificationTier =
        (p.isOwner === true) ? "owner" as const :
        (isVerified || rawStatus === "approved") ? "verified" as const : undefined;

      const mapped: ProfileData = {
        id:          p.id ?? safeUserId,
        username:    p.username ?? res.username ?? "User",
        level:       p.level   ?? res.level    ?? 1,
        postsCount:  res.postsCount ?? (res.posts?.length ?? 0),
        followers:   res.followers  ?? res.followersCount ?? 0,
        following:   res.following  ?? res.followingCount ?? 0,

        avatar:  p.avatar  ?? res.avatar  ?? null,
        cover:   p.cover   ?? res.cover   ?? null,
        bio:     p.bio     ?? res.bio     ?? "",

        reelsCount: 0,
        savedCount: 0,
        isFollowing,

        totalLikes:         res.likesReceived ?? 0,
        joinedAt:           res.joinedAt      ?? undefined,
        verification:       verificationTier,
        verificationStatus: rawStatus as any,
      };

      profileCache.set(safeUserId, { data: mapped, timestamp: Date.now() });
      setProfile(mapped);
    } catch (err) {
      console.error("Profile fetch error:", err);
      setIsError(true);
      setErrorMessage("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, [safeUserId]);

  useEffect(() => {
    fetchProfile();
    return () => abortRef.current?.abort();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    isError,
    errorMessage,
    refetch: fetchProfile,
  };
}
