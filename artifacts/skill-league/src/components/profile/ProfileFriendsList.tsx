import React, { memo, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, UserCheck, UserX, UserPlus, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import type { FriendEntry } from "@/types/profile";

const ONLINE_DOT = "w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 absolute -bottom-0.5 -right-0.5";

interface FriendItemProps {
  friend: FriendEntry;
  index: number;
  isOwner: boolean;
  onRemove?: (id: string) => void;
  onMessage?: (id: string) => void;
}

const FriendItem = memo(({ friend, index, isOwner, onRemove, onMessage }: FriendItemProps) => {
  const [, navigate] = useLocation();

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
    >
      {/* Avatar */}
      <div
        className="relative cursor-pointer flex-shrink-0"
        onClick={() => navigate(`/profile/${friend.id}`)}
      >
        <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
          {friend.avatar ? (
            <img src={friend.avatar} alt={friend.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-400">
              {friend.username[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className={cn(ONLINE_DOT, friend.isOnline ? "bg-green-500" : "bg-gray-400")} />
      </div>

      {/* Info */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => navigate(`/profile/${friend.id}`)}
      >
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {friend.displayName ?? friend.username}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            @{friend.username}
          </p>
          {friend.isOnline && (
            <span className="text-[10px] text-green-500 font-medium flex-shrink-0">Online</span>
          )}
        </div>
        {friend.mutualCount !== undefined && friend.mutualCount > 0 && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            {friend.mutualCount} mutual friend{friend.mutualCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isOwner ? (
          <button
            onClick={() => onRemove?.(friend.id)}
            className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <UserX size={16} />
          </button>
        ) : (
          <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
        )}
      </div>
    </motion.div>
  );
});

FriendItem.displayName = "FriendItem";

interface ProfileFriendsListProps {
  friends?: FriendEntry[];
  isOwner?: boolean;
  onRemoveFriend?: (id: string) => void;
  onMessageFriend?: (id: string) => void;
  className?: string;
}

export const ProfileFriendsList = memo(
  ({
    friends = [],
    isOwner = false,
    onRemoveFriend,
    onMessageFriend,
    className,
  }: ProfileFriendsListProps) => {
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<"all" | "online" | "mutual">("all");

    const filtered = useMemo(() => {
      let list = friends;
      if (query.trim()) {
        const q = query.toLowerCase();
        list = list.filter(
          (f) =>
            f.username.toLowerCase().includes(q) ||
            (f.displayName ?? "").toLowerCase().includes(q)
        );
      }
      if (filter === "online") list = list.filter((f) => f.isOnline);
      if (filter === "mutual") list = list.filter((f) => (f.mutualCount ?? 0) > 0);
      return list;
    }, [friends, query, filter]);

    const onlineCount = friends.filter((f) => f.isOnline).length;

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("pt-3", className)}
      >
        {/* ── Header ─── */}
        <div className="flex items-center justify-between px-4 mb-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-blue-500" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              Friends
            </span>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              {friends.length}
            </span>
          </div>
          {onlineCount > 0 && (
            <span className="text-xs text-green-500 font-semibold">
              {onlineCount} online
            </span>
          )}
        </div>

        {/* ── Search ─── */}
        <div className="px-4 mb-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search friends…"
              className={cn(
                "w-full pl-9 pr-4 py-2.5 text-sm",
                "bg-gray-100 dark:bg-gray-800 rounded-xl",
                "text-gray-900 dark:text-white placeholder-gray-400",
                "border border-transparent focus:border-blue-400 focus:outline-none transition-colors"
              )}
            />
          </div>
        </div>

        {/* ── Filter pills ─── */}
        <div className="flex gap-2 px-4 mb-1">
          {(["all", "online", "mutual"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all",
                filter === f
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* ── List ─── */}
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-14 text-center"
            >
              <span className="text-5xl mb-3">👥</span>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {query ? "No friends found" : "No friends yet"}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {query
                  ? "Try a different search"
                  : isOwner
                  ? "Add friends to see them here"
                  : "This player has no friends yet"}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {filtered.map((friend, i) => (
                <FriendItem
                  key={friend.id}
                  friend={friend}
                  index={i}
                  isOwner={isOwner}
                  onRemove={onRemoveFriend}
                  onMessage={onMessageFriend}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
);

ProfileFriendsList.displayName = "ProfileFriendsList";
export default ProfileFriendsList;
