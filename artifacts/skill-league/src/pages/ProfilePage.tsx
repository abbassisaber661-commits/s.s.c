import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { useRoute } from "wouter";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ===== Components =====
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs from "@/components/profile/ProfileTabs";
import PostCard from "@/components/social/PostCard";
import { PostModal } from "@/components/profile/PostModal";

// ===== Hooks =====
import { useProfileData } from "@/hooks/useProfileData";
import { useFollowUser } from "@/hooks/useFollowUser";
import { useGame } from "@/contexts/GameContext";

// ===== Types =====
import type { Post } from "@/types/profile";

export default function ProfilePage() {
  // ================= ROUTE =================
  const [, routeParams] = useRoute("/profile/:userId");
  const { authUser } = useGame();

  const userId = routeParams?.userId ?? authUser?.uid ?? "";

  // ================= REFS =================
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastPostRef = useRef<HTMLDivElement | null>(null);

  // ================= STATE =================
  const [currentTab, setCurrentTab] = useState<
    "posts" | "reels" | "saved"
  >("posts");

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // ================= FOLLOW =================
  const handleFollowToggle = useCallback(() => {
    if (!profile) return;

    const action = profile.isFollowing ? "unfollow" : "follow";
    followMutation.mutate(action);
  }, [profile, followMutation]);

  // ================= UI ACTIONS =================
  const handleAvatarClick = () => toast("📷 تغيير الصورة الشخصية");
  const handleCoverClick = () => toast("🖼️ تغيير صورة الغلاف");
  const handleEditProfile = () => toast("✏️ تعديل الملف الشخصي");
  const handleShare = () => toast("🔗 تم نسخ الرابط");

  // ================= POST EVENTS =================
  const handleLikeChange = useCallback((postId: string) => {
    console.log("Like:", postId);
  }, []);

  const handleCommentCountChange = useCallback((postId: string) => {
    console.log("Comments:", postId);
  }, []);

  const handlePostClick = useCallback((post: Post) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedPost(null), 300);
  }, []);

  // ================= INFINITE SCROLL =================
  useEffect(() => {
    if (isLoading) return;

    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (
        entries[0].isIntersecting &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    });

    if (lastPostRef.current) {
      observerRef.current.observe(lastPostRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  ]);

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

  const safePlayerId =
    profile?.id ?? authUser?.uid ?? userId ?? "1";

  const renderedPosts = useMemo(() => {
    return visiblePosts.map((post, index) => {
      const isLast = index === visiblePosts.length - 1;

      return (
        <div key={post.id} ref={isLast ? lastPostRef : null}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: Math.min(index * 0.05, 0.5),
            }}
          >
            <PostCard
              post={post as any}
              index={index}
              commentCount={(post as any).comments || 0}
              currentUser={profile?.username || "مستخدم"}
              currentLevel={profile?.level ?? 1}
              currentPlayerId={safePlayerId}
              onLikeChange={handleLikeChange}
              onCommentCountChange={handleCommentCountChange}
              onPostClick={handlePostClick}
            />
          </motion.div>
        </div>
      );
    });
  }, [
    visiblePosts,
    profile,
    safePlayerId,
    handleLikeChange,
    handleCommentCountChange,
    handlePostClick,
  ]);

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
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-4xl mb-2">😕</p>
        <h2 className="text-xl font-bold">فشل تحميل البروفايل</h2>

        <button
          onClick={refetch}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  // ================= RENDER =================
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-20">
      {/* HEADER */}
      <ProfileHeader
        username={profile.username}
        avatar={profile.avatar ?? ""}
        cover={profile.cover}
        bio={profile.bio}
        postsCount={profile.postsCount}
        followers={profile.followers}
        following={profile.following}
        level={profile.level}
        isFollowing={profile.isFollowing}
        isFollowLoading={followMutation.isPending}
        onAvatarClick={handleAvatarClick}
        onCoverClick={handleCoverClick}
        onEditProfile={handleEditProfile}
        onShare={handleShare}
        onFollowToggle={handleFollowToggle}
      />

      {/* TABS */}
      <ProfileTabs
        currentTab={currentTab}
        onTabChange={(tab) =>
          setCurrentTab(tab as typeof currentTab)
        }
        postsCount={profile.postsCount}
        reelsCount={profile.reelsCount || 0}
        savedCount={profile.savedCount || 0}
      />

      {/* POSTS */}
      <AnimatePresence mode="wait">
        {visiblePosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-2">📝</p>
            <p>لا توجد منشورات</p>
          </div>
        ) : (
          <div className="space-y-4">
            {renderedPosts}

            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* MODAL */}
      <PostModal
        post={selectedPost}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
}