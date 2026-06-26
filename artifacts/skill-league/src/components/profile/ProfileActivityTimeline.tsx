import React, { memo } from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityEvent } from "@/types/profile";

const formatTimeAgo = (ts: number): string => {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) return `${months}mo ago`;
  if (weeks > 0) return `${weeks}w ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
};

const EVENT_CONFIG: Record<
  string,
  { icon: string; color: string; bgColor: string }
> = {
  joined: { icon: "🎉", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  post: { icon: "📝", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  achievement: { icon: "🏆", color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" },
  badge: { icon: "🏅", color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  friend: { icon: "🤝", color: "text-pink-600", bgColor: "bg-pink-100 dark:bg-pink-900/30" },
  league: { icon: "⚔️", color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  level: { icon: "⬆️", color: "text-indigo-600", bgColor: "bg-indigo-100 dark:bg-indigo-900/30" },
  media: { icon: "🖼️", color: "text-teal-600", bgColor: "bg-teal-100 dark:bg-teal-900/30" },
};

interface TimelineItemProps {
  event: ActivityEvent;
  index: number;
  isLast: boolean;
}

const TimelineItem = memo(({ event, index, isLast }: TimelineItemProps) => {
  const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG["post"];

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex gap-3"
    >
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center text-base",
            cfg.bgColor
          )}
        >
          {cfg.icon}
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-gray-100 dark:bg-gray-800 mt-1 mb-0 min-h-[16px]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
          {event.title}
        </p>
        {event.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
            {event.description}
          </p>
        )}
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-medium">
          {formatTimeAgo(event.timestamp)}
        </p>
      </div>
    </motion.div>
  );
});

TimelineItem.displayName = "TimelineItem";

const DEMO_EVENTS: ActivityEvent[] = [
  {
    id: "1",
    type: "joined",
    title: "Joined SkillLeague",
    description: "Welcome to the platform!",
    timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000,
  },
  {
    id: "2",
    type: "achievement",
    title: "Earned: Early Member",
    description: "One of the first players to join",
    timestamp: Date.now() - 29 * 24 * 60 * 60 * 1000,
  },
  {
    id: "3",
    type: "league",
    title: "Reached Gold League",
    description: "Promoted after winning 10 matches",
    timestamp: Date.now() - 14 * 24 * 60 * 60 * 1000,
  },
  {
    id: "4",
    type: "badge",
    title: "Earned: Creator Badge",
    description: "Published 10 posts",
    timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
  },
  {
    id: "5",
    type: "friend",
    title: "Made 5 new friends",
    description: "Growing the community",
    timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
];

interface ProfileActivityTimelineProps {
  events?: ActivityEvent[];
  className?: string;
}

export const ProfileActivityTimeline = memo(
  ({ events = DEMO_EVENTS, className }: ProfileActivityTimelineProps) => {
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
        <div className="flex items-center gap-2 mb-5">
          <Activity size={18} className="text-blue-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Activity</h3>
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <span className="text-4xl mb-2">📋</span>
            <p className="text-sm text-gray-500 dark:text-gray-400">No activity yet</p>
          </div>
        ) : (
          <div>
            {events.map((event, i) => (
              <TimelineItem
                key={event.id}
                event={event}
                index={i}
                isLast={i === events.length - 1}
              />
            ))}
          </div>
        )}
      </motion.div>
    );
  }
);

ProfileActivityTimeline.displayName = "ProfileActivityTimeline";
export default ProfileActivityTimeline;
