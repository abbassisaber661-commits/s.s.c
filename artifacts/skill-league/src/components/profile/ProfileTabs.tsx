import React, { memo } from "react";
import { motion } from "framer-motion";
import { Grid3X3, Image, Clapperboard, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentTab } from "@/types/profile";

interface ProfileTabsProps {
  currentTab: ContentTab;
  onTabChange: (tab: ContentTab) => void;
  isOwner?: boolean;
  postsCount?: number;
  mediaCount?: number;
  reelsCount?: number;
  savedCount?: number;
}

const ALL_TABS: {
  id: ContentTab;
  icon: React.ElementType;
  label: string;
  ownerOnly?: boolean;
}[] = [
  { id: "posts", icon: Grid3X3, label: "Posts" },
  { id: "media", icon: Image, label: "Media" },
  { id: "reels", icon: Clapperboard, label: "Reels" },
  { id: "saved", icon: Bookmark, label: "Saved", ownerOnly: true },
];

export default memo(function ProfileTabs({
  currentTab,
  onTabChange,
  isOwner = false,
  postsCount,
  mediaCount,
  reelsCount,
  savedCount,
}: ProfileTabsProps) {
  const tabs = ALL_TABS.filter((t) => !t.ownerOnly || isOwner);

  const countMap: Partial<Record<ContentTab, number | undefined>> = {
    posts: postsCount,
    media: mediaCount,
    reels: reelsCount,
    saved: savedCount,
  };

  return (
    <div
      className={cn(
        "sticky top-0 z-20",
        "bg-white/90 dark:bg-gray-950/90 backdrop-blur-md",
        "border-b border-gray-200 dark:border-gray-800"
      )}
    >
      <div
        className={cn(
          "grid",
          tabs.length === 4 ? "grid-cols-4" : "grid-cols-3"
        )}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = currentTab === tab.id;
          const count = countMap[tab.id];

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center py-3 gap-0.5 transition-all duration-200",
                active
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              )}
            >
              <Icon size={19} strokeWidth={active ? 2.5 : 2} />

              <span className="text-[11px] font-semibold leading-none">
                {tab.label}
              </span>

              {count !== undefined && count > 0 && (
                <span className="text-[9px] text-gray-400 dark:text-gray-500">
                  {count >= 1000 ? (count / 1000).toFixed(1) + "K" : count}
                </span>
              )}

              {active && (
                <motion.div
                  layoutId="profile-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});
