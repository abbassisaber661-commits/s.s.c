import React, { memo } from "react";
import { motion } from "framer-motion";
import { Camera, MapPin, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { VerificationBadge } from "./VerificationBadge";
import type { ProfileData } from "@/types/profile";

const formatJoinDate = (ts?: number) => {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

interface ProfileCoverHeaderProps {
  profile: ProfileData;
  isOwner?: boolean;
  onAvatarClick?: () => void;
  onCoverClick?: () => void;
}

export const ProfileCoverHeader = memo(
  ({
    profile,
    isOwner = false,
    onAvatarClick,
    onCoverClick,
  }: ProfileCoverHeaderProps) => {
    const joinDate = formatJoinDate(profile.joinedAt);

    return (
      <div className="w-full">
        {/* ── Cover Photo ─────────────────────────────────────────── */}
        <div className="relative h-48 md:h-64 bg-gradient-to-br from-[#111111] via-[#222222] to-[#333333] overflow-hidden">
          {profile.profileTheme?.gradient && (
            <div
              className="absolute inset-0"
              style={{ background: profile.profileTheme.gradient }}
            />
          )}

          {profile.cover ? (
            <img
              src={profile.cover}
              alt="cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-full bg-gradient-to-br from-[#FFD60A]/20 via-[#111111]/40 to-[#111111]/80" />
            </div>
          )}

          {/* Gradient overlay bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />

          {/* Edit cover button (owner only) */}
          {isOwner && (
            <button
              onClick={onCoverClick}
              className={cn(
                "absolute bottom-3 right-3 flex items-center gap-1.5",
                "bg-black/50 hover:bg-black/70",
                "text-white text-xs font-medium px-3 py-1.5 rounded-full",
                "transition-all duration-200"
              )}
            >
              <Camera size={13} />
              Edit cover
            </button>
          )}
        </div>

        {/* ── Avatar ──────────────────────────────────────────────── */}
        <div className="relative px-4">
          <div className="absolute -top-14 left-1/2 -translate-x-1/2">
            {/* Frame overlay (cosmetic) */}
            {profile.avatarFrame && (
              <img
                src={profile.avatarFrame.imageUrl}
                alt="frame"
                className="absolute inset-0 w-full h-full z-10 pointer-events-none select-none"
              />
            )}

            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="relative"
            >
              <div
                className={cn(
                  "w-28 h-28 rounded-full overflow-hidden",
                  "border-4 border-white",
                  "shadow-xl bg-[#F5F5F7]"
                )}
              >
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#666666]">
                    {(profile.displayName ?? profile.username)?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
              </div>

              {/* Edit avatar button (owner only) */}
              {isOwner && (
                <button
                  onClick={onAvatarClick}
                  className={cn(
                    "absolute bottom-0 right-0 z-20",
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    "bg-[#FFD60A] hover:bg-[#F5C800] text-black shadow-lg",
                    "transition-colors duration-200"
                  )}
                >
                  <Camera size={14} />
                </button>
              )}
            </motion.div>
          </div>
        </div>

        {/* ── Identity ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-20 text-center px-4"
        >
          {/* Display name + badge */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <h1 className="text-xl font-bold text-[#111111] leading-tight">
              {profile.displayName ?? profile.username}
            </h1>
            {profile.verification && profile.verification !== "none" && (
              <VerificationBadge tier={profile.verification} size="md" />
            )}
          </div>

          {/* @username */}
          <p className="text-sm text-[#666666] mt-0.5">
            @{profile.username}
          </p>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-[#111111] mt-3 max-w-sm mx-auto leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Meta info */}
          <div className="flex items-center justify-center gap-4 flex-wrap mt-3">
            {profile.country && (
              <div className="flex items-center gap-1 text-xs text-[#666666]">
                <MapPin size={12} />
                <span>{profile.country}</span>
              </div>
            )}
            {joinDate && (
              <div className="flex items-center gap-1 text-xs text-[#666666]">
                <Calendar size={12} />
                <span>Joined {joinDate}</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }
);

ProfileCoverHeader.displayName = "ProfileCoverHeader";
export default ProfileCoverHeader;
