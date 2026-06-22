// src/components/profile/ProfileHeader.tsx
import React, { memo, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Edit3, Share2, UserPlus, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

// ==========================
// Format numbers
// ==========================
const formatNumber = (num: number = 0): string => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return String(num);
};

// ==========================
// Stat Component
// ==========================
const Stat = memo(({ label, value }: { label: string; value: number }) => (
  <div className="flex flex-col items-center">
    <span className="text-lg font-bold text-gray-900 dark:text-white">
      {formatNumber(value)}
    </span>
    <span className="text-xs text-gray-500">{label}</span>
  </div>
));

Stat.displayName = "Stat";

// ==========================
// Props
// ==========================
interface ProfileHeaderProps {
  username: string;
  avatar: string;
  cover?: string;
  bio?: string;
  postsCount?: number;
  followers?: number;
  following?: number;
  level?: number;
  isFollowing?: boolean;
  isFollowLoading?: boolean;

  onAvatarClick?: () => void;
  onCoverClick?: () => void;
  onEditProfile?: () => void;
  onShare?: () => void;
  onFollowToggle?: () => void;
}

// ==========================
// Component
// ==========================
const ProfileHeader = memo((props: ProfileHeaderProps) => {
  const {
    username,
    avatar,
    cover,
    bio,
    postsCount = 0,
    followers = 0,
    following = 0,
    level = 1,
    isFollowing = false,
    isFollowLoading = false,
    onAvatarClick,
    onCoverClick,
    onEditProfile,
    onShare,
    onFollowToggle,
  } = props;

  const { t } = useTranslation();
  const [copyMessage, setCopyMessage] = useState("");

  const handleShare = async () => {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: username,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopyMessage(t("common.copied"));
        setTimeout(() => setCopyMessage(""), 2000);
      }
    } catch {}
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow"
    >

      {/* COVER */}
      <div className="relative h-44 md:h-60 bg-gray-200 dark:bg-gray-800">
        {cover ? (
          <img src={cover} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            {t("profilePage.noCover")}
          </div>
        )}

        <button
          onClick={onCoverClick}
          className="absolute bottom-3 right-3 bg-black/50 p-2 rounded-full text-white"
        >
          <Camera size={16} />
        </button>
      </div>

      {/* AVATAR + INFO */}
      <div className="relative flex flex-col items-center -mt-14 px-4">

        {/* AVATAR CENTER */}
        <div className="relative">
          <img
            src={avatar}
            className="w-28 h-28 rounded-full border-4 border-white dark:border-gray-900 object-cover"
          />

          <button
            onClick={onAvatarClick}
            className="absolute bottom-0 right-0 bg-blue-500 p-1 rounded-full text-white"
          >
            <Camera size={14} />
          </button>
        </div>

        {/* USERNAME */}
        <h2 className="text-2xl font-bold mt-2 text-center">
          {username}
        </h2>

        <span className="text-xs text-blue-500">
          Level {level}
        </span>

        {/* BIO */}
        {bio && (
          <p className="text-sm text-gray-500 mt-2 text-center">
            {bio}
          </p>
        )}

        {/* STATS */}
        <div className="flex justify-between w-full mt-5 text-center">
          <Stat label={t("profilePage.posts")} value={postsCount} />
          <Stat label={t("profilePage.followers")} value={followers} />
          <Stat label={t("profilePage.following")} value={following} />
        </div>

        {/* ACTIONS */}
        <div className="flex gap-2 w-full mt-5">

          <button
            onClick={onEditProfile}
            className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center gap-1"
          >
            <Edit3 size={16} />
            {t("profilePage.editProfile")}
          </button>

          <button
            onClick={onFollowToggle}
            className={cn(
              "flex-1 py-2 rounded-lg flex items-center justify-center gap-1",
              isFollowing
                ? "bg-gray-300 dark:bg-gray-700"
                : "bg-blue-500 text-white"
            )}
          >
            {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
            {isFollowing ? t("profilePage.unfollow") : t("profilePage.follow")}
          </button>

          <button
            onClick={onShare}
            className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center gap-1"
          >
            <Share2 size={16} />
            {t("common.share")}
          </button>
        </div>

        {/* COPY MESSAGE */}
        {copyMessage && (
          <div className="text-xs text-green-500 mt-2">
            {copyMessage}
          </div>
        )}
      </div>
    </motion.div>
  );
});

ProfileHeader.displayName = "ProfileHeader";
export default ProfileHeader;