// ─────────────────────────────────────────────
// 👥 SkillLeague Friends Engine
// ─────────────────────────────────────────────

export interface Friend {
  id: string;
  username: string;
  online: boolean;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  createdAt: number;
}

export function addFriend(
  friends: Friend[],
  friend: Friend
): Friend[] {
  const exists = friends.some(
    (f) => f.id === friend.id
  );

  if (exists) return friends;

  return [...friends, friend];
}

export function removeFriend(
  friends: Friend[],
  friendId: string
): Friend[] {
  return friends.filter(
    (f) => f.id !== friendId
  );
}

export function updateFriendStatus(
  friends: Friend[],
  friendId: string,
  online: boolean
): Friend[] {
  return friends.map((f) =>
    f.id === friendId
      ? {
          ...f,
          online,
        }
      : f
  );
}

export function getOnlineFriends(
  friends: Friend[]
): Friend[] {
  return friends.filter(
    (f) => f.online
  );
}