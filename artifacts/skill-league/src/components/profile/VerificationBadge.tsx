import React, { memo } from "react";
import { BadgeCheck, Crown, Shield, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VerificationTier } from "@/types/profile";

interface VerificationBadgeProps {
  tier?: VerificationTier;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const CONFIG: Record<
  Exclude<VerificationTier, "none">,
  { icon: React.ElementType; color: string; label: string }
> = {
  verified: {
    icon: BadgeCheck,
    color: "text-blue-500",
    label: "Verified",
  },
  premium: {
    icon: Crown,
    color: "text-yellow-400",
    label: "Premium",
  },
  partner: {
    icon: Star,
    color: "text-purple-500",
    label: "Partner",
  },
  staff: {
    icon: Shield,
    color: "text-green-500",
    label: "Staff",
  },
};

const SIZE_MAP = {
  sm: 14,
  md: 18,
  lg: 22,
};

export const VerificationBadge = memo(
  ({ tier, size = "md", className }: VerificationBadgeProps) => {
    if (!tier || tier === "none") return null;

    const config = CONFIG[tier];
    const Icon = config.icon;
    const iconSize = SIZE_MAP[size];

    return (
      <span
        title={config.label}
        className={cn("inline-flex items-center", config.color, className)}
      >
        <Icon size={iconSize} strokeWidth={2.5} />
      </span>
    );
  }
);

VerificationBadge.displayName = "VerificationBadge";
export default VerificationBadge;
