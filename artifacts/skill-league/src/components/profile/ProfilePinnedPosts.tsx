import React, { memo } from "react";
import { motion } from "framer-motion";
import { Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import SocialPostCard from "@/components/social/SocialPostCard";
import type { Post } from "@/types/profile";

const MAX_PINS = 3;

interface ProfilePinnedPostsProps {
  posts: Post[];
  isOwner?: boolean;
  onUnpin?: (postId: string) => void;
  className?: string;
}

export const ProfilePinnedPosts = memo(
  ({ posts, isOwner = false, onUnpin, className }: ProfilePinnedPostsProps) => {
    const pinned = posts.slice(0, MAX_PINS);

    if (pinned.length === 0) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("space-y-3", className)}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-2">
          <Pin size={14} className="text-blue-500 rotate-45" />
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Pinned Posts
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-600 ml-auto">
            {pinned.length}/{MAX_PINS}
          </span>
        </div>

        {/* Posts */}
        <div className="space-y-3 px-4">
          {pinned.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative"
            >
              {/* Pin badge */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-blue-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                <Pin size={9} className="rotate-45" />
                Pinned
              </div>

              <div className="rounded-2xl overflow-hidden ring-1 ring-blue-400/20">
                <SocialPostCard post={post as any} />
              </div>

              {isOwner && onUnpin && (
                <button
                  onClick={() => onUnpin(post.id)}
                  className="mt-1.5 ml-1 text-[11px] text-gray-400 hover:text-red-400 transition-colors font-medium"
                >
                  Unpin
                </button>
              )}
            </motion.div>
          ))}
        </div>

        {/* Divider */}
        <div className="mx-4 border-b border-gray-100 dark:border-gray-800 pt-2" />
      </motion.div>
    );
  }
);

ProfilePinnedPosts.displayName = "ProfilePinnedPosts";
export default ProfilePinnedPosts;
