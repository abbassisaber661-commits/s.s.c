import React, { memo } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileLeagueCardProps {
  league?: string;
  leagueIcon?: string;
  level?: number;
  className?: string;
}

// Per-league accent colors — kept subtle on the white/light-gray palette
const LEAGUE_ACCENT: Record<string, { border: string; text: string; bg: string }> = {
  bronze:      { border: "#D97706", text: "#92400E", bg: "#FEF3C7" },
  silver:      { border: "#9CA3AF", text: "#374151", bg: "#F3F4F6" },
  gold:        { border: "#FFD60A", text: "#78350F", bg: "#FFFBEB" },
  platinum:    { border: "#22D3EE", text: "#164E63", bg: "#ECFEFF" },
  diamond:     { border: "#60A5FA", text: "#1E3A5F", bg: "#EFF6FF" },
  master:      { border: "#A855F7", text: "#581C87", bg: "#FAF5FF" },
  grandmaster: { border: "#EF4444", text: "#7F1D1D", bg: "#FEF2F2" },
  challenger:  { border: "#FFD60A", text: "#111111", bg: "#FFFBEB" },
};

const DEFAULT_ACCENT = { border: "#E5E5E5", text: "#666666", bg: "#F5F5F7" };

export const ProfileLeagueCard = memo(
  ({ league, leagueIcon, level, className }: ProfileLeagueCardProps) => {
    const key    = (league ?? "").toLowerCase();
    const accent = LEAGUE_ACCENT[key] ?? DEFAULT_ACCENT;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-2xl border bg-white shadow-sm",
          className
        )}
        style={{ borderColor: accent.border + "60" }}
      >
        {/* League Icon */}
        <div className="flex-shrink-0">
          {leagueIcon ? (
            <img
              src={leagueIcon}
              alt={league}
              className="w-9 h-9 object-contain drop-shadow-md"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: accent.bg }}
            >
              <Trophy size={20} style={{ color: accent.border }} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] uppercase tracking-widest text-[#666666] font-semibold">
            Current League
          </span>
          <span className="text-sm font-bold capitalize" style={{ color: accent.text }}>
            {league ?? "Unranked"}
          </span>
        </div>

        {/* Level pill */}
        {level !== undefined && (
          <div className="ml-auto flex-shrink-0">
            <div
              className="px-3 py-1 rounded-full text-xs font-bold border"
              style={{ background: accent.bg, color: accent.text, borderColor: accent.border + "60" }}
            >
              Lv. {level}
            </div>
          </div>
        )}
      </motion.div>
    );
  }
);

ProfileLeagueCard.displayName = "ProfileLeagueCard";
export default ProfileLeagueCard;
