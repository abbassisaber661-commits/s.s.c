// src/pages/SocialPage.tsx
import React, { useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useProfileData } from '@/hooks/useProfileData';
import {
  StoryBar,
  FeaturedPlayers,
  CreatePost,
  PostCard,
} from '@/components/social/SocialComponents';
import { useAuth } from '@/hooks/useAuth'; // افتراضي

const SocialPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth(); // جلب معرف المستخدم الحالي
  const userId = user?.id || '';

  const {
    profile,
    posts,
    isLoading,
    isError,
    errorMessage,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProfileData(userId);

  // إذا كنت تريد تحميل تلقائي للصفحة التالية عند التمرير (اختياري)
  // يمكنك إضافة IntersectionObserver هنا

  return (
    <div className="social-page container mx-auto px-4 py-6">
      {/* العنوان والوصف */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{t('socialPage.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('socialPage.subtitle')}
        </p>
      </header>

      {/* شريط القصص */}
      <section className="mb-8">
        <StoryBar />
      </section>

      {/* أبرز اللاعبين */}
      <section className="mb-8">
        <FeaturedPlayers />
      </section>

      {/* نموذج إنشاء منشور */}
      <section className="mb-8">
        <CreatePost onPost={async () => {}} />
      </section>

      {/* قائمة المنشورات */}
      <section>
        {isError && (
          <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-lg mb-4">
            {errorMessage || t('socialPage.error')}
          </div>
        )}

        {!isLoading && posts.length === 0 && !isError && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {t('socialPage.noPosts')}
          </div>
        )}

        <div className="space-y-4">
          {posts.map((post, index) => (
            <PostCard
              key={post.id}
              post={post as any}
              index={index}
              commentCount={0}
              currentUser=""
              currentLevel={1}
              currentPlayerId=""
              onLikeChange={() => {}}
              onCommentCountChange={() => {}}
            />
          ))}
        </div>

        {/* زر تحميل المزيد */}
        {hasNextPage && (
          <div className="text-center mt-6">
            <button
              onClick={fetchNextPage}
              disabled={isFetchingNextPage}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFetchingNextPage
                ? t('socialPage.loading')
                : t('socialPage.loadMore')}
            </button>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-8 text-gray-500">
            {t('socialPage.loading')}
          </div>
        )}
      </section>
    </div>
  );
};

export default SocialPage;