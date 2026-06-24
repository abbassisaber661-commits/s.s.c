import React from "react";
import { useSocialFeed } from "@/hooks/social/useSocialFeed";
import { useGame } from "@/contexts/GameContext";
import StoryBar from "@/components/social/StoryBar";
import FeaturedPlayers from "@/components/social/FeaturedPlayers";
import CreatePost from "@/components/social/CreatePost";
import PostCard from "@/components/social/PostCard";

const SocialPage: React.FC = () => {
  const { username, level } = useGame();

  const {
    posts,
    loading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    commentCounts,
    createPost,
    handleLike,
    handleCommentUpdate,
  } = useSocialFeed({ enableRealtime: true });

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-20 space-y-4">
      <StoryBar />

      <FeaturedPlayers />

      <CreatePost
        onPost={async (content, imageUrl) => {
          await createPost(content, imageUrl);
        }}
      />

      {loading && posts.length === 0 && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          لا توجد منشورات بعد
        </div>
      )}

      <div className="space-y-4">
        {posts.map((post, index) => (
          <PostCard
            key={post.id ?? index}
            post={post as any}
            index={index}
            commentCount={commentCounts[post.id] ?? (post as any).replies ?? 0}
            currentUser={username}
            currentLevel={level}
            currentPlayerId={post.authorId ?? ""}
            onLikeChange={handleLike}
            onCommentCountChange={handleCommentUpdate}
          />
        ))}
      </div>

      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <button
            onClick={fetchNextPage}
            disabled={isFetchingNextPage}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
          >
            {isFetchingNextPage ? "جاري التحميل..." : "تحميل المزيد"}
          </button>
        </div>
      )}
    </div>
  );
};

export default SocialPage;
