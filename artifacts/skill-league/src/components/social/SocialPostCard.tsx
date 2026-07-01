// src/components/social/SocialPostCard.tsx
import React, { memo, useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Share2, Heart, Bookmark, BookmarkCheck, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import Avatar from "@/components/Avatar";
import { PostOptionsMenu } from "@/components/social/PostOptionsMenu";
import type { CommunityPost } from "@/shared/community";
import { toggleSave, isSaved } from "@/lib/savedPosts";
import { getPostMeta, incrementView, incrementShare } from "@/lib/postMeta";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import { useGame } from "@/contexts/GameContext";
import { isRTL } from "@/lib/i18n";

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + "M"
    : n >= 1_000
    ? (n / 1_000).toFixed(1) + "K"
    : String(n);

const age = (ts: number, rtl: boolean) => {
  const d = Date.now() - ts;
  if (rtl) {
    if (d < 60_000) return "الآن";
    if (d < 3_600_000) return `${Math.floor(d / 60_000)}د`;
    if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}س`;
    return `${Math.floor(d / 86_400_000)}ي`;
  }
  if (d < 60_000) return "now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  return `${Math.floor(d / 86_400_000)}d`;
};

// ─── action bar label helper ─────────────────────────────────────────────────
const labels = {
  like:    { ar: "إعجاب",   liked_ar: "أعجبني",  en: "Like",    liked_en: "Liked"    },
  comment: { ar: "تعليق",   en: "Comment" },
  share:   { ar: "مشاركة",  en: "Share"   },
  save:    { ar: "حفظ",     saved_ar: "محفوظ", en: "Save", saved_en: "Saved" },
};

// ─── Follow button (non-owner only) ──────────────────────────────────────────

const FollowBtn = memo(function FollowBtn({
  meId, themId, rtl,
}: { meId?: string; themId?: string; rtl: boolean }) {
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
        "text-xs px-3 py-1 rounded-full font-bold transition-colors",
        following
          ? "bg-[#F0F0F0] text-[#444444]"
          : "bg-[#FFD60A] text-[#111111]"
      )}
    >
      {following
        ? (rtl ? "متابَع" : "Following")
        : (rtl ? "متابعة" : "Follow")}
    </button>
  );
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  post: CommunityPost;
  commentCount?: number;
  onLikeChange?: (postId: string, liked: boolean) => void;
  onCommentClick?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  className?: string;
}

// ─── Main card ───────────────────────────────────────────────────────────────

const SocialPostCard = memo(function SocialPostCard({
  post,
  commentCount = 0,
  onLikeChange,
  onCommentClick,
  onDelete,
  className,
}: Props) {
  const [, navigate] = useLocation();
  const { language } = useGame();
  const rtl = isRTL(language);
  const dir = rtl ? "rtl" : "ltr";

  const currentPlayerId = getStoredPlayerId() ?? undefined;
  const isOwner = !!currentPlayerId && currentPlayerId === post.authorId;

  // ── visibility (hide from feed client-side) ──
  const [hidden, setHidden] = useState(false);

  // ── post content (editable by owner) ──
  const [content, setContent] = useState(post.content);

  // ── like ──
  const [liked, setLiked] = useState(post.likedByMe);
  const [likes, setLikes] = useState(post.likes);

  useEffect(() => {
    setLiked(post.likedByMe);
    setLikes(post.likes);
  }, [post.likedByMe, post.likes]);

  const handleLike = useCallback(() => {
    const next = !liked;
    setLiked(next);
    setLikes((l) => l + (next ? 1 : -1));
    onLikeChange?.(post.id, next);
  }, [liked, post.id, onLikeChange]);

  // ── save ──
  const [saved, setSaved] = useState(() => isSaved(post.id));

  const handleSave = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = toggleSave(post.id);
    setSaved(next);
    toast.success(next
      ? (rtl ? "تم الحفظ" : "Saved")
      : (rtl ? "تم إلغاء الحفظ" : "Removed"));
  }, [post.id, rtl]);

  // ── views (intersection observer) ──
  const postRef = useRef<HTMLElement>(null);
  const viewed  = useRef(false);
  const [views, setViews] = useState(() => getPostMeta(post.id).views);

  useEffect(() => {
    if (!postRef.current || viewed.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      viewed.current = true;
      obs.disconnect();
      setViews(incrementView(post.id).views);
    }, { threshold: 0.6 });
    obs.observe(postRef.current);
    return () => obs.disconnect();
  }, [post.id]);

  // ── share ──
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.authorName, text: content, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(rtl ? "تم نسخ الرابط" : "Link copied");
      }
    } catch {}
    incrementShare(post.id);
  }, [post, content, rtl]);

  // ── hide (client-side) ──
  if (hidden) return null;

  // ─── action bar labels ───────────────────────────────────────────────────
  const likeLabel    = liked ? (rtl ? "أعجبني" : "Liked")   : (rtl ? "إعجاب"   : "Like");
  const commentLabel = rtl ? "تعليق"   : "Comment";
  const shareLabel   = rtl ? "مشاركة"  : "Share";
  const saveLabel    = saved ? (rtl ? "محفوظ"  : "Saved")   : (rtl ? "حفظ"     : "Save");

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <motion.article
      ref={postRef}
      dir={dir}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white rounded-2xl border border-[#E5E5E5] shadow-sm",
        className
      )}
      style={{ overflow: "visible" }}
    >
      {/* ── inner wrapper clips rounded corners for image ── */}
      <div className="rounded-2xl overflow-hidden">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          {/* Avatar + name */}
          <button
            onClick={() => navigate(`/profile/${post.authorId}`)}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            <Avatar username={post.authorName} />
            <div className={cn("min-w-0", rtl ? "text-right" : "text-left")}>
              <div className="font-semibold text-sm text-[#111111] truncate leading-tight">
                {post.authorName}
              </div>
              <div className="text-xs text-[#888888]">
                Lv.{post.authorLevel} · {age(post.timestamp, rtl)}
              </div>
            </div>
          </button>

          {/* Follow (non-owner) */}
          <FollowBtn meId={currentPlayerId} themId={post.authorId} rtl={rtl} />

          {/* ⋯ options menu — strict owner vs viewer */}
          <PostOptionsMenu
            postId={post.id}
            authorId={post.authorId}
            isOwner={isOwner}
            isPinned={(post as any).isPinned ?? false}
            isPublic={(post as any).isPublic ?? true}
            onEditDone={(newContent) => setContent(newContent)}
            onDeleteDone={() => onDelete?.(post.id)}
            onHide={() => setHidden(true)}
          />
        </div>

        {/* ── CONTENT ──────────────────────────────────────────────────── */}
        {content && (
          <div className={cn(
            "px-4 pb-3 text-sm whitespace-pre-wrap text-[#111111] leading-relaxed",
            rtl ? "text-right" : "text-left"
          )}>
            {content}
          </div>
        )}

        {/* ── IMAGE ────────────────────────────────────────────────────── */}
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            className="w-full max-h-96 object-cover"
            alt=""
            loading="lazy"
          />
        )}

        {/* ── STATS ROW ────────────────────────────────────────────────── */}
        <div
          dir={dir}
          className="px-4 pt-3 pb-1 text-xs text-[#888888] flex items-center gap-3"
        >
          {likes > 0 && (
            <span className="flex items-center gap-1">
              <Heart size={11} className="fill-red-400 text-red-400" />
              {fmt(likes)}
            </span>
          )}
          {commentCount > 0 && (
            <span>{fmt(commentCount)} {rtl ? "تعليق" : "comments"}</span>
          )}
          {views > 0 && (
            <span className={cn("flex items-center gap-1", rtl ? "mr-auto" : "ml-auto")}>
              <Eye size={11} />
              {fmt(views)}
            </span>
          )}
        </div>

        {/* ── ACTION BAR ───────────────────────────────────────────────── */}
        <div
          dir={dir}
          className="flex items-center border-t border-[#F0F0F0] mt-1"
        >
          {/* LIKE */}
          <button
            onClick={handleLike}
            className={cn(
              "flex-1 py-2.5 flex items-center justify-center gap-1.5 text-sm font-medium transition-all active:scale-90",
              liked ? "text-red-500" : "text-[#888888] hover:text-red-400"
            )}
          >
            <Heart size={17} className={cn("transition-all", liked && "fill-red-500")} />
            <span className="text-xs">{likeLabel}</span>
          </button>

          <div className="w-px h-5 bg-[#F0F0F0]" />

          {/* COMMENT */}
          <button
            onClick={() => onCommentClick?.(post.id)}
            className="flex-1 py-2.5 text-[#888888] hover:text-[#444444] flex items-center justify-center gap-1.5 text-sm font-medium transition-colors active:scale-90"
          >
            <MessageCircle size={17} />
            <span className="text-xs">{commentLabel}</span>
          </button>

          <div className="w-px h-5 bg-[#F0F0F0]" />

          {/* SHARE */}
          <button
            onClick={handleShare}
            className="flex-1 py-2.5 text-[#888888] hover:text-[#444444] flex items-center justify-center gap-1.5 text-sm font-medium transition-colors active:scale-90"
          >
            <Share2 size={17} />
            <span className="text-xs">{shareLabel}</span>
          </button>

          <div className="w-px h-5 bg-[#F0F0F0]" />

          {/* SAVE */}
          <button
            onClick={handleSave}
            className={cn(
              "flex-1 py-2.5 flex items-center justify-center gap-1.5 text-sm font-medium transition-all active:scale-90",
              saved ? "text-[#FFD60A]" : "text-[#888888] hover:text-[#444444]"
            )}
          >
            {saved
              ? <BookmarkCheck size={17} className="fill-[#FFD60A]" />
              : <Bookmark size={17} />
            }
            <span className="text-xs">{saveLabel}</span>
          </button>
        </div>

      </div>{/* end inner clip wrapper */}
    </motion.article>
  );
});

export { SocialPostCard };
export default SocialPostCard;
