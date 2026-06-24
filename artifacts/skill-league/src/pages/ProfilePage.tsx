import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { useRoute } from "wouter";
import { toast } from "sonner";
import { motion } from "framer-motion";

// ===== Hooks =====
import { useTranslation } from "@/hooks/useTranslation";
import { useProfileData } from "@/hooks/useProfileData";
import { useFollowUser } from "@/hooks/useFollowUser";
import { useGame } from "@/contexts/GameContext";

// ===== Components =====
import ProfileTabs from "@/components/profile/ProfileTabs";
import PostCard from "@/components/social/PostCard";
import { PostModal } from "@/components/profile/PostModal";

// ===== Types =====
import type { Post } from "@/types/profile";

export default function ProfilePage() {
  const { t } = useTranslation();

  // ================= ROUTE =================
  const [, routeParams] = useRoute("/profile/:userId?");
  const { authUser } = useGame();

  const userId = routeParams?.userId ?? authUser?.uid ?? "";

  // ================= DATA =================
  const {
    profile,
    posts,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProfileData(userId || "1");

  const followMutation = useFollowUser(userId || "1");

  // ================= STATE =================
  const [currentTab, setCurrentTab] = useState<
    "posts" | "reels" | "saved"
  >("posts");

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ================= FOLLOW =================
  const handleFollowToggle = useCallback(() => {
    if (!profile) return;
    const action = profile.isFollowing ? "unfollow" : "follow";
    followMutation.mutate(action);
  }, [profile]);

  // ================= POSTS =================
  const visiblePosts = useMemo(() => {
    const allPosts = posts ?? [];

    switch (currentTab) {
      case "reels":
        return allPosts.filter((p) => p.type === "reel");
      case "saved":
        return allPosts.filter((p) => p.isSaved);
      default:
        return allPosts;
    }
  }, [posts, currentTab]);

  // ================= LOADING =================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ================= ERROR =================
  if (isError || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <p className="text-5xl mb-2">😕</p>
        <h2 className="text-xl font-bold">{t("profilePage.loadError")}</h2>

        <button
          onClick={refetch}
          className="mt-4 px-5 py-2 bg-blue-500 text-white rounded-xl font-medium"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  // ================= UI =================
  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-white dark:bg-black pb-20">

      {/* ================= COVER ================= */}
      <div className="relative">
        <div className="h-48 md:h-64 bg-gray-300 dark:bg-gray-800 overflow-hidden">
          {profile.cover ? (
            <img
              src={profile.cover}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              {t("profilePage.noCover")}
            </div>
          )}
        </div>

        {/* ================= AVATAR CENTER ================= */}
        <div className="absolute left-1/2 -bottom-12 -translate-x-1/2">
          <img
            src={profile.avatar || ""}
            className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white dark:border-black object-cover shadow-xl"
          />
        </div>
      </div>

      {/* ================= USER INFO ================= */}
      <div className="mt-16 text-center px-4">
        <h2 className="text-2xl font-bold">{profile.username}</h2>

        <p className="text-sm text-gray-500 mt-1">
          {t("profilePage.levelLabel")} {profile.level}
        </p>

        {/* ================= STATS BIG STYLE ================= */}
        <div className="flex justify-center gap-10 mt-6">
          <div className="text-center">
            <p className="text-2xl font-bold">{profile.postsCount}</p>
            <p className="text-xs text-gray-500">Posts</p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold">{profile.followers}</p>
            <p className="text-xs text-gray-500">Followers</p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold">{profile.following}</p>
            <p className="text-xs text-gray-500">Following</p>
          </div>
        </div>

        {/* ================= BUTTONS ================= */}
        <div className="flex gap-2 mt-6 px-4">
          <button
            onClick={() => toast("Edit Profile")}
            className="flex-1 py-2 bg-gray-200 dark:bg-gray-800 rounded-xl font-medium"
          >
            Edit Profile
          </button>

          <button
            onClick={handleFollowToggle}
            className="flex-1 py-2 bg-blue-500 text-white rounded-xl font-medium"
          >
            {profile.isFollowing ? "Unfollow" : "Follow"}
          </button>
        </div>
      </div>

      {/* ================= TABS ================= */}
      <div className="mt-6">
        <ProfileTabs
          currentTab={currentTab}
          onTabChange={(tab) => setCurrentTab(tab as any)}
          postsCount={profile.postsCount}
          reelsCount={profile.reelsCount || 0}
          savedCount={profile.savedCount || 0}
        />
      </div>

      {/* ================= POSTS ================= */}
      <div className="mt-4 space-y-4 px-4">
        {visiblePosts.length === 0 ? (
          <p className="text-center text-gray-500 py-10">
            {t("profilePage.noPosts")}
          </p>
        ) : (
          visiblePosts.map((post) => (
            <PostCard key={post.id} post={post as any} />
          ))
        )}
      </div>

      {/* ================= MODAL ================= */}
      <PostModal
        post={selectedPost}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}