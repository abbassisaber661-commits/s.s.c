// TODO: Implement real profile data fetching
import { useState } from "react";
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

export function useProfileData(_userId: string): UseProfileDataResult {
  const [isLoading] = useState(false);
  const [isError] = useState(false);

  return {
    profile: null,
    posts: null,
    isLoading,
    isError,
    refetch: () => {},
    fetchNextPage: () => {},
    hasNextPage: false,
  };
}
