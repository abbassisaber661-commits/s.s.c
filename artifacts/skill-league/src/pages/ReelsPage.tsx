/**
 * ReelsPage — TikTok-style vertical video feed
 * ─────────────────────────────────────────────
 * Swipe navigation, auto-play, loop, engagement overlay.
 * Has its own For You / Following / Trending / Latest tabs.
 */
import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Bookmark, BookmarkCheck,
  Volume2, VolumeX, ChevronUp, ChevronDown, Play,
  ArrowLeft, Sparkles, Users, Flame, Clock,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CommentsSheet } from "@/components/social/CommentsSheet";
import type { CommunityPost } from "@/lib/community";

type ReelTab = "fyp" | "following" | "trending" | "latest";

const REEL_TABS: { id: ReelTab; label: string; icon: React.ElementType }[] = [
  { id: "fyp",       label: "For You",   icon: Sparkles },
  { id: "following", label: "Following", icon: Users    },
  { id: "trending",  label: "Trending",  icon: Flame    },
  { id: "latest",    label: "Latest",    icon: Clock    },
];

const formatNumber = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1)     + "K";
  return String(n);
};

// Demo reels (replace with API)
const DEMO_REELS: (CommunityPost & { videoUrl?: string; description?: string })[] = Array.from(
  { length: 8 },
  (_, i) => ({
    id:          `reel_${i}`,
    authorId:    `user_${i}`,
    authorName:  `Creator${i + 1}`,
    authorLevel: Math.floor(Math.random() * 50) + 1,
    authorFame:  0,
    content:     `Check out this amazing play! #S.S.C #Gaming #${["Pro", "Epic", "Viral", "Top"][i % 4]}`,
    imageUrl:    `https://picsum.photos/seed/reel${i}/600/1000`,
    type:        "text" as const,
    timestamp:   Date.now() - i * 3_600_000,
    likes:       Math.floor(Math.random() * 50000) + 100,
    views:       Math.floor(Math.random() * 200000) + 1000,
    likedByMe:   false,
    savedByMe:   false,
    boosted:     false,
    boostExpiry: null,
    description: `Amazing clip #${i + 1} — long press ❤️ for reactions!`,
  })
);

// Action button
const ActionBtn = memo(({
  icon: Icon, label, onClick, active, color,
}: {
  icon: React.ElementType; label: string | number;
  onClick(): void; active?: boolean; color?: string;
}) => (
  <motion.button
    whileTap={{ scale: 0.85 }}
    onClick={onClick}
    className="flex flex-col items-center gap-1"
  >
    <div className={cn(
      "w-12 h-12 rounded-full flex items-center justify-center",
      "bg-black/30 backdrop-blur-sm",
      active && "bg-red-500/20",
    )}>
      <Icon
        size={24}
        className={active ? (color ?? "text-red-400") : "text-white"}
        fill={active ? "currentColor" : "none"}
      />
    </div>
    <span className="text-white text-[11px] font-semibold drop-shadow">{label}</span>
  </motion.button>
));
ActionBtn.displayName = "ActionBtn";

// Single reel card
interface ReelCardProps {
  reel:     CommunityPost & { videoUrl?: string; description?: string };
  isActive: boolean;
  muted:    boolean;
  onToggleMute(): void;
}

const ReelCard = memo(({ reel, isActive, muted, onToggleMute }: ReelCardProps) => {
  const [, navigate] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked,         setLiked]         = useState(reel.likedByMe);
  const [likeCount,     setLikeCount]     = useState(reel.likes);
  const [saved,         setSaved]         = useState(false);
  const [playing,       setPlaying]       = useState(false);
  const [showComments,  setShowComments]  = useState(false);
  const [showCaption,   setShowCaption]   = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.currentTime = 0;
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setPlaying(false);
    }
  }, [isActive]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else          { v.pause(); setPlaying(false); }
  };

  const handleLike = () => {
    setLiked((v) => !v);
    setLikeCount((n) => liked ? Math.max(0, n - 1) : n + 1);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/reel/${reel.id}`;
    if (navigator.share) await navigator.share({ title: reel.authorName, text: reel.content, url }).catch(() => {});
    else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
  };

  return (
    <>
      <div className="relative w-full h-full bg-black overflow-hidden">
        {reel.videoUrl ? (
          <video
            ref={videoRef}
            src={reel.videoUrl}
            loop
            playsInline
            muted={muted}
            className="w-full h-full object-cover"
            onClick={togglePlay}
          />
        ) : (
          <img
            src={reel.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}

        {/* Tap overlay for video */}
        {reel.videoUrl && !playing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <Play size={28} className="text-white fill-white ml-1" />
            </div>
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

        {/* Author info + caption */}
        <div className="absolute bottom-24 left-4 right-16 pointer-events-none">
          <div className="flex items-center gap-2.5 mb-2">
            <div
              className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0 cursor-pointer pointer-events-auto border-2 border-white"
              onClick={() => navigate(`/profile/${reel.authorId ?? reel.authorName}`)}
            >
              {reel.authorName[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-white font-bold text-sm drop-shadow">{reel.authorName}</p>
              <p className="text-white/70 text-[11px]">Lv.{reel.authorLevel}</p>
            </div>
          </div>

          <div className="pointer-events-auto">
            <p
              className={cn(
                "text-white text-sm drop-shadow leading-relaxed",
                !showCaption && "line-clamp-2"
              )}
              onClick={() => setShowCaption((v) => !v)}
            >
              {reel.content}
            </p>
          </div>
        </div>

        {/* Right action column */}
        <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4">
          <ActionBtn
            icon={Heart}
            label={formatNumber(likeCount)}
            onClick={handleLike}
            active={liked}
            color="text-red-400"
          />
          <ActionBtn
            icon={MessageCircle}
            label="Comment"
            onClick={() => setShowComments(true)}
          />
          <ActionBtn
            icon={Share2}
            label="Share"
            onClick={handleShare}
          />
          <ActionBtn
            icon={saved ? BookmarkCheck : Bookmark}
            label="Save"
            onClick={() => setSaved((v) => !v)}
            active={saved}
            color="text-blue-400"
          />
          <ActionBtn
            icon={muted ? VolumeX : Volume2}
            label={muted ? "Unmute" : "Mute"}
            onClick={onToggleMute}
          />
        </div>
      </div>

      <CommentsSheet
        postId={reel.id}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        initialCount={0}
      />
    </>
  );
});
ReelCard.displayName = "ReelCard";

// Main page
export default function ReelsPage() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<ReelTab>("fyp");
  const [reels]        = useState(DEMO_REELS);
  const [current,  setCurrent]  = useState(0);
  const [muted,    setMuted]    = useState(true);

  const startY = useRef(0);

  const goNext = useCallback(() => {
    setCurrent((n) => Math.min(n + 1, reels.length - 1));
  }, [reels.length]);

  const goPrev = useCallback(() => {
    setCurrent((n) => Math.max(n - 1, 0));
  }, []);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = startY.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 60) {
      if (diff > 0) goNext(); else goPrev();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") goNext();
      if (e.key === "ArrowUp"   || e.key === "k") goPrev();
      if (e.key === "m") setMuted((v) => !v);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  // Reset current reel when tab changes
  useEffect(() => {
    setCurrent(0);
  }, [activeTab]);

  return (
    <div className="fixed inset-0 bg-black z-40">

      {/* ── Top bar: back + title + mute ── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex flex-col">
        <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-2">
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-white font-bold text-base">Reels</h1>
          <button
            onClick={() => setMuted((v) => !v)}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white"
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center justify-center gap-1 px-4 pb-2">
          {REEL_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                  activeTab === tab.id
                    ? "bg-white text-black"
                    : "bg-white/10 text-white hover:bg-white/20"
                )}
              >
                <Icon size={12} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={goPrev}
        disabled={current === 0}
        className="absolute left-1/2 -translate-x-1/2 top-28 z-10 w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-0 transition-opacity"
      >
        <ChevronUp size={20} />
      </button>
      <button
        onClick={goNext}
        disabled={current === reels.length - 1}
        className="absolute left-1/2 -translate-x-1/2 bottom-6 z-10 w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-0 transition-opacity"
      >
        <ChevronDown size={20} />
      </button>

      {/* Progress dots */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1.5">
        {reels.map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-1 rounded-full transition-all",
              i === current ? "h-5 bg-white" : "h-1.5 bg-white/40"
            )}
          />
        ))}
      </div>

      {/* Reel stack */}
      <div
        className="w-full h-full"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0"
          >
            <ReelCard
              reel={reels[current]}
              isActive={true}
              muted={muted}
              onToggleMute={() => setMuted((v) => !v)}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
