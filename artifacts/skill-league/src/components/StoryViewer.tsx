// src/components/StoryViewer.tsx

import { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import StoryReactions from "@/components/social/StoryReactions";
import { viewStoryAsync, getStoryAsync, Story } from "@/lib/stories";
import { useGame } from "@/contexts/GameContext";
import { io } from "socket.io-client";

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onStoryEnd?: () => void;
}

interface Reply {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  likes?: Record<string, true>;
}

function getReactionBreakdown(reactions: Record<string, string> = {}) {
  const result: Record<string, number> = {
    like: 0,
    love: 0,
    haha: 0,
    wow: 0,
    angry: 0,
  };

  Object.values(reactions).forEach((r) => {
    if (result[r] !== undefined) {
      result[r]++;
    }
  });

  return result;
}

const isSameReplies = (a: Reply[], b: Reply[]) =>
  a.length === b.length && a.every((x, i) => x.id === b[i]?.id);

export default function StoryViewer({
  stories,
  initialIndex,
  onClose,
  onStoryEnd,
}: StoryViewerProps) {
  const { authUser } = useGame();

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [viewsCount, setViewsCount] = useState(0);

  const [localStory, setLocalStory] = useState<Story | null>(null);

  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState("");
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [sending, setSending] = useState(false);

  // ❌ تم حذف viewers state نهائياً

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef = useRef<any>(null);

  const story = localStory || stories[currentIndex];

  useEffect(() => {
    if (stories[currentIndex]) {
      setLocalStory(stories[currentIndex]);
    }
  }, [currentIndex, stories]);

  // ── جلب الردود ──
  useEffect(() => {
    if (!story?.id) return;

    const loadReplies = async () => {
      try {
        const data = await getStoryAsync(story.id);
        setReplies(data.replies || []);
        setLocalStory((prev) => prev ? { ...prev, replies: data.replies || [] } : prev);
      } catch (err) {
        console.error("Error loading replies:", err);
      }
    };

    loadReplies();
  }, [story?.id]);

  // ❌ تم حذف useEffect الخاص بجلب المشاهدين

  // ── WebSocket Realtime ──
  useEffect(() => {
    if (!story?.id) return;

    if (!socketRef.current) {
      socketRef.current = io("/stories", {
        transports: ["websocket"],
      });

      socketRef.current.on("disconnect", () => {
        console.log("🔌 socket disconnected");
      });

      socketRef.current.on("reconnect", () => {
        console.log("🔄 socket reconnected");
        if (story?.id) {
          socketRef.current.emit("join_story", story.id);
        }
      });
    }

    const socket = socketRef.current;
    socket.emit("join_story", story.id);

    const onNewReply = (data: any) => {
      if (data.storyId !== story.id) return;

      setReplies((prev) => {
        const incoming = data.replies || [];

        const map = new Map();
        [...prev, ...incoming].forEach((r) => {
          map.set(r.id, r);
        });

        const merged = Array.from(map.values());

        if (!isSameReplies(prev, merged)) {
          setLocalStory((localPrev) =>
            localPrev ? { ...localPrev, replies: merged } : localPrev
          );
        }

        return merged;
      });
    };

    const onReplyLiked = (data: any) => {
      if (data.storyId !== story.id) return;

      setReplies((prev) => {
        const updated = data.replies || [];

        const map = new Map();
        updated.forEach((r: any) => map.set(r.id, r));

        const merged = prev.map((r) => map.get(r.id) || r);

        if (!isSameReplies(prev, merged)) {
          setLocalStory((localPrev) =>
            localPrev ? { ...localPrev, replies: merged } : localPrev
          );
        }

        return merged;
      });
    };

    // ✅ تحديث المشاهدات فقط (بدون viewers)
    const onViewUpdate = (data: any) => {
      if (data.storyId !== story.id) return;
      setViewsCount(data.views ?? 0);
    };

    socket.on("new_reply", onNewReply);
    socket.on("reply_liked", onReplyLiked);
    socket.on("view_update", onViewUpdate);

    return () => {
      socket.off("new_reply", onNewReply);
      socket.off("reply_liked", onReplyLiked);
      socket.off("view_update", onViewUpdate);
      socket.emit("leave_story", story.id);
    };
  }, [story?.id]);

  // ── reset عند تغيير الستوري ──
  useEffect(() => {
    setProgress(0);
    setViewsCount(story?.views ?? 0);
    setReplies([]);
    setIsPaused(false);
  }, [story]);

  // ── تسجيل المشاهدة ──
  useEffect(() => {
    if (!story || !authUser?.uid) return;

    const key = `viewed_${story.id}_${authUser.uid}`;

    if (!sessionStorage.getItem(key)) {
      viewStoryAsync(story.id);
      sessionStorage.setItem(key, "true");
      // ✅ تحديث دقيق بعدد المشاهدات من الـ story
      setViewsCount(story.views + 1);
    }
  }, [story?.id, authUser?.uid]);

  // ── progress timer ──
  useEffect(() => {
    if (!story || isPaused) return;

    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          goNext();
          return 0;
        }
        return p + 0.6;
      });
    }, 50);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [story, isPaused]);

  // ── video reset ──
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [currentIndex]);

  const goNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      onStoryEnd?.();
      onClose();
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  // ── إرسال الرد (Optimistic) ──
  const handleSendReply = async () => {
    if (!story?.id) return;
    if (!replyText.trim() || !authUser?.uid || sending) return;

    const tempReply = {
      id: `temp_${Date.now()}`,
      userId: authUser.uid,
      userName:
        (authUser as any).displayName ||
        authUser.email?.split("@")[0] ||
        "مستخدم",
      text: replyText.trim(),
      timestamp: Date.now(),
      likes: {},
    };

    setReplies((prev) => [...prev, tempReply]);

    const originalText = replyText;

    setReplyText("");
    setShowReplyBox(false);
    setSending(true);

    try {
      const response = await fetch(
        `/api/stories/${story.id}/reply`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: authUser.uid,
            userName:
              (authUser as any).displayName ||
              authUser.email?.split("@")[0] ||
              "مستخدم",
            text: originalText,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("فشل إرسال الرد");
      }

    } catch (err) {
      console.error("❌ Reply Error:", err);

      setReplies((prev) =>
        prev.filter((r) => r.id !== tempReply.id)
      );
    } finally {
      setSending(false);
    }
  };

  // ── Like على الردود ──
  const handleLikeReply = async (replyId: string) => {
    if (!authUser?.uid || !localStory) return;

    setLocalStory((prev) => {
      if (!prev) return prev;

      const updatedReplies = prev.replies?.map((r) => {
        if (r.id !== replyId) return r;

        const likes = r.likes || {};
        if (likes[authUser.uid]) {
          delete likes[authUser.uid];
        } else {
          likes[authUser.uid] = true;
        }

        return { ...r, likes };
      });

      return {
        ...prev,
        replies: updatedReplies,
      };
    });

    setReplies((prev) =>
      prev.map((r) => {
        if (r.id !== replyId) return r;
        const likes = r.likes || {};
        if (likes[authUser.uid]) {
          delete likes[authUser.uid];
        } else {
          likes[authUser.uid] = true;
        }
        return { ...r, likes };
      })
    );

    try {
      await fetch(
        `/api/stories/${story.id}/replies/${replyId}/like`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: authUser.uid,
          }),
        }
      );
    } catch (err) {
      console.error("Like reply error:", err);
    }
  };

  if (!story) return null;

  const reactionCount = Object.keys(story.reactions ?? {}).length;
  const reactionBreakdown = getReactionBreakdown(story.reactions);
  const replyCount = replies.length;

  const isVideo = /\.(mp4|webm|ogg)$/i.test(story.imageUrl ?? "");

  return (
    <div
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* ── media ── */}
      {isVideo ? (
        <video
          ref={videoRef}
          src={story.imageUrl}
          autoPlay
          className="w-full h-full object-contain"
          onEnded={goNext}
        />
      ) : story.imageUrl ? (
        <img
          src={story.imageUrl}
          alt="story"
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white text-6xl">
          {story.emoji}
        </div>
      )}

      {/* ── click zones ── */}
      <div className="absolute inset-0 flex z-10">
        <div className="w-1/2" onClick={goPrev} />
        <div className="w-1/2" onClick={goNext} />
      </div>

      {/* ── progress ── */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-20">
        {stories.map((_, i) => (
          <div key={i} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all"
              style={{
                width:
                  i === currentIndex
                    ? `${progress}%`
                    : i < currentIndex
                    ? "100%"
                    : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* ── close ── */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-30 text-white bg-black/50 p-2 rounded-full"
      >
        <X className="w-6 h-6" />
      </button>

      {/* ── user info ── */}
      <div className="absolute top-12 left-4 z-30 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-600 p-0.5">
          <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center text-white font-bold">
            {story.authorName?.[0]?.toUpperCase()}
          </div>
        </div>

        <div>
          <p className="text-white font-medium">{story.authorName}</p>
          <p className="text-white/60 text-xs">
            {new Date(story.timestamp).toLocaleTimeString("ar", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* ── nav buttons ── */}
      {currentIndex > 0 && (
        <button
          onClick={goPrev}
          className="absolute left-2 top-1/2 z-30 bg-black/30 p-2 rounded-full text-white"
        >
          <ChevronLeft />
        </button>
      )}

      {currentIndex < stories.length - 1 && (
        <button
          onClick={goNext}
          className="absolute right-2 top-1/2 z-30 bg-black/30 p-2 rounded-full text-white"
        >
          <ChevronRight />
        </button>
      )}

      {/* ── bottom ── */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-30">
        {/* ── عرض الردود ── */}
        {replies.length > 0 && (
          <div className="max-h-40 overflow-y-auto mb-3 space-y-2 px-1">
            {replies.slice(-10).reverse().map((reply) => {
              const likeCount = Object.keys(reply.likes ?? {}).length;
              const isLiked = !!reply.likes?.[authUser?.uid || ""];

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
                    onClick={() => handleLikeReply(reply.id)}
                    className={`text-xs flex items-center gap-1 transition ${
                      isLiked ? "text-red-400" : "text-gray-400 hover:text-red-400"
                    }`}
                  >
                    ❤️ {likeCount}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── إحصائيات سريعة ── */}
        <div className="flex justify-between text-white/80 text-sm mb-2">
          <div className="flex gap-2 text-xs bg-black/40 px-2 py-1 rounded-full">
            <span>👍 {reactionBreakdown.like}</span>
            <span>❤️ {reactionBreakdown.love}</span>
            <span>😂 {reactionBreakdown.haha}</span>
            <span>😮 {reactionBreakdown.wow}</span>
            <span>😡 {reactionBreakdown.angry}</span>
          </div>

          <button
            onClick={() => setShowReplyBox(true)}
            className="flex items-center gap-1 hover:scale-110 transition"
          >
            💬 <span>{replyCount}</span>
          </button>

          {/* ✅ عداد المشاهدات المحسّن مع animate-pulse */}
          <div className="flex items-center gap-1 text-xs text-white/70 bg-black/30 px-2 py-1 rounded-full">
            👀 <span className="animate-pulse">{viewsCount}</span>
          </div>
        </div>

        {/* ── مكون التفاعلات ── */}
        <StoryReactions
          storyId={story.id}
          initialLikes={reactionCount}
          initialReactions={story.reactions as any}
          onLikeChange={() => {}}
          onReply={() => setShowReplyBox(true)}
        />

        {/* ── صندوق الرد ── */}
        {showReplyBox && (
          <div className="absolute bottom-20 left-4 right-4 bg-black/80 p-3 rounded-lg z-40">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="اكتب رد..."
              className="w-full p-2 rounded bg-gray-800 text-white outline-none"
              autoFocus
              disabled={sending}
            />

            <div className="flex justify-between mt-2">
              <button
                onClick={() => {
                  setReplyText("");
                  setShowReplyBox(false);
                }}
                className="text-gray-400 hover:text-white transition"
                disabled={sending}
              >
                إلغاء
              </button>

              <button
                onClick={handleSendReply}
                className="text-blue-400 hover:text-blue-300 transition disabled:opacity-50"
                disabled={!replyText.trim() || sending}
              >
                {sending ? "جاري الإرسال..." : "إرسال"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}