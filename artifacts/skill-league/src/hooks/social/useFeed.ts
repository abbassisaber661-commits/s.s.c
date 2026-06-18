import { useEffect, useState } from "react";
import { fetchPosts } from "@/services/social/posts.service";
import { getSocket } from "@/lib/socket";

export function useFeed(limit = 30) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();

    const socket = getSocket();

    // 🔥 real-time new post
    socket.on("community:post", (post: any) => {
      setPosts(prev => [post, ...prev]);
    });

    // 🔥 real-time like update
    socket.on("community:like", ({ postId, liked }: any) => {
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, likes: liked ? p.likes + 1 : Math.max(0, p.likes - 1) }
            : p
        )
      );
    });

    return () => {
      socket.off("community:post");
      socket.off("community:like");
    };
  }, []);

  async function load() {
    try {
      setLoading(true);
      const data = await fetchPosts(limit);
      setPosts(data);
    } finally {
      setLoading(false);
    }
  }

  return {
    posts,
    setPosts,
    loading,
    reload: load,
  };
}