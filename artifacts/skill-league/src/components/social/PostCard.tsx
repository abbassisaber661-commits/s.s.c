import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Bookmark, BookmarkCheck, Send, Eye, Repeat2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { type CommunityPost, getPostAge } from "@/lib/community";
import { type Comment, getCommentAge } from "@/lib/comments";
import { toggleSave, isSaved } from "@/lib/savedPosts";
import { getSocialLeague } from "@/lib/socialLeague";
import { getFriendStatus, sendFriendRequest, unfriend, type FriendStatus } from "@/lib/friends";
import { getPostMeta, incrementView, incrementShare } from "@/lib/postMeta";
import Avatar from "@/components/Avatar";
import { api } from "@/lib/apiClient";
import { getSocket } from "@/lib/socket";

interface PostCardProps {
  post: CommunityPost;
  commentCount: number;
  currentUser: string;
  currentLevel: number;
  currentPlayerId?: string;
  onLikeChange: (postId: string, liked: boolean) => void;
  onCommentCountChange: (postId: string, delta: number) => void;
  index: number;
}

// ==========================
// RichContent مع memo
// ==========================
const RichContent = memo(({ content, onHashtag }: { content: string; onHashtag: (tag: string) => void }) => {
  const parts = content.split(/(#[\w\u0600-\u06FF]+|@[\w]+)/g);
  return (
    <p className="text-sm leading-relaxed text-gray-900 dark:text-white">
      {parts.map((part, i) => {
        if (part.startsWith("#")) {
          return (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); onHashtag(part); }}
              className="font-bold hover:underline transition-colors text-blue-600 dark:text-blue-400"
            >
              {part}
            </button>
          );
        }
        if (part.startsWith("@")) {
          return (
            <span key={i} className="font-semibold text-purple-600 dark:text-purple-400">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
});
RichContent.displayName = "RichContent";

// ==========================
// InlineFriendBtn مع memo ومعالجة الأخطاء
// ==========================
const InlineFriendBtn = memo(({ me, them }: { me: string; them: string }) => {
  const [status, setStatus] = useState<FriendStatus>(() => getFriendStatus(me, them));
  if (!me || me === them) return null;

  async function handle() {
    if (status === "none") {
      try {
        await sendFriendRequest(me, them);
        setStatus("pending_sent");
        toast.success("تم إرسال طلب الصداقة!");
      } catch {
        toast.error("فشل إرسال طلب الصداقة");
      }
    } else if (status === "friends") {
      try {
        await unfriend(me, them);
        setStatus("none");
        toast.success("تم حذف الصديق");
      } catch {
        toast.error("فشل حذف الصديق");
      }
    }
  }

  const config = {
    none:         { label: "+ إضافة صديق", cls: "text-white font-bold" },
    pending_sent: { label: "⏳ قيد الانتظار", cls: "text-white font-bold opacity-70 cursor-default" },
    friends:      { label: "✔ أصدقاء", cls: "text-white font-bold" },
  }[status];

  const bgColor = status === "friends" ? "#42B72A" : status === "pending_sent" ? "#65676B" : "#1877F2";

  return (
    <button
      onClick={status === "pending_sent" ? undefined : handle}
      className="text-[10px] px-2.5 py-1 rounded-md transition-all active:scale-90"
      style={{ background: bgColor }}
    >
      <span className={config.cls}>{config.label}</span>
    </button>
  );
});
InlineFriendBtn.displayName = "InlineFriendBtn";

// ==========================
// PostCard الرئيسي
// ==========================
export default function PostCard({
  post,
  commentCount,
  currentUser,
  currentLevel,
  currentPlayerId,
  onLikeChange,
  onCommentCountChange,
  index,
}: PostCardProps) {
  const [, navigate] = useLocation();
  const postRef = useRef<HTMLDivElement>(null);
  const hasViewed = useRef(false);
  const socket = getSocket();

  // حالات المكون
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [saved, setSaved] = useState(() => isSaved(post.id));
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [views, setViews] = useState(() => post.views ?? getPostMeta(post.id).views);
  const [shares, setShares] = useState(() => getPostMeta(post.id).shares);
  const [submittingComment, setSubmittingComment] = useState(false);

  // ==========================
  // مزامنة حالات الإعجاب عند تحديث post
  // ==========================
  useEffect(() => {
    setLiked(post.likedByMe);
    setLikeCount(post.likes);
  }, [post.likedByMe, post.likes]);

  // ==========================
  // دالة Hashtag مستقرة (useCallback)
  // ==========================
  const handleHashtag = useCallback(
    (tag: string) => {
      navigate(`/hashtag/${encodeURIComponent(tag.replace(/^#/, ""))}`);
    },
    [navigate]
  );

  // ==========================
  // IntersectionObserver مع دعم الزوار
  // ==========================
  useEffect(() => {
    if (!postRef.current || hasViewed.current) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !hasViewed.current) {
            hasViewed.current = true;
            observer.unobserve(entry.target);

            try {
              if (currentPlayerId) {
                const result = await api.community.view(post.id, currentPlayerId);
                const viewCount = result?.views ?? result?.data?.views ?? 0;
                if (viewCount > 0) setViews(viewCount);
                else {
                  const meta = incrementView(post.id);
                  setViews(meta.views);
                }
              } else {
                const meta = incrementView(post.id);
                setViews(meta.views);
              }
            } catch {
              const meta = incrementView(post.id);
              setViews(meta.views);
            }
          }
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(postRef.current);
    return () => observer.disconnect();
  }, [post.id, currentPlayerId]);

  // ==========================
  // مستمع Realtime للتعليقات
  // ==========================
  useEffect(() => {
    const handleNewComment = (data: any) => {
      if (data.postId !== post.id) return;

      setComments((prev) => {
        if (data.comment.id) {
          const exists = prev.some((c) => c.id === data.comment.id);
          if (exists) return prev;
        } else {
          const exists = prev.some(
            (c) =>
              c.authorName === data.comment.username &&
              c.content === data.comment.content
          );
          if (exists) return prev;
        }

        const newComment: Comment = {
          id: data.comment.id || `realtime_${Date.now()}`,
          postId: post.id,
          authorName: data.comment.username,
          authorLevel: data.comment.level || 1,
          content: data.comment.content,
          timestamp: data.comment.timestamp || Date.now(),
        };

        if (data.comment.username !== currentUser) {
          onCommentCountChange(post.id, 1);
        }

        return [...prev, newComment];
      });
    };

    socket.on("community:comment", handleNewComment);
    return () => {
      socket.off("community:comment", handleNewComment);
    };
  }, [post.id, currentUser, onCommentCountChange, socket]);

  const league = getSocialLeague(post.authorLevel);

  const goToProfile = useCallback(() => {
    if (post.authorName === currentUser) {
      navigate("/profile");
    } else {
      navigate(`/user/${encodeURIComponent(post.authorName)}`);
    }
  }, [post.authorName, currentUser, navigate]);

  // ==========================
  // معالجة اللايك
  // ==========================
  async function handleHeart() {
    if (!currentPlayerId) {
      toast.error("يرجى تسجيل الدخول للإعجاب");
      return;
    }

    const wasLiked = liked;
    const prevCount = likeCount;
    const nowLiked = !wasLiked;

    setLiked(nowLiked);
    setLikeCount(nowLiked ? prevCount + 1 : Math.max(0, prevCount - 1));
    onLikeChange(post.id, nowLiked);

    try {
      const result = await api.community.like(post.id, currentPlayerId);
      socket.emit("community:like", {
        postId: post.id,
        playerId: currentPlayerId,
        liked: result.liked,
      });
    } catch {
      setLiked(wasLiked);
      setLikeCount(prevCount);
      onLikeChange(post.id, wasLiked);
      toast.error("فشل الإعجاب بالمنشور");
    }
  }

  function handleSave() {
    setSaved(toggleSave(post.id));
  }

  // ==========================
  // تحميل التعليقات مع الدمج
  // ==========================
  async function handleExpand() {
    if (!expanded) {
      try {
        const apiComments = await api.community.comments(post.id);
        const mapped: Comment[] = (apiComments as any[]).map((c) => ({
          id: c.id,
          postId: c.postId,
          authorName: c.username ?? c.authorName ?? "Player",
          authorLevel: c.level ?? 1,
          content: c.content,
          timestamp: c.createdAt ? new Date(c.createdAt).getTime() : Date.now(),
        }));

        setComments((prev) => {
          const map = new Map<string, Comment>();
          [...prev, ...mapped].forEach((c) => {
            map.set(c.id, c);
          });
          return Array.from(map.values());
        });
      } catch {
        console.error("فشل تحميل التعليقات");
      }
    }
    setExpanded((v) => !v);
    setDraft("");
  }

  // ==========================
  // مشاركة المنشور
  // ==========================
  async function handleShare() {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "SkillLeague",
          text: post.content,
          url: postUrl,
        });
      } else {
        await navigator.clipboard.writeText(postUrl);
        toast.success("تم نسخ الرابط!");
      }
      const meta = incrementShare(post.id);
      setShares(meta.shares);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("فشل المشاركة", error);
        toast.error("فشل مشاركة المنشور");
      }
    }
  }

  // ==========================
  // إضافة تعليق
  // ==========================
  async function handleAddComment() {
    if (!currentPlayerId) {
      toast.error("يرجى تسجيل الدخول للتعليق");
      return;
    }
    if (draft.trim().length < 2 || submittingComment) return;

    const text = draft.trim();
    setSubmittingComment(true);

    const tempComment: Comment = {
      id: `cmt_${Date.now()}`,
      postId: post.id,
      authorName: currentUser,
      authorLevel: currentLevel,
      content: text,
      timestamp: Date.now(),
    };

    setComments((prev) => [...prev, tempComment]);
    setDraft("");
    onCommentCountChange(post.id, 1);

    try {
      const created = (await api.community.comment(post.id, {
        authorId: currentPlayerId,
        username: currentUser,
        content: text,
      })) as any;

      setComments((prev) =>
        prev.map((c) =>
          c.id === tempComment.id
            ? {
                id: created.id,
                postId: post.id,
                authorName: currentUser,
                authorLevel: currentLevel,
                content: text,
                timestamp: new Date(created.createdAt).getTime(),
              }
            : c
        )
      );

      socket.emit("community:comment", {
        postId: post.id,
        comment: {
          id: created.id,
          username: currentUser,
          level: currentLevel,
          content: text,
          timestamp: new Date(created.createdAt).getTime(),
        },
      });
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== tempComment.id));
      onCommentCountChange(post.id, -1);
      toast.error("فشل نشر التعليق");
    } finally {
      setSubmittingComment(false);
    }
  }

  // ==========================
  // التصيير (JSX)
  // ==========================
  return (
    <motion.div
      ref={postRef}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3) }}
      className={cn(
        "rounded-xl overflow-hidden bg-white dark:bg-gray-900 border shadow-sm",
        post.boosted 
          ? "border-amber-400 dark:border-amber-600" 
          : "border-gray-200 dark:border-gray-700"
      )}
    >
      <div className="p-4 space-y-3">
        {post.boosted && (
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
            🔥 منشور مدعوم
          </div>
        )}

        {/* ── صف المؤلف ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={goToProfile}
              className="flex items-center gap-2 text-left active:scale-95 transition-transform"
            >
              <Avatar username={post.authorName} size="sm" shape="rounded-xl" />
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-sm font-semibold truncate dark:text-white">
                  {post.authorName}
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {post.time ?? getPostAge(post.timestamp)}
                </span>
              </div>
            </button>

            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap"
              style={{
                color: league.color,
                borderColor: league.color + "40",
                background: league.color + "15",
              }}
            >
              {league.icon} {league.name}
            </span>

            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
              Lv.{post.authorLevel}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <InlineFriendBtn me={currentUser} them={post.authorName} />
            <button
              onClick={handleSave}
              className="p-1.5 rounded-lg transition-all active:scale-90"
              style={
                saved
                  ? { color: "#1877F2", background: "#E7F0FF" }
                  : { color: "#65676B" }
              }
            >
              {saved ? (
                <BookmarkCheck className="w-4 h-4" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* ── المحتوى ── */}
        <RichContent content={post.content} onHashtag={handleHashtag} />

        {/* ── الصورة ── */}
        {post.imageUrl && (
          <div className="relative mt-2">
            <img
              src={post.imageUrl}
              alt={post.content || "صورة المنشور"}
              className="w-full rounded-xl object-contain max-h-[600px] bg-black/5"
            />
            <div className="absolute bottom-2 right-2">
              <InlineFriendBtn me={currentUser} them={post.authorName} />
            </div>
          </div>
        )}

        {/* ── أزرار التفاعل ── */}
        {!post.videoUrl && (
          <div className="flex items-center gap-1 pt-2 border-t border-gray-200 dark:border-gray-700">
            <motion.button
              onClick={handleHeart}
              whileTap={{ scale: 0.75 }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-colors group",
                liked && "bg-rose-50 dark:bg-rose-950/30"
              )}
            >
              <Heart
                className={cn(
                  "w-5 h-5 transition-colors",
                  liked
                    ? "fill-rose-500 stroke-rose-500"
                    : "stroke-gray-600 dark:stroke-gray-400 group-hover:stroke-rose-400"
                )}
              />
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums transition-colors",
                  liked
                    ? "text-rose-500"
                    : "text-gray-600 dark:text-gray-400 group-hover:text-rose-400"
                )}
              >
                {likeCount > 0 ? likeCount : "إعجاب"}
              </span>
            </motion.button>

            <button
              onClick={handleExpand}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-colors",
                expanded 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              )}
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-semibold">
                {commentCount > 0 ? commentCount : "تعليق"}
              </span>
            </button>

            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <Repeat2 className="w-5 h-5" />
              <span className="text-sm font-semibold">
                {shares > 0 ? shares : "مشاركة"}
              </span>
            </button>

            <div className="flex items-center gap-1 px-2 text-gray-400 dark:text-gray-600">
              <Eye className="w-4 h-4" />
              <span className="text-xs tabular-nums">
                {views > 0 ? views : ""}
              </span>
            </div>
          </div>
        )}

        {/* ── التعليقات ── */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 rounded-b-xl"
            >
              <div className="p-3 space-y-2.5">
                {comments.length === 0 && (
                  <p className="text-xs text-center py-1 text-gray-500 dark:text-gray-400">
                    لا توجد تعليقات بعد — كن الأول!
                  </p>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2">
                    <Avatar username={c.authorName} size="xs" shape="rounded-lg" />
                    <div className="flex-1 min-w-0 rounded-xl px-3 py-2 bg-white dark:bg-gray-900">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {c.authorName}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                          Lv.{c.authorLevel}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          {getCommentAge(c.timestamp)}
                        </span>
                      </div>
                      <RichContent content={c.content} onHashtag={handleHashtag} />
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddComment();
                    }}
                    placeholder="اكتب تعليقاً…"
                    maxLength={200}
                    className="flex-1 rounded-full px-4 py-2 text-xs focus:outline-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={draft.trim().length < 2 || submittingComment}
                    className="px-4 py-2 rounded-full text-xs font-bold disabled:opacity-40 active:scale-95 transition-transform text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}