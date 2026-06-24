import React, { useEffect, useState } from "react";
import { api, ApiPost } from "@/lib/apiClient";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Home() {
  const { authUser } = useGame();
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const data = await api.community.posts(30);
      setPosts(data);
    } catch {
      toast.error("فشل تحميل المنشورات");
    } finally {
      setLoading(false);
    }
  };

  const likePost = async (postId: string) => {
    if (!authUser) return;

    try {
      await api.community.like(postId, authUser.uid);

      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, likes: p.likes + 1 }
            : p
        )
      );
    } catch {
      toast.error("خطأ في الإعجاب");
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500">
        Loading feed...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {posts.map(post => (
        <div
          key={post.id}
          className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="font-bold">{post.username}</h3>
              <p className="text-xs text-gray-500">
                Level {post.level}
              </p>
            </div>
          </div>

          {/* Content */}
          <p className="mb-3">{post.content}</p>

          {/* Image */}
          {post.imageUrl && (
            <img
              src={post.imageUrl}
              className="rounded-lg max-h-80 w-full object-cover"
            />
          )}

          {/* Actions */}
          <div className="flex gap-4 mt-3 text-sm">
            <button
              onClick={() => likePost(post.id)}
              className="flex items-center gap-1"
            >
              ❤️ {post.likes}
            </button>

            <span>💬 {post.replies}</span>
          </div>
        </div>
      ))}
    </div>
  );
}