import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Hash, Heart, MessageCircle, TrendingUp } from "lucide-react";
import { api } from "@/lib/apiClient";
import Avatar from "@/components/Avatar";
import { playTap } from "@/lib/sounds";

interface HPost { id: string; authorId: string; username: string; level: number; content: string; likes: number; replies: number; createdAt: string }

function fmt(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000)     return "just now";
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// Render post content with clickable hashtags
function ContentWithHashtags({ content, onHashtag }: { content: string; onHashtag: (tag: string) => void }) {
  const parts = content.split(/(#[\w\u0600-\u06FF]+)/g);
  return (
    <p className="text-sm leading-relaxed" style={{ color: "#050505" }}>
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <button key={i}
            onClick={e => { e.stopPropagation(); onHashtag(part); }}
            className="font-bold hover:underline"
            style={{ color: "#1877F2" }}>
            {part}
          </button>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

export default function HashtagFeedPage() {
  const [, params]   = useRoute("/hashtag/:tag");
  const [, navigate] = useLocation();
  const tag = params?.tag ? decodeURIComponent(params.tag) : "";

  const [posts, setPosts]     = useState<HPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [relatedTags, setRelatedTags] = useState<{ tag: string; postCount: number }[]>([]);

  const displayTag = `#${tag}`;

  useEffect(() => {
    if (!tag) return;
    setLoading(true);
    Promise.all([
      api.social.postsByHashtag(tag),
      api.social.hashtagsTrending("7d"),
    ]).then(([postsData, trendData]) => {
      const rawPosts = (postsData as unknown as { posts?: HPost[] })?.posts ?? (postsData as unknown as HPost[]) ?? [];
      setPosts(rawPosts as HPost[]);
      const trending = (trendData as any).trending ?? [];
      setRelatedTags(trending.filter((t: any) => t.tag !== displayTag.toLowerCase()).slice(0, 8));
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [tag]);

  function handleHashtagClick(newTag: string) {
    navigate(`/hashtag/${encodeURIComponent(newTag.replace(/^#/, ""))}`);
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: "#F0F2F5" }}>
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b bg-white"
        style={{ borderColor: "#E4E6EB", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <button onClick={() => { playTap(); navigate(-1 as any); }}
          className="p-2 rounded-xl hover:bg-gray-100 active:scale-90 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#F0E9FF" }}>
          <Hash className="w-4 h-4 text-purple-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black text-purple-600">{displayTag}</h1>
          <p className="text-xs text-gray-400">{loading ? "Loading…" : `${posts.length} posts`}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-3 space-y-3">
        {/* Related hashtags */}
        {relatedTags.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-xs font-black uppercase tracking-wider text-gray-500">Related Hashtags</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {relatedTags.map(t => (
                <button key={t.tag}
                  onClick={() => handleHashtagClick(t.tag)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 hover:bg-purple-100"
                  style={{ background: "#F0E9FF", color: "#8B5CF6", border: "1px solid #DDD6FE" }}>
                  {t.tag}
                  <span className="ml-1 opacity-60">({t.postCount})</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent" />
          </div>
        )}

        {/* Posts */}
        {!loading && posts.length === 0 && (
          <div className="py-12 text-center bg-white rounded-xl border" style={{ borderColor: "#E4E6EB" }}>
            <div className="text-4xl mb-2">🔍</div>
            <p className="text-sm text-gray-400">No posts with <strong className="text-purple-500">{displayTag}</strong> yet</p>
            <p className="text-xs text-gray-400 mt-1">Be the first to post with this hashtag!</p>
          </div>
        )}

        {!loading && posts.length > 0 && (
          <div className="space-y-3">
            {posts.map((post, idx) => (
              <motion.div key={post.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="rounded-xl overflow-hidden bg-white border"
                style={{ borderColor: "#E4E6EB", boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}>
                <div className="p-4 space-y-2.5">
                  {/* Author row */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/profile/${post.authorId}`)}>
                      <Avatar username={post.username} size="sm" shape="rounded-xl" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => navigate(`/profile/${post.authorId}`)}
                        className="text-sm font-bold hover:text-blue-600 transition-colors">
                        {post.username}
                      </button>
                      <p className="text-[11px] text-gray-400">{fmt(post.createdAt)}</p>
                    </div>
                  </div>

                  {/* Content with clickable hashtags */}
                  <ContentWithHashtags content={post.content} onHashtag={handleHashtagClick} />

                  {/* Metrics */}
                  <div className="flex items-center gap-4 pt-1 border-t border-gray-100 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-rose-400" /> {post.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5 text-blue-400" /> {post.replies}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
