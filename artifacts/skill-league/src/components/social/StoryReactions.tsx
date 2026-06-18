// src/components/Story/StoryReactions.tsx

import { useState, useEffect, useCallback, useRef } from "react";
import { Heart, Laugh, ThumbsUp, Angry, AlertCircle, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/GameContext";

type ReactionType = "like" | "love" | "haha" | "wow" | "angry";

interface Props {
  storyId: string;
  initialLikes: number;
  initialReactions?: Record<string, ReactionType>;
  onLikeChange?: (count: number) => void;
  onReply?: () => void;
}

const reactions: { type: ReactionType; icon: any; color: string }[] = [
  { type: "like", icon: ThumbsUp, color: "text-blue-400" },
  { type: "love", icon: Heart, color: "text-red-400" },
  { type: "haha", icon: Laugh, color: "text-yellow-400" },
  { type: "wow", icon: AlertCircle, color: "text-purple-400" },
  { type: "angry", icon: Angry, color: "text-orange-400" },
];

export default function StoryReactions({
  storyId,
  initialLikes,
  initialReactions = {},
  onLikeChange,
  onReply,
}: Props) {
  const { authUser } = useAuth();

  const [count, setCount] = useState(initialLikes);
  const [selected, setSelected] = useState<ReactionType | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedRef = useRef<ReactionType | null>(null);

  // ── تحديث التفاعل الحالي من props ──
  useEffect(() => {
    if (!authUser?.uid) return;
    const userReaction = initialReactions?.[authUser.uid] || null;
    setSelected(userReaction as ReactionType | null);
    selectedRef.current = userReaction as ReactionType | null;
  }, [authUser?.uid, initialReactions]);

  // ── تحديث العدد من props ──
  useEffect(() => {
    setCount(initialLikes);
  }, [initialLikes]);

  // ── التفاعل ──
  const handleReact = useCallback(async (type: ReactionType) => {
    if (!authUser?.uid || loading) return;

    setLoading(true);

    const current = selectedRef.current;
    const isSame = current === type;

    try {
      const res = await fetch(`/api/stories/${storyId}/react`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authUser.uid,
          reaction: isSame ? undefined : type,
        }),
      });

      if (!res.ok) throw new Error("React failed");

      const data = await res.json();

      const updatedReactions = data.story?.reactions || {};
      const newCount = Object.keys(updatedReactions).length;

      const newSelected = updatedReactions[authUser.uid] || null;
      setSelected(newSelected);
      selectedRef.current = newSelected;
      setCount(newCount);

      onLikeChange?.(newCount);
    } catch (err) {
      console.error("Reaction error:", err);
    } finally {
      setLoading(false);
    }
  }, [authUser?.uid, loading, storyId, onLikeChange]);

  return (
    <div className="flex gap-3 items-center mt-2">
      {reactions.map((r) => {
        const Icon = r.icon;
        const isActive = selected === r.type;

        return (
          <button
            key={r.type}
            onClick={() => handleReact(r.type)}
            disabled={loading}
            className={`transition hover:scale-125 active:scale-90 disabled:opacity-50 ${
              isActive ? r.color : "text-gray-400 hover:text-white"
            }`}
            title={r.type}
          >
            <Icon size={20} className={isActive ? "fill-current" : ""} />
          </button>
        );
      })}

      {onReply && (
        <button
          onClick={onReply}
          className="flex items-center gap-1 text-gray-400 hover:text-white transition hover:scale-110 text-sm"
        >
          <MessageCircle size={18} />
          <span>رد</span>
        </button>
      )}

      {count > 0 && (
        <span className="text-xs text-gray-400 mr-1">{count}</span>
      )}
    </div>
  );
}