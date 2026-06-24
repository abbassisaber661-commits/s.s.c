import React, {
  useState,
  useCallback,
  useMemo,
} from "react";
import { useRoute } from "wouter";
import { toast } from "sonner";

import { useTranslation } from "@/hooks/useTranslation";
import { useProfileData } from "@/hooks/useProfileData";
import { useFollowUser } from "@/hooks/useFollowUser";
import { useGame } from "@/contexts/GameContext";

import ProfileTabs from "@/components/profile/ProfileTabs";
import PostCard from "@/components/social/PostCard";
import { PostModal } from "@/components/profile/PostModal";

import type { Post } from "@/types/profile";

export default function ProfilePage() {
  const { t } = useTranslation();

  // 🟢 FIX: wouter route safe parsing
  const [match, params] = useRoute("/profile/:userId");
  const { authUser } = useGame();

  const userId = params?.userId || authUser?.uid || "1";

  const {
    profile,
    posts,
    isLoading,
    isError,
    refetch,
  } = useProfileData(userId);

  const followMutation = useFollowUser(userId);

  const [currentTab, setCurrentTab] = useState<
    "posts" | "reels" | "saved"
  >("posts");

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleFollowToggle = useCallback(() => {
    if (!profile) return;

    const action = profile.isFollowing ? "unfollow" : "follow";
    followMutation.mutate(action);
  }, [profile, followMutation]);

  const visiblePosts = useMemo(() => {
    const allPosts = posts ?? [];

    if (currentTab === "reels") {
      return allPosts.filter((p) => p.type === "reel");
    }

    if (currentTab === "saved") {
      return allPosts.filter((p) => p.isSaved);
    }

    return allPosts;
  }, [posts, currentTab]);

  // 🟢 LOADING SAFE
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 🟢 ERROR SAFE (FIXED TRANSLATION CRASH)
  if (isError || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-xl font-bold">
          Profile not found
        </h2>

        <button
          onClick={refetch}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">

      {/* COVER */}
      <div className="h-48 bg-gray-300 overflow-hidden">
        {profile.cover ? (
          <img src={profile.cover} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            No Cover
          </div>
        )}
      </div>

      {/* AVATAR */}
      <div className="flex flex-col items-center -mt-10">
        <img
          src={profile.avatar || ""}
          className="w-20 h-20 rounded-full border-4 border-white"
        />

        <h2 className="mt-2 font-bold">{profile.username}</h2>
        <p className="text-sm text-gray-500">
          Level {profile.level}
        </p>
      </div>

      {/* STATS */}
      <div className="flex justify-around mt-4">
        <div>{profile.postsCount} Posts</div>
        <div>{profile.followers} Followers</div>
        <div>{profile.following} Following</div>
      </div>

      {/* BUTTONS */}
      <div className="flex gap-2 mt-4 px-4">
        <button
          onClick={() => toast("Edit Profile")}
          className="flex-1 bg-gray-200 py-2 rounded-xl"
        >
          Edit
        </button>

        <button
          onClick={handleFollowToggle}
          className="flex-1 bg-blue-500 text-white py-2 rounded-xl"
        >
          {profile.isFollowing ? "Unfollow" : "Follow"}
        </button>
      </div>

      {/* TABS */}
      <ProfileTabs
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        postsCount={profile.postsCount}
        reelsCount={profile.reelsCount || 0}
        savedCount={profile.savedCount || 0}
      />

      {/* POSTS */}
      <div className="mt-4 px-4 space-y-3">
        {visiblePosts.length === 0 ? (
          <p className="text-center text-gray-500">
            No posts
          </p>
        ) : (
          visiblePosts.map((post) => (
            <PostCard key={post.id} post={post as any} />
          ))
        )}
      </div>

      <PostModal
        post={selectedPost}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}