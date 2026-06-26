import React, { memo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AvatarFrame, ProfileTheme } from "@/types/profile";

interface ProfileCustomizationProps {
  avatarFrame?: AvatarFrame;
  profileTheme?: ProfileTheme;
  isOwner?: boolean;
  onOpenCosmetics?: () => void;
  className?: string;
}

interface CosmeticSlotProps {
  label: string;
  icon: string;
  active?: boolean;
  isPremium?: boolean;
  name?: string;
}

const CosmeticSlot = memo(
  ({ label, icon, active, isPremium, name }: CosmeticSlotProps) => (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all",
        active
          ? "border-blue-400/50 bg-blue-50/50 dark:bg-blue-900/20"
          : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40"
      )}
    >
      <div className="relative">
        <span className="text-2xl">{icon}</span>
        {isPremium && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
            <Sparkles size={9} className="text-yellow-900" />
          </div>
        )}
        {!active && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
            <Lock size={9} className="text-gray-500 dark:text-gray-400" />
          </div>
        )}
      </div>
      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
        {label}
      </span>
      {name && (
        <span className="text-[9px] text-blue-500 font-semibold truncate max-w-full">
          {name}
        </span>
      )}
    </div>
  )
);

CosmeticSlot.displayName = "CosmeticSlot";

export const ProfileCustomization = memo(
  ({
    avatarFrame,
    profileTheme,
    isOwner = false,
    onOpenCosmetics,
    className,
  }: ProfileCustomizationProps) => {
    const slots = [
      {
        label: "Avatar Frame",
        icon: "🖼️",
        active: !!avatarFrame,
        isPremium: avatarFrame?.isPremium,
        name: avatarFrame?.name,
      },
      {
        label: "Profile Theme",
        icon: "🎨",
        active: !!profileTheme,
        isPremium: profileTheme?.isPremium,
        name: profileTheme?.name,
      },
      {
        label: "Badge Frame",
        icon: "✨",
        active: false,
        isPremium: false,
        name: undefined,
      },
      {
        label: "Name Effect",
        icon: "💫",
        active: false,
        isPremium: false,
        name: undefined,
      },
    ];

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
          <Sparkles size={18} className="text-purple-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Customization
          </h3>
          {isOwner && (
            <button
              onClick={onOpenCosmetics}
              className="ml-auto text-xs text-blue-500 font-semibold hover:underline"
            >
              Shop
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {slots.map((slot) => (
            <CosmeticSlot key={slot.label} {...slot} />
          ))}
        </div>

        {!avatarFrame && !profileTheme && (
          <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-3">
            Cosmetics coming soon — equip items to stand out
          </p>
        )}
      </motion.div>
    );
  }
);

ProfileCustomization.displayName = "ProfileCustomization";
export default ProfileCustomization;
