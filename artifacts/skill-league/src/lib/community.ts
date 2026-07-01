/**
 * Community utilities — localStorage persistence, seed data, helpers.
 * The CommunityPost type lives in @/shared/community (single source of truth).
 */

export type { CommunityPost, PostType } from "@/shared/community";
import type { CommunityPost, PostType } from "@/shared/community";

export const USER_POST_TYPES: PostType[] = ["text"];

export function isUserPost(post: CommunityPost): boolean {
  return USER_POST_TYPES.includes(post.type);
}

const POSTS_KEY = "sl_social_posts_v2";
const LIKED_KEY = "sl_liked_posts";

export const BOOST_COST = 50;

export function getLikedPostIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LIKED_KEY) || "[]");
  } catch {
    return [];
  }
}

function getLikedIds(): string[] {
  return getLikedPostIds();
}

function saveLikedIds(ids: string[]) {
  localStorage.setItem(LIKED_KEY, JSON.stringify(ids));
}

export function getCommunityPosts(): CommunityPost[] {
  try {
    const raw = localStorage.getItem(POSTS_KEY);
    if (raw) return JSON.parse(raw) as CommunityPost[];
  } catch {
    /* ignore */
  }
  return getSeedPosts();
}

export function saveCommunityPosts(posts: CommunityPost[]) {
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts.slice(0, 100)));
}

export function createPost(
  authorName: string,
  authorLevel: number,
  authorFame: number,
  content: string,
  type: PostType,
  imageUrl?: string,
): CommunityPost {
  return {
    id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    authorName,
    authorLevel,
    authorFame,
    content,
    imageUrl: imageUrl || undefined,
    type,
    timestamp: Date.now(),
    likes: 0,
    views: 0,
    boosted: false,
    boostExpiry: null,
    likedByMe: false,
    savedByMe: false,
  };
}

export function addPost(post: CommunityPost): CommunityPost[] {
  const posts = getCommunityPosts();
  const updated = [post, ...posts].slice(0, 100);
  saveCommunityPosts(updated);
  return updated;
}

export function likePost(postId: string): CommunityPost[] {
  const posts = getCommunityPosts();
  const likedIds = getLikedIds();
  const alreadyLiked = likedIds.includes(postId);
  const updated = posts.map((p) => {
    if (p.id !== postId) return p;
    if (alreadyLiked)
      return { ...p, likes: Math.max(0, p.likes - 1), likedByMe: false };
    return { ...p, likes: p.likes + 1, likedByMe: true };
  });
  if (alreadyLiked) {
    saveLikedIds(likedIds.filter((id) => id !== postId));
  } else {
    saveLikedIds([...likedIds, postId]);
  }
  saveCommunityPosts(updated);
  return updated;
}

export function boostPost(postId: string): CommunityPost[] {
  const posts = getCommunityPosts();
  const boostDuration = 24 * 60 * 60 * 1000;
  const updated = posts.map((p) =>
    p.id === postId
      ? { ...p, boosted: true, boostExpiry: Date.now() + boostDuration }
      : p,
  );
  const sorted = updated.sort((a, b) => {
    if (a.boosted && !b.boosted) return -1;
    if (!a.boosted && b.boosted) return 1;
    return b.timestamp - a.timestamp;
  });
  saveCommunityPosts(sorted);
  return sorted;
}

export function getPostAge(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function getSeedPosts(): CommunityPost[] {
  const now = Date.now();
  const posts: CommunityPost[] = [
    {
      id: "seed_1",
      authorName: "QuantumBolt77",
      authorLevel: 34,
      authorFame: 820,
      content:
        "🏆 Just won an 8-player tournament! The final round was so intense. GGs everyone!",
      type: "text",
      timestamp: now - 12 * 60_000,
      likes: 14,
      views: 0,
      boosted: true,
      boostExpiry: now + 10 * 3600_000,
      likedByMe: false,
      savedByMe: false,
    },
    {
      id: "seed_2",
      authorName: "NeonArrow42",
      authorLevel: 28,
      authorFame: 430,
      content:
        "⚔️ On a 7-game PvP win streak right now. Who dares to challenge me? 😈",
      type: "text",
      timestamp: now - 40 * 60_000,
      likes: 8,
      views: 0,
      boosted: false,
      boostExpiry: null,
      likedByMe: false,
      savedByMe: false,
    },
    {
      id: "seed_3",
      authorName: "SwiftHawk99",
      authorLevel: 52,
      authorFame: 1240,
      content:
        "💎 Just hit Level 50! Halfway Hero status. This game is genuinely addictive 🔥",
      type: "text",
      timestamp: now - 2 * 3600_000,
      likes: 22,
      views: 0,
      boosted: false,
      boostExpiry: null,
      likedByMe: false,
      savedByMe: false,
    },
    {
      id: "seed_4",
      authorName: "IronMind55",
      authorLevel: 15,
      authorFame: 110,
      content:
        "🎯 98% accuracy in a Bronze match today. Memory mode is hard but I'm getting the hang of it!",
      type: "text",
      timestamp: now - 5 * 3600_000,
      likes: 5,
      views: 0,
      boosted: false,
      boostExpiry: null,
      likedByMe: false,
      savedByMe: false,
    },
    {
      id: "seed_5",
      authorName: "StarFox21",
      authorLevel: 8,
      authorFame: 60,
      content:
        "Just discovered this game. The reaction mode is insane 😂 anyone got tips for memory challenges?",
      type: "text",
      timestamp: now - 8 * 3600_000,
      likes: 3,
      views: 0,
      boosted: false,
      boostExpiry: null,
      likedByMe: false,
      savedByMe: false,
    },
  ];
  saveCommunityPosts(posts);
  return posts;
}
