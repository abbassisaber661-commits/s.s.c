import React, { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Achievement } from "@/types/profile";

const RARITY_RING: Record<string, string> = {
  common: "ring-gray-300 dark:ring-gray-600",
  rare: "ring-blue-400",
  epic: "ring-purple-500",
  legendary: "ring-yellow-400",
};

const RARITY_GLOW: Record<string, string> = {
  common: "",
  rare: "shadow-blue-400/30",
  epic: "shadow-purple-500/40",
  legendary: "shadow-yellow-400/50",
};

interface AchievementBadgeProps {
  achievement: Achievement;
  index: number;
}

const AchievementBadge = memo(({ achievement, index }: AchievementBadgeProps) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const rarity = achievement.rarity ?? "common";
  const ringClass = RARITY_RING[rarity];
  const glowClass = RARITY_GLOW[rarity];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 200 }}
      className="relative flex flex-col items-center gap-1.5"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onTouchStart={() => setShowTooltip((v) => !v)}
    >
      {/* Badge */}
      <div
        className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center",
          "ring-2 shadow-lg transition-transform hover:scale-110 cursor-pointer",
          ringClass,
          glowClass
        )}
        style={{ background: achievement.color }}
      >
        <span className="text-2xl select-none">{achievement.icon}</span>
      </div>

      {/* Label */}
      <span className="text-[10px] text-center text-gray-500 dark:text-gray-400 font-medium max-w-[56px] truncate">
        {achievement.title}
      </span>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.9 }}
            className={cn(
              "absolute bottom-full mb-2 z-50 w-40",
              "bg-gray-900 dark:bg-gray-800 text-white",
              "rounded-xl px-3 py-2 shadow-2xl pointer-events-none",
              "text-center"
            )}
          >
            <p className="text-xs font-bold">{achievement.title}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {achievement.description}
            </p>
            {achievement.rarity && (
              <p
                className={cn(
                  "text-[9px] mt-1 font-semibold capitalize",
                  rarity === "legendary" && "text-yellow-400",
                  rarity === "epic" && "text-purple-400",
                  rarity === "rare" && "text-blue-400",
                  rarity === "common" && "text-gray-400"
                )}
              >
                {achievement.rarity}
              </p>
            )}
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

AchievementBadge.displayName = "AchievementBadge";

const PREVIEW_COUNT = 8;

interface ProfileAchievementsProps {
  achievements?: Achievement[];
  className?: string;
}

export const ProfileAchievements = memo(
  ({ achievements = [], className }: ProfileAchievementsProps) => {
    const [expanded, setExpanded] = useState(false);
    const hasMore = achievements.length > PREVIEW_COUNT;
    const visible = expanded ? achievements : achievements.slice(0, PREVIEW_COUNT);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-2xl border border-gray-100 dark:border-gray-800",
          "bg-white dark:bg-gray-900/60 p-4",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={18} className="text-yellow-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Achievements
          </h3>
          <span className="ml-auto text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
            {achievements.length}
          </span>
        </div>

        {achievements.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="text-4xl mb-2">🏅</span>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No achievements yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Keep playing to unlock badges
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-3 justify-start">
              {visible.map((achievement, i) => (
                <AchievementBadge
                  key={achievement.id}
                  achievement={achievement}
                  index={i}
                />
              ))}
            </div>

            {hasMore && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setExpanded((v) => !v)}
                className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-blue-500 hover:text-blue-600 transition-colors"
              >
                {expanded ? (
                  <>
                    <ChevronUp size={14} />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} />
                    {achievements.length - PREVIEW_COUNT} more achievements
                  </>
                )}
              </motion.button>
            )}
          </>
        )}
      </motion.div>
    );
  }
);

ProfileAchievements.displayName = "ProfileAchievements";
export default ProfileAchievements;
