import React, { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortOption = "latest" | "oldest" | "most_liked" | "most_viewed";

const SORT_OPTIONS: { id: SortOption; label: string; icon: string }[] = [
  { id: "latest", label: "Latest", icon: "🕐" },
  { id: "oldest", label: "Oldest", icon: "📅" },
  { id: "most_liked", label: "Most Liked", icon: "❤️" },
  { id: "most_viewed", label: "Most Viewed", icon: "👁️" },
];

interface ProfileSortFilterProps {
  sort: SortOption;
  onChange: (sort: SortOption) => void;
  className?: string;
}

export const ProfileSortFilter = memo(
  ({ sort, onChange, className }: ProfileSortFilterProps) => {
    const [open, setOpen] = useState(false);
    const current = SORT_OPTIONS.find((o) => o.id === sort);

    return (
      <div className={cn("relative", className)}>
        {/* Trigger */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all",
            "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
            "text-gray-700 dark:text-gray-300"
          )}
        >
          <SlidersHorizontal size={13} />
          <span>{current?.icon} {current?.label}</span>
          <ChevronDown
            size={12}
            className={cn("transition-transform", open && "rotate-180")}
          />
        </motion.button>

        {/* Dropdown */}
        <AnimatePresence>
          {open && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -6 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "absolute right-0 top-full mt-2 z-40 w-44",
                  "bg-white dark:bg-gray-900 rounded-2xl shadow-2xl",
                  "border border-gray-100 dark:border-gray-800 overflow-hidden"
                )}
              >
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                      sort === option.id
                        ? "text-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    <span>{option.icon}</span>
                    <span className="flex-1 text-left font-medium">{option.label}</span>
                    {sort === option.id && <Check size={14} />}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

ProfileSortFilter.displayName = "ProfileSortFilter";
export default ProfileSortFilter;
