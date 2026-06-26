import React, { useState, useCallback, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, RefreshCcw, Search as SearchIcon, Settings } from "lucide-react";

// ── Hooks ─────────────────────────────────────────────────────────────────────
import { useTranslation } from "@/hooks/useTranslation";
import { useProfileData } from "@/hooks/useProfileData";
import { useFollowUser } from "@/hooks/useFollowUser";
import { useGame } from "@/contexts/GameContext";

// ── Profile Components ────────────────────────────────────────────────────────
import ProfileCoverHeader        from "@/components/profile/ProfileCoverHeader";
import ProfileSocialStats        from "@/components/profile/ProfileSocialStats";
import ProfileActionButtons      from "@/components/profile/ProfileActionButtons";
import ProfileLeagueCard         from "@/components/profile/ProfileLeagueCard";
import ProfileAchievements       from "@/components/profile/ProfileAchievements";
import ProfileBadges             from "@/components/profile/ProfileBadges";
import ProfileCustomization      from "@/components/profile/ProfileCustomization";
import ProfileTabs               from "@/components/profile/ProfileTabs";
import ProfileMediaGrid          from "@/components/profile/ProfileMediaGrid";
import ProfileEmptyState         from "@/components/profile/ProfileEmptyState";
import ProfileSkeletonLoader     from "@/components/profile/ProfileSkeletonLoader";
import ProfilePinnedPosts        from "@/components/profile/ProfilePinnedPosts";
import ProfileAboutTab           from "@/components/profile/ProfileAboutTab";
import ProfileFriendsList        from "@/components/profile/ProfileFriendsList";
import ProfileShareSheet         from "@/components/profile/ProfileShareSheet";
import ProfileSearch             from "@/components/profile/ProfileSearch";
import ProfileSortFilter         from "@/components/profile/ProfileSortFilter";
import ProfileGallery            from "@/components/profile/ProfileGallery";
import ProfileVideos             from "@/components/profile/ProfileVideos";
import ProfileActivityTimeline   from "@/components/profile/ProfileActivityTimeline";
import EditProfileModal          from "@/components/profile/EditProfileModal";
import { PostModal }             from "@/components/profile/PostModal";
import SocialPostCard             from "@/components/social/SocialPostCard";

// ── Types ─────────────────────────────────────────────────────────────────────
import type { ContentTab, Post, FriendEntry, Badge } from "@/types/profile";
import type { SortOption } from "@/components/profile/ProfileSortFilter";

// ── Demo data (replace with real API) ─────────────────────────────────────────
const DEMO_ACHIEVEMENTS = [
  { id: "verified",      title: "Verified",     description: "Verified account",           icon: "✅", color: "#3B82F6", rarity: "rare"      as const },
  { id: "early",         title: "Early Member", description: "Joined in the first wave",   icon: "🌟", color: "#8B5CF6", rarity: "epic"      as const },
  { id: "creator",       title: "Creator",      description: "Published 10+ posts",        icon: "✍️", color: "#10B981", rarity: "common"    as const },
  { id: "100posts",      title: "100 Posts",    description: "Published 100 posts",        icon: "📝", color: "#F59E0B", rarity: "rare"      as const },
  { id: "1k_followers",  title: "1K Followers", description: "Reached 1,000 followers",   icon: "👥", color: "#EF4444", rarity: "epic"      as const },
  { id: "top_community", title: "Top Member",   description: "Recognized community leader",icon: "🏅", color: "#6366F1", rarity: "legendary" as const },
  { id: "event",         title: "Event Pro",    description: "Participated in an event",   icon: "🎉", color: "#EC4899", rarity: "common"    as const },
];

const DEMO_BADGES: Badge[] = [
  { id: "b1", title: "Verified",   description: "Account verified",         icon: "✅", color: "#3B82F6", rarity: "rare",      category: "role"        },
  { id: "b2", title: "Creator",    description: "Content creator",          icon: "🎨", color: "#EC4899", rarity: "epic",      category: "role"        },
  { id: "b3", title: "Moderator",  description: "Community moderator",      icon: "🛡️", color: "#10B981", rarity: "rare",      category: "role"        },
  { id: "b4", title: "Top Fan",    description: "Most active commenter",    icon: "❤️", color: "#EF4444", rarity: "common",    category: "social"      },
  { id: "b5", title: "Milestone",  description: "Reached 100 posts",        icon: "📝", color: "#F59E0B", rarity: "common",    category: "achievement" },
  { id: "b6", title: "Event '25",  description: "Attended 2025 SkillLeague", icon: "🎟️",color: "#8B5CF6", rarity: "legendary", category: "event"       },
];

const DEMO_FRIENDS: FriendEntry[] = Array.from({ length: 8 }, (_, i) => ({
  id: String(i + 1),
  username: `friend_${i + 1}`,
  displayName: `Friend ${i + 1}`,
  isOnline: i % 3 === 0,
  mutualCount: Math.floor(Math.random() * 5),
  level: Math.floor(Math.random() * 40) + 1,
}));

const sortPosts = (posts: Post[], sort: SortOption): Post[] => {
  const copy = [...posts];
  switch (sort) {
    case "oldest":    return copy.sort((a, b) => a.timestamp - b.timestamp);
    case "most_liked": return copy.sort((a, b) => b.likes - a.likes);
    case "most_viewed": return copy.sort((a, b) => b.likes - a.likes); // views not in type yet
    default:          return copy.sort((a, b) => b.timestamp - a.timestamp);
  }
};

// ─────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  // ── Route ─────────────────────────────────────────────────────────────────
  const [, routeParams] = useRoute("/profile/:userId?");
  const { authUser } = useGame();
  const userId = routeParams?.userId ?? authUser?.uid ?? "";

  // ── Data ──────────────────────────────────────────────────────────────────
  const { profile, posts, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useProfileData(userId || "1");
  const followMutation = useFollowUser(userId || "1");

  // ── UI state ──────────────────────────────────────────────────────────────
  const [currentTab, setCurrentTab]     = useState<ContentTab>("posts");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [isEditOpen, setIsEditOpen]     = useState(false);
  const [isShareOpen, setIsShareOpen]   = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sort, setSort]                 = useState<SortOption>("latest");

  const isOwner = !routeParams?.userId || routeParams.userId === authUser?.uid;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleFollowToggle = useCallback(() => {
    if (!profile) return;
    followMutation.mutate(profile.isFollowing ? "unfollow" : "follow");
  }, [profile, followMutation]);

  const handleShareProfile = useCallback(() => setIsShareOpen(true), []);

  const handleSaveProfile = useCallback(async () => {
    toast.success("Profile updated!");
    setIsEditOpen(false);
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────
  const allPosts      = posts ?? [];
  const pinnedPosts   = allPosts.filter((p) => p.isPinned);
  const mediaPosts    = allPosts.filter((p) => p.type === "image" || p.type === "reel");

  const visiblePosts = useMemo(() => {
    switch (currentTab) {
      case "reels": return sortPosts(allPosts.filter((p) => p.type === "reel"), sort);
      case "saved": return sortPosts(allPosts.filter((p) => p.isSaved), sort);
      default:      return sortPosts(allPosts.filter((p) => !p.isPinned), sort);
    }
  }, [allPosts, currentTab, sort]);

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

  const profileUrl = `${window.location.origin}/profile/${profile.id}`;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-white dark:bg-gray-950 pb-24">

      {/* ── Top action bar (search + settings) ─────────────── */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        <button
          onClick={() => setIsSearchOpen(true)}
          className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
        >
          <SearchIcon size={16} />
        </button>
        {isOwner && (
          <button
            onClick={() => navigate("/profile-settings")}
            className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
          >
            <Settings size={16} />
          </button>
        )}
      </div>

      {/* ── Cover + Avatar + Identity ─────────────────────── */}
      <ProfileCoverHeader
        profile={profile}
        isOwner={isOwner}
        onAvatarClick={() => toast.info("Avatar upload coming soon")}
        onCoverClick={() => toast.info("Cover upload coming soon")}
      />

      {/* ── Social Stats ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="mt-5 px-4"
      >
        <ProfileSocialStats
          postsCount={profile.postsCount}
          followers={profile.followers}
          following={profile.following}
          friends={profile.friends ?? DEMO_FRIENDS.length}
          totalLikes={profile.totalLikes ?? 0}
          onFollowersClick={() => navigate(`/profile/${profile.id}/followers`)}
          onFollowingClick={() => navigate(`/profile/${profile.id}/following`)}
          onFriendsClick={() => setCurrentTab("friends")}
        />
      </motion.div>

      {/* ── Action Buttons ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.17 }}
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
          onFriendToggle={() => toast.info("Friend request coming soon")}
          onMessage={() => toast.info("Messaging coming soon")}
        />
      </motion.div>

      {/* ── League Card (minimal) ─────────────────────────── */}
      {(profile.league || profile.level) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="mt-4 px-4"
        >
          <ProfileLeagueCard
            league={profile.league}
            leagueIcon={profile.leagueIcon}
            level={profile.level}
          />
        </motion.div>
      )}

      {/* ── Achievements ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.27 }}
        className="mt-4 px-4"
      >
        <ProfileAchievements achievements={profile.achievements ?? DEMO_ACHIEVEMENTS} />
      </motion.div>

      {/* ── Badges ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-4 px-4"
      >
        <ProfileBadges badges={profile.badges ?? DEMO_BADGES} />
      </motion.div>

      {/* ── Activity Timeline ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.33 }}
        className="mt-4 px-4"
      >
        <ProfileActivityTimeline events={profile.activityEvents} />
      </motion.div>

      {/* ── Customization ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.36 }}
        className="mt-4 px-4"
      >
        <ProfileCustomization
          avatarFrame={profile.avatarFrame}
          profileTheme={profile.profileTheme}
          isOwner={isOwner}
          onOpenCosmetics={() => toast.info("Cosmetics shop coming soon")}
        />
      </motion.div>

      {/* ── Tabs ─────────────────────────────────────────── */}
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

      {/* ── Tab Content ──────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.16 }}
        >

          {/* POSTS */}
          {currentTab === "posts" && (
            <div className="mt-2">
              {/* Sort control */}
              {allPosts.length > 1 && (
                <div className="flex justify-end px-4 py-2">
                  <ProfileSortFilter sort={sort} onChange={setSort} />
                </div>
              )}
              {/* Pinned */}
              <ProfilePinnedPosts
                posts={pinnedPosts}
                isOwner={isOwner}
                onUnpin={(id) => toast.info(`Unpin ${id} — backend coming soon`)}
              />
              {/* Regular posts */}
              <div className="space-y-4 px-4 mt-2">
                {visiblePosts.length === 0 ? (
                  <ProfileEmptyState tab="posts" isOwner={isOwner} />
                ) : (
                  <>
                    {visiblePosts.map((post) => (
                      <SocialPostCard key={post.id} post={post as any} />
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
            </div>
          )}

          {/* MEDIA — Gallery */}
          {currentTab === "media" && (
            <div className="mt-2">
              {mediaPosts.length === 0 ? (
                <ProfileEmptyState tab="media" isOwner={isOwner} />
              ) : (
                <>
                  <ProfileGallery posts={mediaPosts} />
                  <div className="mt-2 border-t border-gray-100 dark:border-gray-800 pt-2">
                    <ProfileVideos posts={mediaPosts} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* REELS */}
          {currentTab === "reels" && (
            <div className="mt-2">
              {visiblePosts.length === 0 ? (
                <ProfileEmptyState tab="reels" isOwner={isOwner} />
              ) : (
                <ProfileMediaGrid posts={visiblePosts} filterType="reel" />
              )}
            </div>
          )}

          {/* SAVED (owner only) */}
          {currentTab === "saved" && isOwner && (
            <div className="mt-4 space-y-4 px-4">
              {visiblePosts.length === 0 ? (
                <ProfileEmptyState tab="saved" isOwner={isOwner} />
              ) : (
                visiblePosts.map((post) => (
                  <SocialPostCard key={post.id} post={post as any} />
                ))
              )}
            </div>
          )}

          {/* ABOUT */}
          {currentTab === "about" && (
            <div className="px-4">
              <ProfileAboutTab
                profile={profile}
                isOwner={isOwner}
                onEdit={() => setIsEditOpen(true)}
              />
            </div>
          )}

          {/* FRIENDS */}
          {currentTab === "friends" && (
            <ProfileFriendsList
              friends={DEMO_FRIENDS}
              isOwner={isOwner}
              onRemoveFriend={(id) => toast.info(`Remove friend ${id} — coming soon`)}
              onMessageFriend={(id) => toast.info(`Message ${id} — coming soon`)}
            />
          )}

        </motion.div>
      </AnimatePresence>

      {/* ── Modals ────────────────────────────────────────── */}
      {isOwner && (
        <EditProfileModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          initialData={{
            username: profile.username,
            bio:      profile.bio ?? "",
            avatar:   profile.avatar ?? "",
            fullName: profile.fullName ?? "",
            location: profile.country ?? "",
            website:  profile.website ?? "",
          }}
          onSave={handleSaveProfile}
        />
      )}

      <PostModal
        post={selectedPost}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedPost(null); }}
      />

      <ProfileShareSheet
        username={profile.username}
        profileUrl={profileUrl}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />

      {/* ── Search overlay ─────────────────────────────────── */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-50 bg-white dark:bg-gray-950 overflow-y-auto">
            <ProfileSearch
              posts={allPosts}
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
