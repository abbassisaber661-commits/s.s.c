import React, { memo, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, X, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Post } from "@/types/profile";

const formatNumber = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
};

interface VideoCardProps {
  post: Post;
  index: number;
  onClick: (post: Post) => void;
}

const VideoCard = memo(({ post, index, onClick }: VideoCardProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: index * 0.04 }}
    className="relative aspect-[9/16] overflow-hidden bg-gray-900 rounded-xl cursor-pointer group"
    onClick={() => onClick(post)}
  >
    {post.imageUrl ? (
      <img
        src={post.imageUrl}
        alt=""
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center bg-gray-800">
        <Video size={32} className="text-gray-600" />
      </div>
    )}

    {/* Overlay */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

    {/* Play button */}
    <div className="absolute inset-0 flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity">
      <div className="w-10 h-10 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
        <Play size={18} className="text-white fill-white ml-0.5" />
      </div>
    </div>

    {/* Stats */}
    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 text-white text-xs">
      <span className="flex items-center gap-1">
        <Play size={10} className="fill-white" />
        {formatNumber(post.likes)}
      </span>
    </div>

    {/* Type badge */}
    <div className="absolute top-2 right-2">
      <span className="text-[10px] font-bold bg-black/50 text-white px-1.5 py-0.5 rounded-md uppercase tracking-wide">
        {post.type}
      </span>
    </div>
  </motion.div>
));

VideoCard.displayName = "VideoCard";

interface VideoPlayerProps {
  post: Post;
  onClose: () => void;
}

const VideoPlayer = memo(({ post, onClose }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative max-w-sm w-full max-h-screen"
        onClick={(e) => e.stopPropagation()}
      >
        {post.videoUrl ? (
          <video
            ref={videoRef}
            src={post.videoUrl}
            autoPlay
            loop
            playsInline
            className="w-full max-h-screen object-contain"
          />
        ) : post.imageUrl ? (
          <img src={post.imageUrl} alt="" className="w-full object-contain" />
        ) : (
          <div className="w-full h-64 bg-gray-800 flex items-center justify-center">
            <Video size={48} className="text-gray-600" />
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
          {post.videoUrl && (
            <button
              onClick={toggle}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white"
            >
              {playing ? <Pause size={18} /> : <Play size={18} className="fill-white ml-0.5" />}
            </button>
          )}
          {post.videoUrl && (
            <button
              onClick={toggleMute}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white"
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          )}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white"
        >
          <X size={18} />
        </button>
      </div>
    </motion.div>
  );
});

VideoPlayer.displayName = "VideoPlayer";

interface ProfileVideosProps {
  posts: Post[];
  className?: string;
}

export const ProfileVideos = memo(({ posts, className }: ProfileVideosProps) => {
  const [selected, setSelected] = useState<Post | null>(null);
  const videoPosts = posts.filter((p) => p.type === "reel");
  const handleSelect = useCallback((post: Post) => setSelected(post), []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("", className)}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3">
          <Video size={16} className="text-red-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Videos</h3>
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
            {videoPosts.length}
          </span>
        </div>

        {videoPosts.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center px-6">
            <span className="text-5xl mb-3">🎬</span>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No videos yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Post reels and videos to fill this section
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 px-4">
            {videoPosts.map((post, i) => (
              <VideoCard key={post.id} post={post} index={i} onClick={handleSelect} />
            ))}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {selected && <VideoPlayer post={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </>
  );
});

ProfileVideos.displayName = "ProfileVideos";
export default ProfileVideos;
