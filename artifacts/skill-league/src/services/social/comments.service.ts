import { api } from "@/lib/apiClient";
import { getSocket } from "@/lib/socket";

export async function fetchComments(postId: string) {
  return api.community.comments(postId);
}

export async function addComment(postId: string, data: {
  authorId: string;
  username: string;
  content: string;
}) {
  const comment = await api.community.comment(postId, data);

  getSocket().emit("community:comment", {
    postId,
    comment,
  });

  return comment;
}