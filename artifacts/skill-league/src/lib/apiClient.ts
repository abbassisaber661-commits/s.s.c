const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
const API_BASE = BASE + '/api';

const TOKEN_KEY = 'sl_jwt_token';
const PLAYER_ID_KEY = 'sl_player_id';

/* ───────────── Auth Storage ───────────── */
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const getStoredPlayerId = () => localStorage.getItem(PLAYER_ID_KEY);
export const setStoredPlayerId = (id: string) =>
  localStorage.setItem(PLAYER_ID_KEY, id);

/* ───────────── Core Fetch ───────────── */
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearToken();
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || `HTTP ${res.status}`);
  }

  return res.json();
}

/* ───────────── Methods ───────────── */
const post = <T>(p: string, b: unknown) =>
  apiFetch<T>(p, { method: "POST", body: JSON.stringify(b) });

const patch = <T>(p: string, b: unknown) =>
  apiFetch<T>(p, { method: "PATCH", body: JSON.stringify(b) });

/* ───────────── API ───────────── */
export const api = {
  community: {
    getPosts: (type: string, page = 1, limit = 10) =>
      apiFetch<PaginatedResponse<CommunityPost>>(
        `/community/posts?type=${type}&page=${page}&limit=${limit}`
      ),

    createPost: (payload: CreatePostPayload) =>
      post<CommunityPost>("/community/posts", payload),

    likePost: (postId: string, like: boolean) =>
      patch<{ postId: string; likes: number; likedByMe: boolean }>(
        `/community/posts/${postId}/like`,
        { like }
      ),

    addComment: (postId: string, content: string) =>
      post<{ postId: string; replyCount: number }>(
        `/community/posts/${postId}/comments`,
        { content }
      ),
  },
};