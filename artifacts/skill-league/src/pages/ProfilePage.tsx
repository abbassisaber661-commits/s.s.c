import React, {
  useState,
  useCallback,
  useMemo,
} from "react";
import { useRoute } from "wouter";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, RefreshCcw } from "lucide-react";

// ── Hooks ────────────────────────────────────────────────────────────────────
import { useTranslation } from "@/hooks/useTranslation";
import { useProfileData } from "@/hooks/useProfileData";
import { useFollowUser } from "@/hooks/useFollowUser";
import { useGame } from "@/contexts/GameContext";

// ── Profile Components ────────────────────────────────────────────────────────
import ProfileCoverHeader from "@/components/profile/ProfileCoverHeader";
import ProfileSocialStats from "@/components/profile/ProfileSocialStats";
import ProfileActionButtons from "@/components/profile/ProfileActionButtons";
import ProfileLeagueCard from "@/components/profile/ProfileLeagueCard";
import ProfileAchievements from "@/components/profile/ProfileAchievements";
import ProfileCustomization from "@/components/profile/ProfileCustomization";
import ProfileTabs from "@/components/profile/ProfileTabs";
import ProfileMediaGrid from "@/components/profile/ProfileMediaGrid";
import ProfileEmptyState from "@/components/profile/ProfileEmptyState";
import ProfileSkeletonLoader from "@/components/profile/ProfileSkeletonLoader";
import EditProfileModal from "@/components/profile/EditProfileModal";
import { PostModal } from "@/components/profile/PostModal";
import PostCard from "@/components/social/PostCard";

// ── Types ─────────────────────────────────────────────────────────────────────
import type { ContentTab, Post } from "@/types/profile";

// ── Demo achievements (replace with real API data) ────────────────────────────
const DEMO_ACHIEVEMENTS = [
  { id: "verified", title: "Verified", description: "Verified account", icon: "✅", color: "#3B82F6", rarity: "rare" as const },
  { id: "early", title: "Early Member", description: "Joined in the first wave", icon: "🌟", color: "#8B5CF6", rarity: "epic" as const },
  { id: "creator", title: "Creator", description: "Published 10+ posts", icon: "✍️", color: "#10B981", rarity: "common" as const },
  { id: "100posts", title: "100 Posts", description: "Published 100 posts", icon: "📝", color: "#F59E0B", rarity: "rare" as const },
  { id: "1k_followers", title: "1K Followers", description: "Reached 1,000 followers", icon: "👥", color: "#EF4444", rarity: "epic" as const },
  { id: "top_community", title: "Top Member", description: "Recognized community leader", icon: "🏅", color: "#6366F1", rarity: "legendary" as const },
  { id: "event", title: "Event Pro", description: "Participated in a platform event", icon: "🎉", color: "#EC4899", rarity: "common" as const },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { t } = useTranslation();

  // ── Route ─────────────────────────────────────────────────────────────────
  const [, routeParams] = useRoute("/profile/:userId?");
  const { authUser } = useGame();

  const userId = routeParams?.userId ?? authUser?.uid ?? "";

  // ── Data ──────────────────────────────────────────────────────────────────
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

  // ── State ─────────────────────────────────────────────────────────────────
  const [currentTab, setCurrentTab] = useState<ContentTab>("posts");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Determine ownership — if no userId in route, viewing own profile
  const isOwner = !routeParams?.userId || routeParams.userId === authUser?.uid;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleFollowToggle = useCallback(() => {
    if (!profile) return;
    followMutation.mutate(profile.isFollowing ? "unfollow" : "follow");
  }, [profile, followMutation]);

  const handleFriendToggle = useCallback(() => {
    toast.info("Friend request feature coming soon");
  }, []);

  const handleMessage = useCallback(() => {
    toast.info("Messaging feature coming soon");
  }, []);

  const handleShareProfile = useCallback(() => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => toast.success("Profile link copied!"))
      .catch(() => toast.error("Could not copy link"));
  }, []);

  const handleSaveProfile = useCallback(
    async (data: {
      username: string;
      bio: string;
      avatar: string | File;
      fullName?: string;
      location?: string;
      website?: string;
    }) => {
      toast.success("Profile updated!");
      setIsEditOpen(false);
    },
    []
  );

  // ── Filtered posts by tab ─────────────────────────────────────────────────
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

  const mediaPosts = useMemo(
    () => (posts ?? []).filter((p) => p.type === "image" || p.type === "reel"),
    [posts]
  );

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto min-h-screen bg-white dark:bg-gray-950">
        <ProfileSkeletonLoader />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (isError || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 gap-3">
        <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {t("profilePage.loadError")}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          We couldn't load this profile. Check your connection and try again.
        </p>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold text-sm transition-colors"
        >
          <RefreshCcw size={15} />
          {t("common.retry")}
        </button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-white dark:bg-gray-950 pb-24">

      {/* ── Cover + Avatar + Identity ─────────────────────────────── */}
      <ProfileCoverHeader
        profile={profile}
        isOwner={isOwner}
        onAvatarClick={() => toast.info("Avatar upload coming soon")}
        onCoverClick={() => toast.info("Cover upload coming soon")}
      />

      {/* ── Social Stats ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-5 px-4"
      >
        <ProfileSocialStats
          postsCount={profile.postsCount}
          followers={profile.followers}
          following={profile.following}
          friends={profile.friends ?? 0}
          totalLikes={profile.totalLikes ?? 0}
          onFollowersClick={() => toast.info("Followers list coming soon")}
          onFollowingClick={() => toast.info("Following list coming soon")}
          onFriendsClick={() => toast.info("Friends list coming soon")}
        />
      </motion.div>

      {/* ── Action Buttons ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-4 px-4"
      >
        <ProfileActionButtons
          isOwner={isOwner}
          isFollowing={profile.isFollowing ?? false}
          isFriend={profile.isFriend ?? false}
          isFollowLoading={followMutation.isPending}
          onEditProfile={() => setIsEditOpen(true)}
          onShareProfile={handleShareProfile}
          onFollowToggle={handleFollowToggle}
          onFriendToggle={handleFriendToggle}
          onMessage={handleMessage}
        />
      </motion.div>

      {/* ── League / Competitive (minimal) ────────────────────────── */}
      {(profile.league || profile.level) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-4 px-4"
        >
          <ProfileLeagueCard
            league={profile.league}
            leagueIcon={profile.leagueIcon}
            level={profile.level}
          />
        </motion.div>
      )}

      {/* ── Achievements ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-4 px-4"
      >
        <ProfileAchievements
          achievements={profile.achievements ?? DEMO_ACHIEVEMENTS}
        />
      </motion.div>

      {/* ── Customization ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mt-4 px-4"
      >
        <ProfileCustomization
          avatarFrame={profile.avatarFrame}
          profileTheme={profile.profileTheme}
          isOwner={isOwner}
          onOpenCosmetics={() => toast.info("Cosmetics shop coming soon")}
        />
      </motion.div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div className="mt-6">
        <ProfileTabs
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          isOwner={isOwner}
          postsCount={profile.postsCount}
          mediaCount={profile.mediaCount ?? mediaPosts.length}
          reelsCount={profile.reelsCount ?? 0}
          savedCount={profile.savedCount ?? 0}
        />
      </div>

      {/* ── Tab Content ───────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {/* POSTS tab */}
          {currentTab === "posts" && (
            <div className="mt-4 space-y-4 px-4">
              {visiblePosts.length === 0 ? (
                <ProfileEmptyState tab="posts" isOwner={isOwner} />
              ) : (
                <>
                  {visiblePosts.map((post) => (
                    <PostCard key={post.id} post={post as any} />
                  ))}
                  {hasNextPage && (
                    <button
                      onClick={fetchNextPage}
                      disabled={isFetchingNextPage}
                      className="w-full py-3 text-sm font-semibold text-blue-500 hover:text-blue-600 transition-colors"
                    >
                      {isFetchingNextPage ? "Loading…" : "Load more"}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* MEDIA tab */}
          {currentTab === "media" && (
            <div className="mt-1">
              {mediaPosts.length === 0 ? (
                <ProfileEmptyState tab="media" isOwner={isOwner} />
              ) : (
                <ProfileMediaGrid posts={mediaPosts} filterType="all" />
              )}
            </div>
          )}

          {/* REELS tab */}
          {currentTab === "reels" && (
            <div className="mt-1">
              {visiblePosts.length === 0 ? (
                <ProfileEmptyState tab="reels" isOwner={isOwner} />
              ) : (
                <ProfileMediaGrid posts={visiblePosts} filterType="reel" />
              )}
            </div>
          )}

          {/* SAVED tab (owner only) */}
          {currentTab === "saved" && isOwner && (
            <div className="mt-4 space-y-4 px-4">
              {visiblePosts.length === 0 ? (
                <ProfileEmptyState tab="saved" isOwner={isOwner} />
              ) : (
                visiblePosts.map((post) => (
                  <PostCard key={post.id} post={post as any} />
                ))
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Modals ────────────────────────────────────────────────── */}
      {isOwner && (
        <EditProfileModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          initialData={{
            username: profile.username,
            bio: profile.bio ?? "",
            avatar: profile.avatar ?? "",
            fullName: profile.fullName ?? "",
            location: profile.country ?? "",
            website: profile.website ?? "",
          }}
          onSave={handleSaveProfile}
        />
      )}

      <PostModal
        post={selectedPost}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPost(null);
        }}
      />
    </div>
  );
}
