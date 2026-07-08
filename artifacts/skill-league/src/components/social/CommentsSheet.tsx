import React, { memo, useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Reply, Loader2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommentItem, type CommentData } from "./CommentItem";
import { useGame } from "@/contexts/GameContext";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";

interface CommentsSheetProps {
  postId:       string;
  isOpen:       boolean;
  onClose:      () => void;
  initialCount: number;
  onCountChange?: (delta: number) => void;
}

const SKELETON = () => (
  <div className="space-y-4 px-4 pt-2">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#F5F5F7] animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-16 bg-[#F5F5F7] rounded-2xl animate-pulse" />
          <div className="h-3 w-24 bg-[#E5E5E5] rounded animate-pulse ml-1" />
        </div>
      </div>
    ))}
  </div>
);

const mapToCommentData = (c: any): CommentData => ({
  id:          c.id,
  postId:      c.postId,
  authorId:    c.authorId,
  authorName:  c.authorName ?? c.username ?? "User",
  authorLevel: c.authorLevel ?? c.level ?? 1,
  content:     c.content,
  timestamp:   c.timestamp ?? new Date(c.createdAt ?? Date.now()).getTime(),
  likes:       c.likes ?? 0,
  likedByMe:   c.likedByMe ?? false,
  replies:     c.replies?.map(mapToCommentData) ?? [],
});

export const CommentsSheet = memo(({
  postId,
  isOpen,
  onClose,
  initialCount,
  onCountChange,
}: CommentsSheetProps) => {
  const { username, level } = useGame();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<CommentData | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialCount > 10);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.community.comments(postId).then((res: any[]) => {
      setComments(res.map(mapToCommentData));
      setHasMore(res.length >= PAGE_SIZE);
    }).catch(() => {
      setComments([]);
      setHasMore(false);
    }).finally(() => setLoading(false));
  }, [isOpen, postId]);

  useEffect(() => {
    if (!isOpen) return;
    const socket = getSocket();
    const handler = (data: any) => {
      if (data.postId !== postId) return;
      if (data.comment?.username === username) return;
      const newComment: CommentData = {
        id:          `rt_${Date.now()}`,
        postId,
        authorName:  data.comment?.username ?? "User",
        authorLevel: data.comment?.level ?? 1,
        content:     data.comment?.content ?? "",
        timestamp:   Date.now(),
        likes:       0,
        replies:     [],
      };
      setComments((prev) => [...prev, newComment]);
    };
    socket.on("community:comment", handler);
    return () => { socket.off("community:comment", handler); };
  }, [isOpen, postId, username]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;

    setSending(true);
    const tempId = `tmp_${Date.now()}`;
    const optimistic: CommentData = {
      id:          tempId,
      postId,
      authorName:  username,
      authorLevel: level,
      content:     replyTo ? `@${replyTo.authorName} ${text}` : text,
      timestamp:   Date.now(),
      likes:       0,
      replies:     [],
      parentId:    replyTo?.id,
    };

    if (replyTo) {
      setComments((prev) => prev.map((c) =>
        c.id === replyTo.id
          ? { ...c, replies: [...(c.replies ?? []), optimistic] }
          : c
      ));
    } else {
      setComments((prev) => [...prev, optimistic]);
    }

    setDraft("");
    setReplyTo(null);
    onCountChange?.(1);

    try {
      const playerId = getStoredPlayerId();
      await api.community.comment(postId, {
        authorId: playerId ?? username,
        username,
        content: optimistic.content,
      });
      getSocket().emit("community:comment", {
        postId,
        comment: { username, level, content: optimistic.content },
      });
    } catch {
      toast.error("Failed to send comment");
    } finally {
      setSending(false);
      setTimeout(() => {
        listRef.current?.scrollTo({ top: 99999, behavior: "smooth" });
      }, 100);
    }
  }, [draft, postId, username, level, replyTo, onCountChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReply = useCallback((comment: CommentData) => {
    setReplyTo(comment);
    setDraft(`@${comment.authorName} `);
    inputRef.current?.focus();
  }, []);

  const handleDelete = useCallback(async (commentId: string) => {
    const authorId = getStoredPlayerId();
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    onCountChange?.(-1);
    if (authorId) {
      api.community.deleteComment(postId, commentId, authorId).catch(() => {});
    }
    toast.success("Comment deleted");
  }, [onCountChange, postId]);

  const handleReport = useCallback((commentId: string) => {
    toast.success("Comment reported");
  }, []);

  const handleLoadMore = () => {
    setPage((p) => p + 1);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 max-w-2xl mx-auto",
              "bg-white rounded-t-3xl",
              "flex flex-col shadow-2xl",
              "max-h-[85vh]"
            )}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-[#E5E5E5] rounded-full mx-auto mt-3 mb-2 flex-shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-2">
                <MessageCircle size={16} className="text-[#FFD60A]" />
                <h3 className="text-sm font-bold text-[#111111]">
                  Comments
                </h3>
                <span className="text-xs text-[#666666] bg-[#F5F5F7] px-2 py-0.5 rounded-full">
                  {comments.length}
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#666666] hover:bg-[#E5E5E5] transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Reply indicator */}
            <AnimatePresence>
              {replyTo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FFFBEB] flex-shrink-0 border-b border-[#FFD60A]/30"
                >
                  <Reply size={13} className="text-[#111111] flex-shrink-0" />
                  <span className="text-xs text-[#666666] font-medium flex-1 truncate">
                    Replying to @{replyTo.authorName}
                  </span>
                  <button
                    onClick={() => { setReplyTo(null); setDraft(""); }}
                    className="text-[#666666] hover:text-[#111111]"
                  >
                    <X size={13} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Comment list */}
            <div ref={listRef} className="flex-1 overflow-y-auto min-h-0 py-3 space-y-3">
              {loading ? (
                <SKELETON />
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <span className="text-4xl mb-2">💬</span>
                  <p className="text-sm font-semibold text-[#111111]">No comments yet</p>
                  <p className="text-xs text-[#666666] mt-1">Be the first to comment!</p>
                </div>
              ) : (
                <div className="px-4 space-y-3">
                  {comments.map((c) => (
                    <CommentItem
                      key={c.id}
                      comment={c}
                      currentUser={username}
                      onReply={handleReply}
                      onDelete={handleDelete}
                      onReport={handleReport}
                    />
                  ))}
                  {hasMore && (
                    <button
                      onClick={handleLoadMore}
                      className="w-full text-xs text-[#666666] font-semibold py-2 hover:text-[#111111] transition-colors"
                    >
                      Load more comments
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex-shrink-0 border-t border-[#E5E5E5] px-4 py-3 pb-safe bg-white">
              <div className="flex items-end gap-2">
                <div className="w-8 h-8 rounded-full bg-[#FFD60A] flex items-center justify-center text-black text-xs font-bold flex-shrink-0">
                  {username[0]?.toUpperCase()}
                </div>
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Write a comment…"
                    rows={1}
                    className={cn(
                      "w-full resize-none px-3 py-2.5 text-sm rounded-2xl",
                      "bg-[#F5F5F7] border border-[#E5E5E5]",
                      "text-[#111111] placeholder-[#666666]",
                      "focus:border-[#FFD60A] focus:outline-none",
                      "transition-colors max-h-28 overflow-y-auto"
                    )}
                    style={{ fieldSizing: "content" } as React.CSSProperties}
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSend}
                  disabled={!draft.trim() || sending}
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0",
                    draft.trim() && !sending
                      ? "bg-[#FFD60A] hover:bg-[#F5C800] text-black"
                      : "bg-[#F5F5F7] text-[#666666]"
                  )}
                >
                  {sending
                    ? <Loader2 size={16} className="animate-spin" />
                    : <Send size={16} />
                  }
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

CommentsSheet.displayName = "CommentsSheet";
export default CommentsSheet;
