import React, { memo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MoreHorizontal,
  Edit3,
  Trash2,
  Flag,
  Link2,
  Pin,
  Bookmark,
  BookmarkCheck,
  MessageCircleOff,
  UserX,
  Share2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PostOptionsMenuProps {
  postId:      string;
  isOwner?:    boolean;
  isPinned?:   boolean;
  isSaved?:    boolean;
  commentsOff?: boolean;
  onEdit?:     () => void;
  onDelete?:   () => void;
  onReport?:   () => void;
  onPin?:      (pinned: boolean) => void;
  onSave?:     (saved: boolean) => void;
  onToggleComments?: (off: boolean) => void;
  onBlock?:    () => void;
  className?:  string;
}

interface OptionRowProps {
  icon:    React.ElementType;
  label:   string;
  onClick: () => void;
  variant?: "default" | "danger";
  done?:   boolean;
}

const OptionRow = memo(({ icon: Icon, label, onClick, variant = "default", done }: OptionRowProps) => (
  <motion.button
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left",
      variant === "danger"
        ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
        : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
    )}
  >
    <Icon size={17} className="flex-shrink-0" />
    <span className="flex-1 font-medium">{label}</span>
    {done && <Check size={14} className="text-green-500" />}
  </motion.button>
));
OptionRow.displayName = "OptionRow";

export const PostOptionsMenu = memo(({
  postId,
  isOwner = false,
  isPinned = false,
  isSaved = false,
  commentsOff = false,
  onEdit,
  onDelete,
  onReport,
  onPin,
  onSave,
  onToggleComments,
  onBlock,
}: PostOptionsMenuProps) => {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(isPinned);
  const [saved, setSaved] = useState(isSaved);
  const [commOff, setCommOff] = useState(commentsOff);
  const [linkCopied, setLinkCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const close = () => setOpen(false);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/post/${postId}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast.success("Link copied");
    close();
  };

  const handleSave = () => {
    const next = !saved;
    setSaved(next);
    onSave?.(next);
    toast.success(next ? "Saved" : "Removed from saved");
    close();
  };

  const handlePin = () => {
    const next = !pinned;
    setPinned(next);
    onPin?.(next);
    toast.success(next ? "Post pinned" : "Post unpinned");
    close();
  };

  const handleToggleComments = () => {
    const next = !commOff;
    setCommOff(next);
    onToggleComments?.(next);
    toast.success(next ? "Comments turned off" : "Comments turned on");
    close();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
          "hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        )}
      >
        <MoreHorizontal size={18} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -6 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute right-0 top-full mt-1 z-50 w-52",
              "bg-white dark:bg-gray-900 rounded-2xl shadow-2xl",
              "border border-gray-100 dark:border-gray-800 overflow-hidden"
            )}
          >
            {/* Owner options */}
            {isOwner && (
              <>
                {onEdit && <OptionRow icon={Edit3} label="Edit post" onClick={() => { onEdit(); close(); }} />}
                <OptionRow icon={Pin} label={pinned ? "Unpin post" : "Pin post"} onClick={handlePin} />
                <OptionRow
                  icon={commOff ? MessageCircleOff : MessageCircleOff}
                  label={commOff ? "Turn on comments" : "Turn off comments"}
                  onClick={handleToggleComments}
                />
                <div className="mx-4 border-b border-gray-100 dark:border-gray-800" />
              </>
            )}

            {/* Common options */}
            <OptionRow
              icon={saved ? BookmarkCheck : Bookmark}
              label={saved ? "Unsave" : "Save post"}
              onClick={handleSave}
              done={saved}
            />
            <OptionRow icon={Link2} label="Copy link" onClick={handleCopyLink} done={linkCopied} />
            <OptionRow icon={Share2} label="Share post" onClick={() => { handleCopyLink(); }} />

            {/* Danger zone */}
            <div className="mx-4 border-b border-gray-100 dark:border-gray-800" />
            {!isOwner && onBlock && (
              <OptionRow icon={UserX} label="Block user" onClick={() => { onBlock(); close(); }} variant="danger" />
            )}
            {!isOwner && onReport && (
              <OptionRow icon={Flag} label="Report post" onClick={() => { onReport(); close(); }} variant="danger" />
            )}
            {isOwner && onDelete && (
              <OptionRow icon={Trash2} label="Delete post" onClick={() => { onDelete(); close(); }} variant="danger" />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

PostOptionsMenu.displayName = "PostOptionsMenu";
export default PostOptionsMenu;
