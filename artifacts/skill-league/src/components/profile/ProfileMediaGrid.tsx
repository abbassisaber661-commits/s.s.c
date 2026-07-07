import React, { memo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X, Maximize2, Heart, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Post } from "@/types/profile";

const formatNumber = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
};

interface MediaItemProps {
  post: Post;
  index: number;
  onClick: (post: Post) => void;
}

const MediaItem = memo(({ post, index, onClick }: MediaItemProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.97 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: index * 0.03 }}
    className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer group"
    onClick={() => onClick(post)}
  >
    {post.type === "reel" || post.type === "video" ? (
      <>
        {post.imageUrl ? (
          <img
            src={post.imageUrl}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <Play size={32} className="text-white" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-2 right-2">
          <Play size={16} className="text-white fill-white drop-shadow" />
        </div>
      </>
    ) : (
      <>
        <img
          src={post.imageUrl}
          alt=""
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
          <div className="flex items-center gap-1 text-white text-xs font-semibold">
            <Heart size={14} className="fill-white" />
            {formatNumber(post.likes)}
          </div>
          <div className="flex items-center gap-1 text-white text-xs font-semibold">
            <MessageCircle size={14} className="fill-white" />
            {formatNumber(post.comments)}
          </div>
        </div>
      </>
    )}
  </motion.div>
));

MediaItem.displayName = "MediaItem";

interface MediaLightboxProps {
  post: Post;
  onClose: () => void;
}

const MediaLightbox = memo(({ post, onClose }: MediaLightboxProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <button
      className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors z-10"
      onClick={onClose}
    >
      <X size={20} />
    </button>

    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="max-w-lg w-full max-h-[80vh] rounded-xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {(post.type === "reel" || post.type === "video") && post.imageUrl ? (
        <video
          src={post.imageUrl}
          controls
          autoPlay
          className="w-full h-full object-contain"
        />
      ) : post.imageUrl ? (
        <img
          src={post.imageUrl}
          alt=""
          className="w-full h-full object-contain"
        />
      ) : null}

      <div className="bg-gray-900 px-4 py-3">
        <div className="flex items-center gap-4 text-white text-sm">
          <div className="flex items-center gap-1.5">
            <Heart size={15} className="fill-red-400 text-red-400" />
            {formatNumber(post.likes)}
          </div>
          <div className="flex items-center gap-1.5">
            <MessageCircle size={15} />
            {formatNumber(post.comments)}
          </div>
        </div>
        {post.content && (
          <p className="text-gray-300 text-xs mt-2 line-clamp-2">{post.content}</p>
        )}
      </div>
    </motion.div>
  </motion.div>
));

MediaLightbox.displayName = "MediaLightbox";

interface ProfileMediaGridProps {
  posts: Post[];
  filterType?: "all" | "image" | "reel";
  className?: string;
}

export const ProfileMediaGrid = memo(
  ({ posts, filterType = "all", className }: ProfileMediaGridProps) => {
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);

    const mediaPosts = posts.filter((p) => {
      // Always require non-empty media URL so unrenderable items never appear
      if (filterType === "image") return p.type === "image" && !!p.imageUrl;
      if (filterType === "reel") return (p.type === "reel" || p.type === "video") && !!p.imageUrl;
      return (p.type === "image" || p.type === "reel" || p.type === "video") && !!p.imageUrl;
    });

    const handleSelect = useCallback((post: Post) => {
      setSelectedPost(post);
    }, []);

    return (
      <>
        <div className={cn("grid grid-cols-3 gap-0.5", className)}>
          {mediaPosts.map((post, i) => (
            <MediaItem key={post.id} post={post} index={i} onClick={handleSelect} />
          ))}
        </div>

        <AnimatePresence>
          {selectedPost && (
            <MediaLightbox
              post={selectedPost}
              onClose={() => setSelectedPost(null)}
            />
          )}
        </AnimatePresence>
      </>
    );
  }
);

ProfileMediaGrid.displayName = "ProfileMediaGrid";
export default ProfileMediaGrid;
