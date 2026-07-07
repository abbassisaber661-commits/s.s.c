import React, { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type ActiveTab = "all" | "video" | "image" | "saved";

interface ProfileTabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

const TABS: { id: ActiveTab; emoji?: string; label: string }[] = [
  { id: "all",   label: "All" },
  { id: "image", emoji: "🖼",  label: "Photos" },
  { id: "video", emoji: "📽",  label: "Videos" },
  { id: "saved", emoji: "🔖",  label: "Saved" },
];

export default memo(function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <div className="sticky top-0 z-20 bg-white border-b border-[#E5E5E5] shadow-sm">
      <div className="flex" dir="ltr">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex items-center justify-center gap-1 flex-1",
                "py-3 text-xs font-semibold transition-all duration-200",
                active ? "text-[#111111]" : "text-[#888888] hover:text-[#444444]"
              )}
            >
              {tab.emoji && (
                <span className="text-sm leading-none">{tab.emoji}</span>
              )}
              <span>{tab.label}</span>

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
