import React, { memo, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Grid3X3, Image, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";
import SocialPostCard from "@/components/social/SocialPostCard";
import { ProfileMediaGrid } from "./ProfileMediaGrid";
import type { Post, ContentTab } from "@/types/profile";

type SearchScope = "posts" | "media" | "reels";

const SCOPES: { id: SearchScope; label: string; icon: React.ElementType }[] = [
  { id: "posts", label: "Posts", icon: Grid3X3 },
  { id: "media", label: "Media", icon: Image },
  { id: "reels", label: "Reels", icon: Clapperboard },
];

interface ProfileSearchProps {
  posts: Post[];
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileSearch = memo(({ posts, isOpen, onClose }: ProfileSearchProps) => {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("posts");

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return posts.filter((p) => {
      const matchesQuery =
        p.content?.toLowerCase().includes(q) ||
        p.authorName?.toLowerCase().includes(q);

      const matchesScope =
        scope === "posts"
          ? true
          : scope === "media"
          ? p.type === "image"
          : p.type === "reel";

      return matchesQuery && matchesScope;
    });
  }, [posts, query, scope]);

  const handleClear = useCallback(() => {
    setQuery("");
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-white dark:bg-gray-950"
        >
          {/* ── Search bar ─── */}
          <div className="sticky top-0 z-30 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md px-4 pt-3 pb-2 space-y-2 border-b border-gray-100 dark:border-gray-800">
            {/* Input row */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search posts, media, reels…"
                  className={cn(
                    "w-full pl-9 pr-8 py-2.5 text-sm rounded-xl",
                    "bg-gray-100 dark:bg-gray-800",
                    "text-gray-900 dark:text-white placeholder-gray-400",
                    "border border-transparent focus:border-blue-400 focus:outline-none transition-colors"
                  )}
                />
                {query && (
                  <button
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-sm font-semibold text-blue-500 flex-shrink-0"
              >
                Cancel
              </button>
            </div>

            {/* Scope tabs */}
            <div className="flex gap-1.5">
              {SCOPES.map((s) => {
                const Icon = s.icon;
                const active = scope === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setScope(s.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                      active
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    )}
                  >
                    <Icon size={12} />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Results ─── */}
          <div className="pb-10">
            {!query.trim() ? (
              <div className="flex flex-col items-center py-16 text-center px-6">
                <Search size={40} className="text-gray-200 dark:text-gray-700 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Type to search this profile's content
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center px-6">
                <span className="text-4xl mb-3">🔍</span>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  No results for "{query}"
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Try a different search or scope
                </p>
              </div>
            ) : scope === "media" || scope === "reels" ? (
              <ProfileMediaGrid
                posts={results}
                filterType={scope === "reels" ? "reel" : "image"}
              />
            ) : (
              <div className="space-y-3 px-4 pt-4">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {results.length} result{results.length !== 1 ? "s" : ""}
                </p>
                {results.map((post) => (
                  <SocialPostCard key={post.id} post={post as any} />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

ProfileSearch.displayName = "ProfileSearch";
export default ProfileSearch;
