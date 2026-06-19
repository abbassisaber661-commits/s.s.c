import { api, getStoredPlayerId } from "@/lib/apiClient";
import { getSocket } from "@/lib/socket";

export async function fetchPosts(limit = 30, page = 1) {
  const offset = (page - 1) * limit;
  return api.community.posts(limit + offset);
}

export async function createPost(data: {
  content: string;
  imageUrl?: string;
  username?: string;
  level?: number;
}) {
  const playerId = getStoredPlayerId();

  const post = await api.community.create({
    authorId: playerId ?? "",
    content: data.content,
    imageUrl: data.imageUrl || null,
    type: "text",
  });

  getSocket().emit("community:post", post);

  return post;
}
