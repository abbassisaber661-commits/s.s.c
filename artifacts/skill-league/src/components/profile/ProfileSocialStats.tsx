import React, { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const formatNumber = (num: number = 0): string => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000)     return (num / 1_000).toFixed(1) + "K";
  return String(num);
};

interface StatItemProps {
  label: string;
  value: number;
  index: number;
  onClick?: () => void;
}

const StatItem = memo(({ label, value, index, onClick }: StatItemProps) => (
  <motion.button
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors",
      onClick
        ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95"
        : "cursor-default"
    )}
  >
    <span className="text-lg font-bold text-gray-900 dark:text-white leading-none">
      {formatNumber(value)}
    </span>
    <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
      {label}
    </span>
  </motion.button>
));

StatItem.displayName = "StatItem";

interface ProfileSocialStatsProps {
  postsCount: number;
  followers: number;
  following: number;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
  className?: string;
}

export const ProfileSocialStats = memo(
  ({
    postsCount,
    followers,
    following,
    onFollowersClick,
    onFollowingClick,
    className,
  }: ProfileSocialStatsProps) => {
    const stats = [
      { label: "Posts",     value: postsCount, onClick: undefined          },
      { label: "Followers", value: followers,  onClick: onFollowersClick   },
      { label: "Following", value: following,  onClick: onFollowingClick   },
    ];

    return (
      <div className={cn("flex items-center justify-center gap-1", className)}>
        {stats.map((stat, i) => (
          <React.Fragment key={stat.label}>
            <StatItem
              label={stat.label}
              value={stat.value}
              index={i}
              onClick={stat.onClick}
            />
            {i < stats.length - 1 && (
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }
);

ProfileSocialStats.displayName = "ProfileSocialStats";
export default ProfileSocialStats;
