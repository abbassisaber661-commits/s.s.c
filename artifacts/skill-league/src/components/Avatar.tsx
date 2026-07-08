import React, { memo } from "react";
import { Shield } from "lucide-react";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarShape = "rounded-lg" | "rounded-xl" | "rounded-2xl" | "rounded-3xl" | "rounded-full";

interface AvatarProps {
  username: string;
  avatar?: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  className?: string;
  online?: boolean;
  /** Renders the official S.S.C shield identity instead of a photo/initials. */
  isOfficialPage?: boolean;
}

const ICON_SIZE_MAP: Record<AvatarSize, number> = {
  xs: 13,
  sm: 16,
  md: 20,
  lg: 26,
  xl: 36,
};

const SIZE_MAP: Record<AvatarSize, string> = {
  xs: "w-7 h-7 text-[10px]",
  sm: "w-9 h-9 text-xs",
  md: "w-11 h-11 text-sm",
  lg: "w-14 h-14 text-base",
  xl: "w-20 h-20 text-xl",
};

function getInitials(name: string) {
  if (!name) return "?";

  const words = name.trim().split(" ");
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  return words[0].slice(0, 2).toUpperCase();
}

const Avatar = memo(
  ({
    username,
    avatar,
    size = "md",
    shape = "rounded-full",
    className = "",
    online,
    isOfficialPage = false,
  }: AvatarProps) => {
    const initials = getInitials(username);

    return (
      <div className={`relative flex-shrink-0 ${className}`}>
        {isOfficialPage ? (
          <div
            className={`${SIZE_MAP[size]} rounded-2xl
            flex items-center justify-center
            bg-gradient-to-br from-[#111111] to-[#333333]
            border border-[#FFD60A]/40`}
          >
            <Shield size={ICON_SIZE_MAP[size]} className="text-[#FFD60A]" fill="currentColor" fillOpacity={0.15} />
          </div>
        ) : avatar ? (
          <img
            src={avatar}
            alt={username}
            loading="lazy"
            className={`${SIZE_MAP[size]} ${shape} object-cover bg-gray-200`}
          />
        ) : (
          <div
            className={`${SIZE_MAP[size]} ${shape}
            flex items-center justify-center
            bg-gradient-to-br from-blue-500 to-purple-600
            text-white font-bold`}
          >
            {initials}
          </div>
        )}

        {online !== undefined && (
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
              online ? "bg-green-500" : "bg-gray-400"
            }`}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";

export default Avatar;