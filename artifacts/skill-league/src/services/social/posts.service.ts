import { api, getStoredPlayerId } from "@/lib/apiClient";
import { getSocket } from "@/lib/socket";

export async function fetchPosts(limit = 30, page = 1) {
  const offset = (page - 1) * limit;
  return api.community.posts(limit + offset);
}

export async function createPost(data: {
  content: string;
  imageUrl?: string;
  type?: string;
  username?: string;
  level?: number;
}) {
  const playerId = getStoredPlayerId();

  // Infer type only when caller doesn't specify it explicitly
  const resolvedType = data.type ?? (data.imageUrl ? "image" : "text");

  const post = await api.community.create({
    authorId: playerId ?? "",
    content: data.content,
    imageUrl: data.imageUrl || null,
    type: resolvedType as import("@/shared/community").PostType,
  });

  getSocket().emit("community:post", post);

  return post;
}
