// src/components/social/SocialPostCard.tsx
import React, { memo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Share2, Heart } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import Avatar from "@/components/Avatar";
import type { CommunityPost } from "@/shared/community";

interface Props {
  post: CommunityPost;
  commentCount?: number;
  onLikeChange?: (postId: string, liked: boolean) => void;
  onCommentClick?: (postId: string) => void;
  className?: string;
}

const formatNumber = (n: number) =>
  n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + "M"
    : n >= 1_000
    ? (n / 1_000).toFixed(1) + "K"
    : String(n);

const formatAge = (ts: number) => {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
};

const SocialPostCard = memo(function SocialPostCard({
  post,
  commentCount = 0,
  onLikeChange,
  onCommentClick,
  className,
}: Props) {
  const [, navigate] = useLocation();

  const [liked, setLiked] = useState(post.likedByMe);
  const [likes, setLikes] = useState(post.likes);

  const handleLike = useCallback(() => {
    const next = !liked;

    setLiked(next);
    setLikes((l) => l + (next ? 1 : -1));

    onLikeChange?.(post.id, next);
  }, [liked, post.id, onLikeChange]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/post/${post.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: post.authorName,
          text: post.content,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {}
  }, [post]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800",
        className
      )}
    >
      {/* HEADER */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => navigate(`/profile/${post.authorId}`)}
      >
        <Avatar username={post.authorName} />
        <div>
          <div className="font-semibold text-sm">{post.authorName}</div>
          <div className="text-xs text-gray-400">
            Lv.{post.authorLevel} · {formatAge(post.timestamp)}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 pb-3 text-sm whitespace-pre-wrap">
        {post.content}
      </div>

      {/* IMAGE */}
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          className="w-full max-h-96 object-cover"
        />
      )}

      {/* STATS */}
      <div className="px-4 py-2 text-xs text-gray-400 flex gap-3">
        {likes > 0 && <span>{formatNumber(likes)} likes</span>}
        {commentCount > 0 && (
          <span>{formatNumber(commentCount)} comments</span>
        )}
      </div>

      {/* ACTIONS */}
      <div className="flex items-center border-t border-gray-100 dark:border-gray-800">
        {/* LIKE */}
        <button
          onClick={handleLike}
          className={cn(
            "flex-1 py-2 text-sm flex items-center justify-center gap-1",
            liked ? "text-red-500" : "text-gray-500"
          )}
        >
          <Heart size={16} />
          {likes}
        </button>

        {/* COMMENT */}
        <button
          onClick={() => onCommentClick?.(post.id)}
          className="flex-1 py-2 text-sm text-gray-500 flex items-center justify-center gap-1"
        >
          <MessageCircle size={16} />
          {commentCount}
        </button>

        {/* SHARE */}
        <button
          onClick={handleShare}
          className="flex-1 py-2 text-sm text-gray-500 flex items-center justify-center gap-1"
        >
          <Share2 size={16} />
        </button>
      </div>
    </motion.article>
  );
});

export { SocialPostCard };
export default SocialPostCard;