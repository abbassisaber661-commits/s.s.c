import React, { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Badge, BadgeRarity } from "@/types/profile";

const RARITY_CONFIG: Record<
  BadgeRarity,
  { label: string; ring: string; glow: string; bg: string }
> = {
  common: {
    label: "Common",
    ring: "ring-gray-300 dark:ring-gray-600",
    glow: "",
    bg: "bg-gray-50 dark:bg-gray-800",
  },
  rare: {
    label: "Rare",
    ring: "ring-blue-400",
    glow: "shadow-blue-400/25 shadow-lg",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  epic: {
    label: "Epic",
    ring: "ring-purple-500",
    glow: "shadow-purple-500/35 shadow-lg",
    bg: "bg-purple-50 dark:bg-purple-900/20",
  },
  legendary: {
    label: "Legendary",
    ring: "ring-yellow-400",
    glow: "shadow-yellow-400/45 shadow-xl",
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
  },
};

const CATEGORY_LABEL: Record<string, string> = {
  role: "Role",
  social: "Community",
  achievement: "Achievement",
  event: "Event",
  special: "Special",
};

interface BadgeCardProps {
  badge: Badge;
  index: number;
}

const BadgeCard = memo(({ badge, index }: BadgeCardProps) => {
  const [hovered, setHovered] = useState(false);
  const rarity = badge.rarity ?? "common";
  const cfg = RARITY_CONFIG[rarity];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.75 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.035, type: "spring", stiffness: 220 }}
      className="relative flex flex-col items-center gap-1.5"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered((v) => !v)}
    >
      {/* Badge tile */}
      <div
        className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center",
          "ring-2 transition-transform hover:scale-110 cursor-pointer select-none",
          cfg.ring,
          cfg.glow,
          cfg.bg
        )}
        style={badge.color ? { backgroundColor: badge.color + "25" } : {}}
      >
        <span className="text-2xl">{badge.icon}</span>
      </div>

      {/* Title */}
      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 text-center max-w-[56px] truncate">
        {badge.title}
      </span>

      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.9 }}
            className={cn(
              "absolute bottom-full mb-2 z-50 w-44 pointer-events-none",
              "bg-gray-900 dark:bg-gray-800 text-white",
              "rounded-xl px-3 py-2.5 shadow-2xl text-center"
            )}
          >
            <p className="text-xs font-bold">{badge.title}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
              {badge.description}
            </p>
            <div className="flex items-center justify-center gap-1 mt-1.5">
              <span
                className={cn(
                  "text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full",
                  rarity === "legendary" && "text-yellow-400 bg-yellow-400/10",
                  rarity === "epic" && "text-purple-400 bg-purple-400/10",
                  rarity === "rare" && "text-blue-400 bg-blue-400/10",
                  rarity === "common" && "text-gray-400 bg-gray-400/10"
                )}
              >
                {cfg.label}
              </span>
              {badge.category && (
                <span className="text-[9px] text-gray-500">
                  · {CATEGORY_LABEL[badge.category] ?? badge.category}
                </span>
              )}
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

BadgeCard.displayName = "BadgeCard";

const PREVIEW_COUNT = 10;
const CATEGORIES = ["role", "social", "achievement", "event", "special"] as const;

interface ProfileBadgesProps {
  badges?: Badge[];
  className?: string;
}

export const ProfileBadges = memo(({ badges = [], className }: ProfileBadgesProps) => {
  const [expanded, setExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = ["all", ...CATEGORIES.filter((c) => badges.some((b) => b.category === c))];

  const filtered =
    activeCategory === "all" ? badges : badges.filter((b) => b.category === activeCategory);

  const visible = expanded ? filtered : filtered.slice(0, PREVIEW_COUNT);
  const hasMore = filtered.length > PREVIEW_COUNT;

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
      <div className="flex items-center gap-2 mb-3">
        <Award size={18} className="text-purple-500" />
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Badges</h3>
        <span className="ml-auto text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
          {badges.length}
        </span>
      </div>

      {/* Category filter */}
      {categories.length > 2 && (
        <div className="flex gap-1.5 flex-wrap mb-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setExpanded(false);
              }}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all",
                activeCategory === cat
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              {cat === "all" ? "All" : CATEGORY_LABEL[cat] ?? cat}
            </button>
          ))}
        </div>
      )}

      {/* Badge grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <span className="text-3xl mb-2">🏷️</span>
          <p className="text-sm text-gray-500 dark:text-gray-400">No badges yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Earn badges by participating in the community
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 justify-start">
            {visible.map((badge, i) => (
              <BadgeCard key={badge.id} badge={badge} index={i} />
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
                  <ChevronUp size={14} /> Show less
                </>
              ) : (
                <>
                  <ChevronDown size={14} />
                  {filtered.length - PREVIEW_COUNT} more badges
                </>
              )}
            </motion.button>
          )}
        </>
      )}
    </motion.div>
  );
});

ProfileBadges.displayName = "ProfileBadges";
export default ProfileBadges;
