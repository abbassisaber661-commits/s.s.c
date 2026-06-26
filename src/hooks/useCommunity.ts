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
      api.community.getPosts(type, pageParam, 10),

    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    initialPageParam: 1,

    staleTime: 60 * 1000, // 1 minute cache
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
          (old: any) => {
            if (!old) return old;

            const [firstPage, ...rest] = old;

            return [
              {
                ...firstPage,
                data: [newPost, ...firstPage.data],
              },
              ...rest,
            ];
          }
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

      const previousData = queryClient.getQueryData(communityKeys.all);

      ["fyp", "following", "trending", "latest"].forEach((type) => {
        queryClient.setQueryData(
          communityKeys.posts(type),
          (old: any) => {
            if (!old) return old;

            return old.map((page: any) => ({
              ...page,
              data: page.data.map((post: CommunityPost) =>
                post.id === postId
                  ? {
                      ...post,
                      likes: post.likes + (like ? 1 : -1),
                      likedByMe: like,
                    }
                  : post
              ),
            }));
          }
        );
      });

      return { previousData };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          communityKeys.all,
          context.previousData
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}