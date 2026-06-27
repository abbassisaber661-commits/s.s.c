/**
 * friends.ts — API-based follow/friend system.
 * Backed by /followers API endpoints. No localStorage.
 */
import { api, getStoredPlayerId } from "@/lib/apiClient";

export type FriendStatus = "none" | "pending_sent" | "friends";

export interface FriendEntry {
  id: string;
  username: string;
  level?: number;
  avatar?: string;
  status: FriendStatus;
}

/**
 * Synchronous stub — returns 'none'.
 * Use checkFollowStatus() for the real async check.
 */
export function getFriendStatus(_me: string, _them: string): FriendStatus {
  return "none";
}

/**
 * Async: check if myId follows theirId via API.
 */
export async function checkFollowStatus(
  myId: string,
  theirId: string,
): Promise<FriendStatus> {
  if (!myId || !theirId || myId === theirId) return "none";
  try {
    const data = await api.followers.get(theirId, myId);
    return data.isFollowing ? "friends" : "none";
  } catch {
    return "none";
  }
}

/**
 * Follow a player (replaces sendFriendRequest).
 */
export async function sendFriendRequest(
  _me: string,
  _them: string,
  myId?: string,
  theirId?: string,
): Promise<void> {
  const from = myId ?? getStoredPlayerId();
  if (!from || !theirId) return;
  await api.followers.follow(theirId, from);
}

/**
 * Follow by IDs directly.
 */
export async function followPlayer(myId: string, theirId: string): Promise<void> {
  if (!myId || !theirId || myId === theirId) return;
  await api.followers.follow(theirId, myId);
}

/**
 * Unfollow a player (replaces unfriend).
 */
export async function unfriend(
  _me: string,
  _them: string,
  myId?: string,
  theirId?: string,
): Promise<void> {
  const from = myId ?? getStoredPlayerId();
  if (!from || !theirId) return;
  await api.followers.unfollow(theirId, from);
}

/**
 * Unfollow by IDs directly.
 */
export async function unfollowPlayer(myId: string, theirId: string): Promise<void> {
  if (!myId || !theirId) return;
  await api.followers.unfollow(theirId, myId);
}

/**
 * Get list of players the current user follows (their "friends").
 */
export async function getFriendsListAsync(myId: string): Promise<FriendEntry[]> {
  if (!myId) return [];
  try {
    const entries = await api.followers.listFollowing(myId, myId);
    return entries.map(e => ({
      id:       e.id,
      username: e.username,
      level:    e.level,
      avatar:   e.avatar,
      status:   "friends" as FriendStatus,
    }));
  } catch {
    return [];
  }
}

/**
 * Synchronous stub for backwards-compat (returns empty).
 * Use getFriendsListAsync() for real data.
 */
export function getFriendsList(_me: string): FriendEntry[] {
  return [];
}

export function getFriendsCount(_me: string): number {
  return 0;
}
