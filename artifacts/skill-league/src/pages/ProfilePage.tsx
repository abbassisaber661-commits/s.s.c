import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, RefreshCcw, Menu } from "lucide-react";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import { compressImageToBase64 } from "@/lib/imageUtils";

import { useTranslation } from "@/hooks/useTranslation";
import { useProfileData } from "@/hooks/useProfileData";
import { usePosts, useSavedPosts } from "@/hooks/useCommunity";
import { useFollowUser } from "@/hooks/useFollowUser";
import { useGame } from "@/contexts/GameContext";
import GuestPaywall from "@/components/profile/GuestPaywall";

import ProfileCoverHeader    from "@/components/profile/ProfileCoverHeader";
import ProfileSocialStats    from "@/components/profile/ProfileSocialStats";
import ProfileActionButtons  from "@/components/profile/ProfileActionButtons";
import ProfileLeagueCard     from "@/components/profile/ProfileLeagueCard";
import ProfileTabs, { type ActiveTab } from "@/components/profile/ProfileTabs";
import ProfileEmptyState     from "@/components/profile/ProfileEmptyState";
import ProfileSkeletonLoader from "@/components/profile/ProfileSkeletonLoader";
import ProfilePinnedPosts    from "@/components/profile/ProfilePinnedPosts";
import ProfileShareSheet     from "@/components/profile/ProfileShareSheet";
import ProfileSortFilter     from "@/components/profile/ProfileSortFilter";
import EditProfileModal      from "@/components/profile/EditProfileModal";
import { PostModal }         from "@/components/profile/PostModal";
import SocialPostCard        from "@/components/social/SocialPostCard";
import { CommentsSheet }     from "@/components/social/CommentsSheet";

import CreatorDashboard  from "@/components/profile/CreatorDashboard";
import ProfileWalletCard from "@/components/wallet/ProfileWalletCard";
import { useCreatorStats } from "@/hooks/useCreatorStats";

import type { SortOption } from "@/components/profile/ProfileSortFilter";
import type { CommunityPost } from "@/shared/community";

const sortPosts = (posts: CommunityPost[], sort: SortOption): CommunityPost[] => {
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
  const { authUser, isGuest } = useGame();
  const storedPlayerId = getStoredPlayerId();
  // Prefer storedPlayerId (DB nanoid) over authUser.uid (Pi UUID for Pi users)
  // so profile fetch and upload handlers always target the correct player record.
  const userId = routeParams?.userId ?? storedPlayerId ?? authUser?.uid ?? "";

  // ── Guest paywall ──────────────────────────────────────────────────────────
  const [paywallVisible, setPaywallVisible] = useState(false);

  useEffect(() => {
    if (!isGuest) return;
    const timer = setTimeout(() => setPaywallVisible(true), 700);
    return () => clearTimeout(timer);
  }, [isGuest]);

  const guardGuest = useCallback(
    (action: () => void) => {
      if (isGuest) { setPaywallVisible(true); return; }
      action();
    },
    [isGuest],
  );

  // ── Profile metadata ──
  const { profile, isLoading, isError, refetch } = useProfileData(userId || "1");

  // ── Posts ──
  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePosts("latest", userId || "1");

  const { data: savedData } = useSavedPosts();
  const followMutation = useFollowUser(userId || "1");

  const [activeTab, setActiveTab]               = useState<ActiveTab>("all");
  const [selectedPost, setSelectedPost]         = useState<CommunityPost | null>(null);
  const [isModalOpen, setIsModalOpen]           = useState(false);
  const [isEditOpen, setIsEditOpen]             = useState(false);
  const [isShareOpen, setIsShareOpen]           = useState(false);
  const [statsOpen, setStatsOpen]               = useState(false);
  const [sort, setSort]                         = useState<SortOption>("latest");
  const [openCommentPostId, setOpenCommentPostId] = useState<string | null>(null);
  const [commentCounts, setCommentCounts]       = useState<Record<string, number>>({});

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef  = useRef<HTMLInputElement>(null);

  const currentPlayerId = storedPlayerId ?? undefined;
  // isOwner: true when no URL param (own profile tab), or when URL param matches
  // either the Pi UUID (authUser.uid) OR the DB player nanoid (storedPlayerId).
  const isOwner =
    !routeParams?.userId ||
    routeParams.userId === authUser?.uid ||
    routeParams.userId === storedPlayerId;

  const creatorStats = useCreatorStats(userId || "1", profile?.postsCount ?? 0);

  const handleFollowToggle = useCallback(async () => {
    if (!profile) return;
    if (isGuest) { setPaywallVisible(true); return; }
    await followMutation.mutate(profile.isFollowing ? "unfollow" : "follow");
    refetch();
  }, [profile, followMutation, refetch, isGuest]);

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
        avatarStr = await compressImageToBase64(data.avatar);
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
    if (isGuest) { setPaywallVisible(true); e.target.value = ""; return; }
    const pid = getStoredPlayerId() ?? userId;
    if (!pid) { toast.error("Not logged in"); return; }
    try {
      const avatarStr = await compressImageToBase64(file);
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
    if (isGuest) { setPaywallVisible(true); e.target.value = ""; return; }
    const pid = getStoredPlayerId() ?? userId;
    if (!pid) { toast.error("Not logged in"); return; }
    try {
      const coverStr = await compressImageToBase64(file);
      await api.players.sync(pid, { cover: coverStr } as any);
      toast.success("Cover updated!");
      refetch();
    } catch {
      toast.error("Failed to update cover");
    }
    e.target.value = "";
  }, [userId, refetch]);

  // ── Flatten paginated data ──
  const allPosts   = useMemo(() => postsData?.pages.flatMap((p) => p.data) ?? [], [postsData]);
  const savedPosts = useMemo(() => savedData?.pages.flatMap((p) => p.data) ?? [], [savedData]);

  const pinnedPosts = useMemo(() => allPosts.filter((p) => p.isPinned), [allPosts]);
  const nonPinned   = useMemo(() => allPosts.filter((p) => !p.isPinned), [allPosts]);

  const filteredPosts = useMemo(() => {
    switch (activeTab) {
      case "video": return nonPinned.filter((p) => p.type === "video");
      case "image": return nonPinned.filter((p) => p.type === "image");
      case "saved": return savedPosts;
      default:      return nonPinned;
    }
  }, [activeTab, nonPinned, savedPosts]);

  const visiblePosts = useMemo(() => sortPosts(filteredPosts, sort), [filteredPosts, sort]);

  // ─────────────────────── Loading / Error ──────────────────────────────────

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
        <h2 className="text-lg font-bold text-[#111111]">{t("profilePage.loadError")}</h2>
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

  // ─────────────────────── Render ───────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-[#F5F5F7] pb-24">

      {/* ── Back button ── */}
      <div className="absolute top-3 left-3 z-30">
        <button
          onClick={() => navigate("/feed")}
          className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
          aria-label="Back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
      </div>

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

      {/* ══════════════════════════════════════════════════════════════
          1. Cover  ·  Avatar  ·  Pi Login Name  ·  @username
      ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white">
        <ProfileCoverHeader
          profile={profile}
          isOwner={isOwner}
          onAvatarClick={() => {
            if (isGuest) { setPaywallVisible(true); return; }
            if (isOwner) avatarInputRef.current?.click();
          }}
          onCoverClick={() => {
            if (isGuest) { setPaywallVisible(true); return; }
            if (isOwner) coverInputRef.current?.click();
          }}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          2. Following  |  Followers  |  Posts
      ══════════════════════════════════════════════════════════════ */}
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

      {/* ══════════════════════════════════════════════════════════════
          3. Wallet  (owner only)
             ⓘ DN$ Balance  |  Pi Balance ⓘ
             Transaction History
      ══════════════════════════════════════════════════════════════ */}
      {isOwner && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.13 }}
          className="mt-3 px-4"
        >
          <ProfileWalletCard />
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          3b. Pi UID card — REMOVED for security (SSC hardening).
              The raw Pi Network UID must never be displayed in the UI,
              even to the owner. Owner verification is handled entirely
              server-side (isOwnerPiUid against the OWNER_UID secret);
              the UID itself stays private in the database/session only.
      ══════════════════════════════════════════════════════════════ */}

      {/* ══════════════════════════════════════════════════════════════
          4. 📊 Statistics  |  Share Profile  |  Edit Profile
             (owner)  —or—  Follow  |  Message  (visitor)
      ══════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="mt-3 px-4"
      >
        <ProfileActionButtons
          isOwner={isOwner}
          isFollowing={profile.isFollowing ?? false}
          isFollowLoading={followMutation.isPending}
          onStatistics={() => setStatsOpen(true)}
          onEditProfile={() => guardGuest(() => setIsEditOpen(true))}
          onShareProfile={() => setIsShareOpen(true)}
          onFollowToggle={handleFollowToggle}
          onMessage={() => guardGuest(() => {
            navigate("/chat/" + encodeURIComponent(profile.username));
          })}
        />
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════
          5. League / Level card
      ══════════════════════════════════════════════════════════════ */}
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

      {/* ══════════════════════════════════════════════════════════════
          Creator stats drawer  — triggered by Statistics button above
          (no inline button rendered in controlled mode)
      ══════════════════════════════════════════════════════════════ */}
      <CreatorDashboard
        stats={creatorStats}
        postsCount={profile.postsCount}
        joinedAt={profile.joinedAt}
        username={profile.username}
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
      />

      {/* ══════════════════════════════════════════════════════════════
          6. Tab bar  —  All  |  🖼 Photos  |  📽 Videos  |  🔖 Saved
      ══════════════════════════════════════════════════════════════ */}
      <div className="mt-4">
        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          7. Posts feed
      ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.16 }}
        >
          <div className="mt-2">
            {allPosts.length > 1 && (
              <div className="flex justify-end px-4 py-2">
                <ProfileSortFilter sort={sort} onChange={setSort} />
              </div>
            )}
            <ProfilePinnedPosts
              posts={activeTab === "all" ? (pinnedPosts as any[]) : []}
              isOwner={isOwner}
              onUnpin={() => {}}
            />
            <div className="space-y-3 px-4 mt-2">
              {visiblePosts.length === 0 ? (
                <ProfileEmptyState tab={activeTab === "saved" ? "saved" : "posts"} isOwner={isOwner} />
              ) : (
                <>
                  {visiblePosts.map((post) => (
                    <SocialPostCard
                      key={post.id}
                      post={post}
                      currentPlayerId={currentPlayerId}
                      commentCount={commentCounts[post.id] ?? post.replyCount ?? 0}
                      onCommentClick={(postId) => guardGuest(() => setOpenCommentPostId(postId))}
                      onGuestInteract={isGuest ? () => setPaywallVisible(true) : undefined}
                    />
                  ))}
                  {hasNextPage && activeTab === "all" && (
                    <button
                      onClick={() => fetchNextPage()}
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
        </motion.div>
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════
          Modals & Sheets
      ══════════════════════════════════════════════════════════════ */}
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
        post={selectedPost as any}
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
            (allPosts.find((p) => p.id === openCommentPostId)?.replyCount ?? 0)
          }
          onCountChange={(delta) => {
            setCommentCounts((prev) => {
              const cur = prev[openCommentPostId] ??
                (allPosts.find((p) => p.id === openCommentPostId)?.replyCount ?? 0);
              return { ...prev, [openCommentPostId]: cur + delta };
            });
          }}
        />
      )}

      {/* ── Guest Paywall ── */}
      <GuestPaywall
        visible={paywallVisible}
        onDismiss={() => setPaywallVisible(false)}
      />
    </div>
  );
}
