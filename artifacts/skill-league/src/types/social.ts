export interface Post {
  id: string;
  content: string;
  originalContent: string;
  language: string;
  likes: number;
  likedByMe: boolean;
  replies: number;
  authorId: string;
  authorName?: string;
  authorLevel?: number;
  imageUrl?: string;
  createdAt?: string | number;
  type?: "text" | "image" | "reel";
  isSaved?: boolean;
}
