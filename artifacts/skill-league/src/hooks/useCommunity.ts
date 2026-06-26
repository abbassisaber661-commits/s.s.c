import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { CommunityPost, CreatePostPayload, PaginatedResponse } from "@/shared/community";

/* ─────────────────────────────
   Query Keys
───────────────────────────── */
export const communityKeys = {
  all: ["community"] as const,
  posts: (type: string) => [...communityKeys.all, "posts", type] as const,
};

/* ─────────────────────────────
   Get Posts (Infinite Scroll)
───────────────────────────── */
export function usePosts(type: string) {
  return useInfiniteQuery({
    queryKey: communityKeys.posts(type),
    queryFn: ({ pageParam = 1 }) =>
      api.community.getPosts(type, pageParam as number, 10),

    getNextPageParam: (lastPage: PaginatedResponse<CommunityPost>) =>
      lastPage.nextPage ?? undefined,
    initialPageParam: 1,

    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
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

    onSuccess: (newPost) => {
      ["fyp", "latest"].forEach((type) => {
        queryClient.setQueryData(
          communityKeys.posts(type),
          (old: { pages: PaginatedResponse<CommunityPost>[] } | undefined) => {
            if (!old) return old;
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
  });
}

/* ─────────────────────────────
   Like Post (Optimistic Update)
───────────────────────────── */
export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, like }: { postId: string; like: boolean }) =>
      api.community.likePost(postId, like),

    onMutate: async ({ postId, like }) => {
      await queryClient.cancelQueries({ queryKey: communityKeys.all });

      const snapshots: Record<string, unknown> = {};

      ["fyp", "following", "trending", "latest"].forEach((type) => {
        const key = communityKeys.posts(type);
        snapshots[type] = queryClient.getQueryData(key);

        queryClient.setQueryData(
          key,
          (old: { pages: PaginatedResponse<CommunityPost>[] } | undefined) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                data: page.data.map((p) =>
                  p.id === postId
                    ? {
                        ...p,
                        likes: p.likes + (like ? 1 : -1),
                        likedByMe: like,
                      }
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
      ["fyp", "following", "trending", "latest"].forEach((type) => {
        queryClient.setQueryData(
          communityKeys.posts(type),
          context.snapshots[type],
        );
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}
