import React, { memo, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MoreHorizontal,
  Edit3,
  Trash2,
  Flag,
  Link2,
  Pin,
  PinOff,
  EyeOff,
  Globe,
  Lock,
  Check,
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
  onEditDone?:   (newContent: string) => void;
  onDeleteDone?: () => void;
  onHide?:       () => void;
}

/* ─── single action row ─────────────────────────────────────────── */
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
    <div className="flex-1 min-w-0 text-left">
      <div className="font-semibold leading-snug">{label}</div>
      {sublabel && <div className="text-[11px] text-[#888888] mt-0.5">{sublabel}</div>}
    </div>
    {done && <Check size={14} className="text-green-500 flex-shrink-0" />}
  </motion.button>
));
Row.displayName = "Row";

const Divider = () => <div className="mx-4 border-b border-[#F0F0F0]" />;

/* ─── main component ────────────────────────────────────────────── */
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
  const [open, setOpen]     = useState(false);
  const [view, setView]     = useState<"main" | "edit" | "report">("main");
  const [pinned, setPinned] = useState(initialPinned);
  const [isPublic, setPublicFlag] = useState(initialPublic);
  const [linkCopied, setLinkCopied] = useState(false);
  const [editText, setEditText]     = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  /* position of the floating menu (fixed coords) */
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef    = useRef<HTMLDivElement>(null);
  const myId = getStoredPlayerId();

  /* calculate fixed position so menu is never clipped */
  const calcPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const menuW = 256; // w-64
    const viewW = window.innerWidth;

    let left = r.right - menuW;
    if (left < 8) left = 8;
    if (left + menuW > viewW - 8) left = viewW - menuW - 8;

    setMenuStyle({
      position: "fixed",
      top:  r.bottom + 6,
      left,
      width: menuW,
      zIndex: 99999,
    });
  }, []);

  /* open / close */
  const openMenu = useCallback(() => {
    calcPosition();
    setOpen(v => !v);
    setView("main");
  }, [calcPosition]);

  /* close on outside click */
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        setOpen(false);
        setView("main");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  /* recompute on scroll/resize while open */
  useEffect(() => {
    if (!open) return;
    const update = () => calcPosition();
    window.addEventListener("scroll", update, { passive: true, capture: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
    };
  }, [open, calcPosition]);

  const close = useCallback(() => {
    setOpen(false);
    setView("main");
    setEditText("");
    setReportReason("");
  }, []);

  /* ── copy link ── */
  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`).catch(() => {});
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
    setPublicFlag(next);
    close();
    try {
      await api.community.setVisibility(postId, myId ?? authorId, next);
      toast.success(next ? "Post is now public" : "Post is now private");
    } catch {
      setPublicFlag(!next);
      toast.error("Failed to change visibility");
    }
  };

  /* ── edit ── */
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

  /* ── floating menu (portal) ── */
  const floatingMenu = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={menuRef}
          style={menuStyle}
          initial={{ opacity: 0, scale: 0.93, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: -6 }}
          transition={{ duration: 0.13 }}
          className="bg-white rounded-2xl shadow-2xl border border-[#E5E5E5] overflow-hidden"
        >
          {/* ── MAIN VIEW ── */}
          {view === "main" && (
            <>
              <div className="px-4 py-2.5 border-b border-[#F0F0F0]">
                <p className="text-xs font-black text-[#888888] uppercase tracking-wider">
                  {isOwner ? "Your post" : "Post options"}
                </p>
              </div>

              {isOwner ? (
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
                    className="px-4 py-1.5 rounded-lg text-xs font-black bg-[#FFD60A] text-black disabled:opacity-40"
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
                className="w-full py-2 rounded-xl text-sm font-black bg-red-500 text-white disabled:opacity-40"
              >
                {reportLoading ? "Reporting…" : "Submit Report"}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* trigger button */}
      <button
        ref={triggerRef}
        onClick={openMenu}
        className="w-8 h-8 rounded-full flex items-center justify-center text-[#888888] hover:text-[#444444] hover:bg-[#F5F5F7] transition-colors flex-shrink-0"
        aria-label="Post options"
      >
        <MoreHorizontal size={18} />
      </button>

      {/* menu rendered into document.body via portal — never clipped */}
      {createPortal(floatingMenu, document.body)}
    </>
  );
});

PostOptionsMenu.displayName = "PostOptionsMenu";
export default PostOptionsMenu;
