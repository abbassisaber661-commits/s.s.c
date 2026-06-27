import React, { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ContentTab } from "@/types/profile";

interface ProfileEmptyStateProps {
  tab: ContentTab;
  isOwner?: boolean;
  onAction?: () => void;
  className?: string;
}

const EMPTY_CONFIGS: Record<
  ContentTab,
  { icon: string; title: string; ownerDesc: string; visitorDesc: string; actionLabel?: string }
> = {
  posts: {
    icon: "📝",
    title: "No Posts Yet",
    ownerDesc: "Share your thoughts, moments and highlights with the world.",
    visitorDesc: "This player hasn't shared any posts yet.",
    actionLabel: "Create First Post",
  },
  media: {
    icon: "🖼️",
    title: "No Media Yet",
    ownerDesc: "Upload photos and videos to build your media gallery.",
    visitorDesc: "No photos or videos have been shared yet.",
    actionLabel: "Upload Media",
  },
  reels: {
    icon: "🎬",
    title: "No Reels Yet",
    ownerDesc: "Create short video reels to showcase your best plays.",
    visitorDesc: "No reels have been posted yet.",
    actionLabel: "Create Reel",
  },
  saved: {
    icon: "🔖",
    title: "Nothing Saved",
    ownerDesc: "Save posts you love — they'll appear here for easy access.",
    visitorDesc: "",
    actionLabel: "Browse Posts",
  },
  about: {
    icon: "📋",
    title: "No Info Yet",
    ownerDesc: "Add information about yourself so others can get to know you.",
    visitorDesc: "This player hasn't added any info yet.",
    actionLabel: "Edit Profile",
  },
  friends: {
    icon: "👥",
    title: "No Friends Yet",
    ownerDesc: "Connect with other players to build your friends list.",
    visitorDesc: "This player hasn't connected with anyone yet.",
  },
};

export const ProfileEmptyState = memo(
  ({ tab, isOwner = false, onAction, className }: ProfileEmptyStateProps) => {
    const config = EMPTY_CONFIGS[tab];
    const description = isOwner ? config.ownerDesc : config.visitorDesc;

    if (!description) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "flex flex-col items-center justify-center py-16 px-6 text-center",
          className
        )}
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
          className="text-6xl mb-4 select-none"
        >
          {config.icon}
        </motion.div>

        <h3 className="text-base font-bold text-[#111111] mb-2">
          {config.title}
        </h3>

        <p className="text-sm text-[#666666] max-w-xs leading-relaxed">
          {description}
        </p>

        {isOwner && onAction && config.actionLabel && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onAction}
            className="mt-6 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#FFD60A] hover:bg-[#F5C800] text-black transition-colors duration-200"
          >
            {config.actionLabel}
          </motion.button>
        )}
      </motion.div>
    );
  }
);

ProfileEmptyState.displayName = "ProfileEmptyState";
export default ProfileEmptyState;
