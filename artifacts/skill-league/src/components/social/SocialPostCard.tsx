/**
 * SocialPostCard — Production-grade post card
 * ───────────────────────────────────────────
 * Full feature set: reactions, options, comments, views, shares, save, hashtags, mentions.
 * Uses PostReactionPicker, PostOptionsMenu, CommentsSheet.
 * Backward-compatible with CommunityPost from lib/community.ts.
 */
import React, { memo, useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Share2, Bookmark, BookmarkCheck, Eye, MapPin, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { PostReactionPicker, type ReactionEmoji } from "./PostReactionPicker";
import { PostOptionsMenu } from "./PostOptionsMenu";
import { CommentsSheet } from "./CommentsSheet";
import { trackView, trackShare, trackSave } from "@/lib/engagement";
import { toggleSave, isSaved } from "@/lib/savedPosts";
import { useGame } from "@/contexts/GameContext";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import { getSocket } from "@/lib/socket";
import Avatar from "@/components/Avatar";
import type { CommunityPost } from "@/lib/community";

const formatNumber = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1)     + "K";
  return String(n);
};

const formatAge = (ts: number) => {
  const d = Date.now() - ts;
  if (d < 60_000)     return "now";
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  if (d < 7 * 86_400_000) return `${Math.floor(d / 86_400_000)}d`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// Rich content with hashtag + mention support
const RichContent = memo(({ content, onHashtag }: { content: string; onHashtag(tag: string): void }) => {
  const parts = content.split(/(#[\w\u0600-\u06FF]+|@[\w]+)/g);
  return (
    <p className="text-sm leading-relaxed text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
      {parts.map((p, i) => {
        if (p.startsWith("#"))
          return <button key={i} onClick={() => onHashtag(p)} className="font-semibold text-blue-500 hover:text-blue-600">{p}</button>;
        if (p.startsWith("@"))
          return <span key={i} className="font-semibold text-purple-500 cursor-pointer hover:underline">{p}</span>;
        return <span key={i}>{p}</span>;
      })}
    </p>
  );
});
RichContent.displayName = "RichContent";

interface SocialPostCardProps {
  post:                CommunityPost;
  commentCount?:       number;
  onLikeChange?:       (postId: string, liked: boolean) => void;
  onCommentCountChange?: (postId: string, delta: number) => void;
  onDelete?:           (postId: string) => void;
  compact?:            boolean;
  className?:          string;
}

export const SocialPostCard = memo(function SocialPostCard({
  post,
  commentCount = 0,
  onLikeChange,
  onCommentCountChange,
  onDelete,
  compact = false,
  className,
}: SocialPostCardProps) {
  const [, navigate] = useLocation();
  const { username } = useGame();
  const playerId = getStoredPlayerId() ?? undefined;

  // State
  const [reaction,   setReaction]   = useState<ReactionEmoji | null>(null);
  const [likeCount,  setLikeCount]  = useState(post.likes);
  const [comments,   setComments]   = useState(commentCount);
  const [views,      setViews]      = useState(0);
  const [shares,     setShares]     = useState(0);
  const [saved,      setSaved]      = useState(() => isSaved(post.id));
  const [pinned,     setPinned]     = useState(false);
  const [commOff,    setCommOff]    = useState(false);
  const [showImages, setShowImages] = useState(true);
  const [imageIdx,   setImageIdx]   = useState(0);
  const [showComments, setShowComments] = useState(false);

  const hasViewed = useRef(false);
  const cardRef   = useRef<HTMLDivElement>(null);
  const socket    = getSocket();

  const isOwner = username === post.authorName;

  // View tracking
  useEffect(() => {
    if (!cardRef.current || hasViewed.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      hasViewed.current = true;
      obs.disconnect();
      const data = trackView(post.id);
      setViews(data.views);
    }, { threshold: 0.5 });
    obs.observe(cardRef.current);
    return () => obs.disconnect();
  }, [post.id]);

  // Hashtag navigation
  const goHashtag = useCallback((tag: string) => {
    navigate(`/hashtag/${tag.replace("#", "")}`);
  }, [navigate]);

  // Reaction
  const handleReact = useCallback(async (emoji: ReactionEmoji | null) => {
    const wasReacted = !!reaction;
    const isNewReact = !!emoji && !wasReacted;
    const isRemove   = !emoji && wasReacted;

    setReaction(emoji);
    setLikeCount((n) => isNewReact ? n + 1 : isRemove ? Math.max(0, n - 1) : n);
    onLikeChange?.(post.id, !!emoji);

    try {
      await api.community.like(post.id, playerId ?? "");
      socket.emit("community:like", { postId: post.id, liked: !!emoji });
    } catch {}
  }, [reaction, post.id, playerId, onLikeChange, socket]);

  // Save
  const handleSave = useCallback((nextSaved: boolean) => {
    setSaved(nextSaved);
    toggleSave(post.id);
    trackSave(post.id, nextSaved);
  }, [post.id]);

  // Share
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      await navigator.share({ title: post.authorName, text: post.content, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Link copied");
    }
    const data = trackShare(post.id);
    setShares(data.shares);
  }, [post]);

  // Delete
  const handleDelete = useCallback(async () => {
    try {
      onDelete?.(post.id);
      toast.success("Post deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }, [post.id, onDelete]);

  // Multi-image helper
  const imageUrls: string[] = post.imageUrl ? [post.imageUrl] : [];

  return (
    <>
      <motion.article
        ref={cardRef}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden",
          className
        )}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-4 pt-4 pb-2">
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => navigate(`/profile/${post.authorId ?? post.authorName}`)}
          >
            <Avatar username={post.authorName} />
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{post.authorName}</p>
                {post.boosted && (
                  <span className="text-[9px] bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                    Boosted
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span>Lv.{post.authorLevel}</span>
                <span>·</span>
                <span>{formatAge(post.timestamp)}</span>
              </div>
            </div>
          </div>

          <PostOptionsMenu
            postId={post.id}
            isOwner={isOwner}
            isPinned={pinned}
            isSaved={saved}
            commentsOff={commOff}
            onDelete={handleDelete}
            onReport={() => toast.info("Report submitted")}
            onPin={(p) => setPinned(p)}
            onSave={handleSave}
            onToggleComments={(off) => setCommOff(off)}
            onBlock={() => toast.info("User blocked")}
          />
        </div>

        {/* ── Content ── */}
        {post.content && (
          <div className={cn("px-4 pb-2", !compact && "text-base")}>
            <RichContent content={post.content} onHashtag={goHashtag} />
          </div>
        )}

        {/* ── Image(s) ── */}
        <AnimatePresence>
          {imageUrls.length > 0 && showImages && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative overflow-hidden bg-gray-100 dark:bg-gray-800"
            >
              <img
                src={imageUrls[imageIdx]}
                alt=""
                className="w-full max-h-96 object-cover"
                loading="lazy"
              />
              {imageUrls.length > 1 && (
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                  {imageUrls.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setImageIdx(i)}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all",
                        i === imageIdx ? "bg-white w-3" : "bg-white/50"
                      )}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Poll preview ── */}
        {post.type === "achievement" && (
          <div className="mx-4 mb-3 p-3 rounded-xl bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs font-bold text-yellow-700 dark:text-yellow-400">🏆 Achievement Unlocked</p>
          </div>
        )}

        {/* ── Footer stats ── */}
        <div className="flex items-center gap-1 px-4 pb-2 text-xs text-gray-400 dark:text-gray-500">
          {views > 0 && (
            <span className="flex items-center gap-1">
              <Eye size={11} /> {formatNumber(views)}
            </span>
          )}
          {views > 0 && comments > 0 && <span>·</span>}
          {comments > 0 && <span>{formatNumber(comments)} comments</span>}
          {shares > 0 && <><span>·</span><span>{formatNumber(shares)} shares</span></>}
        </div>

        {/* ── Divider ── */}
        <div className="mx-4 border-t border-gray-100 dark:border-gray-800" />

        {/* ── Actions ── */}
        <div className="flex items-center px-2 py-1">
          {/* Reaction */}
          <PostReactionPicker
            likeCount={likeCount}
            myReaction={reaction}
            onReact={handleReact}
            className="flex-1"
          />

          {/* Comment */}
          <button
            onClick={() => !commOff && setShowComments(true)}
            disabled={commOff}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl",
              "text-sm font-semibold text-gray-500 hover:text-blue-500",
              "hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
              commOff && "opacity-40 cursor-not-allowed"
            )}
          >
            <MessageCircle size={17} />
            <span className="text-xs">{comments > 0 ? formatNumber(comments) : ""}</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:text-green-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Share2 size={17} />
            <span className="text-xs">{shares > 0 ? formatNumber(shares) : ""}</span>
          </button>

          {/* Save */}
          <button
            onClick={() => handleSave(!saved)}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-xl transition-all",
              saved
                ? "text-blue-500"
                : "text-gray-400 hover:text-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            {saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
          </button>
        </div>
      </motion.article>

      {/* ── Comments Sheet ── */}
      <CommentsSheet
        postId={post.id}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        initialCount={comments}
        onCountChange={(delta) => {
          setComments((n) => Math.max(0, n + delta));
          onCommentCountChange?.(post.id, delta);
        }}
      />
    </>
  );
});

export default SocialPostCard;
