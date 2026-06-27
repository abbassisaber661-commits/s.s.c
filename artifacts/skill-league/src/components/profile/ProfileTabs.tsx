import React, { memo } from "react";
import { motion } from "framer-motion";
import { Grid3X3, Image, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentTab } from "@/types/profile";

interface ProfileTabsProps {
  currentTab: ContentTab;
  onTabChange: (tab: ContentTab) => void;
  isOwner?: boolean;
  postsCount?: number;
  mediaCount?: number;
}

const TABS: { id: ContentTab; icon: React.ElementType; label: string }[] = [
  { id: "posts", icon: Grid3X3, label: "Posts" },
  { id: "media", icon: Image,   label: "Media" },
  { id: "about", icon: Info,    label: "About" },
];

export default memo(function ProfileTabs({
  currentTab,
  onTabChange,
  postsCount,
  mediaCount,
}: ProfileTabsProps) {
  const countMap: Partial<Record<ContentTab, number | undefined>> = {
    posts: postsCount,
    media: mediaCount,
  };

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-[#E5E5E5] shadow-sm">
      <div className="flex">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = currentTab === tab.id;
          const count = countMap[tab.id];

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1",
                "px-4 py-3 gap-0.5 transition-all duration-200",
                active
                  ? "text-[#111111]"
                  : "text-[#666666] hover:text-[#111111]"
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[11px] font-semibold leading-none">{tab.label}</span>
              {count !== undefined && count > 0 && (
                <span className="text-[9px] text-[#666666]">
                  {count >= 1000 ? (count / 1000).toFixed(1) + "K" : count}
                </span>
              )}
              {active && (
                <motion.div
                  layoutId="profile-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFD60A]"
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
