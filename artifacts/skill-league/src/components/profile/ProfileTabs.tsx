import React, { memo } from "react";
import { motion } from "framer-motion";
import { Clapperboard, Image, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActiveTab = "all" | "video" | "image" | "saved";

interface ProfileTabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

const TABS: { id: ActiveTab; icon?: React.ElementType; label?: string }[] = [
  { id: "all",   label: "Tout" },
  { id: "video", icon: Clapperboard },
  { id: "image", icon: Image },
  { id: "saved", icon: Bookmark },
];

export default memo(function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <div className="sticky top-0 z-20 bg-white border-b border-[#E5E5E5] shadow-sm">
      <div className="flex">
        {TABS.map((tab) => {
          const Icon  = tab.icon;
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex items-center justify-center flex-1",
                "py-3 transition-all duration-200",
                active ? "text-[#111111]" : "text-[#888888] hover:text-[#444444]"
              )}
            >
              {Icon
                ? <Icon size={19} strokeWidth={active ? 2.5 : 2} />
                : <span className="text-xs font-bold">{tab.label}</span>
              }

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
