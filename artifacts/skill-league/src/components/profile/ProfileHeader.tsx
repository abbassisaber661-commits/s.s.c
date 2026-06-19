// src/components/profile/ProfileHeader.tsx
import React, { memo, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Edit3, Share2, UserPlus, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation"; // ✅ إضافة الترجمة

// ==========================
// دالة تنسيق الأرقام (1K, 2.5M)
// ==========================
const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(num >= 10_000 ? 0 : 1) + "K";
  return num.toString();
};

// ==========================
// مكون الإحصائية الفرعي (مع memo)
// ==========================
const Stat = memo(({ label, value }: { label: string; value: number }) => (
  <div className="text-center">
    <p className="text-sm font-bold text-gray-900 dark:text-white">
      {formatNumber(value)}
    </p>
    <p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
  </div>
));
Stat.displayName = "Stat";

// ==========================
// الواجهة الرئيسية
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
  className?: string;

  // الأحداث
  onAvatarClick?: () => void;
  onCoverClick?: () => void;
  onEditProfile?: () => void;
  onShare?: () => void;
  onFollowToggle?: () => void;
}

// ==========================
// المكون الرئيسي (مع memo)
// ==========================
const ProfileHeader = memo(
  ({
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
    className,
    onAvatarClick,
    onCoverClick,
    onEditProfile,
    onShare,
    onFollowToggle,
  }: ProfileHeaderProps) => {
    const { t } = useTranslation(); // ✅ استخدم الترجمة

    // حالة لإشعار نسخ الرابط
    const [copyMessage, setCopyMessage] = useState("");

    // دالة المشاركة الافتراضية
    const handleShare = async () => {
      if (onShare) {
        onShare();
        return;
      }

      const shareData = {
        title: document.title || t('profilePage.title') || "Profile",
        text: `Check out ${username}'s profile!`,
        url: window.location.href,
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
          return;
        } catch (error) {
          if ((error as Error).name !== "AbortError") {
            console.error("Share failed:", error);
          }
        }
      }

      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopyMessage(t('common.copied') || "✅ Link copied!");
        setTimeout(() => setCopyMessage(""), 3000);
      } catch (err) {
        const textArea = document.createElement("textarea");
        textArea.value = window.location.href;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopyMessage(t('common.copied') || "✅ Link copied!");
        setTimeout(() => setCopyMessage(""), 3000);
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={cn(
          "relative w-full rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-md",
          className
        )}
      >
        {/* ===== قسم الغلاف ===== */}
        <div className="relative h-40 md:h-56 bg-gray-200 dark:bg-gray-800">
          {cover ? (
            <img
              src={cover}
              alt={t('profilePage.coverAlt') || "Cover"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <span>{t('profilePage.noCover')}</span>
            </div>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onCoverClick}
            className="absolute bottom-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            aria-label={t('profilePage.changeCover')}
          >
            <Camera size={18} />
          </motion.button>
        </div>

        {/* ===== الصورة الشخصية والمعلومات ===== */}
        <div className="relative px-4 pb-4">
          <div className="flex flex-col items-center -mt-12 sm:flex-row sm:items-end sm:-mt-16">
            <div className="relative">
              <img
                src={avatar}
                alt={username}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-gray-900 object-cover"
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onAvatarClick}
                className="absolute bottom-0 right-0 p-1 bg-blue-500 rounded-full text-white border-2 border-white dark:border-gray-900 hover:bg-blue-600 transition-colors"
                aria-label={t('profilePage.changeAvatar')}
              >
                <Camera size={14} />
              </motion.button>
            </div>
            <div className="mt-2 sm:mt-0 sm:ml-4 text-center sm:text-left">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                {username}
                {level && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                    {t('profilePage.levelLabel')} {level}
                  </span>
                )}
              </h2>
              {bio && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {bio}
                </p>
              )}
            </div>
          </div>

          {/* ===== الإحصائيات ===== */}
          <div className="flex justify-around mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <Stat label={t('profilePage.stats.posts')} value={postsCount} />
            <Stat label={t('profilePage.stats.followers')} value={followers} />
            <Stat label={t('profilePage.stats.following')} value={following} />
          </div>

          {/* ===== الأزرار ===== */}
          <div className="flex gap-2 mt-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onEditProfile}
              className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
            >
              <Edit3 size={16} />
              {t('profilePage.editProfile')}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onFollowToggle}
              disabled={isFollowLoading}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1",
                isFollowing
                  ? "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white",
                isFollowLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              {isFollowLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : isFollowing ? (
                <>
                  <UserCheck size={16} />
                  {t('profilePage.unfollow')}
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  {t('profilePage.follow')}
                </>
              )}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleShare}
              className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 relative"
            >
              <Share2 size={16} />
              {t('common.share')}
              {copyMessage && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {copyMessage}
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }
);

ProfileHeader.displayName = "ProfileHeader";

export default ProfileHeader;