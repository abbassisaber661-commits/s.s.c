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

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + "M"
    : n >= 1_000
    ? (n / 1_000).toFixed(1) + "K"
    : String(n);

const age = (ts: number) => {
  const d = Date.now() - ts;
  if (d < 60_000) return "الآن";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}د`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}س`;
  return `${Math.floor(d / 86_400_000)}ي`;
};

// ─── Follow button (non-owner only) ──────────────────────────────────────────

const FollowBtn = memo(function FollowBtn({ meId, themId }: { meId?: string; themId?: string }) {
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
        toast.success("تم إلغاء المتابعة");
      } else {
        await api.followers.follow(themId, meId);
        setFollowing(true);
        toast.success("تمت المتابعة");
      }
    } catch {
      toast.error("حدث خطأ");
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
      {following ? "متابَع" : "متابعة"}
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

  const currentPlayerId = getStoredPlayerId() ?? undefined;
  const isOwner = !!currentPlayerId && currentPlayerId === post.authorId;

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
    toast.success(next ? "تم الحفظ" : "تم إلغاء الحفظ");
  }, [post.id]);

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
        await navigator.share({ title: post.authorName, text: post.content, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("تم نسخ الرابط");
      }
    } catch {}
    incrementShare(post.id);
  }, [post]);

  // ── delete (owner only) ──
  const handleDelete = useCallback(() => {
    onDelete?.(post.id);
    toast.success("تم حذف المنشور");
  }, [post.id, onDelete]);

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <motion.article
      ref={postRef}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden",
        className
      )}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        {/* Avatar + name */}
        <button
          onClick={() => navigate(`/profile/${post.authorId}`)}
          className="flex items-center gap-3 flex-1 min-w-0"
        >
          <Avatar username={post.authorName} />
          <div className="min-w-0 text-left">
            <div className="font-semibold text-sm text-[#111111] truncate leading-tight">
              {post.authorName}
            </div>
            <div className="text-xs text-[#888888]">
              Lv.{post.authorLevel} · {age(post.timestamp)}
            </div>
          </div>
        </button>

        {/* Follow (non-owner) */}
        <FollowBtn meId={currentPlayerId} themId={post.authorId} />

        {/* ⋯ options menu */}
        <PostOptionsMenu
          postId={post.id}
          isOwner={isOwner}
          isSaved={saved}
          onSave={() => handleSave()}
          onDelete={isOwner ? handleDelete : undefined}
          onReport={!isOwner ? () => toast.success("تم الإبلاغ") : undefined}
        />
      </div>

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      {post.content && (
        <div className="px-4 pb-3 text-sm whitespace-pre-wrap text-[#111111] leading-relaxed">
          {post.content}
        </div>
      )}

      {/* ── IMAGE ──────────────────────────────────────────────────────────── */}
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          className="w-full max-h-96 object-cover"
          alt=""
          loading="lazy"
        />
      )}

      {/* ── STATS ROW ──────────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-1 text-xs text-[#888888] flex items-center gap-3">
        {likes > 0 && (
          <span className="flex items-center gap-1">
            <Heart size={11} className="fill-red-400 text-red-400" />
            {fmt(likes)}
          </span>
        )}
        {commentCount > 0 && <span>{fmt(commentCount)} تعليق</span>}
        {views > 0 && (
          <span className="flex items-center gap-1 ml-auto">
            <Eye size={11} />
            {fmt(views)}
          </span>
        )}
      </div>

      {/* ── ACTION BAR ─────────────────────────────────────────────────────── */}
      <div className="flex items-center border-t border-[#F0F0F0] mt-1">

        {/* LIKE */}
        <button
          onClick={handleLike}
          className={cn(
            "flex-1 py-2.5 flex items-center justify-center gap-1.5 text-sm font-medium transition-all active:scale-90",
            liked ? "text-red-500" : "text-[#888888] hover:text-red-400"
          )}
        >
          <Heart
            size={17}
            className={cn("transition-all", liked && "fill-red-500")}
          />
          <span className="text-xs">{liked ? "أعجبني" : "إعجاب"}</span>
        </button>

        <div className="w-px h-5 bg-[#F0F0F0]" />

        {/* COMMENT */}
        <button
          onClick={() => onCommentClick?.(post.id)}
          className="flex-1 py-2.5 text-[#888888] hover:text-[#444444] flex items-center justify-center gap-1.5 text-sm font-medium transition-colors active:scale-90"
        >
          <MessageCircle size={17} />
          <span className="text-xs">تعليق</span>
        </button>

        <div className="w-px h-5 bg-[#F0F0F0]" />

        {/* SHARE */}
        <button
          onClick={handleShare}
          className="flex-1 py-2.5 text-[#888888] hover:text-[#444444] flex items-center justify-center gap-1.5 text-sm font-medium transition-colors active:scale-90"
        >
          <Share2 size={17} />
          <span className="text-xs">مشاركة</span>
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
          <span className="text-xs">{saved ? "محفوظ" : "حفظ"}</span>
        </button>

      </div>
    </motion.article>
  );
});

export { SocialPostCard };
export default SocialPostCard;
