import React, { memo, useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MoreHorizontal,
  Edit3,
  Trash2,
  Flag,
  Link2,
  Pin,
  PinOff,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Check,
  X,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api, getStoredPlayerId } from "@/lib/apiClient";

interface PostOptionsMenuProps {
  postId:    string;
  authorId:  string;
  isOwner:   boolean;
  isPinned?: boolean;
  isPublic?: boolean;
  onEditDone?:    (newContent: string) => void;
  onDeleteDone?:  () => void;
  onHide?:        () => void;
}

/* ─── single action row ─────────────────────────────────────── */
const Row = memo(({
  icon: Icon, label, sublabel, onClick, variant = "default", done, disabled,
}: {
  icon: React.ElementType;
  label: string;
  sublabel?: string;
  onClick: () => void;
  variant?: "default" | "danger";
  done?: boolean;
  disabled?: boolean;
}) => (
  <motion.button
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left disabled:opacity-40",
      variant === "danger"
        ? "text-red-500 hover:bg-red-50"
        : "text-[#111111] hover:bg-[#F5F5F7]"
    )}
  >
    <div className={cn(
      "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
      variant === "danger" ? "bg-red-50" : "bg-[#F5F5F7]"
    )}>
      <Icon size={17} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="font-semibold leading-snug">{label}</div>
      {sublabel && <div className="text-[11px] text-[#888888] mt-0.5">{sublabel}</div>}
    </div>
    {done && <Check size={14} className="text-green-500 flex-shrink-0" />}
  </motion.button>
));
Row.displayName = "Row";

/* ─── divider ────────────────────────────────────────────────── */
const Divider = () => <div className="mx-4 border-b border-[#F0F0F0]" />;

/* ─── main component ─────────────────────────────────────────── */
export const PostOptionsMenu = memo(({
  postId,
  authorId,
  isOwner,
  isPinned: initialPinned = false,
  isPublic: initialPublic = true,
  onEditDone,
  onDeleteDone,
  onHide,
}: PostOptionsMenuProps) => {
  const [open, setOpen]       = useState(false);
  const [view, setView]       = useState<"main" | "edit" | "report">("main");
  const [pinned, setPinned]   = useState(initialPinned);
  const [isPublic, setPublic] = useState(initialPublic);
  const [linkCopied, setLinkCopied] = useState(false);
  const [editText, setEditText]     = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const myId = getStoredPlayerId();

  /* close on outside click */
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setView("main");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setView("main");
    setEditText("");
    setReportReason("");
  }, []);

  /* ── copy link ── */
  const handleCopyLink = async () => {
    const url = `${window.location.origin}/post/${postId}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast.success("Link copied");
    close();
  };

  /* ── pin ── */
  const handlePin = async () => {
    const next = !pinned;
    setPinned(next);
    close();
    try {
      await api.community.pinPost(postId, myId ?? authorId, next);
      toast.success(next ? "Post pinned" : "Post unpinned");
    } catch {
      setPinned(!next);
      toast.error("Failed to pin post");
    }
  };

  /* ── visibility ── */
  const handleVisibility = async () => {
    const next = !isPublic;
    setPublic(next);
    close();
    try {
      await api.community.setVisibility(postId, myId ?? authorId, next);
      toast.success(next ? "Post is now public" : "Post is now private");
    } catch {
      setPublic(!next);
      toast.error("Failed to change visibility");
    }
  };

  /* ── edit save ── */
  const handleEditSave = async () => {
    if (!editText.trim()) return;
    setEditLoading(true);
    try {
      await api.community.editPost(postId, myId ?? authorId, editText.trim());
      onEditDone?.(editText.trim());
      toast.success("Post updated");
      close();
    } catch {
      toast.error("Failed to update post");
    } finally {
      setEditLoading(false);
    }
  };

  /* ── delete ── */
  const handleDelete = async () => {
    close();
    try {
      await api.community.deletePost(postId, myId ?? authorId);
      onDeleteDone?.();
      toast.success("Post deleted");
    } catch {
      toast.error("Failed to delete post");
    }
  };

  /* ── report ── */
  const handleReport = async () => {
    setReportLoading(true);
    try {
      await api.community.reportPost(postId, myId ?? "", reportReason || undefined);
      toast.success("Post reported. Thank you.");
      close();
    } catch {
      toast.error("Failed to report post");
    } finally {
      setReportLoading(false);
    }
  };

  /* ── hide ── */
  const handleHide = () => {
    close();
    onHide?.();
    toast.success("Post hidden");
  };

  return (
    <div className="relative" ref={ref}>
      {/* trigger */}
      <button
        onClick={() => { setOpen(v => !v); setView("main"); }}
        className="w-8 h-8 rounded-full flex items-center justify-center text-[#888888] hover:text-[#444444] hover:bg-[#F5F5F7] transition-colors"
        aria-label="Post options"
      >
        <MoreHorizontal size={18} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: -6 }}
            transition={{ duration: 0.13 }}
            className="absolute right-0 top-full mt-1 z-50 w-64 bg-white rounded-2xl shadow-2xl border border-[#E5E5E5] overflow-hidden"
          >
            {/* ── MAIN VIEW ── */}
            {view === "main" && (
              <>
                {/* Header label */}
                <div className="px-4 py-2.5 border-b border-[#F0F0F0]">
                  <p className="text-xs font-black text-[#888888] uppercase tracking-wider">
                    {isOwner ? "Your post" : "Post options"}
                  </p>
                </div>

                {isOwner ? (
                  /* ── OWNER OPTIONS ── */
                  <>
                    <Row
                      icon={Edit3}
                      label="Edit post"
                      sublabel="Change text or content"
                      onClick={() => { setEditText(""); setView("edit"); }}
                    />
                    <Divider />
                    <Row
                      icon={isPublic ? Globe : Lock}
                      label={isPublic ? "Make private" : "Make public"}
                      sublabel={isPublic ? "Only you can see it" : "Everyone can see it"}
                      onClick={handleVisibility}
                    />
                    <Row
                      icon={pinned ? PinOff : Pin}
                      label={pinned ? "Unpin post" : "Pin post"}
                      sublabel={pinned ? "Remove from top" : "Keep at top of profile"}
                      onClick={handlePin}
                    />
                    <Row
                      icon={Link2}
                      label="Copy link"
                      onClick={handleCopyLink}
                      done={linkCopied}
                    />
                    <Divider />
                    <Row
                      icon={Trash2}
                      label="Delete post"
                      sublabel="This cannot be undone"
                      onClick={handleDelete}
                      variant="danger"
                    />
                  </>
                ) : (
                  /* ── OTHER USER'S OPTIONS ── */
                  <>
                    <Row
                      icon={Flag}
                      label="Report post"
                      sublabel="We'll review it"
                      onClick={() => setView("report")}
                      variant="danger"
                    />
                    <Row
                      icon={EyeOff}
                      label="Hide post"
                      sublabel="Don't show this post"
                      onClick={handleHide}
                    />
                    <Row
                      icon={Link2}
                      label="Copy link"
                      onClick={handleCopyLink}
                      done={linkCopied}
                    />
                  </>
                )}
              </>
            )}

            {/* ── EDIT VIEW ── */}
            {view === "edit" && (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setView("main")}
                    className="p-1 rounded-lg hover:bg-[#F5F5F7] transition-colors"
                  >
                    <ChevronLeft size={16} className="text-[#444444]" />
                  </button>
                  <span className="text-sm font-black text-[#111111]">Edit post</span>
                </div>
                <textarea
                  autoFocus
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  placeholder="What's on your mind?"
                  maxLength={500}
                  rows={4}
                  className="w-full rounded-xl border border-[#E5E5E5] bg-[#F5F5F7] px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#FFD60A] resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#888888]">{editText.length}/500</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setView("main")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#666666] hover:bg-[#F5F5F7] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEditSave}
                      disabled={!editText.trim() || editLoading}
                      className="px-4 py-1.5 rounded-lg text-xs font-black bg-[#FFD60A] text-black disabled:opacity-40 transition-opacity active:scale-95"
                    >
                      {editLoading ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── REPORT VIEW ── */}
            {view === "report" && (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setView("main")}
                    className="p-1 rounded-lg hover:bg-[#F5F5F7] transition-colors"
                  >
                    <ChevronLeft size={16} className="text-[#444444]" />
                  </button>
                  <span className="text-sm font-black text-[#111111]">Report post</span>
                </div>
                <div className="space-y-1.5">
                  {["Spam", "Harassment", "Hate speech", "Violence", "Other"].map(r => (
                    <button
                      key={r}
                      onClick={() => setReportReason(r)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors",
                        reportReason === r
                          ? "bg-red-50 text-red-600 border border-red-200"
                          : "bg-[#F5F5F7] text-[#111111] hover:bg-[#EDEDED]"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleReport}
                  disabled={!reportReason || reportLoading}
                  className="w-full py-2 rounded-xl text-sm font-black bg-red-500 text-white disabled:opacity-40 transition-opacity active:scale-95"
                >
                  {reportLoading ? "Reporting…" : "Submit Report"}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

PostOptionsMenu.displayName = "PostOptionsMenu";
export default PostOptionsMenu;
