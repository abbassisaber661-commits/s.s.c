import { useState, useEffect } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link } from "wouter";
import { ArrowLeft, Flame, Heart, Zap, Plus, Send, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  getCommunityPosts, addPost, likePost, boostPost,
  createPost, getPostAge, BOOST_COST, type CommunityPost,
} from "@/lib/community";
import { getFameTitle } from "@/lib/fame";
import { checkPostSpam } from "@/lib/anti-cheat";
import {
  getComments, addComment, getCommentCounts, getAllReactions, toggleReaction,
  REACTION_TYPES, type ReactionType, type Comment, type PostReactions,
  totalReactions, getCommentAge,
} from "@/lib/comments";

function emptyReactions(postId: string): PostReactions {
  const counts: Record<ReactionType, number> = {} as any;
  for (const r of REACTION_TYPES) counts[r] = 0;
  return { postId, counts, mine: null };
}

export default function Community() {
  const { coins, username, level, fame, spendCoins, lastPostTime, setLastPostTime, addFame } = useGame();
  const [posts, setPosts]             = useState<CommunityPost[]>([]);
  const [composing, setComposing]     = useState(false);
  const [draft, setDraft]             = useState('');
  const [error, setError]             = useState<string | null>(null);
  const [tab, setTab]                 = useState<'hot' | 'new'>('hot');
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [reactions, setReactions]     = useState<Record<string, PostReactions>>({});
  const [expanded, setExpanded]       = useState<string | null>(null);
  const [comments, setComments]       = useState<Comment[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const fameTitle = getFameTitle(fame);

  useEffect(() => {
    setPosts(getCommunityPosts());
    setCommentCounts(getCommentCounts());
    setReactions(getAllReactions());
  }, []);

  const sorted = tab === 'hot'
    ? [...posts].sort((a, b) => {
        if (a.boosted && !b.boosted) return -1;
        if (!a.boosted && b.boosted) return 1;
        return b.likes - a.likes;
      })
    : [...posts].sort((a, b) => b.timestamp - a.timestamp);

  function handleLike(postId: string) {
    const updated = likePost(postId);
    setPosts(updated);
    const post = updated.find(p => p.id === postId);
    if (post?.likedByMe) addFame(1);
  }

  function handleBoost(postId: string) {
    if (coins < BOOST_COST) return;
    spendCoins(BOOST_COST);
    const updated = boostPost(postId);
    setPosts(updated);
    addFame(5);
  }

  function handlePost() {
    const check = checkPostSpam(draft, lastPostTime);
    if (check.spam) { setError(check.reason ?? 'Spam detected'); return; }
    const post = createPost(username, level, fame, draft.trim(), 'text');
    const updated = addPost(post);
    setPosts(updated);
    setDraft('');
    setComposing(false);
    setError(null);
    setLastPostTime(Date.now());
  }

  function handleReaction(postId: string, r: ReactionType) {
    const updated = toggleReaction(postId, r);
    setReactions(prev => ({ ...prev, [postId]: updated }));
    if (updated.mine === r) addFame(1);
  }

  function toggleExpanded(postId: string) {
    if (expanded === postId) {
      setExpanded(null);
      setComments([]);
    } else {
      setExpanded(postId);
      setComments(getComments(postId));
    }
    setCommentDraft('');
  }

  function handleAddComment(postId: string) {
    if (commentDraft.trim().length < 2) return;
    const updated = addComment(postId, username, level, commentDraft);
    setComments(updated);
    setCommentCounts(prev => ({ ...prev, [postId]: (prev[postId] ?? 0) + 1 }));
    setCommentDraft('');
  }

  const postTypeIcon: Record<string, string> = {
    text: '💬', achievement: '🏅', pvp_win: '⚔️', tournament: '🏆', level_up: '⬆️',
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="p-1 rounded-lg hover:bg-card active:scale-95 transition-transform">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="text-lg font-bold flex-1">Community</h1>
        <div className="flex items-center gap-1 text-sm">
          <span>{fameTitle.icon}</span>
          <span className="font-bold tabular-nums" style={{ color: fameTitle.color }}>{fame}</span>
          <span className="text-muted-foreground text-xs">fame</span>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-3">
        {/* My Fame Bar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{fameTitle.icon}</span>
            <div className="flex-1">
              <div className="text-sm font-black" style={{ color: fameTitle.color }}>{fameTitle.title}</div>
              <div className="text-xs text-muted-foreground">{fame} Fame points</div>
            </div>
            <div className="text-xs text-muted-foreground text-right">
              <div>Earn fame by</div>
              <div>winning & posting</div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 bg-card rounded-2xl p-1 border border-border">
          {(['hot', 'new'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {t === 'hot' ? '🔥 Hot' : '🆕 New'}
            </button>
          ))}
        </div>

        {/* Compose */}
        <AnimatePresence>
          {composing ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl border border-border bg-card p-4 space-y-3 overflow-hidden"
            >
              <div className="text-sm font-bold">Share with the community</div>
              <textarea value={draft} onChange={e => setDraft(e.target.value)}
                placeholder="What's on your mind? Share a win, tip, or challenge..."
                className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary"
                maxLength={280} />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{draft.length}/280</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setComposing(false); setDraft(''); setError(null); }}>Cancel</Button>
                  <Button size="sm" onClick={handlePost} disabled={draft.trim().length < 3} className="gap-1">
                    <Send className="w-3.5 h-3.5" /> Post
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onClick={() => setComposing(true)}
              className="w-full rounded-2xl border border-dashed border-border bg-card/60 p-3 text-sm text-muted-foreground flex items-center gap-2 hover:bg-card active:scale-[0.99] transition-all">
              <Plus className="w-4 h-4" />
              Share a match result, tip or achievement…
            </motion.button>
          )}
        </AnimatePresence>

        {/* Feed */}
        <div className="space-y-3">
          {sorted.map((post, idx) => {
            const postReactions = reactions[post.id] ?? emptyReactions(post.id);
            const postTotalReactions = totalReactions(postReactions);
            const cmtCount = commentCounts[post.id] ?? 0;
            const isExpanded = expanded === post.id;
            return (
              <motion.div key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`rounded-2xl border bg-card overflow-hidden ${post.boosted ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-border'}`}
              >
                <div className="p-4 space-y-3">
                  {post.boosted && (
                    <div className="flex items-center gap-1 text-xs text-yellow-400 font-bold">
                      <Flame className="w-3 h-3" /> Boosted
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-sm font-black text-primary flex-shrink-0">
                      {post.authorName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold">{post.authorName}</span>
                        <span className="text-xs bg-muted/60 rounded px-1 py-0.5 text-muted-foreground">Lv.{post.authorLevel}</span>
                        <span className="text-xs">{postTypeIcon[post.type]}</span>
                      </div>
                      <p className="text-sm text-foreground/90 mt-1 leading-relaxed">{post.content}</p>
                    </div>
                  </div>

                  {/* Reactions Row */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {REACTION_TYPES.map(r => {
                      const count = postReactions.counts[r] ?? 0;
                      const active = postReactions.mine === r;
                      return (
                        <button key={r}
                          onClick={() => handleReaction(post.id, r)}
                          className={`flex items-center gap-0.5 text-xs px-2 py-1 rounded-xl transition-all active:scale-90 ${active ? 'bg-primary/20 border border-primary/40' : 'bg-muted/40 border border-transparent hover:bg-muted/60'}`}>
                          <span className="text-sm leading-none">{r}</span>
                          {count > 0 && <span className={`font-bold ${active ? 'text-primary' : 'text-muted-foreground'}`}>{count}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Bottom bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{getPostAge(post.timestamp)}</span>
                      {postTotalReactions > 0 && (
                        <span className="text-xs text-muted-foreground">{postTotalReactions} reactions</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleLike(post.id)}
                        className={`flex items-center gap-1 text-xs font-semibold transition-colors ${post.likedByMe ? 'text-red-400' : 'text-muted-foreground hover:text-red-400'}`}>
                        <Heart className={`w-3.5 h-3.5 ${post.likedByMe ? 'fill-red-400' : ''}`} />
                        {post.likes}
                      </button>
                      <button onClick={() => toggleExpanded(post.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                        <MessageCircle className="w-3.5 h-3.5" />
                        {cmtCount > 0 ? cmtCount : ''}
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      {!post.boosted && (
                        <button onClick={() => handleBoost(post.id)}
                          disabled={coins < BOOST_COST}
                          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-yellow-400 disabled:opacity-40 transition-colors">
                          <Zap className="w-3.5 h-3.5" />
                          Boost
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Comments section */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border/50 bg-muted/20 overflow-hidden"
                    >
                      <div className="p-3 space-y-2">
                        {comments.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">No comments yet — be first!</p>
                        )}
                        {comments.map(c => (
                          <div key={c.id} className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center text-[10px] font-black text-primary flex-shrink-0">
                              {c.authorName.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold">{c.authorName}</span>
                                <span className="text-[10px] text-muted-foreground">Lv.{c.authorLevel}</span>
                                <span className="text-[10px] text-muted-foreground">{getCommentAge(c.timestamp)}</span>
                              </div>
                              <p className="text-xs text-foreground/80 mt-0.5">{c.content}</p>
                            </div>
                          </div>
                        ))}
                        {/* Add comment */}
                        <div className="flex gap-2 pt-1">
                          <input value={commentDraft} onChange={e => setCommentDraft(e.target.value)}
                            placeholder="Add a comment…"
                            maxLength={200}
                            onKeyDown={e => { if (e.key === 'Enter') handleAddComment(post.id); }}
                            className="flex-1 bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                          <button onClick={() => handleAddComment(post.id)}
                            disabled={commentDraft.trim().length < 2}
                            className="px-3 py-1.5 rounded-xl bg-primary/20 border border-primary/30 text-primary text-xs font-bold disabled:opacity-40 active:scale-95 transition-transform">
                            <Send className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
