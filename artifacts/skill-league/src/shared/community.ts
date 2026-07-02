/**
 * Single source of truth for CommunityPost types.
 * All components, hooks, and API clients import from here.
 */

export type PostType =
  | "text"
  | "image"
  | "video"
  | "achievement"
  | "poll"
  | "pvp_win"
  | "tournament"
  | "level_up";

export interface CommunityPost {
  id: string;

  authorId?: string;
  authorName: string;
  authorLevel: number;
  authorFame?: number;
  authorIsOwner?: boolean;

  content: string;
  imageUrl?: string;

  type: PostType;
  timestamp: number;

  likes: number;
  likedByMe: boolean;
  savedByMe: boolean;
  views: number;
  replyCount?: number;

  isPinned?: boolean;
  isPublic?: boolean;

  boosted?: boolean;
  boostExpiry?: number | null;

  location?: string;
  tags?: string[];
}

export interface CreatePostPayload {
  /** Server-side player identity — required by backend */
  authorId?: string;
  username?: string;
  level?: number;

  content: string;
  /** Single image URL — matches backend `imageUrl` column */
  imageUrl?: string;
  type?: PostType;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextPage?: number | null;
  total?: number;
}

/** Shape returned by the legacy /community/posts endpoint (array, no pagination) */
export interface ApiPost {
  id: string;
  authorId?: string;
  username: string;
  level: number;
  content: string;
  imageUrl?: string | null;
  type?: string;
  createdAt: string;
  likes: number;
  replies?: number;
  likedByMe?: boolean;
  savedByMe?: boolean;
  views?: number;
}
