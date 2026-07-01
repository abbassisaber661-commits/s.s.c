import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import type { CommunityPost, CreatePostPayload, PaginatedResponse } from "@/shared/community";

/* ─────────────────────────────
   Query Keys
───────────────────────────── */
export const communityKeys = {
  all:   ["community"] as const,
  posts: (type: string) => ["community", "posts", type] as const,
};

/** All feed type keys that may cache the same post */
const ALL_FEED_TYPES = ["fyp", "following", "trending", "latest"];

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
  if (Array.isArray(raw)) {
    return { data: raw as CommunityPost[], nextPage: null, total: raw.length };
  }
  return { data: [], nextPage: null, total: 0 };
}

/** Patch a single post in all cached pages across multiple feed keys */
function patchPostInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  feedTypes: string[],
  postId: string,
  updater: (p: CommunityPost) => CommunityPost,
) {
  feedTypes.forEach((feedType) => {
    queryClient.setQueryData<{ pages: PaginatedResponse<CommunityPost>[] }>(
      communityKeys.posts(feedType),
      (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((p) => p.id === postId ? updater(p) : p),
          })),
        };
      },
    );
  });
}

/* ─────────────────────────────
   Get Posts (Infinite Scroll)
   pass authorId to load a specific user's posts (Profile tab)
───────────────────────────── */
export function usePosts(type: string, authorId?: string) {
  const playerId = getStoredPlayerId();

  const cacheKey = authorId
    ? communityKeys.posts(`profile:${authorId}`)
    : communityKeys.posts(type);

  return useInfiniteQuery<PaginatedResponse<CommunityPost>, Error>({
    queryKey: cacheKey,

    queryFn: async ({ pageParam = 1 }) => {
      const raw = await api.community.getPosts(
        type,
        pageParam as number,
        15,
        playerId,
        authorId ?? null,
      );
      return normalisePage(raw);
    },

    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    initialPageParam: 1,
    staleTime:        30 * 1000,
    refetchOnMount:   true,
    refetchInterval:  60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
}

/* ─────────────────────────────
   Saved Posts (Profile → Saved tab)
───────────────────────────── */
export function useSavedPosts() {
  const playerId = getStoredPlayerId();

  return useInfiniteQuery<PaginatedResponse<CommunityPost>, Error>({
    queryKey: communityKeys.posts("saved"),
    enabled:  !!playerId,

    queryFn: async ({ pageParam = 1 }) => {
      if (!playerId) return { data: [], nextPage: null, total: 0 };
      const raw = await api.community.getSavedPosts(playerId, pageParam as number, 15);
      return normalisePage(raw);
    },

    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    initialPageParam: 1,
    staleTime: 60 * 1000,
    refetchOnMount: true,
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

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

/* ─────────────────────────────
   Like Post (Optimistic — covers all feed caches + profile cache)
───────────────────────────── */
export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, like }: { postId: string; like: boolean }) => {
      const playerId = getStoredPlayerId();
      const username = null;
      return api.community.likePost(postId, like, playerId, username);
    },

    onMutate: async ({ postId, like }) => {
      await queryClient.cancelQueries({ queryKey: communityKeys.all });

      // Snapshot ALL keys for rollback
      const snapshots: Record<string, unknown> = {};
      const allKeys = [...ALL_FEED_TYPES, "saved"];

      // Also snapshot any profile: keys
      const queryCache = queryClient.getQueryCache();
      queryCache.getAll().forEach((q) => {
        const key = q.queryKey;
        if (Array.isArray(key) && key[0] === "community" && key[1] === "posts") {
          const feedType = key[2] as string;
          if (!allKeys.includes(feedType)) allKeys.push(feedType);
        }
      });

      allKeys.forEach((feedType) => {
        const key = communityKeys.posts(feedType);
        snapshots[feedType] = queryClient.getQueryData(key);
      });

      // Optimistically update every feed that might contain this post
      patchPostInCache(queryClient, allKeys, postId, (p) => ({
        ...p,
        likes: p.likes + (like ? 1 : -1),
        likedByMe: like,
      }));

      return { snapshots, allKeys };
    },

    onError: (_err, _vars, context) => {
      if (!context) return;
      context.allKeys.forEach((feedType) => {
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

/* ─────────────────────────────
   Save Post (Optimistic — backend-persistent)
───────────────────────────── */
export function useSavePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId }: { postId: string; saved: boolean }) => {
      const playerId = getStoredPlayerId();
      if (!playerId) throw new Error("Not logged in");
      return api.community.savePost(postId, playerId);
    },

    onMutate: async ({ postId, saved }) => {
      await queryClient.cancelQueries({ queryKey: communityKeys.all });

      const snapshots: Record<string, unknown> = {};
      const allKeys = [...ALL_FEED_TYPES, "saved"];

      const queryCache = queryClient.getQueryCache();
      queryCache.getAll().forEach((q) => {
        const key = q.queryKey;
        if (Array.isArray(key) && key[0] === "community" && key[1] === "posts") {
          const feedType = key[2] as string;
          if (!allKeys.includes(feedType)) allKeys.push(feedType);
        }
      });

      allKeys.forEach((feedType) => {
        const key = communityKeys.posts(feedType);
        snapshots[feedType] = queryClient.getQueryData(key);
      });

      // Optimistically flip savedByMe across all caches
      patchPostInCache(queryClient, allKeys, postId, (p) => ({
        ...p,
        savedByMe: !saved,
      }));

      return { snapshots, allKeys };
    },

    onError: (_err, _vars, context) => {
      if (!context) return;
      context.allKeys.forEach((feedType) => {
        queryClient.setQueryData(
          communityKeys.posts(feedType),
          context.snapshots[feedType],
        );
      });
    },

    onSettled: () => {
      // Refresh saved feed so it's always accurate
      queryClient.invalidateQueries({ queryKey: communityKeys.posts("saved") });
    },
  });
}
