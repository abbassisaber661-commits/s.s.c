import React, { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BadgeCheck,
  Crown,
  Shield,
  Star,
  Code2,
  Megaphone,
  Brush,
  Globe,
  UserCog,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VerificationTier } from "@/types/profile";

interface BadgeConfig {
  icon: React.ElementType;
  color: string;
  bg: string;
  label: string;
  description: string;
}

const CONFIG: Record<Exclude<VerificationTier, "none">, BadgeConfig> = {
  verified: {
    icon: BadgeCheck,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    label: "Verified",
    description: "This account has been verified by SkillLeague.",
  },
  official: {
    icon: Globe,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    label: "Official",
    description: "This is an official SkillLeague account.",
  },
  premium: {
    icon: Crown,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    label: "Premium",
    description: "This player has an active Premium subscription.",
  },
  partner: {
    icon: Star,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    label: "Partner",
    description: "Official SkillLeague content partner.",
  },
  creator: {
    icon: Brush,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    label: "Creator",
    description: "A recognized content creator on the platform.",
  },
  developer: {
    icon: Code2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    label: "Developer",
    description: "A member of the SkillLeague development team.",
  },
  moderator: {
    icon: UserCog,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    label: "Moderator",
    description: "A community moderator helping keep the platform safe.",
  },
  ambassador: {
    icon: Megaphone,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    label: "Ambassador",
    description: "An official SkillLeague brand ambassador.",
  },
  staff: {
    icon: Shield,
    color: "text-green-500",
    bg: "bg-green-500/10",
    label: "Staff",
    description: "A member of the SkillLeague staff team.",
  },
};

const SIZE_MAP = { sm: 13, md: 17, lg: 21 };

interface VerificationBadgeProps {
  tier?: VerificationTier;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

export const VerificationBadge = memo(
  ({ tier, size = "md", showTooltip = true, className }: VerificationBadgeProps) => {
    const [hovered, setHovered] = useState(false);

    if (!tier || tier === "none") return null;

    const config = CONFIG[tier];
    if (!config) return null;

    const Icon = config.icon;
    const iconSize = SIZE_MAP[size];

    return (
      <span
        className="relative inline-flex items-center"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onTouchStart={() => setHovered((v) => !v)}
      >
        <span
          title={!showTooltip ? config.label : undefined}
          className={cn("inline-flex items-center", config.color, className)}
        >
          <Icon size={iconSize} strokeWidth={2.5} />
        </span>

        {showTooltip && (
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50",
                  "w-44 pointer-events-none",
                  "bg-gray-900 dark:bg-gray-800 text-white",
                  "rounded-xl px-3 py-2 shadow-2xl text-center"
                )}
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-1.5",
                    config.bg
                  )}
                >
                  <Icon size={14} className={config.color} />
                </div>
                <p className="text-xs font-bold">{config.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                  {config.description}
                </p>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </span>
    );
  }
);

VerificationBadge.displayName = "VerificationBadge";
export default VerificationBadge;
