import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRoute } from "wouter";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ===== مكوناتنا =====
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs from "@/components/profile/ProfileTabs";
import PostCard from "@/components/social/PostCard";
import { PostModal } from "@/components/profile/PostModal";

// ===== Hooks =====
import { useProfileData } from "@/hooks/useProfileData";
import { useFollowUser } from "@/hooks/useFollowUser";
import { useGame } from "@/contexts/GameContext";

// ===== أنواع =====
import type { Post } from "@/types/profile";

// ============================================================
// المكون الرئيسي
// ============================================================
export default function ProfilePage() {
  // ===== المتغيرات =====
  const [, routeParams] = useRoute("/profile/:userId");
  const { authUser } = useGame();
  const userId = routeParams?.userId ?? authUser?.uid ?? "";
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastPostRef = useRef<HTMLDivElement | null>(null);

  // ===== الحالات =====
  const [currentTab, setCurrentTab] = useState<"posts" | "reels" | "saved">("posts");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ===== جلب البيانات =====
  const { profile, posts, isLoading, isError, refetch } = useProfileData(userId || "1");

  // ===== نظام المتابعة =====
  const followMutation = useFollowUser(userId || "1");

  // ===== معالجة المتابعة =====
  const handleFollowToggle = useCallback(() => {
    if (!profile) return;
    const action = profile.isFollowing ? "unfollow" : "follow";
    followMutation.mutate(action);
  }, [profile, followMutation]);

  // ===== دوال الهيدر =====
  const handleAvatarClick = () => toast("📷 تغيير الصورة الشخصية");
  const handleCoverClick = () => toast("🖼️ تغيير صورة الغلاف");
  const handleEditProfile = () => toast("✏️ توجيه إلى صفحة التعديل");
  const handleShare = () => toast("✅ تم نسخ الرابط");

  // ===== دوال البوستات =====
  const handleLikeChange = useCallback((postId: string, _liked: boolean) => {
    console.log(`📌 Post ${postId} liked`);
  }, []);

  const handleCommentCountChange = useCallback((postId: string, newCount: number) => {
    console.log(`💬 Post ${postId} comments: ${newCount}`);
  }, []);

  const handlePostClick = useCallback((post: Post) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedPost(null), 300);
  }, []);

  // ===== تحميل تدريجي (Infinite Scroll) =====
  const hasNextPage = posts?.hasNextPage || false;
  const fetchNextPage = posts?.fetchNextPage || (() => {});

  useEffect(() => {
    if (isLoading) return;

    // قطع الاتصال السابق إن وجد
    observerRef.current?.disconnect();

    // إنشاء مراقب جديد
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !posts?.isFetchingNextPage) {
        fetchNextPage();
      }
    });

    // ✅ التحسين الآمن: التأكد من وجود العنصر قبل المراقبة
    if (lastPostRef.current) {
      observerRef.current.observe(lastPostRef.current);
    }

    // ✅ cleanup مبسط وأكثر أماناً
    return () => {
      observerRef.current?.disconnect();
    };
  }, [isLoading, hasNextPage, fetchNextPage, posts?.isFetchingNextPage]);

  // ===== تصفية البوستات =====
  const visiblePosts = useMemo(() => {
    const allPosts = posts?.pages?.flatMap((page) => page.posts) ?? [];
    switch (currentTab) {
      case "reels":
        return allPosts.filter((post) => post.type === "reel");
      case "saved":
        return allPosts.filter((post) => post.isSaved);
      default:
        return allPosts;
    }
  }, [posts, currentTab]);

  // ✅ حماية معرف المستخدم
  const safePlayerId = profile?.id || userId || "1";

  // ✅ تحسين الأداء: حفظ البوستات المعروضة في useMemo
  const renderedPosts = useMemo(() => {
    return visiblePosts.map((post, index) => {
      const isLast = index === visiblePosts.length - 1;
      return (
        <div
          key={post.id}
          ref={isLast ? lastPostRef : null}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
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
            />
          </motion.div>
        </div>
      );
    });
  }, [
    visiblePosts,
    profile?.username,
    profile?.level,
    safePlayerId,
    handleLikeChange,
    handleCommentCountChange,
    handlePostClick,
  ]);

  // ===== حالات التحميل والأخطاء =====
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">جاري تحميل الملف الشخصي...</p>
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <p className="text-4xl mb-4">😕</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            لم نتمكن من العثور على المستخدم
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            قد يكون المستخدم قد حذف حسابه أو أن الرابط غير صحيح
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // التصيير الرئيسي
  // ============================================================
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-20">
      {/* ===== رأس البروفايل ===== */}
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

      {/* ===== التبويبات ===== */}
      <ProfileTabs
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab as typeof currentTab)}
        postsCount={profile.postsCount}
        reelsCount={profile.reelsCount || 0}
        savedCount={profile.savedCount || 0}
      />

      {/* ===== قائمة المنشورات ===== */}
      <AnimatePresence mode="wait">
        {visiblePosts.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-12 text-center"
          >
            {currentTab === "posts" && (
              <>
                <p className="text-5xl mb-4">📝</p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  لا توجد منشورات بعد
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  شارك أول منشور لك الآن!
                </p>
              </>
            )}
            {currentTab === "reels" && (
              <>
                <p className="text-5xl mb-4">🎬</p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  لا توجد ريلز
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  أنشئ أول ريلز خاص بك
                </p>
              </>
            )}
            {currentTab === "saved" && (
              <>
                <p className="text-5xl mb-4">🔖</p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  لا توجد منشورات محفوظة
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  احفظ المنشورات التي تعجبك لتظهر هنا
                </p>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="posts"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {renderedPosts}

            {/* مؤشر تحميل المزيد */}
            {posts?.isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* رسالة نهاية القائمة */}
            {!hasNextPage && visiblePosts.length > 0 && (
              <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-4">
                🎯 لقد وصلت إلى نهاية القائمة
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== مودال عرض البوست ===== */}
      <PostModal
        post={selectedPost}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
}