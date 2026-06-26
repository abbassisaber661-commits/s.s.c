import React, { memo, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReactionEmoji = "❤️" | "😂" | "😮" | "😢" | "🔥" | "👏" | "💪";

export const REACTIONS: { emoji: ReactionEmoji; label: string }[] = [
  { emoji: "❤️", label: "Love" },
  { emoji: "😂", label: "Haha" },
  { emoji: "😮", label: "Wow" },
  { emoji: "😢", label: "Sad" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "👏", label: "Clap" },
  { emoji: "💪", label: "Strong" },
];

interface ReactionCounts {
  "❤️"?: number;
  "😂"?: number;
  "😮"?: number;
  "😢"?: number;
  "🔥"?: number;
  "👏"?: number;
  "💪"?: number;
}

interface PostReactionPickerProps {
  likeCount:      number;
  myReaction?:    ReactionEmoji | null;
  reactionCounts?: ReactionCounts;
  onReact:        (emoji: ReactionEmoji | null) => void;
  className?:     string;
}

export const PostReactionPicker = memo(
  ({ likeCount, myReaction, reactionCounts = {}, onReact, className }: PostReactionPickerProps) => {
    const [showPicker, setShowPicker] = useState(false);
    const [localReaction, setLocalReaction] = useState<ReactionEmoji | null>(myReaction ?? null);
    const [localCount, setLocalCount] = useState(likeCount);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    const hasReacted = !!localReaction;

    const handleQuickLike = useCallback(() => {
      if (showPicker) return;
      if (localReaction) {
        // Toggle off
        setLocalReaction(null);
        setLocalCount((n) => Math.max(0, n - 1));
        onReact(null);
      } else {
        // Default heart react
        setLocalReaction("❤️");
        setLocalCount((n) => n + 1);
        onReact("❤️");
      }
    }, [localReaction, onReact, showPicker]);

    const handleLongPressStart = useCallback(() => {
      longPressTimer.current = setTimeout(() => setShowPicker(true), 400);
    }, []);

    const handleLongPressEnd = useCallback(() => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }, []);

    const handleSelectReaction = useCallback(
      (emoji: ReactionEmoji) => {
        if (localReaction === emoji) {
          setLocalReaction(null);
          setLocalCount((n) => Math.max(0, n - 1));
          onReact(null);
        } else {
          if (!localReaction) setLocalCount((n) => n + 1);
          setLocalReaction(emoji);
          onReact(emoji);
        }
        setShowPicker(false);
      },
      [localReaction, onReact]
    );

    // Total reactions across all types
    const totalReactions = localCount;

    // Top 2 reactions to display
    const topReactions = Object.entries(reactionCounts)
      .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
      .slice(0, 2)
      .map(([emoji]) => emoji);

    return (
      <div className={cn("relative flex items-center gap-1.5", className)} ref={pickerRef}>
        {/* Main like/reaction button */}
        <button
          onClick={handleQuickLike}
          onMouseDown={handleLongPressStart}
          onMouseUp={handleLongPressEnd}
          onMouseLeave={handleLongPressEnd}
          onTouchStart={handleLongPressStart}
          onTouchEnd={handleLongPressEnd}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all",
            "text-sm font-semibold select-none",
            hasReacted
              ? "bg-red-50 dark:bg-red-900/20"
              : "hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
        >
          {localReaction ? (
            <motion.span
              key={localReaction}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="text-base leading-none"
            >
              {localReaction}
            </motion.span>
          ) : (
            <Heart
              size={17}
              className={cn(
                "transition-colors",
                hasReacted ? "fill-red-500 text-red-500" : "text-gray-500"
              )}
            />
          )}
          <span className={cn("text-xs", hasReacted ? "text-red-500" : "text-gray-500")}>
            {totalReactions > 0 ? totalReactions : ""}
          </span>
        </button>

        {/* Reaction badges */}
        {topReactions.length > 0 && (
          <div className="flex -space-x-0.5">
            {topReactions.map((emoji) => (
              <span key={emoji} className="text-xs">{emoji}</span>
            ))}
          </div>
        )}

        {/* Picker popover */}
        <AnimatePresence>
          {showPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 8 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={cn(
                  "absolute bottom-full left-0 mb-2 z-50",
                  "flex items-center gap-1 px-2 py-2 rounded-2xl",
                  "bg-white dark:bg-gray-900 shadow-2xl",
                  "border border-gray-100 dark:border-gray-800"
                )}
              >
                {REACTIONS.map(({ emoji, label }) => (
                  <motion.button
                    key={emoji}
                    whileHover={{ scale: 1.3, y: -4 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSelectReaction(emoji)}
                    title={label}
                    className={cn(
                      "w-9 h-9 flex items-center justify-center text-xl rounded-full",
                      "transition-colors",
                      localReaction === emoji
                        ? "bg-blue-100 dark:bg-blue-900/30"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

PostReactionPicker.displayName = "PostReactionPicker";
export default PostReactionPicker;
