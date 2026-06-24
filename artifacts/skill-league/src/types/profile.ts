// TODO: Add profile type definitions

export interface Post {
  id: string;
  type: "text" | "image" | "reel";
  content: string;
  imageUrl?: string;
  likes: number;
  comments: number;
  isSaved?: boolean;
  timestamp: number;
  authorName: string;
  authorLevel: number;
}

export interface ProfileData {
  id: string;
  username: string;
  avatar?: string;
  cover?: string;
  bio?: string;
  level: number;
  postsCount: number;
  reelsCount?: number;
  savedCount?: number;
  followers: number;
  following: number;
  isFollowing?: boolean;
}
