import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/apiClient";
import type { ProfileData, Post } from "@/types/profile";

interface PostsPage { posts: Post[] }
interface PostsState {
  pages: PostsPage[];
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
}

interface UseProfileDataResult {
  profile: ProfileData | null;
  posts: PostsState | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
}

export function useProfileData(userId: string): UseProfileDataResult {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!userId) { setIsLoading(false); return; }
    setIsLoading(true);
    setIsError(false);
    try {
      const res = await api.social.profile(userId);
      setProfile({
        id:          res.playerId,
        username:    res.username || "مستخدم",
        level:       res.level ?? 1,
        postsCount:  res.postsCount ?? 0,
        followers:   res.followersCount ?? 0,
        following:   res.followingCount ?? 0,
        avatar:      undefined,
        cover:       undefined,
        bio:         undefined,
        reelsCount:  0,
        savedCount:  0,
        isFollowing: false,
      });
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    posts: null,
    isLoading,
    isError,
    refetch: fetchProfile,
    fetchNextPage: () => {},
    hasNextPage: false,
  };
}
