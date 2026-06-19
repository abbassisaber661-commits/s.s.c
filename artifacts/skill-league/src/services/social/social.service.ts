import { api } from "@/lib/apiClient";
import { getStoredPlayerId } from "@/lib/apiClient";

export async function fetchTrendingHashtags(): Promise<{ tag: string; postCount: number }[]> {
  try {
    const data = await api.social.hashtagsTrending();
    return Array.isArray(data?.trending) ? data.trending : [];
  } catch {
    return [];
  }
}

export async function fetchNotifications(): Promise<number> {
  try {
    const playerId = getStoredPlayerId();
    if (!playerId) return 0;
    const data = await api.notifications.list(playerId);
    return Array.isArray(data) ? data.filter((n: any) => !n.read).length : 0;
  } catch {
    return 0;
  }
}
