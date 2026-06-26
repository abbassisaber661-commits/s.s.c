import React, { memo } from "react";
import { cn } from "@/lib/utils";

const Shimmer = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "animate-pulse bg-gray-200 dark:bg-gray-700 rounded",
      className
    )}
  />
);

export const ProfileSkeletonLoader = memo(() => {
  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Cover */}
      <Shimmer className="w-full h-48 md:h-64 rounded-none" />

      {/* Avatar */}
      <div className="relative px-4">
        <div className="absolute -top-14 left-1/2 -translate-x-1/2">
          <Shimmer className="w-28 h-28 rounded-full border-4 border-white dark:border-gray-900" />
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col items-center mt-20 px-4 space-y-3">
        <Shimmer className="h-6 w-40 rounded-full" />
        <Shimmer className="h-4 w-28 rounded-full" />
        <Shimmer className="h-4 w-56 rounded-full" />
        <Shimmer className="h-4 w-48 rounded-full" />
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-8 mt-6 px-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Shimmer className="h-6 w-10 rounded" />
            <Shimmer className="h-3 w-14 rounded" />
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex gap-3 mt-6 px-4">
        <Shimmer className="flex-1 h-10 rounded-xl" />
        <Shimmer className="flex-1 h-10 rounded-xl" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mt-6 border-b border-gray-200 dark:border-gray-800 px-4">
        {[1, 2, 3, 4].map((i) => (
          <Shimmer key={i} className="flex-1 h-10 rounded-t-lg" />
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-3 gap-1 mt-4 px-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <Shimmer key={i} className="aspect-square w-full" />
        ))}
      </div>
    </div>
  );
});

ProfileSkeletonLoader.displayName = "ProfileSkeletonLoader";
export default ProfileSkeletonLoader;
