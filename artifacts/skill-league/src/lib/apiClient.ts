import type {
  CommunityPost,
  CreatePostPayload,
  PaginatedResponse,
  ApiPost,
} from "@/shared/community";
import type { FollowEntry } from "@/types/profile";

export type { ApiPost, FollowEntry };

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const API_BASE = BASE + "/api";

const TOKEN_KEY = "sl_jwt_token";
const PLAYER_ID_KEY = "sl_player_id";

/* ───────────── Auth Storage ───────────── */
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const getStoredPlayerId = () => localStorage.getItem(PLAYER_ID_KEY);
export const setStoredPlayerId = (id: string) =>
  localStorage.setItem(PLAYER_ID_KEY, id);

/* ───────────── Availability check ───────────── */
export async function isApiAvailable(): Promise<boolean> {
  try {
    const res = await fetch(API_BASE + "/health", { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

/* ───────────── Shared Types ───────────── */
export interface ApiPlayer {
  id: string;
  username: string;
  level: number;
  xp: number;
  coins: number;
  elo: number;
  fame?: number;
  language?: string;
  [key: string]: unknown;
}

export interface ApiStory {
  id: string;
  authorId: string;
  authorName: string;
  imageUrl?: string;
  videoUrl?: string;
  text?: string;
  expiresAt: string;
  createdAt: string;
  views: number;
  likes?: Record<string, true>;
}

export interface ApiMessage {
  id: string;
  fromId: string;
  toId: string;
  content: string;
  createdAt: string;
  read: boolean;
}

export interface ApiNotification {
  id: string;
  type: string;
  fromId?: string;
  fromName?: string;
  targetId?: string;
  content?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

/* ───────────── Core Fetch ───────────── */
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error((err as { error?: string } | null)?.error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

/* ───────────── HTTP helpers ───────────── */
const get = <T>(p: string) => apiFetch<T>(p);

const post = <T>(p: string, b: unknown) =>
  apiFetch<T>(p, { method: "POST", body: JSON.stringify(b) });

const patch = <T>(p: string, b: unknown) =>
  apiFetch<T>(p, { method: "PATCH", body: JSON.stringify(b) });

const del = <T>(p: string) =>
  apiFetch<T>(p, { method: "DELETE" });

/* ───────────── API ───────────── */
export const api = {
  /* ── Community ── */
  community: {
    /** Paginated feed — used by useCommunity / FeedPage / infinite scroll */
    getPosts: (type: string, page = 1, limit = 15) =>
      apiFetch<PaginatedResponse<CommunityPost>>(
        `/community/posts?type=${type}&page=${page}&limit=${limit}`,
      ),

    /** Legacy flat array — used by Community.tsx / Home.tsx / services */
    posts: (limit = 30): Promise<ApiPost[]> =>
      get<ApiPost[]>(`/community/posts?limit=${limit}&format=flat`),

    /** Creates a post — payload MUST include authorId for backend to accept */
    createPost: (payload: CreatePostPayload) =>
      post<CommunityPost>("/community/posts", payload),

    /** Legacy create with explicit fields (posts.service.ts) */
    create: (payload: {
      authorId: string;
      content: string;
      imageUrl?: string | null;
      type?: string;
    }) => post<ApiPost>("/community/posts", payload),

    likePost: (postId: string, like: boolean) =>
      patch<{ postId: string; likes: number; likedByMe: boolean }>(
        `/community/posts/${postId}/like`,
        { like },
      ),

    /** Legacy toggle like — PostCard / Home / likes.service */
    like: (_postId: string, _playerId?: string) =>
      patch<{ liked: boolean; likes: number }>(
        `/community/posts/${_postId}/like`,
        { toggle: true },
      ),

    addComment: (postId: string, content: string) =>
      post<{ postId: string; replyCount: number }>(
        `/community/posts/${postId}/comments`,
        { content },
      ),

    /** Legacy comment — PostCard / CommentsSheet / comments.service */
    comment: (
      postId: string,
      data: { authorId?: string; username?: string; content: string },
    ) =>
      post<{ id: string; postId: string; content: string; createdAt: string }>(
        `/community/posts/${postId}/comments`,
        data,
      ),

    /** Fetch comments list (CommentsSheet / comments.service) */
    comments: (postId: string) =>
      get<{ id: string; authorName: string; content: string; createdAt: string }[]>(
        `/community/posts/${postId}/comments`,
      ),
  },

  /* ── Auth ── */
  auth: {
    register: (username: string, password: string, language?: string) =>
      post<{ token: string; player: ApiPlayer }>("/auth/register", {
        username,
        password,
        language,
      }),

    login: (username: string, password: string) =>
      post<{ token: string; player: ApiPlayer }>("/auth/login", {
        username,
        password,
      }),

    guest: (guestId: string, username: string) =>
      post<{ token: string; player: ApiPlayer }>("/auth/guest", {
        guestId,
        username,
      }),

    pi: (accessToken: string) =>
      post<{ token: string; player: ApiPlayer }>("/auth/pi", { accessToken }),
  },

  /* ── Players ── */
  players: {
    get: (playerId: string) =>
      get<ApiPlayer>(`/players/${playerId}`),

    sync: (playerId: string, data: Partial<ApiPlayer>) =>
      patch<ApiPlayer>(`/players/${playerId}`, data),

    create: (data: Partial<ApiPlayer>) =>
      post<ApiPlayer>("/players", data),

    leaderboard: (limit = 50) =>
      get<{ players: ApiPlayer[]; total: number }>(`/players/leaderboard?limit=${limit}`),
  },

  /* ── Followers ── */
  followers: {
    get: (targetId: string, viewerId?: string) =>
      get<{ followersCount: number; followingCount: number; isFollowing: boolean }>(
        `/followers/${targetId}${viewerId ? `?viewerId=${viewerId}` : ""}`,
      ),

    /** List of users who follow targetId (with profile data) */
    list: (targetId: string, viewerId?: string) =>
      get<FollowEntry[]>(
        `/followers/${targetId}/list${viewerId ? `?viewerId=${viewerId}` : ""}`,
      ),

    /** List of users that targetId follows (with profile data) */
    listFollowing: (targetId: string, viewerId?: string) =>
      get<FollowEntry[]>(
        `/followers/${targetId}/following${viewerId ? `?viewerId=${viewerId}` : ""}`,
      ),

    follow: (targetId: string, followerId: string) =>
      post<{ ok: boolean }>(`/followers/follow`, { followerId, followingId: targetId }),

    unfollow: (targetId: string, followerId: string) =>
      post<{ ok: boolean }>(`/followers/unfollow`, { followerId, followingId: targetId }),
  },

  /* ── Stories ── */
  stories: {
    list: (limit = 50) =>
      get<ApiStory[]>(`/stories?limit=${limit}`),

    create: (data: {
      authorId: string;
      authorName: string;
      authorLevel?: number;
      emoji?: string;
      imageUrl?: string;
      videoUrl?: string;
      text?: string;
      content?: string;
    }) => post<ApiStory>("/stories", data),

    view: (storyId: string) =>
      post<{ ok: boolean }>(`/stories/${storyId}/view`, {}),

    like: (storyId: string, userId: string) =>
      post<{ ok: boolean }>(`/stories/${storyId}/like`, { userId }),

    delete: (storyId: string) =>
      del<{ ok: boolean }>(`/stories/${storyId}`),
  },

  /* ── Social / Search / Profile ── */
  social: {
    search: (query: string, type?: string, _sort?: string) =>
      get<{ users?: ApiPlayer[]; posts?: ApiPost[]; hashtags?: { tag: string; count: number }[] }>(
        `/social/search?q=${encodeURIComponent(query)}${type ? `&type=${type}` : ""}`,
      ),

    profile: (userId: string) =>
      get<{
        player: ApiPlayer;
        followers: number;
        following: number;
        posts: ApiPost[];
      }>(`/social/profile/${userId}`),

    postsByHashtag: (tag: string, page = 1) =>
      get<{ posts: ApiPost[]; total: number; tag: string }>(
        `/social/posts/hashtag/${encodeURIComponent(tag)}?page=${page}`,
      ),

    hashtagsTrending: (_period?: string) =>
      get<{ tag: string; count: number }[]>("/social/hashtags/trending"),

    trending: (_window?: string) =>
      get<{ posts: ApiPost[]; users: ApiPlayer[]; trendingPosts?: ApiPost[]; trendingHashtags?: { tag: string; count: number }[] }>("/social/trending"),
  },

  /* ── Messages / DMs ── */
  messages: {
    thread: (userId1: string, userId2: string) =>
      get<ApiMessage[]>(`/messages/thread/${userId1}/${userId2}`),

    send: (data: { fromId: string; toId: string; content: string }) =>
      post<ApiMessage>("/messages", data),

    read: (messageId: string) =>
      patch<{ ok: boolean }>(`/messages/${messageId}/read`, {}),

    inbox: (playerId: string) =>
      get<ApiMessage[]>(`/messages/inbox/${playerId}`),
  },

  /* ── Analytics ── */
  analytics: {
    event: (data: {
      type: string;
      playerId?: string;
      timestamp?: string;
      [key: string]: unknown;
    }) => post<{ ok: boolean }>("/analytics/events", data),

    dashboard: () =>
      get<{
        activeUsers: number;
        totalPosts: number;
        totalMatches: number;
        [key: string]: unknown;
      }>("/analytics/dashboard"),
  },

  /* ── Admin ── */
  admin: {
    stats: () =>
      get<{
        users: number;
        posts: number;
        matches: number;
        [key: string]: unknown;
      }>("/admin/stats"),

    suspicious: () =>
      get<{ playerId: string; reason: string }[]>("/admin/suspicious"),
  },

  /* ── Daily Economy ── */
  daily: {
    status: (playerId: string) =>
      get<{
        coins: number;
        tasks: { id: string; completed: boolean; reward: number }[];
      }>(`/daily/status/${playerId}`),

    claim: (playerId: string, taskId: string) =>
      post<{ reward: number; total: number; awarded: boolean; coins: number }>(
        `/daily/claim`,
        { playerId, taskId },
      ),
  },

  /* ── Matches ── */
  matches: {
    dailyStatus: (playerId?: string) =>
      get<DailyStatus>(
        `/matches/daily-status${playerId ? `?playerId=${playerId}` : ""}`,
      ),

    create: (data: {
      playerId?: string;
      playerAId?: string;
      playerBId?: string;
      tier?: string;
      mode?: string;
      leagueId?: string;
      [key: string]: unknown;
    }) => post<{
      matchId?: string;
      rewards?: {
        lp: { newLp: number; oldLp: number; delta: number; oldTier: string; newTier: string };
        xp: { gained: number };
        coins: number;
      };
      [key: string]: unknown;
    }>("/matches", data),

    list: (playerId: string) =>
      get<{ matchId: string; result: string; coins: number; xp: number; createdAt: string }[]>(
        `/matches?playerId=${playerId}`,
      ),
  },

  /* ── Marketplace ── */
  marketplace: {
    list: () =>
      get<{ id: string; name: string; price: number; type: string; [key: string]: unknown }[]>(
        "/marketplace/items",
      ),

    buy: (itemId: string, playerId: string) =>
      post<{ ok: boolean; newBalance: number }>("/marketplace/buy", {
        itemId,
        playerId,
      }),

    create: (data: {
      name?: string;
      price: number;
      type?: string;
      sellerId?: string;
      itemId?: string;
      itemName?: string;
      itemEmoji?: string;
      itemType?: string;
      [key: string]: unknown;
    }) =>
      post<{ id: string; [key: string]: unknown }>("/marketplace/items", data),
  },

  /* ── Beta Feedback ── */
  betaFeedback: {
    submit: (data: { [key: string]: unknown }) =>
      post<{ ok: boolean; valid?: boolean }>("/beta/feedback", data),
  },

  /* ── Notifications ── */
  notifications: {
    list: (playerId: string, limit = 50) =>
      get<ApiNotification[]>(`/notifications/${playerId}?limit=${limit}`),

    readAll: (playerId: string) =>
      post<{ ok: boolean }>("/notifications/read-all", { playerId }),

    markRead: (notifId: string) =>
      patch<{ ok: boolean }>(`/notifications/${notifId}/read`, {}),

    create: (data: { playerId: string; type: string; [key: string]: unknown }) =>
      post<{ ok: boolean }>("/notifications", data),
  },

  /* ── Pi Payments ── */
  pi: {
    create: (data: { amount: number; memo: string; [key: string]: unknown }) =>
      post<{ paymentId: string }>("/pi/payments", data),

    approve: (paymentId: string, piPaymentId: string) =>
      post<{ ok: boolean }>(`/pi/payments/${paymentId}/approve`, { piPaymentId }),

    complete: (paymentId: string, txId: string) =>
      post<{ ok: boolean }>(`/pi/payments/${paymentId}/complete`, { txId }),
  },
};

/* ───────────── Exported Types ───────────── */
export interface DailyStatus {
  canPlay: boolean;
  nextMatchAt: string | null;
  matchesPlayedToday: number;
}
