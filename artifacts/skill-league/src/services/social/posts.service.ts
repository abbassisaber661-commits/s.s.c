import { api, getStoredPlayerId } from "@/lib/apiClient";
import { getSocket } from "@/lib/socket";

export async function fetchPosts(limit = 30) {
  return api.community.posts(limit);
}

export async function createPost(data: {
  content: string;
  imageUrl?: string;
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