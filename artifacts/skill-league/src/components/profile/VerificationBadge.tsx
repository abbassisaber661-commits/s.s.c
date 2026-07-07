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
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VerificationTier } from "@/types/profile";

interface BadgeConfig {
  icon: React.ElementType;
  color: string;
  bg: string;
  glowColor: string;
  label: string;
  description: string;
  isPrimary?: boolean;
}

const CONFIG: Record<Exclude<VerificationTier, "none">, BadgeConfig> = {
  owner: {
    icon: Crown,
    color: "text-white",
    bg: "bg-blue-600",
    glowColor: "rgba(37,99,235,0.9)",
    label: "App Owner",
    description: "The creator and owner of S.S.C.",
    isPrimary: true,
  },
  verified: {
    icon: BadgeCheck,
    color: "text-white",
    bg: "bg-blue-500",
    glowColor: "rgba(59,130,246,0.7)",
    label: "Verified",
    description: "This account has been verified by S.S.C.",
    isPrimary: true,
  },
  official: {
    icon: BadgeCheck,
    color: "text-white",
    bg: "bg-sky-500",
    glowColor: "rgba(14,165,233,0.6)",
    label: "Official",
    description: "This is an official S.S.C account.",
    isPrimary: true,
  },
  premium: {
    icon: Crown,
    color: "text-white",
    bg: "bg-yellow-400",
    glowColor: "rgba(250,204,21,0.6)",
    label: "Premium",
    description: "This player has an active Premium subscription.",
  },
  partner: {
    icon: Star,
    color: "text-white",
    bg: "bg-purple-500",
    glowColor: "rgba(168,85,247,0.6)",
    label: "Partner",
    description: "Official S.S.C content partner.",
  },
  creator: {
    icon: Brush,
    color: "text-white",
    bg: "bg-pink-500",
    glowColor: "rgba(236,72,153,0.6)",
    label: "Creator",
    description: "A recognized content creator on the platform.",
  },
  developer: {
    icon: Code2,
    color: "text-white",
    bg: "bg-emerald-500",
    glowColor: "rgba(16,185,129,0.6)",
    label: "Developer",
    description: "A member of the S.S.C development team.",
  },
  moderator: {
    icon: UserCog,
    color: "text-white",
    bg: "bg-orange-500",
    glowColor: "rgba(249,115,22,0.6)",
    label: "Moderator",
    description: "A community moderator helping keep the platform safe.",
  },
  ambassador: {
    icon: Megaphone,
    color: "text-white",
    bg: "bg-indigo-500",
    glowColor: "rgba(99,102,241,0.6)",
    label: "Ambassador",
    description: "An official S.S.C brand ambassador.",
  },
  staff: {
    icon: Shield,
    color: "text-white",
    bg: "bg-green-500",
    glowColor: "rgba(34,197,94,0.6)",
    label: "Staff",
    description: "A member of the S.S.C staff team.",
  },
};

const SIZE_MAP = {
  sm: { icon: 10, wrapper: "w-4 h-4" },
  md: { icon: 13, wrapper: "w-5 h-5" },
  lg: { icon: 17, wrapper: "w-7 h-7" },
};

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
    const { icon: iconSize, wrapper: wrapperSize } = SIZE_MAP[size];

    return (
      <span
        className="relative inline-flex items-center"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onTouchStart={() => setHovered((v) => !v)}
      >
        {/* Badge circle */}
        <motion.span
          className={cn(
            "inline-flex items-center justify-center rounded-full flex-shrink-0",
            config.bg,
            config.color,
            wrapperSize,
            className,
          )}
          style={{
            boxShadow: config.isPrimary
              ? `0 0 8px ${config.glowColor}, 0 0 16px ${config.glowColor.replace("0.7", "0.35").replace("0.6", "0.25")}`
              : undefined,
          }}
          animate={
            config.isPrimary
              ? {
                  boxShadow: [
                    `0 0 6px ${config.glowColor}, 0 0 12px ${config.glowColor.replace("0.7", "0.2").replace("0.6", "0.15")}`,
                    `0 0 12px ${config.glowColor}, 0 0 24px ${config.glowColor.replace("0.7", "0.45").replace("0.6", "0.35")}`,
                    `0 0 6px ${config.glowColor}, 0 0 12px ${config.glowColor.replace("0.7", "0.2").replace("0.6", "0.15")}`,
                  ],
                }
              : undefined
          }
          transition={
            config.isPrimary
              ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
              : undefined
          }
        >
          <Icon size={iconSize} strokeWidth={2.8} />
        </motion.span>

        {/* Tooltip */}
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
                  "bg-gray-900 text-white",
                  "rounded-xl px-3 py-2 shadow-2xl text-center",
                )}
                style={{ boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)` }}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1.5",
                    config.bg,
                  )}
                  style={{
                    boxShadow: config.isPrimary ? `0 0 12px ${config.glowColor}` : undefined,
                  }}
                >
                  <Icon size={15} className="text-white" />
                </div>
                <p className="text-xs font-bold">{config.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                  {config.description}
                </p>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900" />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </span>
    );
  },
);

VerificationBadge.displayName = "VerificationBadge";
export default VerificationBadge;
