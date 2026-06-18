import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  memo,
  useLayoutEffect,
  useReducer,
} from "react";
import { useGame } from "@/contexts/GameContext";
import { useT } from "@/lib/i18n";
import { Link } from "wouter";
import {
  Bell,
  User,
  MessageCircle,
  Share2,
  Send,
  Heart,
  ThumbsUp,
  Users,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { useRealtime } from "@/contexts/RealtimeContext";
// ChatContext removed — not available in this build
import { Button } from "@/components/ui/button";
import { getDailyChallenges, todayString } from "@/lib/challenges";
import { getWeeklyMissions, getWeekString } from "@/lib/weekly-challenges";
import { getLevelTitle, xpProgressInLevel } from "@/lib/xp";
import { getNotifications, unreadCount } from "@/lib/messages";
import { motion } from "framer-motion";
import { getCurrentSeason, getSeasonTier } from "@/lib/seasons";
import StoryFeed from "@/components/StoryFeed";
import CreatePost from "@/components/social/CreatePost";
import { toast } from "sonner";

/* ─── Types ─── */

type ReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry";

interface Comment {
  id: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
  parentId?: string | null;
  likesCount: number;
  userLiked: boolean;
  edited?: boolean;
}

interface Post {
  id: string;
  userId: string;
  username: string;
  content: string;
  imageUrl?: string;
  reactions: Record<ReactionType, number>;
  userReaction: ReactionType | null;
  createdAt: string;
  tags?: string[];
  version: number;
  score?: number;
}

interface User {
  uid: string;
  username: string;
  followers: string[];
  following: string[];
  followersCount: number;
  followingCount: number;
}

interface SocialStore {
  postsById: Record<string, Post>;
  postOrder: string[];
  commentsByPost: Record<string, Comment[]>;
  commentToPostMap: Record<string, string>;
}

/* ─── Reducer ─── */

type StoreAction =
  | { type: "ADD_POST"; payload: Post }
  | { type: "ADD_POSTS"; payload: Post[] }
  | { type: "UPDATE_POST"; payload: { postId: string; updater: (post: Post) => Post } }
  | { type: "ADD_COMMENT"; payload: { postId: string; comment: Comment } };

function storeReducer(state: SocialStore, action: StoreAction): SocialStore {
  switch (action.type) {
    case "ADD_POST": {
      const post = action.payload;
      if (state.postsById[post.id]) return state;

      return {
        ...state,
        postsById: { ...state.postsById, [post.id]: post },
        postOrder: [post.id, ...state.postOrder],
      };
    }

    case "ADD_POSTS": {
      const postsById = { ...state.postsById };
      const order = [...state.postOrder];

      action.payload.forEach((p) => {
        if (!postsById[p.id]) {
          postsById[p.id] = p;
          order.push(p.id);
        }
      });

      return { ...state, postsById, postOrder: order };
    }

    case "UPDATE_POST": {
      const { postId, updater } = action.payload;
      const post = state.postsById[postId];
      if (!post) return state;

      return {
        ...state,
        postsById: {
          ...state.postsById,
          [postId]: updater(post),
        },
      };
    }

    case "ADD_COMMENT": {
      const { postId, comment } = action.payload;

      return {
        ...state,
        commentsByPost: {
          ...state.commentsByPost,
          [postId]: [...(state.commentsByPost[postId] || []), comment],
        },
        commentToPostMap: {
          ...state.commentToPostMap,
          [comment.id]: postId,
        },
      };
    }

    default:
      return state;
  }
}

/* ─── Helpers ─── */

const safeName = (name?: string) =>
  name?.[0]?.toUpperCase() || "U";

/* ─── Comment Thread ─── */

function groupComments(comments: Comment[]) {
  const map: Record<string, Comment[]> = {};
  const roots: Comment[] = [];

  for (const c of comments) {
    if (!c.parentId) roots.push(c);
    else {
      map[c.parentId] = [...(map[c.parentId] || []), c];
    }
  }

  const build = (c: Comment): any => ({
    ...c,
    replies: (map[c.id] || []).map(build),
  });

  return roots.map(build);
}

/* ─── Follow Button ─── */

const FollowButton = memo(({ targetUserId, targetUsername, isFollowing, onFollowChange }: any) => {
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);

    const next = !isFollowing;
    onFollowChange(targetUserId, next);

    try {
      await fetch(`/api/users/${targetUserId}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ follow: next }),
      });

      toast.success(next ? `متابعة ${targetUsername}` : `إلغاء المتابعة`);
    } catch {
      toast.error("خطأ");
      onFollowChange(targetUserId, !next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={toggle} disabled={loading}>
      {isFollowing ? "متابَع" : "متابعة"}
    </button>
  );
});

/* ─── Comment Item ─── */

const CommentItem = memo(({ comment, depth = 0, onLike }: any) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ marginLeft: depth * 12 }}>
      <div>
        <b>{comment.username}</b>
        <p>{comment.text}</p>

        <button onClick={() => onLike(comment.id)}>
          👍 {comment.likesCount}
        </button>

        {comment.replies?.length > 0 && (
          <button onClick={() => setCollapsed((v) => !v)}>
            {collapsed ? "عرض" : "إخفاء"}
          </button>
        )}
      </div>

      {!collapsed &&
        comment.replies?.map((r: Comment) => (
          <CommentItem key={r.id} comment={r} depth={depth + 1} onLike={onLike} />
        ))}
    </div>
  );
});

/* ─── Post Item ─── */

const PostItem = memo(({ post, comments, onReaction, onComment }: any) => {
  const grouped = useMemo(() => groupComments(comments), [comments]);

  return (
    <div>
      <h4>{post.username}</h4>
      <p>{post.content}</p>

      <button onClick={() => onReaction(post.id, "like")}>
        👍 {(Object.values(post.reactions || {}).reduce((a: number, b: unknown) => a + (b as number), 0) as number)}
      </button>

      {grouped.map((c: Comment) => (
        <CommentItem key={c.id} comment={c} onLike={() => {}} />
      ))}

      <input onKeyDown={(e) => e.key === "Enter" && onComment(post.id)} />
    </div>
  );
});

/* ─── MAIN ─── */

export default function Home() {
  const [store, dispatch] = useReducer(storeReducer, {
    postsById: {},
    postOrder: [],
    commentsByPost: {},
    commentToPostMap: {},
  });

  const posts = store.postOrder.map((id) => store.postsById[id]);

  return (
    <div>
      {posts.map((p) => (
        <PostItem
          key={p.id}
          post={p}
          comments={store.commentsByPost[p.id] || []}
          onReaction={() => {}}
          onComment={() => {}}
        />
      ))}
    </div>
  );
}