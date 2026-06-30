import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, Hash, Heart, MessageCircle, Zap, Crown } from "lucide-react";
import { api } from "@/lib/apiClient";
import Avatar from "@/components/Avatar";
import { playTap } from "@/lib/sounds";

type Window = "24h" | "7d" | "30d";
type TrendTab = "posts" | "users" | "hashtags";

interface TPost { id: string; authorId: string; username: string; content: string; likes: number; replies: number; createdAt: string }
interface TUser  { authorId: string; username: string; postCount: number; totalLikes: number; level?: number }
interface THashtag { tag: string; postCount: number; totalLikes: number }

function fmt(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000)     return "just now";
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function TrendingPage() {
  const [, navigate] = useLocation();
  const [window, setWindow] = useState<Window>("24h");
  const [tab, setTab]       = useState<TrendTab>("posts");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    trendingPosts: TPost[];
    mostLikedPosts: TPost[];
    mostCommentedPosts: TPost[];
    mostActiveUsers: TUser[];
    trendingHashtags: THashtag[];
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    api.social.trending(window)
      .then(d => setData(d as any))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [window]);

  const WINDOWS: { id: Window; label: string }[] = [
    { id: "24h", label: "24h" },
    { id: "7d",  label: "7 days" },
    { id: "30d", label: "30 days" },
  ];

  const TABS: { id: TrendTab; label: string; icon: React.ReactNode }[] = [
    { id: "posts",    label: "Posts",    icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: "users",    label: "Users",    icon: <Crown className="w-3.5 h-3.5" /> },
    { id: "hashtags", label: "Hashtags", icon: <Hash className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen pb-28" style={{ background: "#F0F2F5" }}>
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b bg-white"
        style={{ borderColor: "#E4E6EB", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <button onClick={() => { playTap(); window.history.back(); }}
          className="p-2 rounded-xl hover:bg-gray-100 active:scale-90 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <TrendingUp className="w-5 h-5 text-blue-500" />
        <h1 className="text-lg font-black flex-1">🔥 Trending</h1>

        {/* Window selector */}
        <div className="flex gap-1">
          {WINDOWS.map(w => (
            <button key={w.id}
              onClick={() => { playTap(); setWindow(w.id); }}
              className="px-3 py-1 rounded-full text-xs font-bold transition-all active:scale-95"
              style={window === w.id
                ? { background: "#1877F2", color: "#fff" }
                : { background: "#F0F2F5", color: "#65676B" }}>
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab row */}
      <div className="flex gap-2 px-4 pt-3 pb-1">
        {TABS.map(t => (
          <button key={t.id}
            onClick={() => { playTap(); setTab(t.id); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95"
            style={tab === t.id
              ? { background: "#1877F2", color: "#fff" }
              : { background: "#fff", color: "#65676B", border: "1px solid #E4E6EB" }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="max-w-md mx-auto px-4 pt-3 space-y-3">
        {loading && (
          <div className="flex justify-center py-12">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        )}

        {!loading && data && (
          <>
            {/* ── POSTS tab ── */}
            {tab === "posts" && (
              <div className="space-y-4">
                {/* Trending (by engagement score) */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-gray-600">Trending Now</span>
                  </div>
                  {data.trendingPosts.length === 0
                    ? <EmptyCard emoji="🔥" text={`No trending posts in the last ${window}`} />
                    : <div className="space-y-2">
                        {data.trendingPosts.map((p, i) => (
                          <TrendPostCard key={p.id} post={p} rank={i + 1} navigate={navigate} />
                        ))}
                      </div>
                  }
                </div>

                {/* Most liked */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-rose-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-gray-600">Most Liked</span>
                  </div>
                  {data.mostLikedPosts.length === 0
                    ? <EmptyCard emoji="❤️" text="No liked posts yet" />
                    : <div className="space-y-2">
                        {data.mostLikedPosts.slice(0, 5).map((p, i) => (
                          <TrendPostCard key={p.id} post={p} rank={i + 1} navigate={navigate} />
                        ))}
                      </div>
                  }
                </div>

                {/* Most commented */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-gray-600">Most Commented</span>
                  </div>
                  {data.mostCommentedPosts.length === 0
                    ? <EmptyCard emoji="💬" text="No commented posts yet" />
                    : <div className="space-y-2">
                        {data.mostCommentedPosts.slice(0, 5).map((p, i) => (
                          <TrendPostCard key={p.id} post={p} rank={i + 1} navigate={navigate} />
                        ))}
                      </div>
                  }
                </div>
              </div>
            )}

            {/* ── USERS tab ── */}
            {tab === "users" && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-gray-600">Most Active Users</span>
                </div>
                {data.mostActiveUsers.length === 0
                  ? <EmptyCard emoji="👤" text="No active users in this period" />
                  : <div className="space-y-2">
                      {data.mostActiveUsers.map((u, i) => (
                        <motion.button key={u.authorId}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => navigate(`/profile/${u.authorId}`)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border hover:border-blue-300 active:scale-98 transition-all text-left"
                          style={{ borderColor: "#E4E6EB" }}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm text-white flex-shrink-0"
                            style={{ background: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "#E4E6EB", color: i < 3 ? "#000" : "#65676B" }}>
                            #{i + 1}
                          </div>
                          <Avatar username={u.username} size="sm" shape="rounded-xl" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-900 truncate">{u.username}</div>
                            <div className="text-xs text-gray-500">{u.postCount} posts · ❤️ {u.totalLikes} likes</div>
                          </div>
                          <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                        </motion.button>
                      ))}
                    </div>
                }
              </div>
            )}

            {/* ── HASHTAGS tab ── */}
            {tab === "hashtags" && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-gray-600">Trending Hashtags</span>
                </div>
                {data.trendingHashtags.length === 0
                  ? <EmptyCard emoji="#️⃣" text="No hashtags in this period" />
                  : <div className="space-y-2">
                      {data.trendingHashtags.map((h, i) => (
                        <motion.button key={h.tag}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => navigate(`/hashtag/${encodeURIComponent(h.tag.replace(/^#/, ""))}`)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border hover:border-purple-300 active:scale-98 transition-all text-left"
                          style={{ borderColor: "#E4E6EB" }}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                            style={{ background: i < 3 ? "#F0E9FF" : "#F0F2F5" }}>
                            <span style={{ color: i < 3 ? "#8B5CF6" : "#65676B", fontSize: "1.1rem", fontWeight: 900 }}>#</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold" style={{ color: i < 3 ? "#8B5CF6" : "#050505" }}>
                              {h.tag}
                            </div>
                            <div className="text-xs text-gray-500">{h.postCount} posts · ❤️ {h.totalLikes}</div>
                          </div>
                          {i < 3 && <TrendingUp className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                        </motion.button>
                      ))}
                    </div>
                }
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TrendPostCard({ post, rank, navigate }: { post: TPost; rank: number; navigate: (to: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.04 }}
      className="p-3 rounded-xl bg-white border"
      style={{ borderColor: "#E4E6EB" }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
          style={{ background: rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : "#E4E6EB", color: rank < 4 ? "#000" : "#65676B" }}>
          {rank}
        </div>
        <button className="text-xs font-bold text-blue-600 hover:underline"
          onClick={() => navigate(`/profile/${post.authorId}`)}>
          {post.username}
        </button>
        <span className="text-[10px] text-gray-400 ml-auto">{fmt(post.createdAt)}</span>
      </div>
      <p className="text-sm text-gray-800 leading-relaxed line-clamp-2">{post.content}</p>
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
        <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-rose-400" /> {post.likes}</span>
        <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 text-blue-400" /> {post.replies}</span>
      </div>
    </motion.div>
  );
}

function EmptyCard({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="py-8 text-center bg-white rounded-xl border" style={{ borderColor: "#E4E6EB" }}>
      <div className="text-3xl mb-2">{emoji}</div>
      <p className="text-xs text-gray-400">{text}</p>
    </div>
  );
}
