// src/pages/SearchPage.tsx
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowLeft, Hash, User, FileText, TrendingUp } from "lucide-react";
import { api } from "@/lib/apiClient";
import Avatar from "@/components/Avatar";
import { playTap } from "@/lib/sounds";
import { useTranslation } from "@/hooks/useTranslation"; // ✅ إضافة الترجمة

type SearchTab = "all" | "users" | "posts" | "hashtags";
type SortMode  = "relevant" | "recent" | "engagement";

interface SearchUser   { id: string; username: string; level: number; elo: number; verificationStatus: string }
interface SearchPost   { id: string; authorId: string; username: string; content: string; likes: number; replies: number; createdAt: string }
interface SearchHashtag { tag: string; count: number }

// ✅ دالة مساعدة لتنسيق الوقت مع الترجمة
function formatTimeAgo(ts: string, t: (key: string) => string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000)     return t('searchPage.time.justNow');
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

// ✅ مكون تمييز النص (يبقى كما هو)
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-black rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function SearchPage() {
  const { t } = useTranslation(); // ✅ استخدم الترجمة
  const [, navigate] = useLocation();
  const [query, setQuery]     = useState("");
  const [tab, setTab]         = useState<SearchTab>("all");
  const [sort, setSort]       = useState<SortMode>("relevant");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ users: SearchUser[]; posts: SearchPost[]; hashtags: SearchHashtag[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults(null); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api.social.search(query.trim(), tab === "all" ? "all" : tab, sort);
        setResults({
          users:    (r.users    as unknown as SearchUser[])    ?? [],
          posts:    (r.posts    as SearchPost[])    ?? [],
          hashtags: (r.hashtags as SearchHashtag[]) ?? [],
        });
      } catch {
        setResults({ users: [], posts: [], hashtags: [] });
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [query, tab, sort]);

  // ✅ تعريف التبويبات مع ترجمة التسميات
  const TABS: { id: SearchTab; label: string; icon: React.ReactNode }[] = [
    { id: "all",      label: t('searchPage.tabs.all'),       icon: <Search className="w-3 h-3" /> },
    { id: "users",    label: t('searchPage.tabs.users'),     icon: <User className="w-3 h-3" /> },
    { id: "posts",    label: t('searchPage.tabs.posts'),     icon: <FileText className="w-3 h-3" /> },
    { id: "hashtags", label: t('searchPage.tabs.hashtags'),  icon: <Hash className="w-3 h-3" /> },
  ];

  // ✅ تعريف خيارات الترتيب مع ترجمة التسميات
  const SORTS: { id: SortMode; label: string }[] = [
    { id: "relevant",   label: t('searchPage.sort.relevant') },
    { id: "recent",     label: t('searchPage.sort.recent') },
    { id: "engagement", label: t('searchPage.sort.engagement') },
  ];

  const hasResults = results && (results.users.length + results.posts.length + results.hashtags.length) > 0;

  return (
    <div className="min-h-screen pb-28" style={{ background: "#F0F2F5" }}>
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-white border-b px-3 py-2 flex items-center gap-2"
        style={{ borderColor: "#E4E6EB", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <button onClick={() => { playTap(); navigate(-1 as any); }}
          className="p-2 rounded-xl hover:bg-gray-100 active:scale-90 transition-all flex-shrink-0">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('searchPage.placeholder')}
            className="w-full pl-9 pr-9 py-2 rounded-full text-sm focus:outline-none"
            style={{ background: "#F0F2F5", border: "1px solid #E4E6EB", color: "#050505" }}
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults(null); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="px-4 pt-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {TABS.map(tabItem => (
          <button key={tabItem.id}
            onClick={() => { playTap(); setTab(tabItem.id); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95"
            style={tab === tabItem.id
              ? { background: "#1877F2", color: "#fff" }
              : { background: "#fff", color: "#65676B", border: "1px solid #E4E6EB" }}>
            {tabItem.icon}{tabItem.label}
          </button>
        ))}
        <div className="ml-auto flex-shrink-0 flex gap-1">
          {SORTS.map(s => (
            <button key={s.id}
              onClick={() => { playTap(); setSort(s.id); }}
              className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95"
              style={sort === s.id
                ? { background: "#E7F0FF", color: "#1877F2" }
                : { background: "#fff", color: "#65676B", border: "1px solid #E4E6EB" }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* loading spinner */}
        {loading && (
          <div className="flex justify-center py-8">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        )}

        {/* empty state (no query) */}
        {!loading && !query && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 py-16 text-gray-400">
            <Search className="w-12 h-12 opacity-30" />
            <p className="text-sm">{t('searchPage.emptyState')}</p>
          </motion.div>
        )}

        {/* no results */}
        {!loading && query && results && !hasResults && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-16 text-gray-400">
            <div className="text-4xl">🔍</div>
            <p className="text-sm">
              {t('searchPage.noResults')} "<strong className="text-gray-600">{query}</strong>"
            </p>
          </motion.div>
        )}

        <AnimatePresence>
          {!loading && results && hasResults && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

              {/* Users */}
              {results.users.length > 0 && (tab === "all" || tab === "users") && (
                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-gray-600">
                      {t('searchPage.sectionUsers')}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {results.users.map(u => (
                      <motion.button key={u.id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        onClick={() => navigate(`/profile/${u.id}`)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border hover:border-blue-300 active:scale-98 transition-all text-left"
                        style={{ borderColor: "#E4E6EB" }}>
                        <Avatar username={u.username} size="sm" shape="rounded-xl" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-gray-900 truncate">
                            <HighlightText text={u.username} query={query} />
                            {u.verificationStatus === "verified" && <span className="ml-1 text-blue-500">✓</span>}
                          </div>
                          <div className="text-xs text-gray-500">
                            {`Lvl ${u.level} · ${u.elo} ELO`}
                          </div>
                        </div>
                        <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180 flex-shrink-0" />
                      </motion.button>
                    ))}
                  </div>
                </section>
              )}

              {/* Posts */}
              {results.posts.length > 0 && (tab === "all" || tab === "posts") && (
                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-gray-600">
                      {t('searchPage.sectionPosts')}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {results.posts.map(p => (
                      <motion.div key={p.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-xl bg-white border"
                        style={{ borderColor: "#E4E6EB" }}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Avatar username={p.username} size="xs" shape="rounded-lg" />
                          <button
                            className="text-xs font-bold text-blue-600 hover:underline"
                            onClick={() => navigate(`/profile/${p.authorId}`)}>
                            {p.username}
                          </button>
                          <span className="text-[10px] text-gray-400 ml-auto">
                            {formatTimeAgo(p.createdAt, t)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed line-clamp-3">
                          <HighlightText text={p.content} query={query} />
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span>❤️ {p.likes}</span>
                          <span>💬 {p.replies}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {/* Hashtags */}
              {results.hashtags.length > 0 && (tab === "all" || tab === "hashtags") && (
                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-gray-600">
                      {t('searchPage.sectionHashtags')}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {results.hashtags.map((h: any) => (
                      <motion.button key={h.tag}
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        onClick={() => navigate(`/hashtag/${encodeURIComponent(h.tag.replace(/^#/, ""))}`)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border hover:border-purple-300 active:scale-98 transition-all text-left"
                        style={{ borderColor: "#E4E6EB" }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                          style={{ background: "#F0E9FF" }}>
                          <Hash className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-gray-900">
                            <HighlightText text={h.tag} query={query} />
                          </div>
                          {h.count > 0 && (
                            <div className="text-xs text-gray-500">
                              {`${h.count} posts`}
                            </div>
                          )}
                        </div>
                        <TrendingUp className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      </motion.button>
                    ))}
                  </div>
                </section>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}