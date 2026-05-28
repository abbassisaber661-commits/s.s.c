import { useState, useEffect } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link } from "wouter";
import { ArrowLeft, Flame, Heart, Zap, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  getCommunityPosts, addPost, likePost, boostPost,
  createPost, getPostAge, BOOST_COST, type CommunityPost,
} from "@/lib/community";
import { getFameTitle } from "@/lib/fame";
import { checkPostSpam } from "@/lib/anti-cheat";
import { useGame as useGameCtx } from "@/contexts/GameContext";

export default function Community() {
  const { coins, username, level, fame, spendCoins, lastPostTime, setLastPostTime, addFame } = useGame();
  const [posts, setPosts]       = useState<CommunityPost[]>([]);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft]       = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [tab, setTab]           = useState<'hot' | 'new'>('hot');
  const fameTitle = getFameTitle(fame);

  useEffect(() => {
    setPosts(getCommunityPosts());
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

  const postTypeIcon: Record<string, string> = {
    text: '💬', achievement: '🏅', pvp_win: '⚔️', tournament: '🏆', level_up: '⬆️',
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-10">
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
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-4"
        >
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
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="What's on your mind? Share a win, tip, or challenge..."
                className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary"
                maxLength={280}
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{draft.length}/280</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setComposing(false); setDraft(''); setError(null); }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handlePost} disabled={draft.trim().length < 3} className="gap-1">
                    <Send className="w-3.5 h-3.5" /> Post
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onClick={() => setComposing(true)}
              className="w-full rounded-2xl border border-dashed border-border bg-card/60 p-3 text-sm text-muted-foreground flex items-center gap-2 hover:bg-card active:scale-[0.99] transition-all"
            >
              <Plus className="w-4 h-4" />
              Share a match result, tip or achievement…
            </motion.button>
          )}
        </AnimatePresence>

        {/* Feed */}
        <div className="space-y-3">
          {sorted.map((post, idx) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`rounded-2xl border bg-card p-4 space-y-3 ${post.boosted ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-border'}`}
            >
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

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{getPostAge(post.timestamp)}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-1 text-xs font-semibold transition-colors ${post.likedByMe ? 'text-red-400' : 'text-muted-foreground hover:text-red-400'}`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${post.likedByMe ? 'fill-red-400' : ''}`} />
                    {post.likes}
                  </button>
                  {!post.boosted && (
                    <button
                      onClick={() => handleBoost(post.id)}
                      disabled={coins < BOOST_COST}
                      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-yellow-400 disabled:opacity-40 transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Boost ({BOOST_COST}🪙)
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
