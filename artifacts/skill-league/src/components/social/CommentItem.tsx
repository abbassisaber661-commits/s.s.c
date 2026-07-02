import React, { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Reply, MoreHorizontal, Trash2, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { VerificationBadge } from "@/components/profile/VerificationBadge";

const formatAge = (ts: number) => {
  const d = Date.now() - ts;
  if (d < 60_000) return "now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  return `${Math.floor(d / 86_400_000)}d`;
};

export interface CommentData {
  id:            string;
  postId:        string;
  authorName:    string;
  authorLevel:   number;
  authorIsOwner?: boolean;
  content:       string;
  timestamp:     number;
  likes?:        number;
  likedByMe?:    boolean;
  replies?:      CommentData[];
  parentId?:     string;
}

interface CommentItemProps {
  comment:      CommentData;
  currentUser:  string;
  depth?:       number;
  onReply?:     (comment: CommentData) => void;
  onDelete?:    (commentId: string) => void;
  onReport?:    (commentId: string) => void;
  className?:   string;
}

export const CommentItem = memo(function CommentItem({
  comment,
  currentUser,
  depth = 0,
  onReply,
  onDelete,
  onReport,
  className,
}: CommentItemProps) {
  const [liked, setLiked] = useState(comment.likedByMe ?? false);
  const [likeCount, setLikeCount] = useState(comment.likes ?? 0);
  const [showMenu, setShowMenu] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const isOwner = currentUser === comment.authorName;
  const replyCount = comment.replies?.length ?? 0;

  const handleLike = () => {
    setLiked((v) => !v);
    setLikeCount((n) => (liked ? Math.max(0, n - 1) : n + 1));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-2.5", depth > 0 && "ml-8 mt-2", className)}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div
          className={cn(
            "rounded-full flex items-center justify-center font-bold text-black bg-[#FFD60A]",
            depth === 0 ? "w-8 h-8 text-xs" : "w-6 h-6 text-[10px]"
          )}
        >
          {comment.authorName[0]?.toUpperCase()}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="bg-[#F5F5F7] rounded-2xl px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#111111]">
              {comment.authorName}
            </span>
            {comment.authorIsOwner && (
              <VerificationBadge tier="owner" size="sm" showTooltip={false} />
            )}
            <span className="text-[10px] text-[#666666]">Lv.{comment.authorLevel}</span>
          </div>
          <p className="text-sm text-[#111111] mt-0.5 leading-relaxed break-words">
            {comment.content}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-1.5 ml-1">
          <span className="text-[10px] text-[#666666]">{formatAge(comment.timestamp)}</span>

          <button
            onClick={handleLike}
            className={cn(
              "flex items-center gap-1 text-[11px] font-semibold transition-colors",
              liked ? "text-red-500" : "text-[#666666] hover:text-[#111111]"
            )}
          >
            <Heart size={12} className={liked ? "fill-red-500" : ""} />
            {likeCount > 0 && likeCount}
          </button>

          {onReply && depth === 0 && (
            <button
              onClick={() => onReply(comment)}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#666666] hover:text-[#111111] transition-colors"
            >
              <Reply size={12} />
              Reply
            </button>
          )}

          {replyCount > 0 && depth === 0 && (
            <button
              onClick={() => setShowReplies((v) => !v)}
              className="text-[11px] font-semibold text-[#111111] hover:text-[#666666] transition-colors"
            >
              {showReplies ? "Hide" : `${replyCount} repl${replyCount === 1 ? "y" : "ies"}`}
            </button>
          )}

          {/* Options */}
          <div className="relative ml-auto">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="text-[#E5E5E5] hover:text-[#666666] transition-colors"
            >
              <MoreHorizontal size={14} />
            </button>

            <AnimatePresence>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={cn(
                      "absolute right-0 bottom-full mb-1 z-50 w-36",
                      "bg-white rounded-xl shadow-lg",
                      "border border-[#E5E5E5] overflow-hidden"
                    )}
                  >
                    {isOwner && onDelete && (
                      <button
                        onClick={() => { onDelete(comment.id); setShowMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    )}
                    {!isOwner && onReport && (
                      <button
                        onClick={() => { onReport(comment.id); setShowMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Flag size={12} /> Report
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Nested replies */}
        <AnimatePresence>
          {showReplies && comment.replies && comment.replies.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 space-y-2"
            >
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUser={currentUser}
                  depth={depth + 1}
                  onDelete={onDelete}
                  onReport={onReport}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

export default CommentItem;
