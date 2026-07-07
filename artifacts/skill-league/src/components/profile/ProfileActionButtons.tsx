import React, { memo, useState } from "react";
import { motion } from "framer-motion";
import {
  Edit3, Share2, UserPlus, UserCheck,
  MessageCircle, Loader2, BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileActionButtonsProps {
  isOwner: boolean;
  isFollowing?: boolean;
  isFollowLoading?: boolean;
  onEditProfile?: () => void;
  onShareProfile?: () => void;
  onFollowToggle?: () => void;
  onMessage?: () => void;
  onStatistics?: () => void;
  className?: string;
}

const ActionButton = memo(
  ({
    onClick,
    icon: Icon,
    label,
    variant = "secondary",
    loading = false,
    disabled = false,
    className,
  }: {
    onClick?: () => void;
    icon: React.ElementType;
    label: string;
    variant?: "primary" | "secondary" | "success";
    loading?: boolean;
    disabled?: boolean;
    className?: string;
  }) => {
    const variantClasses = {
      primary:   "bg-[#FFD60A] hover:bg-[#F5C800] text-black border border-[#FFD60A]",
      secondary: "bg-white hover:bg-[#F5F5F7] text-[#111111] border border-[#E5E5E5]",
      success:   "bg-green-50 hover:bg-green-100 text-green-700 border border-green-200",
    };

    return (
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        disabled={disabled || loading}
        className={cn(
          "flex-1 flex items-center justify-center gap-1 py-2.5 px-2",
          "rounded-xl text-xs font-semibold transition-all duration-200",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          variantClasses[variant],
          className
        )}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} strokeWidth={2.5} />}
        <span className="truncate">{label}</span>
      </motion.button>
    );
  }
);

ActionButton.displayName = "ActionButton";

export const ProfileActionButtons = memo(
  ({
    isOwner,
    isFollowing = false,
    isFollowLoading = false,
    onEditProfile,
    onShareProfile,
    onFollowToggle,
    onMessage,
    onStatistics,
    className,
  }: ProfileActionButtonsProps) => {
    const [copyDone, setCopyDone] = useState(false);

    const handleShare = () => {
      if (onShareProfile) { onShareProfile(); return; }
      navigator.clipboard.writeText(window.location.href)
        .then(() => { setCopyDone(true); setTimeout(() => setCopyDone(false), 2000); })
        .catch(() => {});
    };

    if (isOwner) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("flex gap-2 w-full", className)}
        >
          <ActionButton icon={BarChart2} label="Statistics"    variant="secondary" onClick={onStatistics} />
          <ActionButton
            icon={Share2}
            label={copyDone ? "Copied!" : "Share Profile"}
            variant={copyDone ? "success" : "secondary"}
            onClick={handleShare}
          />
          <ActionButton icon={Edit3} label="Edit Profile" variant="secondary" onClick={onEditProfile} />
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("flex gap-2 w-full", className)}
      >
        <ActionButton
          icon={isFollowing ? UserCheck : UserPlus}
          label={isFollowing ? "Following" : "Follow"}
          variant={isFollowing ? "secondary" : "primary"}
          loading={isFollowLoading}
          onClick={onFollowToggle}
        />
        <ActionButton
          icon={MessageCircle}
          label="Message"
          variant="secondary"
          onClick={onMessage}
        />
      </motion.div>
    );
  }
);

ProfileActionButtons.displayName = "ProfileActionButtons";
export default ProfileActionButtons;
