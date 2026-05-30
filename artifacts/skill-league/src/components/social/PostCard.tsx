import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Bookmark, BookmarkCheck, ChevronDown, ChevronUp, Send } from "lucide-react";
import { type CommunityPost, getPostAge } from "@/lib/community";
import {
  type PostReactions, type ReactionType,
  toggleReaction, getComments, addComment,
  type Comment, getCommentAge,
} from "@/lib/comments";
import { toggleSave, isSaved } from "@/lib/savedPosts";

const HUB_REACTIONS: ReactionType[] = ["👍", "🔥", "😂", "👏"] as ReactionType[];

interface PostCardProps {
  post: CommunityPost;
  reactions: PostReactions;
  commentCount: number;
  currentUser: string;
  currentLevel: number;
  onReactionChange: (postId: string, updated: PostReactions) => void;
  onCommentCountChange: (postId: string, delta: number) => void;
  index: number;
}

export default function PostCard({
  post,
  reactions,
  commentCount,
  currentUser,
  currentLevel,
  onReactionChange,
  onCommentCountChange,
  index,
}: PostCardProps) {
  const [saved, setSaved]           = useState(() => isSaved(post.id));
  const [expanded, setExpanded]     = useState(false);
  const [comments, setComments]     = useState<Comment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");

  function handleReaction(r: ReactionType) {
    const updated = toggleReaction(post.id, r);
    onReactionChange(post.id, updated);
  }

  function handleSave() {
    const nowSaved = toggleSave(post.id);
    setSaved(nowSaved);
  }

  function handleExpand() {
    if (!expanded) setComments(getComments(post.id));
    setExpanded(v => !v);
    setCommentDraft("");
  }

  function handleAddComment() {
    if (commentDraft.trim().length < 2) return;
    const updated = addComment(post.id, currentUser, currentLevel, commentDraft);
    setComments(updated);
    onCommentCountChange(post.id, 1);
    setCommentDraft("");
  }

  const initials = post.authorName.slice(0, 2).toUpperCase();
  const typeIcon: Record<string, string> = {
    text: "💬", achievement: "🏅", pvp_win: "⚔️", tournament: "🏆", level_up: "⬆️",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3) }}
      className={`rounded-2xl border bg-card overflow-hidden ${
        post.boosted ? "border-yellow-500/40 bg-yellow-500/5" : "border-border"
      }`}
    >
      <div className="p-4 space-y-3">
        {post.boosted && (
          <div className="flex items-center gap-1 text-[11px] text-yellow-400 font-bold">
            🔥 Boosted
          </div>
        )}

        {/* Author row */}
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-primary-foreground flex-shrink-0"
            style={{ background: "hsl(var(--primary)/0.85)" }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold">{post.authorName}</span>
              <span className="text-[11px] bg-muted/60 rounded px-1.5 py-0.5 text-muted-foreground">
                Lv.{post.authorLevel}
              </span>
              <span className="text-sm">{typeIcon[post.type] ?? "💬"}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {getPostAge(post.timestamp)}
            </p>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            className={`p-1.5 rounded-xl transition-all active:scale-90 ${
              saved ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
            }`}
          >
            {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>

        {/* Content */}
        <p className="text-sm text-foreground/90 leading-relaxed">{post.content}</p>

        {/* Optional image */}
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt="post attachment"
            className="w-full max-h-52 object-cover rounded-xl"
          />
        )}

        {/* Reactions row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {HUB_REACTIONS.map(r => {
            const count = reactions.counts[r] ?? 0;
            const active = reactions.mine === r;
            return (
              <motion.button
                key={r}
                whileTap={{ scale: 0.85 }}
                onClick={() => handleReaction(r)}
                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl transition-all ${
                  active
                    ? "bg-primary/20 border border-primary/50 shadow-sm"
                    : "bg-muted/50 border border-transparent hover:bg-muted/70"
                }`}
              >
                <span className="text-base leading-none">{r}</span>
                {count > 0 && (
                  <span className={`font-bold text-[11px] ${active ? "text-primary" : "text-muted-foreground"}`}>
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={handleExpand}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {commentCount > 0 ? `${commentCount} comments` : "Comment"}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <div className="text-[11px] text-muted-foreground">
            {Object.values(reactions.counts).reduce((s, v) => s + v, 0) > 0 && (
              <span>{Object.values(reactions.counts).reduce((s, v) => s + v, 0)} reactions</span>
            )}
          </div>
        </div>
      </div>

      {/* Comments section */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="border-t border-border/50 bg-muted/20 overflow-hidden"
          >
            <div className="p-3 space-y-2.5">
              {comments.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-1">
                  No comments yet — be the first!
                </p>
              )}

              {comments.map(c => (
                <div key={c.id} className="flex items-start gap-2">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-primary-foreground flex-shrink-0"
                    style={{ background: "hsl(var(--primary)/0.7)" }}
                  >
                    {c.authorName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold">{c.authorName}</span>
                      <span className="text-[10px] text-muted-foreground">Lv.{c.authorLevel}</span>
                      <span className="text-[10px] text-muted-foreground">{getCommentAge(c.timestamp)}</span>
                    </div>
                    <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed">{c.content}</p>
                  </div>
                </div>
              ))}

              {/* Comment input */}
              <div className="flex gap-2 pt-1">
                <input
                  value={commentDraft}
                  onChange={e => setCommentDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleAddComment(); }}
                  placeholder="Add a comment…"
                  maxLength={200}
                  className="flex-1 bg-background border border-border rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
                <button
                  onClick={handleAddComment}
                  disabled={commentDraft.trim().length < 2}
                  className="px-3 py-1.5 rounded-xl bg-primary/20 border border-primary/30 text-primary text-xs font-bold disabled:opacity-40 active:scale-95 transition-transform"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
