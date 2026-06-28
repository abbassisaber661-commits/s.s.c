import React, { useState, useCallback, useMemo, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, RefreshCcw, Menu } from "lucide-react";
import { api, getStoredPlayerId } from "@/lib/apiClient";

import { useTranslation } from "@/hooks/useTranslation";
import { useProfileData } from "@/hooks/useProfileData";
import { useFollowUser } from "@/hooks/useFollowUser";
import { useGame } from "@/contexts/GameContext";

import ProfileCoverHeader    from "@/components/profile/ProfileCoverHeader";
import ProfileSocialStats    from "@/components/profile/ProfileSocialStats";
import ProfileActionButtons  from "@/components/profile/ProfileActionButtons";
import ProfileLeagueCard     from "@/components/profile/ProfileLeagueCard";
import ProfileTabs           from "@/components/profile/ProfileTabs";
import ProfileMediaGrid      from "@/components/profile/ProfileMediaGrid";
import ProfileEmptyState     from "@/components/profile/ProfileEmptyState";
import ProfileSkeletonLoader from "@/components/profile/ProfileSkeletonLoader";
import ProfilePinnedPosts    from "@/components/profile/ProfilePinnedPosts";
import ProfileAboutTab       from "@/components/profile/ProfileAboutTab";
import ProfileShareSheet     from "@/components/profile/ProfileShareSheet";
import ProfileSortFilter     from "@/components/profile/ProfileSortFilter";
import ProfileGallery        from "@/components/profile/ProfileGallery";
import ProfileVideos         from "@/components/profile/ProfileVideos";
import EditProfileModal      from "@/components/profile/EditProfileModal";
import { PostModal }         from "@/components/profile/PostModal";
import SocialPostCard        from "@/components/social/SocialPostCard";
import { CommentsSheet }     from "@/components/social/CommentsSheet";

import type { ContentTab, Post } from "@/types/profile";
import type { SortOption } from "@/components/profile/ProfileSortFilter";

const sortPosts = (posts: Post[], sort: SortOption): Post[] => {
  const copy = [...posts];
  switch (sort) {
    case "oldest":     return copy.sort((a, b) => a.timestamp - b.timestamp);
    case "most_liked": return copy.sort((a, b) => b.likes - a.likes);
    default:           return copy.sort((a, b) => b.timestamp - a.timestamp);
  }
};

export default function ProfilePage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const [, routeParams] = useRoute("/profile/:userId?");
  const { authUser } = useGame();
  const userId = routeParams?.userId ?? authUser?.uid ?? "";

  const {
    profile, posts, isLoading, isError, refetch,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useProfileData(userId || "1");

  const followMutation = useFollowUser(userId || "1");

  const [currentTab, setCurrentTab]   = useState<ContentTab>("posts");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen]   = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [sort, setSort]               = useState<SortOption>("latest");
  const [openCommentPostId, setOpenCommentPostId] = useState<string | null>(null);
  const [commentCounts, setCommentCounts]         = useState<Record<string, number>>({});

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef  = useRef<HTMLInputElement>(null);

  const isOwner = !routeParams?.userId || routeParams.userId === authUser?.uid;

  const handleFollowToggle = useCallback(async () => {
    if (!profile) return;
    await followMutation.mutate(profile.isFollowing ? "unfollow" : "follow");
    refetch();
  }, [profile, followMutation, refetch]);

  const handleSaveProfile = useCallback(async (data: {
    username: string;
    bio: string;
    avatar: string | File;
    fullName?: string;
    location?: string;
    website?: string;
  }) => {
    const pid = getStoredPlayerId() ?? userId;
    if (!pid) { toast.error("Not logged in"); return; }
    try {
      let avatarStr: string | undefined;
      if (data.avatar instanceof File) {
        avatarStr = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(data.avatar as File);
        });
      } else {
        avatarStr = data.avatar || undefined;
      }
      await api.players.sync(pid, {
        username: data.username,
        bio:      data.bio || undefined,
        avatar:   avatarStr,
        fullName: data.fullName || undefined,
        location: data.location || undefined,
        website:  data.website  || undefined,
      } as any);
      toast.success("Profile updated!");
      setIsEditOpen(false);
      refetch();
    } catch {
      toast.error("Failed to save profile");
    }
  }, [userId, refetch]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const pid = getStoredPlayerId() ?? userId;
    if (!pid) { toast.error("Not logged in"); return; }
    try {
      const avatarStr = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
      await api.players.sync(pid, { avatar: avatarStr } as any);
      toast.success("Avatar updated!");
      refetch();
    } catch {
      toast.error("Failed to update avatar");
    }
    e.target.value = "";
  }, [userId, refetch]);

  const handleCoverUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const pid = getStoredPlayerId() ?? userId;
    if (!pid) { toast.error("Not logged in"); return; }
    try {
      const coverStr = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
      await api.players.sync(pid, { cover: coverStr } as any);
      toast.success("Cover updated!");
      refetch();
    } catch {
      toast.error("Failed to update cover");
    }
    e.target.value = "";
  }, [userId, refetch]);

  const allPosts    = posts ?? [];
  const pinnedPosts = allPosts.filter((p) => p.isPinned);
  const mediaPosts  = allPosts.filter((p) => p.type === "image" || p.type === "reel");

  const visiblePosts = useMemo(
    () => sortPosts(allPosts.filter((p) => !p.isPinned), sort),
    [allPosts, sort],
  );

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto min-h-screen bg-[#F5F5F7]">
        <ProfileSkeletonLoader />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F5F5F7] text-center px-6 gap-3">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-[#111111]">
          {t("profilePage.loadError")}
        </h2>
        <p className="text-sm text-[#666666] max-w-xs">
          We couldn't load this profile. Check your connection and try again.
        </p>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FFD60A] hover:bg-[#F5C800] text-black rounded-xl font-semibold text-sm transition-colors"
        >
          <RefreshCcw size={15} />
          {t("common.retry")}
        </button>
      </div>
    );
  }

  const profileUrl = `${window.location.origin}/profile/${profile.id}`;

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-[#F5F5F7] pb-24">

      {/* ── Settings button (owner only) ── */}
      {isOwner && (
        <div className="absolute top-3 right-3 z-30">
          <button
            onClick={() => navigate("/profile-settings")}
            className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
          >
            <Menu size={16} />
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
      <input ref={coverInputRef}  type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />

      {/* ── Cover + Avatar + Identity ── */}
      <div className="bg-white">
        <ProfileCoverHeader
          profile={profile}
          isOwner={isOwner}
          onAvatarClick={() => isOwner && avatarInputRef.current?.click()}
          onCoverClick={() => isOwner && coverInputRef.current?.click()}
        />
      </div>

      {/* ── Stats row ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-4 px-4"
      >
        <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm py-3">
          <ProfileSocialStats
            postsCount={profile.postsCount}
            followers={profile.followers}
            following={profile.following}
            onFollowersClick={() => navigate(`/profile/${profile.id}/followers`)}
            onFollowingClick={() => navigate(`/profile/${profile.id}/following`)}
          />
        </div>
      </motion.div>

      {/* ── Action Buttons ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-3 px-4"
      >
        <ProfileActionButtons
          isOwner={isOwner}
          isFollowing={profile.isFollowing ?? false}
          isFollowLoading={followMutation.isPending}
          onEditProfile={() => setIsEditOpen(true)}
          onShareProfile={() => setIsShareOpen(true)}
          onFollowToggle={handleFollowToggle}
          onMessage={() => navigate(`/chat/${encodeURIComponent(profile.username)}`)}
        />
      </motion.div>

      {/* ── League / Level card ── */}
      {(profile.league || profile.level) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-3 px-4"
        >
          <ProfileLeagueCard
            league={profile.league}
            leagueIcon={profile.leagueIcon}
            level={profile.level}
          />
        </motion.div>
      )}

      {/* ── Navigation Tabs ── */}
      <div className="mt-4">
        <ProfileTabs
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          isOwner={isOwner}
          postsCount={profile.postsCount}
          mediaCount={profile.mediaCount ?? mediaPosts.length}
        />
      </div>

      {/* ── Tab Content ── */}
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
              {allPosts.length > 1 && (
                <div className="flex justify-end px-4 py-2">
                  <ProfileSortFilter sort={sort} onChange={setSort} />
                </div>
              )}
              <ProfilePinnedPosts posts={pinnedPosts} isOwner={isOwner} onUnpin={() => {}} />
              <div className="space-y-3 px-4 mt-2">
                {visiblePosts.length === 0 ? (
                  <ProfileEmptyState tab="posts" isOwner={isOwner} />
                ) : (
                  <>
                    {visiblePosts.map((post) => (
                      <SocialPostCard
                        key={post.id}
                        post={post as any}
                        commentCount={commentCounts[post.id] ?? (post as any).replyCount ?? 0}
                        onCommentClick={(postId) => setOpenCommentPostId(postId)}
                      />
                    ))}
                    {hasNextPage && (
                      <button
                        onClick={fetchNextPage}
                        disabled={isFetchingNextPage}
                        className="w-full py-3 text-sm font-semibold text-[#666666] hover:text-[#111111] transition-colors"
                      >
                        {isFetchingNextPage ? "Loading…" : "Load more"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* MEDIA */}
          {currentTab === "media" && (
            <div className="mt-2">
              {mediaPosts.length === 0 ? (
                <ProfileEmptyState tab="media" isOwner={isOwner} />
              ) : (
                <>
                  <ProfileGallery posts={mediaPosts} />
                  <div className="mt-2 border-t border-[#E5E5E5] pt-2">
                    <ProfileVideos posts={mediaPosts} />
                  </div>
                </>
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

        </motion.div>
      </AnimatePresence>

      {/* ── Modals ── */}
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
        onClose={() => setIsModalOpen(false)}
      />

      <ProfileShareSheet
        username={profile.username}
        profileUrl={profileUrl}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />

      {openCommentPostId && (
        <CommentsSheet
          postId={openCommentPostId}
          isOpen={!!openCommentPostId}
          onClose={() => setOpenCommentPostId(null)}
          initialCount={
            commentCounts[openCommentPostId] ??
            ((allPosts.find((p) => p.id === openCommentPostId) as any)?.replyCount ?? 0)
          }
          onCountChange={(delta) => {
            setCommentCounts((prev) => ({
              ...prev,
              [openCommentPostId]: (prev[openCommentPostId] ?? (allPosts.find((p) => p.id === openCommentPostId) as any)?.replyCount ?? 0) + delta,
            }));
          }}
        />
      )}
    </div>
  );
}
