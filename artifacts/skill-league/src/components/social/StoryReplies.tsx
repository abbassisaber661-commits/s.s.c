// src/components/Story/StoryReplies.tsx

import { memo } from "react";

export interface Reply {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  likes?: Record<string, true>;
}

interface StoryRepliesProps {
  replies: Reply[];
  currentUserId?: string;
  onLikeReply: (replyId: string) => void;
}

function StoryReplies({
  replies,
  currentUserId,
  onLikeReply,
}: StoryRepliesProps) {
  // إذا لم توجد ردود، نعرض رسالة بدلاً من لا شيء
  if (replies.length === 0) {
    return (
      <p className="text-gray-500 text-xs text-center py-2">
        لا توجد ردود حتى الآن
      </p>
    );
  }

  return (
    <div className="max-h-48 overflow-y-auto mb-3 space-y-2 px-1">
      {replies
        .slice(-10)
        .reverse()
        .map((reply) => {
          const likeCount = Object.keys(reply.likes ?? {}).length;
          const isLiked = !!reply.likes?.[currentUserId || ""];

          return (
            <div
              key={reply.id}
              className="bg-black/40 rounded-lg p-2 text-white text-sm"
            >
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span className="font-medium">{reply.userName}</span>
                <span>
                  {new Date(reply.timestamp).toLocaleTimeString("ar", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <p className="text-white/90 mb-1">{reply.text}</p>

              <button
                onClick={() => onLikeReply(reply.id)}
                className={`text-xs flex items-center gap-1 transition ${
                  isLiked
                    ? "text-red-400"
                    : "text-gray-400 hover:text-red-400"
                }`}
              >
                ❤️ {likeCount}
              </button>
            </div>
          );
        })}
    </div>
  );
}

// ✅ تحسين الأداء: منع إعادة الرندر غير الضرورية
export default memo(StoryReplies);