import { api } from "@/lib/apiClient";
import { getSocket } from "@/lib/socket";

export async function toggleLike(postId: string, playerId: string) {
  const res = await api.community.like(postId, playerId);

  getSocket().emit("community:like", {
    postId,
    playerId,
    liked: res.liked,
  });

  return res.liked;
}