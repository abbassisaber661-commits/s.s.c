import { useState, useEffect, useRef } from "react";
import { useGame } from "@/contexts/GameContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { getSocket } from "@/lib/socket";
import { Link } from "wouter";
import GuestBanner from "@/components/GuestBanner";
import { ArrowLeft, Flame, Heart, Zap, Plus, Send, MessageCircle, ChevronDown, ChevronUp, Wifi, TrendingUp, Users, UserPlus, UserCheck, Bell } from "lucide-react";
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
import { api } from "@/lib/apiClient";

function emptyReactions(postId: string): PostReactions {
  const counts: Record<ReactionType, number> = {} as any;
  for (const r of REACTION_TYPES) counts[r] = 0;
  return { postId, counts, mine: null };
}

type Tab = "hot" | "new" | "trending" | "players";

interface PopularPlayer {
  id: string;
  username: string;
  avatar: string;
  elo: number;
  level: number;
  pvpWins: number;
  verificationStatus: string;
}

function FollowButton({ targetId, viewerId }: { targetId: string; viewerId?: string }) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!viewerId || loading) return;
    setLoading(true);
    if (following) {
      await api.followers.unfollow(targetId, viewerId);
      setFollowing(false);
    } else {
      await api.followers.follow(targetId, viewerId);
      setFollowing(true);
    }
    setLoading(false);
  };

  return (
    <button onClick={toggle} disabled={loading || !viewerId}
      className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl font-semibold transition-all ${following ? "bg-primary/10 border border-primary/40 text-primary" : "bg-primary text-primary-foreground"} disabled:opacity-50`}>
      {following ? <UserCheck size={12} /> : <UserPlus size={12} />}
      {following ? "متابَع" : "متابعة"}
    </button>
  );
}

export default function Community() {
  const { coins, username, level, fame, spendCoins, lastPostTime, setLastPostTime, addFame, isGuest, authUser } = useGame();
  const { subscribeCommunity, connected } = useRealtime();

  const [posts, setPosts]             = useState<CommunityPost[]>([]);
  const [composing, setComposing]     = useState(false);
  const [draft, setDraft]             = useState('');
  const [error, setError]             = useState<string | null>(null);
  const [tab, setTab]                 = useState<Tab>('hot');
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [reactions, setReactions]     = useState<Record<string, PostReactions>>({});
  const [expanded, setExpanded]       = useState<string | null>(null);
  const [comments, setComments]       = useState<Comment[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [liveIndicator, setLiveIndicator] = useState(false);
  const [popularPlayers, setPopularPlayers] = useState<PopularPlayer[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

  const fameTitle = getFameTitle(fame);

  useEffect(() => {
    setPosts(getCommunityPosts());
    setCommentCounts(getCommentCounts());
    setReactions(getAllReactions());
    subscribeCommunity();
    api.players.leaderboard(20).then(players => setPopularPlayers(players as any)).catch(() => {});
  }, []);

  useEffect(() => {
    const s = getSocket();

    s.on("community:new_post", (post: any) => {
      const localPost: CommunityPost = {
        id: post.id,
        authorId: post.authorId,
        authorName: post.username ?? post.authorName ?? "Player",
        authorLevel: post.level ?? 1,
        content: post.content,
        type: post.type ?? "text",
        likes: 0,
        likedByMe: false,
        boosted: false,
        timestamp: post.createdAt ? new Date(post.createdAt).getTime() : Date.now(),
      };
      setPosts(prev => [localPost, ...prev]);
      setLiveIndicator(true);
      setTimeout(() => setLiveIndicator(false), 2500);
    });

    s.on("community:like_update", (data: { postId: string; playerId: string; liked: boolean }) => {
      setPosts(prev => prev.map(p => {
        if (p.id !== data.postId) return p;
        return { ...p, likes: Math.max(0, p.likes + (data.liked ? 1 : -1)) };
      }));
    });

    return () => {
      s.off("community:new_post");
      s.off("community:like_update");
    };
  }, []);

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const sorted = (() => {
    switch (tab) {
      case "hot":
        return [...posts].sort((a, b) => {
          if (a.boosted && !b.boosted) return -1;
          if (!a.boosted && b.boosted) return 1;
          return b.likes - a.likes;
        });
      case "new":
        return [...posts].sort((a, b) => b.timestamp - a.timestamp);
      case "trending":
        return [...posts]
          .filter(p => p.timestamp > oneDayAgo)
          .sort((a, b) => b.likes * 2 + (b.timestamp > now - 3600000 ? 5 : 0) - (a.likes * 2 + (a.timestamp > now - 3600000 ? 5 : 0)));
      default:
        return posts;
    }
  })();

  function handleLike(postId: string) {
    const updated = likePost(postId);
    setPosts(updated);
    const post = updated.find(p => p.id === postId);
    if (post) {
      getSocket().emit("community:like", { postId, playerId: username, liked: post.likedByMe });
      if (post.likedByMe) addFame(1);
    }
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
    getSocket().emit("community:post", { authorId: username, username, level, content: post.content, type: post.type });
  }

  function handleReaction(postId: string, r: ReactionType) {
    const updated = toggleReaction(postId, r);
    setReactions(prev => ({ ...prev, [postId]: updated }));
    if (updated.mine === r) addFame(1);
  }

  function toggleExpanded(postId: string) {
    if (expanded === postId) { setExpanded(null); setComments([]); }
    else { setExpanded(postId); setComments(getComments(postId)); }
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

  const verifiedBadge = (s: string) => s === "elite" ? " 👑" : s === "verified" ? " ✅" : "";

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "hot",      label: "الأشهر",   icon: Flame },
    { id: "trending", label: "Trending", icon: TrendingUp },
    { id: "new",      label: "الجديد",   icon: Zap },
    { id: "players",  label: "اللاعبون", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 space-y-3">

        {/* Messages shortcut bar */}
        <Link href="/messages">
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-primary/10 border border-primary/25 cursor-pointer hover:bg-primary/15 transition-colors"
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <span className="flex-1 text-sm font-bold text-primary">الرسائل والإشعارات</span>
            <Bell className="w-4 h-4 text-primary/60" />
            <ArrowLeft className="w-4 h-4 text-primary/60 rotate-180" />
          </motion.div>
        </Link>

        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold flex-1">المجتمع</h1>
          <AnimatePresence>
            {liveIndicator && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                منشور جديد!
              </motion.div>
            )}
          </AnimatePresence>
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${connected ? 'bg-green-500/10 text-green-400' : 'bg-muted text-muted-foreground'}`}>
            <Wifi className="w-3 h-3" />{connected ? 'مباشر' : 'غير متصل'}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${tab === t.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}>
              <t.icon size={12} />{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-3" ref={feedRef}>
        {isGuest && <GuestBanner />}

        {/* Popular Players Tab */}
        {tab === "players" ? (
          <div className="space-y-3">
            <div className="text-sm font-bold text-muted-foreground px-1">🔥 اللاعبون المشهورون</div>
            {popularPlayers.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
                <span className="text-2xl">{p.avatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{p.username}{verifiedBadge(p.verificationStatus)}</div>
                  <div className="text-xs text-muted-foreground">Lv.{p.level} · {p.elo} ELO · {p.pvpWins} انتصار</div>
                </div>
                {p.id !== authUser?.id && (
                  <FollowButton targetId={p.id} viewerId={authUser?.id} />
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <>
            {/* Fame Bar */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{fameTitle.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-black" style={{ color: fameTitle.color }}>{fameTitle.title}</div>
                  <div className="text-xs text-muted-foreground">{fame} نقطة شهرة</div>
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  {tab === "trending" ? (
                    <span className="bg-orange-500/10 text-orange-400 px-2 py-1 rounded-full">🔥 {sorted.length} منشور</span>
                  ) : (
                    <span>{posts.length} منشور</span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Compose */}
            <AnimatePresence>
              {composing ? (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-2xl border border-border bg-card p-4 space-y-3 overflow-hidden">
                  <div className="text-sm font-bold">شارك المجتمع</div>
                  <textarea value={draft} onChange={e => setDraft(e.target.value)}
                    placeholder="شارك انتصارًا، نصيحة، أو تحديًا..." dir="rtl"
                    className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary"
                    maxLength={280} />
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{draft.length}/280</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setComposing(false); setDraft(''); setError(null); }}>إلغاء</Button>
                      <Button size="sm" onClick={handlePost} disabled={draft.trim().length < 3} className="gap-1">
                        <Send className="w-3.5 h-3.5" /> نشر
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={() => setComposing(true)}
                  className="w-full rounded-2xl border border-dashed border-border bg-card/60 p-3 text-sm text-muted-foreground flex items-center gap-2 hover:bg-card active:scale-[0.99] transition-all">
                  <Plus className="w-4 h-4" />شارك نتيجة مباراة أو نصيحة أو إنجاز…
                </motion.button>
              )}
            </AnimatePresence>

            {/* Trending banner */}
            {tab === "trending" && sorted.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                <div className="text-4xl mb-2">🔥</div>
                <div>لا توجد منشورات ترند في آخر 24 ساعة</div>
              </div>
            )}

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
                    className={`rounded-2xl border bg-card overflow-hidden ${post.boosted ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-border'}`}>
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
                          <p className="text-sm text-foreground/90 mt-1 leading-relaxed" dir="rtl">{post.content}</p>
                        </div>
                      </div>

                      {/* Reactions */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {REACTION_TYPES.map(r => {
                          const count = postReactions.counts[r] ?? 0;
                          const active = postReactions.mine === r;
                          return (
                            <button key={r} onClick={() => handleReaction(post.id, r)}
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
                          {postTotalReactions > 0 && <span className="text-xs text-muted-foreground">{postTotalReactions} reactions</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleLike(post.id)}
                            className={`flex items-center gap-1 text-xs font-semibold transition-colors ${post.likedByMe ? 'text-red-400' : 'text-muted-foreground hover:text-red-400'}`}>
                            <Heart className={`w-3.5 h-3.5 ${post.likedByMe ? 'fill-red-400' : ''}`} />{post.likes}
                          </button>
                          <button onClick={() => toggleExpanded(post.id)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                            <MessageCircle className="w-3.5 h-3.5" />
                            {cmtCount > 0 ? cmtCount : ''}
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                          {!post.boosted && (
                            <button onClick={() => handleBoost(post.id)} disabled={coins < BOOST_COST}
                              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-yellow-400 disabled:opacity-40 transition-colors">
                              <Zap className="w-3.5 h-3.5" /> Boost
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Comments */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-border/50 bg-muted/20 overflow-hidden">
                          <div className="p-3 space-y-2">
                            {comments.length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-2">لا تعليقات بعد — كن الأول!</p>
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
                            <div className="flex gap-2 pt-1">
                              <input value={commentDraft} onChange={e => setCommentDraft(e.target.value)}
                                placeholder="أضف تعليقًا…" maxLength={200} dir="rtl"
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
          </>
        )}
      </div>
    </div>
  );
}
