import React, { memo, useState } from "react";
import { motion } from "framer-motion";
import {
  Edit3,
  Share2,
  UserPlus,
  UserCheck,
  UserX,
  MessageCircle,
  Loader2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileActionButtonsProps {
  isOwner: boolean;
  isFollowing?: boolean;
  isFriend?: boolean;
  isFollowLoading?: boolean;
  isFriendLoading?: boolean;
  onEditProfile?: () => void;
  onShareProfile?: () => void;
  onFollowToggle?: () => void;
  onFriendToggle?: () => void;
  onMessage?: () => void;
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
    variant?: "primary" | "secondary" | "danger" | "success";
    loading?: boolean;
    disabled?: boolean;
    className?: string;
  }) => {
    const variantClasses = {
      primary:
        "bg-blue-500 hover:bg-blue-600 text-white",
      secondary:
        "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200",
      danger:
        "bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400",
      success:
        "bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400",
    };

    return (
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        disabled={disabled || loading}
        className={cn(
          "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3",
          "rounded-xl text-sm font-semibold transition-all duration-200",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          variantClasses[variant],
          className
        )}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Icon size={16} strokeWidth={2.5} />
        )}
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
    isFriend = false,
    isFollowLoading = false,
    isFriendLoading = false,
    onEditProfile,
    onShareProfile,
    onFollowToggle,
    onFriendToggle,
    onMessage,
    className,
  }: ProfileActionButtonsProps) => {
    const [copyDone, setCopyDone] = useState(false);

    const handleShare = () => {
      if (onShareProfile) {
        onShareProfile();
        return;
      }
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => {
          setCopyDone(true);
          setTimeout(() => setCopyDone(false), 2000);
        })
        .catch(() => {});
    };

    if (isOwner) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("flex gap-2 w-full", className)}
        >
          <ActionButton
            icon={Edit3}
            label="Edit Profile"
            variant="secondary"
            onClick={onEditProfile}
          />
          <ActionButton
            icon={Share2}
            label={copyDone ? "Copied!" : "Share"}
            variant={copyDone ? "success" : "secondary"}
            onClick={handleShare}
          />
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
          icon={isFriend ? UserX : Users}
          label={isFriend ? "Friends" : "Add Friend"}
          variant={isFriend ? "success" : "secondary"}
          loading={isFriendLoading}
          onClick={onFriendToggle}
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
