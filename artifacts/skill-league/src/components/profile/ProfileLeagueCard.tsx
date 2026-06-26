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

const LEAGUE_COLORS: Record<string, string> = {
  bronze: "from-amber-700/20 to-amber-600/10 border-amber-700/30",
  silver: "from-gray-400/20 to-gray-300/10 border-gray-400/30",
  gold: "from-yellow-500/20 to-yellow-400/10 border-yellow-500/30",
  platinum: "from-cyan-400/20 to-cyan-300/10 border-cyan-400/30",
  diamond: "from-blue-400/20 to-blue-300/10 border-blue-400/30",
  master: "from-purple-500/20 to-purple-400/10 border-purple-500/30",
  grandmaster: "from-red-500/20 to-red-400/10 border-red-500/30",
  challenger: "from-yellow-300/20 to-yellow-200/10 border-yellow-300/30",
};

const LEAGUE_TEXT_COLORS: Record<string, string> = {
  bronze: "text-amber-600 dark:text-amber-400",
  silver: "text-gray-500 dark:text-gray-300",
  gold: "text-yellow-600 dark:text-yellow-400",
  platinum: "text-cyan-600 dark:text-cyan-300",
  diamond: "text-blue-500 dark:text-blue-300",
  master: "text-purple-600 dark:text-purple-400",
  grandmaster: "text-red-500 dark:text-red-400",
  challenger: "text-yellow-500 dark:text-yellow-300",
};

export const ProfileLeagueCard = memo(
  ({ league, leagueIcon, level, className }: ProfileLeagueCardProps) => {
    const leagueKey = (league ?? "").toLowerCase();
    const gradientClass =
      LEAGUE_COLORS[leagueKey] ?? "from-gray-200/20 to-gray-100/10 border-gray-300/30";
    const textClass =
      LEAGUE_TEXT_COLORS[leagueKey] ?? "text-gray-600 dark:text-gray-400";

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "flex items-center gap-3 px-4 py-3",
          "rounded-2xl border bg-gradient-to-r",
          gradientClass,
          className
        )}
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
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center",
                "bg-white/10 backdrop-blur-sm",
                textClass
              )}
            >
              <Trophy size={20} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-semibold">
            Current League
          </span>
          <span className={cn("text-sm font-bold capitalize", textClass)}>
            {league ?? "Unranked"}
          </span>
        </div>

        {/* Level pill */}
        {level !== undefined && (
          <div className="ml-auto flex-shrink-0">
            <div
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold",
                "bg-white/10 backdrop-blur-sm",
                textClass
              )}
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
