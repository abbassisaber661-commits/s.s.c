import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/apiClient";

interface FollowerData {
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  followers: Array<{ id: string; username: string; avatar: string; elo: number; level: number; verificationStatus: string }>;
}

export function useFollowers(targetId: string, viewerId?: string) {
  const [data, setData] = useState<FollowerData>({ followersCount: 0, followingCount: 0, isFollowing: false, followers: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!targetId) return;
    setLoading(true);
    api.followers.get(targetId, viewerId)
      .then((d: any) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [targetId, viewerId]);

  const follow = useCallback(async () => {
    if (!viewerId || !targetId) return;
    await api.followers.follow(targetId, viewerId);
    setData(prev => ({ ...prev, isFollowing: true, followersCount: prev.followersCount + 1 }));
  }, [targetId, viewerId]);

  const unfollow = useCallback(async () => {
    if (!viewerId || !targetId) return;
    await api.followers.unfollow(targetId, viewerId);
    setData(prev => ({ ...prev, isFollowing: false, followersCount: Math.max(0, prev.followersCount - 1) }));
  }, [targetId, viewerId]);

  return { ...data, loading, follow, unfollow };
}
