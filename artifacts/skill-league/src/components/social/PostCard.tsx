import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { cn } from "@/lib/utils";
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

// ==================================================
// Types
// ==================================================
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

// ==================================================
// RichContent (memo)
// ==================================================
const RichContent = memo(({ content, onHashtag }: any) => {
  const parts = content.split(/(#[\w\u0600-\u06FF]+|@[\w]+)/g);

  return (
    <p className="text-sm leading-relaxed text-gray-900 dark:text-white">
      {parts.map((part: string, i: number) => {
        if (part.startsWith("#")) {
          return (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onHashtag(part);
              }}
              className="font-bold text-blue-600"
            >
              {part}
            </button>
          );
        }

        if (part.startsWith("@")) {
          return (
            <span key={i} className="font-semibold text-purple-600">
              {part}
            </span>
          );
        }

        return <span key={i}>{part}</span>;
      })}
    </p>
  );
});

// ==================================================
// Friend Button (memo)
// ==================================================
const FriendButton = memo(({ me, them }: any) => {
  const [status, setStatus] = useState<FriendStatus>(() => getFriendStatus(me, them));

  if (!me || me === them) return null;

  const handle = async () => {
    try {
      if (status === "none") {
        await sendFriendRequest(me, them);
        setStatus("pending_sent");
        toast.success("تم إرسال طلب الصداقة");
      } else if (status === "friends") {
        await unfriend(me, them);
        setStatus("none");
        toast.success("تم حذف الصديق");
      }
    } catch {
      toast.error("حدث خطأ");
    }
  };

  const label =
    status === "none"
      ? "+ صديق"
      : status === "pending_sent"
      ? "⏳"
      : "✔";

  return (
    <button onClick={handle} className="text-xs px-2 py-1 rounded bg-blue-600 text-white">
      {label}
    </button>
  );
});

// ==================================================
// Main Component
// ==================================================
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
  const socket = getSocket();

  // ================= STATE =================
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [saved, setSaved] = useState(() => isSaved(post.id));
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [views, setViews] = useState(() => getPostMeta(post.id).views);
  const [shares, setShares] = useState(() => getPostMeta(post.id).shares);

  const hasViewed = useRef(false);
  const usernameRef = useRef(currentUser);

  // ================= SYNC =================
  useEffect(() => {
    usernameRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    setLiked(post.likedByMe);
    setLikeCount(post.likes);
  }, [post.likedByMe, post.likes]);

  // ================= HASHTAG =================
  const goHashtag = useCallback(
    (tag: string) => {
      navigate(`/hashtag/${tag.replace("#", "")}`);
    },
    [navigate]
  );

  // ================= VIEW TRACK =================
  useEffect(() => {
    if (!postRef.current || hasViewed.current) return;

    const obs = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting) return;

      hasViewed.current = true;
      obs.disconnect();

      const meta = incrementView(post.id);
      setViews(meta.views);
    });

    obs.observe(postRef.current);
    return () => obs.disconnect();
  }, [post.id]);

  // ================= LIKE =================
  const handleLike = useCallback(async () => {
    if (!currentPlayerId) {
      toast.error("سجل الدخول");
      return;
    }

    const newLiked = !liked;

    setLiked(newLiked);
    setLikeCount((p) => (newLiked ? p + 1 : Math.max(0, p - 1)));
    onLikeChange(post.id, newLiked);

    try {
      await api.community.like(post.id, currentPlayerId);
      socket.emit("community:like", { postId: post.id, liked: newLiked });
    } catch {
      toast.error("فشل اللايك");
    }
  }, [liked, currentPlayerId]);

  // ================= SHARE =================
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/post/${post.id}`;

    if (navigator.share) {
      await navigator.share({ title: "Post", url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Copied");
    }

    const meta = incrementShare(post.id);
    setShares(meta.shares);
  }, [post.id]);

  // ================= COMMENT =================
  const handleAddComment = useCallback(async () => {
    if (!draft.trim()) return;

    const text = draft;
    setDraft("");

    const temp: Comment = {
      id: `tmp_${Date.now()}`,
      postId: post.id,
      authorName: currentUser,
      authorLevel: currentLevel,
      content: text,
      timestamp: Date.now(),
    };

    setComments((p) => [...p, temp]);
    onCommentCountChange(post.id, 1);

    try {
      const res = await api.community.comment(post.id, {
        authorId: currentPlayerId,
        username: currentUser,
        content: text,
      });

      setComments((prev) =>
        prev.map((c) =>
          c.id === temp.id
            ? { ...c, id: res.id, timestamp: Date.now() }
            : c
        )
      );

      socket.emit("community:comment", {
        postId: post.id,
        comment: { username: currentUser, content: text },
      });
    } catch {
      toast.error("فشل التعليق");
    }
  }, [draft]);

  // ================= RENDER =================
  const league = getSocialLeague(post.authorLevel);

  return (
    <motion.div
      ref={postRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border p-4 space-y-3"
    >
      {/* HEADER */}
      <div className="flex justify-between">
        <div className="flex gap-2">
          <Avatar username={post.authorName} />
          <div>
            <p className="font-bold">{post.authorName}</p>
            <p className="text-xs text-gray-500">{getPostAge(post.timestamp)}</p>
          </div>
        </div>

        <FriendButton me={currentUser} them={post.authorName} />
      </div>

      {/* CONTENT */}
      <RichContent content={post.content} onHashtag={goHashtag} />

      {/* ACTIONS */}
      <div className="flex justify-between text-sm">
        <button onClick={handleLike}>❤️ {likeCount}</button>
        <button onClick={() => setExpanded((v) => !v)}>
          💬 {commentCount}
        </button>
        <button onClick={handleShare}>🔁 {shares}</button>
        <span>👁 {views}</span>
      </div>

      {/* COMMENTS */}
      <AnimatePresence>
        {expanded && (
          <div className="space-y-2">
            {comments.map((c) => (
              <div key={c.id} className="text-xs">
                <b>{c.authorName}</b>: {c.content}
              </div>
            ))}

            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="flex-1 border px-2 py-1 text-xs"
              />
              <button onClick={handleAddComment}>Send</button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}