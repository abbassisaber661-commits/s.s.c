// src/components/social/SocialPostCard.tsx
import React, {
  memo, useState, useCallback, useEffect, useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Share2, Heart, Bookmark, BookmarkCheck,
  Eye, Play, Pause, Volume2, VolumeX,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import Avatar from "@/components/Avatar";
import { VerificationBadge } from "@/components/profile/VerificationBadge";
import { PostOptionsMenu } from "@/components/social/PostOptionsMenu";
import GiftModal from "@/components/social/GiftModal";
import GiftSupportBar from "@/components/social/GiftSupportBar";
import type { CommunityPost } from "@/shared/community";
import { useLikePost, useSavePost, useGiftPostStats } from "@/hooks/useCommunity";
import { api } from "@/lib/apiClient";
import { useGame } from "@/contexts/GameContext";
import { isRTL } from "@/lib/i18n";
import { officialPageDisplayName, OFFICIAL_FOLLOW_LABEL } from "@/lib/officialPage";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Normalise official-page display names: "SkillLeague X" → "S.S.C X" (null-safe) */
const officialPageName = officialPageDisplayName;

const fmt = (n: number) =>
  n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + "M"
    : n >= 1_000
    ? (n / 1_000).toFixed(1) + "K"
    : String(n);

const age = (ts: number, rtl: boolean) => {
  const d = Date.now() - ts;
  if (rtl) {
    if (d < 60_000)    return "الآن";
    if (d < 3_600_000) return `${Math.floor(d / 60_000)}د`;
    if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}س`;
    return `${Math.floor(d / 86_400_000)}ي`;
  }
  if (d < 60_000)    return "now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  return `${Math.floor(d / 86_400_000)}d`;
};

// ─── Scroll-pause detection hook ─────────────────────────────────────────────

function useScrollPaused(delay = 600) {
  const [paused, setPaused] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setPaused(false);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setPaused(true), delay);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [delay]);

  return paused;
}

// ─── Gift button (header floating badge) — premium purple Pi gift entry ──────

const GiftButton = memo(function GiftButton({
  visible, rtl, onClick,
}: { visible: boolean; rtl: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="gift-btn"
          initial={{ opacity: 0, scale: 0.75 }}
          animate={{
            opacity: 1,
            scale: 1,
            x: [0, 2, -2, 2, 0],
          }}
          exit={{ opacity: 0, scale: 0.75 }}
          transition={{
            opacity: { duration: 0.25 },
            scale: { duration: 0.25 },
            x: {
              duration: 2.8,
              repeat: Infinity,
              ease: "easeInOut",
              repeatType: "loop",
            },
          }}
          onClick={onClick}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold text-white select-none shrink-0"
          style={{
            background: "linear-gradient(135deg, #C4B5FD 0%, #6D28D9 100%)",
            boxShadow: "0 0 8px 2px rgba(124,58,237,0.45), 0 0 16px 4px rgba(76,29,149,0.3), 0 1px 4px rgba(0,0,0,0.1)",
          }}
        >
          <span className="text-[13px] leading-none">🎁</span>
          <span className="font-black">π</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
});

// ─── Post celebration overlay — plays when a gift "lands" on this post ──────

const PostCelebration = memo(function PostCelebration({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1100);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 rounded-2xl z-20 overflow-hidden"
      initial={{ boxShadow: "0 0 0 0 rgba(124,58,237,0)" }}
      animate={{
        boxShadow: [
          "0 0 0 0 rgba(124,58,237,0)",
          "0 0 0 5px rgba(124,58,237,0.35)",
          "0 0 0 0 rgba(124,58,237,0)",
        ],
      }}
      transition={{ duration: 1.1, ease: "easeOut" }}
    >
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: [0, 1, 0], scale: [0.7, 1.2, 1] }}
        transition={{ duration: 1 }}
      >
        <span className="text-3xl drop-shadow-[0_0_6px_rgba(124,58,237,0.6)]">✨</span>
      </motion.div>
    </motion.div>
  );
});

// ─── Follow button ────────────────────────────────────────────────────────────

const FollowBtn = memo(function FollowBtn({
  meId, themId, rtl, isOfficialPage,
}: { meId?: string; themId?: string; rtl: boolean; isOfficialPage?: boolean }) {
  const [following, setFollowing] = useState<boolean | null>(null);

  useEffect(() => {
    if (!meId || !themId || meId === themId) return;
    api.followers
      .get(themId, meId)
      .then((d: any) => setFollowing(d.isFollowing))
      .catch(() => setFollowing(false));
  }, [meId, themId]);

  if (!meId || !themId || meId === themId || following === null) return null;

  const handle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (following) {
        await api.followers.unfollow(themId, meId);
        setFollowing(false);
        toast.success(rtl ? "تم إلغاء المتابعة" : "Unfollowed");
      } else {
        await api.followers.follow(themId, meId);
        setFollowing(true);
        toast.success(rtl ? "تمت المتابعة" : "Followed");
      }
    } catch {
      toast.error(rtl ? "حدث خطأ" : "Something went wrong");
    }
  };

  return (
    <button
      onClick={handle}
      className={cn(
        "text-xs px-3 py-1 rounded-full font-bold transition-colors shrink-0",
        following
          ? "bg-[#F0F0F0] text-[#444444]"
          : "bg-[#FFD60A] text-[#111111]"
      )}
    >
      {isOfficialPage
        ? OFFICIAL_FOLLOW_LABEL
        : following
        ? (rtl ? "متابَع" : "Following")
        : (rtl ? "متابعة" : "Follow")}
    </button>
  );
});

// ─── Video player ─────────────────────────────────────────────────────────────

const VideoPost = memo(function VideoPost({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  const MAX_SECONDS = 30;

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); setPlaying(false); }
    else { v.play().catch(() => {}); setPlaying(true); }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    const dur = Math.min(v.duration || MAX_SECONDS, MAX_SECONDS);
    if (v.currentTime >= MAX_SECONDS) {
      v.pause();
      v.currentTime = 0;
      setPlaying(false);
      setProgress(0);
      return;
    }
    setProgress((v.currentTime / dur) * 100);
  };

  const onEnded = () => {
    setPlaying(false);
    setProgress(0);
  };

  return (
    <div className="relative w-full bg-black" style={{ aspectRatio: "16/9", maxHeight: 340 }}>
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover"
        playsInline
        muted={muted}
        preload="metadata"
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onClick={togglePlay}
        style={{ display: "block", cursor: "pointer" }}
      />

      {/* Play/Pause overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ background: playing ? "transparent" : "rgba(0,0,0,0.28)" }}
      >
        <AnimatePresence>
          {!playing && (
            <motion.div
              key="play-icon"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30"
            >
              <Play size={24} className="text-white fill-white ml-1" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mute button */}
      <button
        onClick={toggleMute}
        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white transition-opacity hover:bg-black/60"
      >
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>

      {/* 30s badge */}
      <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-[10px] font-semibold">
        max 30s
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div
          className="h-full bg-[#FFD60A] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
});

// ─── Action button ────────────────────────────────────────────────────────────

const ActionBtn = memo(function ActionBtn({
  onClick, icon, label, active = false, activeColor = "text-[#FFD60A]",
  count, inactiveColor = "text-[#888888] hover:text-[#444444]",
}: {
  onClick?: (e: React.MouseEvent) => void;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  activeColor?: string;
  count?: number;
  inactiveColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 py-3 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90 select-none",
        active ? activeColor : inactiveColor
      )}
    >
      <div className="relative">
        {icon}
        {typeof count === "number" && count > 0 && (
          <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[8px] font-black rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 leading-none">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  post: CommunityPost;
  currentPlayerId?: string;
  commentCount?: number;
  onCommentClick?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  /** Called instead of the real action when the viewer is a guest. */
  onGuestInteract?: () => void;
  className?: string;
}

// ─── Main card ───────────────────────────────────────────────────────────────

const SocialPostCard = memo(function SocialPostCard({
  post,
  currentPlayerId: currentPlayerIdProp,
  commentCount = 0,
  onCommentClick,
  onDelete,
  onGuestInteract,
  className,
}: Props) {
  const [, navigate] = useLocation();
  const { language, authUser } = useGame();
  const rtl = isRTL(language);
  const dir = rtl ? "rtl" : "ltr";

  const currentPlayerId = currentPlayerIdProp ?? authUser?.uid ?? undefined;
  const isOwner = !!currentPlayerId && currentPlayerId === post.authorId;

  const { mutate: likePost } = useLikePost();
  const { mutate: savePost } = useSavePost();

  const scrollPaused = useScrollPaused(600);

  const [hidden, setHidden] = useState(false);
  const [content, setContent] = useState(post.content);
  const [giftOpen, setGiftOpen] = useState(false);
  const [celebrateKey, setCelebrateKey] = useState<number | null>(null);

  // ── gift support bar ──
  const { data: giftStats, refetch: refetchGiftStats } = useGiftPostStats(post.id);
  const supporters = giftStats?.topSenders ?? [];

  // ── like ──
  const [liked, setLiked] = useState(post.likedByMe ?? false);
  const [likes, setLikes] = useState(post.likes ?? 0);

  useEffect(() => {
    setLiked(post.likedByMe ?? false);
    setLikes(post.likes ?? 0);
  }, [post.likedByMe, post.likes]);

  const handleLike = useCallback(() => {
    if (onGuestInteract) { onGuestInteract(); return; }
    const next = !liked;
    setLiked(next);
    setLikes((l) => l + (next ? 1 : -1));
    likePost({ postId: post.id, like: next });
  }, [liked, post.id, likePost, onGuestInteract]);

  // ── save ──
  const [saved, setSaved] = useState(post.savedByMe ?? false);

  useEffect(() => {
    setSaved(post.savedByMe ?? false);
  }, [post.savedByMe]);

  const handleSave = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onGuestInteract) { onGuestInteract(); return; }
    const next = !saved;
    setSaved(next);
    savePost(
      { postId: post.id, saved },
      {
        onError: () => setSaved(!next),
        onSuccess: (data) => {
          setSaved(data.saved);
          toast.success(data.saved
            ? (rtl ? "تم الحفظ" : "Saved")
            : (rtl ? "تم إلغاء الحفظ" : "Removed"));
        },
      },
    );
  }, [saved, post.id, savePost, rtl]);

  // ── views ──
  const postRef = useRef<HTMLElement>(null);
  const viewed  = useRef(false);
  const [views, setViews] = useState(post.views ?? 0);

  useEffect(() => { setViews(post.views ?? 0); }, [post.views]);

  useEffect(() => {
    if (!postRef.current || viewed.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      viewed.current = true;
      obs.disconnect();
      setViews((v) => v + 1);
      api.community.viewPost(post.id).then((res) => {
        if (res.views !== undefined) setViews(res.views);
      }).catch(() => {});
    }, { threshold: 0.6 });
    obs.observe(postRef.current);
    return () => obs.disconnect();
  }, [post.id]);

  // ── share ──
  const handleShare = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.authorName, text: content, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(rtl ? "تم نسخ الرابط" : "Link copied");
      }
    } catch {}
  }, [post, content, rtl]);

  if (hidden) return null;

  // ── detect video post ──
  const isVideo = post.type === "video" ||
    (post.imageUrl && /\.(mp4|webm|mov|ogg)(\?|$)/i.test(post.imageUrl));

  // ── text-only post gets the yellow/white/yellow S.S.C theme ──
  const isTextPost = !post.imageUrl;
  const themeYellowSection = "bg-[#FFD60A]";
  const themeBlackText = "text-[#111111]";

  const likeLabel    = rtl ? "إعجاب"  : "Like";
  const commentLabel = rtl ? "تعليق"  : "Comment";
  const shareLabel   = rtl ? "مشاركة" : "Share";
  const saveLabel    = rtl ? "حفظ"    : "Save";
  const giftLabel    = rtl ? "هدية"   : "Gift";

  return (
    <motion.article
      ref={postRef}
      dir={dir}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={cn(
        "relative bg-white rounded-2xl border border-[#EBEBEB] overflow-hidden",
        "shadow-[0_1px_4px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)]",
        className
      )}
    >
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className={cn(
        "flex items-center gap-2.5 px-3.5 pt-3.5 pb-2.5",
        isTextPost && themeYellowSection
      )}>
        {/* Avatar */}
        <button
          onClick={() => navigate(`/profile/${post.authorId}`)}
          className="shrink-0"
        >
          <Avatar username={post.authorName} isOfficialPage={post.isOfficialPage} />
        </button>

        {/* Name + meta + gift */}
        <div className="flex-1 min-w-0">
          {/* Row 1 — Username */}
          <button
            onClick={() => navigate(`/profile/${post.authorId}`)}
            className={cn(
              "flex items-center gap-1 font-bold text-sm text-[#0D0D0D] leading-tight hover:underline",
              rtl ? "text-right" : "text-left"
            )}
          >
            <span className="truncate">
              {post.isOfficialPage ? officialPageName(post.authorName) : post.authorName}
            </span>
            {post.authorIsOwner && (
              <VerificationBadge tier="owner" size="sm" showTooltip={false} />
            )}
            {!post.authorIsOwner && post.isOfficialPage && (
              <VerificationBadge tier="official" size="sm" />
            )}
          </button>

          {/* Row 2 — Time · Level   [🎁 Gift DN] */}
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn(
              "text-[11px] flex items-center gap-1 shrink-0",
              isTextPost ? themeBlackText : "text-[#9B9B9B]"
            )}>
              {!post.isOfficialPage && (
                <>
                  <span>Lv.{post.authorLevel}</span>
                  <span>·</span>
                </>
              )}
              <span>{age(post.timestamp, rtl)}</span>
              {post.isPinned && (
                <>
                  <span>·</span>
                  <span className={cn("font-semibold", isTextPost ? themeBlackText : "text-[#FFD60A]")}>
                    {rtl ? "📌 مثبّت" : "📌 Pinned"}
                  </span>
                </>
              )}
            </span>

            {/* 🎁 Gift button — floats under username, shows on scroll pause */}
            {!isOwner && (
              <GiftButton
                visible={scrollPaused}
                rtl={rtl}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onGuestInteract) { onGuestInteract(); return; }
                  setGiftOpen(true);
                }}
              />
            )}
          </div>
        </div>

        {/* Follow + Options */}
        <div className="flex items-center gap-1 shrink-0">
          <FollowBtn meId={currentPlayerId} themId={post.authorId} rtl={rtl} isOfficialPage={post.isOfficialPage} />
          <PostOptionsMenu
            postId={post.id}
            authorId={post.authorId ?? ""}
            isOwner={isOwner}
            isPinned={post.isPinned ?? false}
            isPublic={post.isPublic ?? true}
            onEditDone={(newContent) => setContent(newContent)}
            onDeleteDone={() => onDelete?.(post.id)}
            onHide={() => setHidden(true)}
          />
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────────────────── */}
      {content && (
        <div className={cn(
          "px-3.5 pb-2.5 text-[14px] leading-[1.55] text-[#1A1A1A] whitespace-pre-wrap",
          rtl ? "text-right" : "text-left"
        )}>
          {content}
        </div>
      )}

      {/* ── MEDIA ───────────────────────────────────────────────────────────── */}
      {post.imageUrl && (
        isVideo ? (
          <VideoPost src={post.imageUrl} />
        ) : (
          <div className="relative">
            <img
              src={post.imageUrl}
              className="w-full object-cover"
              style={{ maxHeight: 400 }}
              alt=""
              loading="lazy"
            />
          </div>
        )
      )}

      {/* ── STATS ROW ───────────────────────────────────────────────────────── */}
      <div dir={dir} className="px-3.5 pt-2.5 pb-0.5 flex items-center gap-3 text-[11px] text-[#AAAAAA]">
        {likes > 0 && (
          <span className="flex items-center gap-1">
            <span className="text-red-400 text-sm">❤️</span>
            {fmt(likes)}
          </span>
        )}
        {commentCount > 0 && (
          <button
            onClick={() => onCommentClick?.(post.id)}
            className="hover:underline"
          >
            {fmt(commentCount)} {rtl ? "تعليق" : "comments"}
          </button>
        )}
        {views > 0 && (
          <span className={cn("flex items-center gap-1", rtl ? "mr-auto" : "ml-auto")}>
            <Eye size={11} />
            {fmt(views)}
          </span>
        )}
      </div>

      {/* ── GIFT SUPPORT BAR ────────────────────────────────────────────────── */}
      {supporters.length > 0 && (
        <GiftSupportBar
          supporters={supporters}
          rtl={rtl}
          onSupporterClick={(senderId) => navigate(`/profile/${senderId}`)}
        />
      )}

      {/* ── DIVIDER ─────────────────────────────────────────────────────────── */}
      <div className="mx-3.5 mt-1 border-t border-[#F2F2F2]" />

      {/* ── ACTION BAR ──────────────────────────────────────────────────────── */}
      <div dir={dir} className={cn("flex items-center", isTextPost && themeYellowSection)}>

        {/* LIKE */}
        <ActionBtn
          onClick={handleLike}
          active={liked}
          activeColor="text-red-500"
          inactiveColor={isTextPost ? cn(themeBlackText, "hover:opacity-70") : undefined}
          icon={
            <Heart
              size={18}
              className={cn("transition-all duration-200", liked && "fill-red-500")}
            />
          }
          label={likeLabel}
        />

        <div className={cn("w-px h-7", isTextPost ? "bg-black/10" : "bg-[#F0F0F0]")} />

        {/* COMMENT */}
        <ActionBtn
          onClick={() => {
            if (onGuestInteract) { onGuestInteract(); return; }
            onCommentClick?.(post.id);
          }}
          inactiveColor={isTextPost ? cn(themeBlackText, "hover:opacity-70") : undefined}
          icon={<MessageCircle size={18} />}
          label={commentLabel}
          count={commentCount > 0 ? commentCount : undefined}
        />

        <div className={cn("w-px h-7", isTextPost ? "bg-black/10" : "bg-[#F0F0F0]")} />

        {/* SHARE */}
        <ActionBtn
          onClick={handleShare}
          inactiveColor={isTextPost ? cn(themeBlackText, "hover:opacity-70") : undefined}
          icon={<Share2 size={18} />}
          label={shareLabel}
        />

        <div className={cn("w-px h-7", isTextPost ? "bg-black/10" : "bg-[#F0F0F0]")} />

        {/* SAVE */}
        <ActionBtn
          onClick={handleSave}
          active={saved}
          activeColor="text-[#FFD60A]"
          inactiveColor={isTextPost ? cn(themeBlackText, "hover:opacity-70") : undefined}
          icon={
            saved
              ? <BookmarkCheck size={18} className="fill-[#FFD60A]" />
              : <Bookmark size={18} />
          }
          label={saveLabel}
        />

        <div className={cn("w-px h-7", isTextPost ? "bg-black/10" : "bg-[#F0F0F0]")} />

        {/* GIFT */}
        {!isOwner && (
          <ActionBtn
            onClick={(e) => {
              e.stopPropagation();
              if (onGuestInteract) { onGuestInteract(); return; }
              setGiftOpen(true);
            }}
            active={false}
            icon={
              <span
                className="flex items-center gap-0.5 text-[16px] leading-none"
                style={{ filter: "drop-shadow(0 0 4px rgba(124,58,237,0.5))" }}
              >
                <span>🎁</span>
                <span className="text-[13px] font-black text-[#7C3AED]">π</span>
              </span>
            }
            label={giftLabel}
            activeColor="text-[#7C3AED]"
            inactiveColor={isTextPost ? cn(themeBlackText, "hover:opacity-70") : undefined}
          />
        )}

      </div>

      {/* ── GIFT CELEBRATION — plays when a gift lands on this post ────── */}
      <AnimatePresence>
        {celebrateKey !== null && (
          <PostCelebration key={celebrateKey} onDone={() => setCelebrateKey(null)} />
        )}
      </AnimatePresence>

      {/* ── GIFT MODAL ────────────────────────────────────────────── */}
      {!isOwner && post.authorId && (
        <GiftModal
          isOpen={giftOpen}
          onClose={() => setGiftOpen(false)}
          receiverId={post.authorId}
          receiverName={post.authorName}
          postId={post.id}
          senderAvatarUrl={authUser?.photoURL}
          senderName={authUser?.username}
          onSent={() => {
            setCelebrateKey(Date.now());
            refetchGiftStats();
          }}
        />
      )}
    </motion.article>
  );
});

export { SocialPostCard };
export default SocialPostCard;
