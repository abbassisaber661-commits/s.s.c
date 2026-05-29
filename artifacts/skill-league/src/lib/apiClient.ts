const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
const API_BASE = BASE + '/api-server/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(API_BASE + path, {
      headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
      ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
  } catch {
    throw new Error(`API error: ${path}`);
  }
}

function post<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

function patch<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export type ApiPlayer = {
  id: string; username: string; avatar: string; coins: number; xp: number; level: number;
  elo: number; fame: number; leagueDivision: string; unlockedLeagues: string[];
  ownedItems: string[]; xpBoostUntil: string | null; highScores: Record<string, number>;
  achievements: { id: string; date: string }[]; trophies: string[];
  dailyChallenges: Record<string, boolean>; matchesPlayed: number; matchesWon: number;
  pvpWins: number; pvpLosses: number; pvpWinStreak: number; bestPvpStreak: number;
  tournamentWins: number; bestStreak: number; skillSpeed: number; skillAccuracy: number;
  skillMemory: number; language: string; verificationStatus: string;
  piUid?: string; lastActiveAt: string; createdAt: string; updatedAt: string;
};

export type ApiPost = {
  id: string; authorId: string; username: string; level: number;
  content: string; type: string; meta: Record<string, unknown>;
  likes: number; replies: number; createdAt: string;
};

export type ApiNotification = {
  id: string; playerId: string; type: string; title: string;
  body: string; data: Record<string, unknown>; read: boolean; createdAt: string;
};

export type ApiMessage = {
  id: string; fromId: string; toId: string; content: string;
  read: boolean; deleted: boolean; createdAt: string;
};

export type ApiCoinTx = {
  id: string; playerId: string; amount: number; type: string;
  source: string; description: string; balanceAfter: number; createdAt: string;
};

export type ApiTournament = {
  id: string; name: string; type: string; status: string; size: number;
  rewardCoins: number; rewardXp: number; participants: string[];
  startAt: string; endAt?: string; createdAt: string;
};

export const api = {
  players: {
    get:    (id: string)                           => apiFetch<ApiPlayer>(`/players/${id}`),
    create: (data: Partial<ApiPlayer> & { id?: string; username: string }) => post<ApiPlayer>('/players', data),
    sync:   (id: string, data: Partial<ApiPlayer>) => post<{ ok: boolean }>(`/players/${id}/sync`, data),
    leaderboard: (limit = 50)                      => apiFetch<ApiPlayer[]>(`/players/leaderboard?limit=${limit}`),
  },

  matches: {
    list:    (playerId?: string, limit = 20)  => apiFetch<unknown[]>(`/matches?${playerId ? `playerId=${playerId}&` : ''}limit=${limit}`),
    create:  (data: Record<string, unknown>)  => post<unknown>('/matches', data),
  },

  tournaments: {
    list: ()                                  => apiFetch<ApiTournament[]>('/tournaments'),
    create: (data: Record<string, unknown>)   => post<ApiTournament>('/tournaments', data),
    join: (id: string, playerId: string)      => post<ApiTournament>(`/tournaments/${id}/join`, { playerId }),
  },

  community: {
    posts:   (limit = 30)                     => apiFetch<ApiPost[]>(`/community/posts?limit=${limit}`),
    create:  (data: Partial<ApiPost>)         => post<ApiPost>('/community/posts', data),
    like:    (postId: string, playerId: string) => post<{ liked: boolean }>(`/community/posts/${postId}/like`, { playerId }),
    comments:(postId: string)                 => apiFetch<unknown[]>(`/community/posts/${postId}/comments`),
    comment: (postId: string, data: Record<string, unknown>) => post<unknown>(`/community/posts/${postId}/comments`, data),
  },

  economy: {
    transactions: (playerId: string, limit = 50) => apiFetch<ApiCoinTx[]>(`/economy/${playerId}/transactions?limit=${limit}`),
    transaction:  (data: Record<string, unknown>)   => post<{ transaction: ApiCoinTx; newBalance: number }>('/economy/transaction', data),
    purchases:    (playerId: string)             => apiFetch<unknown[]>(`/economy/${playerId}/purchases`),
    purchase:     (data: Record<string, unknown>)   => post<unknown>('/economy/purchase', data),
    boost:        (data: Record<string, unknown>)   => post<unknown>('/economy/boost', data),
    seasons:      ()                             => apiFetch<unknown[]>('/seasons'),
  },

  notifications: {
    list:    (playerId: string, limit = 30)    => apiFetch<ApiNotification[]>(`/notifications/${playerId}?limit=${limit}`),
    create:  (data: Record<string, unknown>)   => post<ApiNotification>('/notifications', data),
    markRead:(id: string)                      => patch<{ ok: boolean }>(`/notifications/${id}/read`, {}),
    readAll: (playerId: string)                => patch<{ ok: boolean }>(`/notifications/${playerId}/read-all`, {}),
  },

  messages: {
    inbox:   (playerId: string)                => apiFetch<ApiMessage[]>(`/messages/inbox/${playerId}`),
    thread:  (a: string, b: string)            => apiFetch<ApiMessage[]>(`/messages/thread/${a}/${b}`),
    send:    (data: Record<string, unknown>)   => post<ApiMessage>('/messages', data),
    read:    (id: string)                      => patch<{ ok: boolean }>(`/messages/${id}/read`, {}),
    block:   (blockerId: string, blockedId: string) => post<{ ok: boolean }>('/messages/block', { blockerId, blockedId }),
    unblock: (blockerId: string, blockedId: string) => post<{ ok: boolean }>('/messages/unblock', { blockerId, blockedId }),
  },

  health: () => apiFetch<{ status: string }>('/healthz'),

  analytics: {
    dashboard: () => apiFetch<Record<string, unknown>>('/analytics/dashboard'),
    event: (data: Record<string, unknown>) => post<{ ok: boolean }>('/analytics/event', data),
  },

  followers: {
    get:      (id: string, viewerId?: string) => apiFetch<unknown>(`/followers/${id}${viewerId ? `?viewerId=${viewerId}` : ''}`),
    follow:   (id: string, followerId: string) => post<{ ok: boolean }>(`/followers/${id}/follow`, { followerId }),
    unfollow: (id: string, followerId: string) => fetch(API_BASE + `/followers/${id}/unfollow`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ followerId }) }).then(r => r.json()),
    following:(id: string) => apiFetch<unknown[]>(`/following/${id}`),
  },

  marketplace: {
    list:    (type?: string, maxPrice?: number) => apiFetch<unknown[]>(`/marketplace${type || maxPrice ? `?${type ? `type=${type}` : ''}${maxPrice ? `&maxPrice=${maxPrice}` : ''}` : ''}`),
    create:  (data: Record<string, unknown>)   => post<unknown>('/marketplace', data),
    buy:     (id: string, buyerId: string)     => post<{ ok: boolean }>(`/marketplace/${id}/buy`, { buyerId }),
    cancel:  (id: string, sellerId: string)    => fetch(API_BASE + `/marketplace/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sellerId }) }).then(r => r.json()),
  },

  betaFeedback: {
    submit: (data: Record<string, unknown>) => post<{ ok: boolean }>('/beta-feedback', data),
  },
};
