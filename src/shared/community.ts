export type PostType = "text" | "image" | "video" | "achievement" | "poll";

export interface CommunityPost {
  id: string;

  authorId: string;
  authorName: string;
  authorLevel: number;

  content: string;
  imageUrl?: string;

  type: PostType;
  timestamp: number;

  likes: number;
  likedByMe: boolean;
  replyCount: number;

  boosted?: boolean;
  boostExpiry?: number | null;

  location?: string;
  tags?: string[];
}

export interface CreatePostPayload {
  content: string;
  imageUrls?: string[];
  type?: PostType;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextPage?: number | null;
  total?: number;
}