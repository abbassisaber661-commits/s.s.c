import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { CommunityPost, CreatePostPayload, PaginatedResponse } from "@/shared/community";

/* ─────────────────────────────
   Query Keys
───────────────────────────── */
export const communityKeys = {
  all:   ["community"] as const,
  posts: (type: string) => ["community", "posts", type] as const,
};

/* ─────────────────────────────
   Normalise API response
   Guards against malformed payloads so the UI never crashes
───────────────────────────── */
function normalisePage(raw: unknown): PaginatedResponse<CommunityPost> {
  if (raw && typeof raw === "object" && "data" in (raw as object)) {
    const r = raw as { data: unknown; nextPage?: unknown; total?: unknown };
    return {
      data:     Array.isArray(r.data) ? (r.data as CommunityPost[]) : [],
      nextPage: typeof r.nextPage === "number" ? r.nextPage : null,
      total:    typeof r.total    === "number" ? r.total    : 0,
    };
  }
  // Legacy flat array response — wrap it
  if (Array.isArray(raw)) {
    return { data: raw as CommunityPost[], nextPage: null, total: raw.length };
  }
  return { data: [], nextPage: null, total: 0 };
}

/* ─────────────────────────────
   Get Posts (Infinite Scroll)
───────────────────────────── */
export function usePosts(type: string) {
  return useInfiniteQuery<PaginatedResponse<CommunityPost>, Error>({
    queryKey: communityKeys.posts(type),

    queryFn: async ({ pageParam = 1 }) => {
      const raw = await api.community.getPosts(type, pageParam as number, 15);
      return normalisePage(raw);
    },

    getNextPageParam: (lastPage) =>
      lastPage.nextPage ?? undefined,

    initialPageParam: 1,

    // Data is considered fresh for 30 s — reduces unnecessary refetches
    staleTime: 30 * 1000,

    // Always refetch on mount so navigating back shows fresh posts
    refetchOnMount: true,

    // Refetch every 60 s while the tab is open
    refetchInterval: 60 * 1000,

    // Don't refetch on window focus to avoid jarring scroll jumps
    refetchOnWindowFocus: false,

    // Retry up to 3 times with exponential back-off before showing error
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
}

/* ─────────────────────────────
   Create Post
───────────────────────────── */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePostPayload) =>
      api.community.createPost(payload),

    // Optimistic prepend: insert the new post at the top of cached pages
    onSuccess: (newPost) => {
      ["fyp", "latest"].forEach((feedType) => {
        queryClient.setQueryData<{ pages: PaginatedResponse<CommunityPost>[] }>(
          communityKeys.posts(feedType),
          (old) => {
            if (!old?.pages?.length) return old;
            const [firstPage, ...rest] = old.pages;
            return {
              ...old,
              pages: [
                { ...firstPage, data: [newPost, ...firstPage.data] },
                ...rest,
              ],
            };
          },
        );
      });
    },

    // Always invalidate after create so the server is the source of truth
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

/* ─────────────────────────────
   Like Post (Optimistic)
───────────────────────────── */
export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, like }: { postId: string; like: boolean }) =>
      api.community.likePost(postId, like),

    onMutate: async ({ postId, like }) => {
      await queryClient.cancelQueries({ queryKey: communityKeys.all });

      const snapshots: Record<string, unknown> = {};

      ["fyp", "following", "trending", "latest"].forEach((feedType) => {
        const key = communityKeys.posts(feedType);
        snapshots[feedType] = queryClient.getQueryData(key);

        queryClient.setQueryData<{ pages: PaginatedResponse<CommunityPost>[] }>(
          key,
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                data: page.data.map((p) =>
                  p.id === postId
                    ? { ...p, likes: p.likes + (like ? 1 : -1), likedByMe: like }
                    : p,
                ),
              })),
            };
          },
        );
      });

      return { snapshots };
    },

    onError: (_err, _vars, context) => {
      if (!context?.snapshots) return;
      ["fyp", "following", "trending", "latest"].forEach((feedType) => {
        queryClient.setQueryData(
          communityKeys.posts(feedType),
          context.snapshots[feedType],
        );
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}
