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
  dnBalance?: number;
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
    getPosts: (type: string, page = 1, limit = 15, playerId?: string | null, authorId?: string | null) => {
      const qs = new URLSearchParams({ type, page: String(page), limit: String(limit) });
      if (playerId) qs.set("playerId", playerId);
      if (authorId) qs.set("authorId", authorId);
      return apiFetch<PaginatedResponse<CommunityPost>>(`/community/posts?${qs}`);
    },

    /** Legacy flat array — used by Community.tsx / Home.tsx / services */
    posts: (limit = 30, playerId?: string | null): Promise<ApiPost[]> => {
      const qs = new URLSearchParams({ limit: String(limit), format: "flat" });
      if (playerId) qs.set("playerId", playerId);
      return get<ApiPost[]>(`/community/posts?${qs}`);
    },

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

    likePost: (postId: string, like: boolean, playerId?: string | null, playerUsername?: string | null) =>
      patch<{ postId: string; likes: number; likedByMe: boolean }>(
        `/community/posts/${postId}/like`,
        { like, playerId: playerId ?? undefined, playerUsername: playerUsername ?? undefined },
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

    /** Delete a comment (owner only) */
    deleteComment: (postId: string, commentId: string, authorId: string) =>
      apiFetch<{ ok: boolean }>(`/community/posts/${postId}/comments/${commentId}`, {
        method: "DELETE",
        body: JSON.stringify({ authorId }),
      }),

    /** Delete a post (owner only) */
    deletePost: (postId: string, authorId: string) =>
      apiFetch<{ ok: boolean }>(`/community/posts/${postId}`, {
        method: "DELETE",
        body: JSON.stringify({ authorId }),
      }),

    /** Edit post content (owner only) */
    editPost: (postId: string, authorId: string, content: string) =>
      patch<{ ok: boolean }>(`/community/posts/${postId}`, { authorId, content }),

    /** Pin / unpin a post (owner only) */
    pinPost: (postId: string, authorId: string, isPinned: boolean) =>
      patch<{ ok: boolean; isPinned: boolean }>(`/community/posts/${postId}/pin`, { authorId, isPinned }),

    /** Toggle public / private visibility (owner only) */
    setVisibility: (postId: string, authorId: string, isPublic: boolean) =>
      patch<{ ok: boolean; isPublic: boolean }>(`/community/posts/${postId}/visibility`, { authorId, isPublic }),

    /** Toggle save/unsave a post for the current player — backend-persistent */
    savePost: (postId: string, playerId: string) =>
      post<{ saved: boolean; postId: string }>(
        `/community/posts/${postId}/save`,
        { playerId },
      ),

    /** Increment view count — fire-and-forget from IntersectionObserver */
    viewPost: (postId: string) =>
      post<{ ok: boolean; views: number; postId: string }>(
        `/community/posts/${postId}/view`,
        {},
      ),

    /** Fetch all saved posts for a player */
    getSavedPosts: (playerId: string, page = 1, limit = 15) =>
      apiFetch<PaginatedResponse<CommunityPost>>(
        `/community/saved?playerId=${playerId}&page=${page}&limit=${limit}`,
      ),

    /** Report a post (any user) */
    reportPost: (postId: string, reporterId: string, reason?: string) =>
      post<{ ok: boolean }>(`/community/posts/${postId}/report`, { reporterId, reason }),
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

  /* ── Owner Panel ── */
  owner: {
    overview: () =>
      get<{
        total_players: string;
        active_7d: string;
        active_24h: string;
        verified_players: string;
        pending_verifications: string;
        suspended_players: string;
        new_players_24h: string;
        matches_24h: string;
        total_gifts: string;
        total_dn_volume: string;
        open_flags: string;
      }>("/owner/overview"),

    users: (page = 1, limit = 20, search = "") =>
      get<{
        users: {
          id: string;
          username: string;
          avatar: string;
          level: number;
          matchesPlayed: number;
          verified: boolean;
          verificationStatus: string;
          suspended: boolean;
          createdAt: string;
          lastActiveAt: string;
        }[];
        total: number;
        page: number;
        limit: number;
      }>(`/owner/users?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`),

    forceVerify: (userId: string) =>
      patch<{ ok: boolean; userId: string; verified: boolean; verificationStatus: string }>(
        `/owner/users/${userId}/force-verify`, {},
      ),

    removeVerify: (userId: string) =>
      patch<{ ok: boolean; userId: string; verified: boolean; verificationStatus: string }>(
        `/owner/users/${userId}/remove-verify`, {},
      ),

    suspend: (userId: string) =>
      patch<{ ok: boolean; userId: string; suspended: boolean }>(
        `/owner/users/${userId}/suspend`, {},
      ),
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
        xp: { gained: number; oldXp: number; newXp: number; oldLevel: number; newLevel: number; levelUp: boolean };
        coins: { earned: number; oldCoins: number; newCoins: number };
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

  /* ── Jobs ── */
  jobs: {
    list: (params?: { type?: string; category?: string; country?: string; q?: string }) => {
      const qs = new URLSearchParams();
      if (params?.type)     qs.set("type",     params.type);
      if (params?.category) qs.set("category", params.category);
      if (params?.country)  qs.set("country",  params.country);
      if (params?.q)        qs.set("q",        params.q);
      return get<{ id: string; authorId: string; authorName: string; title: string; description: string; jobType: string; country: string; category: string; createdAt: string }[]>(
        `/jobs${qs.toString() ? `?${qs}` : ""}`,
      );
    },

    create: (data: { authorId: string; authorName: string; title: string; description: string; jobType?: string; country?: string; category?: string }) =>
      post<{ id: string; authorId: string; authorName: string; title: string; description: string; jobType: string; country: string; category: string; createdAt: string }>(
        "/jobs", data,
      ),

    delete: (jobId: string, authorId: string) =>
      apiFetch<{ ok: boolean }>(`/jobs/${jobId}`, {
        method: "DELETE",
        body: JSON.stringify({ authorId }),
      }),
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

  /* ── Denous Wallet — DN$ points only. Non-transferable, no monetary value,
   * no conversion to/from Pi. There is intentionally no "send"/"gift" method
   * here; gifting is real money and goes exclusively through `api.pi`. ── */
  wallet: {
    getBalance: (playerId: string) =>
      get<{
        dnBalance: number;
        totalEarnedPi: number;
        pendingPi: number;
        availablePi: number;
        totalIncome: number;
        totalSpending: number;
      }>(`/wallet/${playerId}`),

    getTransactions: (playerId: string, filter: "all" | "income" | "spending" = "all", page = 1, limit = 20) =>
      get<{
        data: {
          id: string;
          playerId: string;
          amount: number;
          type: string;
          description: string;
          relatedId: string | null;
          balanceAfter: number;
          createdAt: string;
        }[];
        total: number;
        page: number;
        limit: number;
      }>(`/wallet/${playerId}/transactions?filter=${filter}&page=${page}&limit=${limit}`),

    credit: (playerId: string, amount: number, type: string, description?: string) =>
      post<{ ok: boolean; newBalance: number }>(
        "/wallet/credit",
        { playerId, amount, type, description },
      ),
  },

  /* ── Pi Gift Leaderboard & Trending (gifts are always paid in Pi) ── */
  leaderboardDN: {
    topEarners: (limit = 20) =>
      get<{ playerId: string; username: string; totalReceivedPi: number; totalReceived: number }[]>(
        `/leaderboard/top-earners?limit=${limit}`
      ),
    topSupporters: (limit = 20) =>
      get<{ playerId: string; username: string; totalSentPi: number; totalSent: number }[]>(
        `/leaderboard/top-supporters?limit=${limit}`
      ),
    topPosts: (limit = 20) =>
      get<{ postId: string; authorUsername: string; authorId: string; content: string; imageUrl: string | null; totalGiftAmount: number; totalGiftCount: number; lastGiftTime: string }[]>(
        `/leaderboard/top-posts?limit=${limit}`
      ),
  },

  trending: {
    posts: (limit = 10) =>
      get<{ postId: string; authorUsername: string; authorId: string; content: string; imageUrl: string | null; createdAt: string; totalGiftAmount: number; totalGiftCount: number; last24hAmount: number; trendScore: number }[]>(
        `/trending/posts?limit=${limit}`
      ),
  },

  /* ── Gift Ledger Analytics ── */
  gifts: {
    postStats: (postId: string) =>
      get<{
        totalGiftAmount: number;
        totalGiftCount:  number;
        lastGiftTime:    string | null;
        topSenders:      { senderId: string; username: string; totalAmount: number; giftCount: number }[];
      }>(`/gifts/post/${postId}/stats`),

    userStats: (userId: string) =>
      get<{
        totalSentPi:           number;
        totalReceivedPi:       number;
        totalGiftTransactions: number;
        totalSent:             number;
        totalReceived:         number;
      }>(`/gifts/user/${userId}/stats`),

    userHistory: (userId: string, dir: "sent" | "received" | "both" = "both", page = 1, limit = 20) =>
      get<{ data: unknown[]; total: number; page: number; limit: number }>(
        `/gifts/user/${userId}/history?dir=${dir}&page=${page}&limit=${limit}`
      ),
  },

  /* ── Verification ── */
  verification: {
    /** Request verification for the logged-in user */
    request: () =>
      post<{ ok: boolean; status: string }>("/verification/request", {}),

    /** Get verification status for any user */
    status: (userId: string) =>
      get<{ id: string; username: string; verified: boolean; verificationStatus: string }>(
        `/verification/status/${userId}`,
      ),

    /** Admin: list all pending verification requests */
    pending: () =>
      get<{
        id: string;
        username: string;
        avatar: string;
        level: number;
        matchesPlayed: number;
        verificationStatus: string;
        verificationRequestedAt: string | null;
        createdAt: string;
      }[]>("/verification/pending"),

    /** Admin: approve a user's verification */
    approve: (userId: string) =>
      patch<{ ok: boolean; userId: string; status: string }>(
        `/verification/${userId}/approve`, {},
      ),

    /** Admin: reject a user's verification */
    reject: (userId: string) =>
      patch<{ ok: boolean; userId: string; status: string }>(
        `/verification/${userId}/reject`, {},
      ),
  },

  /* ── Pi Payments ── */
  pi: {
    create: (data: { amount: number; memo: string; [key: string]: unknown }) =>
      post<{ paymentId: string }>("/pi/payments", data),

    approve: (paymentId: string, piPaymentId: string) =>
      post<{ ok: boolean }>(`/pi/payments/${paymentId}/approve`, { piPaymentId }),

    complete: (paymentId: string, txId: string) =>
      post<{ ok: boolean }>(`/pi/payments/${paymentId}/complete`, { txId }),

    /** Call when the Pi SDK payment is cancelled or errors out before completion,
     * so the pending ledger entry doesn't stay stuck forever. */
    fail: (paymentId: string, reason?: string) =>
      post<{ ok: boolean; status: string }>(`/pi/payments/${paymentId}/fail`, { reason }),

    ledger: (playerId: string) =>
      get<{
        data: {
          id: string;
          kind: "gift" | "purchase";
          senderId: string;
          senderName: string;
          receiverId: string | null;
          receiverName: string | null;
          amountPi: number;
          status: "pending" | "confirmed" | "failed";
          txId: string | null;
          memo: string;
          createdAt: string;
          completedAt: string | null;
        }[];
      }>(`/pi/ledger/${playerId}`),
  },
};

/* ───────────── Exported Types ───────────── */
export interface DailyStatus {
  canPlay: boolean;
  nextMatchAt: string | null;
  matchesPlayedToday: number;
}
