import React from "react";
import { motion } from "framer-motion";
import { Grid3X3, Clapperboard, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

export type ContentTab = "posts" | "reels" | "saved";

interface ProfileTabsProps {
currentTab: ContentTab;
onTabChange: (tab: ContentTab) => void;
postsCount?: number;
reelsCount?: number;
savedCount?: number;
}

const tabs = [
{
id: "posts" as const,
icon: Grid3X3,
label: "Posts",
},
{
id: "reels" as const,
icon: Clapperboard,
label: "Reels",
},
{
id: "saved" as const,
icon: Bookmark,
label: "Saved",
},
];

export default function ProfileTabs({
currentTab,
onTabChange,
}: ProfileTabsProps) {
return (
<div className="sticky top-0 z-20 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
<div className="grid grid-cols-3">
{tabs.map((tab) => {
const Icon = tab.icon;
const active = currentTab === tab.id;

      return (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "relative flex flex-col items-center justify-center py-3 transition-all",
            active
              ? "text-black dark:text-white"
              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          )}
        >
          <Icon size={20} />

          <span className="text-xs mt-1 font-medium">
            {tab.label}
          </span>

          {active && (
            <motion.div
              layoutId="profile-tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white"
            />
          )}
        </button>
      );
    })}
  </div>
</div>

);
}