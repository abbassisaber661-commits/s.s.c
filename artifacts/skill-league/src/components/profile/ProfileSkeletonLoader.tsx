import React, { memo } from "react";
import { cn } from "@/lib/utils";

const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-[#E5E5E5] rounded", className)} />
);

export const ProfileSkeletonLoader = memo(() => {
  return (
    <div className="w-full max-w-2xl mx-auto bg-[#F5F5F7]">
      {/* Cover */}
      <Shimmer className="w-full h-48 md:h-64 rounded-none" />

      {/* Avatar */}
      <div className="relative px-4 bg-white">
        <div className="absolute -top-14 left-1/2 -translate-x-1/2">
          <Shimmer className="w-28 h-28 rounded-full border-4 border-white" />
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col items-center mt-20 px-4 space-y-3 bg-white pb-5">
        <Shimmer className="h-6 w-40 rounded-full" />
        <Shimmer className="h-4 w-28 rounded-full" />
        <Shimmer className="h-4 w-56 rounded-full" />
        <Shimmer className="h-4 w-48 rounded-full" />
      </div>

      {/* Stats card */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-[#E5E5E5] shadow-sm py-4 flex justify-center gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Shimmer className="h-6 w-10 rounded" />
            <Shimmer className="h-3 w-14 rounded" />
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex gap-3 mt-3 px-4">
        <Shimmer className="flex-1 h-11 rounded-xl" />
        <Shimmer className="flex-1 h-11 rounded-xl" />
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mt-4 bg-white border-b border-[#E5E5E5]">
        {[1, 2, 3].map((i) => (
          <Shimmer key={i} className="flex-1 h-12 rounded-none" />
        ))}
      </div>

      {/* Content */}
      <div className="space-y-3 px-4 mt-4">
        {[1, 2, 3].map((i) => (
          <Shimmer key={i} className="w-full h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  );
});

ProfileSkeletonLoader.displayName = "ProfileSkeletonLoader";
export default ProfileSkeletonLoader;
