import { useEffect, useState, useCallback } from "react";
import { Story, getStoriesAsync } from "@/lib/stories";

interface Props {
  onOpen: (index: number) => void;
  userId?: string; // ✅ اختياري لتمييز المستخدمين
}

export default function StoryFeed({ onOpen, userId }: Props) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ تحسين: استخدام mounted flag لمنع التحديث بعد unmount
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const data = await getStoriesAsync();
        if (mounted) {
          setStories(data || []);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setStories([]);
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  // ✅ التحقق من المشاهدة من sessionStorage مع userId لو موجود
  const isSeen = useCallback(
    (storyId: string) => {
      const key = userId ? `viewed_${userId}_${storyId}` : `viewed_${storyId}`;
      return sessionStorage.getItem(key) === "true";
    },
    [userId]
  );

  // ✅ تسجيل المشاهدة عند الفتح
  const handleOpen = useCallback(
    (index: number, story: Story) => {
      const key = userId ? `viewed_${userId}_${story.id}` : `viewed_${story.id}`;
      sessionStorage.setItem(key, "true");
      onOpen(index);
    },
    [onOpen, userId]
  );

  if (loading) {
    return (
      <div className="flex gap-3 p-3 overflow-x-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="w-14 h-14 rounded-full bg-gray-700 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!stories.length) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        لا توجد Stories حالياً 👀
      </div>
    );
  }

  return (
    <div className="flex gap-3 p-3 overflow-x-auto scrollbar-hide">
      {stories.map((story, index) => {
        const seen = isSeen(story.id);

        return (
          <button
            key={story.id}
            onClick={() => handleOpen(index, story)}
            className="flex flex-col items-center min-w-[70px] active:scale-95 transition"
          >
            {/* ✅ دائرة الستوري مع transition duration-300 */}
            <div
              className={`w-14 h-14 rounded-full p-[2px] transition duration-300 ${
                seen
                  ? "bg-gray-600"
                  : "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
              }`}
            >
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-white font-bold overflow-hidden">
                {story.imageUrl ? (
                  <img
                    src={story.imageUrl}
                    className="w-full h-full object-cover"
                    alt="story"
                  />
                ) : (
                  story.authorName?.[0]?.toUpperCase()
                )}
              </div>
            </div>

            {/* الاسم */}
            <p className="text-xs text-white mt-1 truncate w-full text-center">
              {story.authorName}
            </p>
          </button>
        );
      })}
    </div>
  );
}