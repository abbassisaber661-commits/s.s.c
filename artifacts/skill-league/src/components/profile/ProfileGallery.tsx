import React, { memo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Images, Grid3X3, LayoutGrid, X, Heart, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Post } from "@/types/profile";

type LayoutMode = "grid" | "masonry";

const formatNumber = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
};

interface GalleryItemProps {
  post: Post;
  index: number;
  layout: LayoutMode;
  onClick: (post: Post) => void;
}

const GalleryItem = memo(({ post, index, layout, onClick }: GalleryItemProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: index * 0.025 }}
    className={cn(
      "relative overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer group",
      layout === "masonry"
        ? index % 3 === 1
          ? "row-span-2"
          : ""
        : "aspect-square"
    )}
    onClick={() => onClick(post)}
  >
    <img
      src={post.imageUrl}
      alt=""
      className="w-full h-full object-cover transition-transform duration-400 group-hover:scale-105"
      loading="lazy"
    />
    <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
      <div className="flex items-center gap-1.5 text-white text-xs font-semibold">
        <Heart size={14} className="fill-white" />
        {formatNumber(post.likes)}
      </div>
      <div className="flex items-center gap-1.5 text-white text-xs font-semibold">
        <MessageCircle size={14} />
        {formatNumber(post.comments)}
      </div>
    </div>
  </motion.div>
));

GalleryItem.displayName = "GalleryItem";

interface LightboxProps {
  post: Post;
  onClose: () => void;
}

const Lightbox = memo(({ post, onClose }: LightboxProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <button
      className="absolute top-4 right-4 text-white bg-white/10 rounded-full p-2 hover:bg-white/20 transition-colors z-10"
      onClick={onClose}
    >
      <X size={20} />
    </button>

    <motion.div
      initial={{ scale: 0.88, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.88, opacity: 0 }}
      className="max-w-lg w-full max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <img
        src={post.imageUrl}
        alt=""
        className="w-full max-h-[75vh] object-contain bg-black"
      />
      <div className="bg-gray-900 px-4 py-3">
        <div className="flex items-center gap-4 text-sm text-white">
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
          <p className="text-gray-300 text-xs mt-2 line-clamp-2 leading-relaxed">
            {post.content}
          </p>
        )}
      </div>
    </motion.div>
  </motion.div>
));

Lightbox.displayName = "Lightbox";

interface ProfileGalleryProps {
  posts: Post[];
  className?: string;
}

export const ProfileGallery = memo(({ posts, className }: ProfileGalleryProps) => {
  const [layout, setLayout] = useState<LayoutMode>("grid");
  const [selected, setSelected] = useState<Post | null>(null);

  const imagePosts = posts.filter((p) => p.type === "image" && !!p.imageUrl);

  const handleSelect = useCallback((post: Post) => setSelected(post), []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("", className)}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Images size={16} className="text-blue-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Gallery</h3>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              {imagePosts.length}
            </span>
          </div>

          {/* Layout toggle */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setLayout("grid")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                layout === "grid"
                  ? "bg-white dark:bg-gray-700 shadow-sm"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              )}
            >
              <Grid3X3 size={14} />
            </button>
            <button
              onClick={() => setLayout("masonry")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                layout === "masonry"
                  ? "bg-white dark:bg-gray-700 shadow-sm"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              )}
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>

        {/* Gallery grid */}
        {imagePosts.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center px-6">
            <span className="text-5xl mb-3">🖼️</span>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              No photos yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Share images to fill your gallery
            </p>
          </div>
        ) : layout === "masonry" ? (
          <div className="grid grid-cols-3 gap-0.5" style={{ gridAutoRows: "120px" }}>
            {imagePosts.map((post, i) => (
              <GalleryItem key={post.id} post={post} index={i} layout="masonry" onClick={handleSelect} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {imagePosts.map((post, i) => (
              <GalleryItem key={post.id} post={post} index={i} layout="grid" onClick={handleSelect} />
            ))}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {selected && <Lightbox post={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </>
  );
});

ProfileGallery.displayName = "ProfileGallery";
export default ProfileGallery;
