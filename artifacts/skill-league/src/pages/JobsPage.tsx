import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Briefcase, Plus, Search, MapPin, Clock, Tag, X, Loader2 } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import { toast } from "sonner";

interface ApiJob {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  description: string;
  jobType: string;
  country: string;
  category: string;
  createdAt: string;
}

const CATEGORIES = ["الكل", "تدريب", "تصميم", "برمجة", "إعلام", "تسويق", "عام"];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1)   return "الآن";
  if (m < 60)  return `منذ ${m} دقيقة`;
  if (h < 24)  return `منذ ${h} ساعة`;
  return `منذ ${d} يوم`;
}

export default function JobsPage() {
  const [, navigate] = useLocation();
  const { username, authUser } = useGame();
  const myId = authUser?.uid ?? getStoredPlayerId();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "offer" | "request">("all");
  const [category, setCategory] = useState("الكل");
  const [showPost, setShowPost] = useState(false);
  const [newJob, setNewJob] = useState({ title: "", type: "offer" as "offer" | "request", country: "", category: "تدريب", description: "" });
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.jobs.list()
      .then(setJobs)
      .catch(() => toast.error("فشل تحميل الوظائف"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = jobs.filter(j => {
    const matchSearch = search === "" ||
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.country.includes(search) ||
      j.authorName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || j.jobType === filter;
    const matchCat    = category === "الكل" || j.category === category;
    return matchSearch && matchFilter && matchCat;
  });

  async function handlePost() {
    if (!myId || !username || !newJob.title.trim() || !newJob.description.trim()) return;
    setPosting(true);
    try {
      const created = await api.jobs.create({
        authorId:    myId,
        authorName:  username,
        title:       newJob.title,
        description: newJob.description,
        jobType:     newJob.type,
        country:     newJob.country || "غير محدد",
        category:    newJob.category,
      });
      setJobs(prev => [created, ...prev]);
      setNewJob({ title: "", type: "offer", country: "", category: "تدريب", description: "" });
      setShowPost(false);
      toast.success("تم نشر الإعلان بنجاح ✅");
    } catch {
      toast.error("فشل نشر الإعلان، يرجى المحاولة مجدداً");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(jobId: string) {
    if (!myId) return;
    try {
      await api.jobs.delete(jobId, myId);
      setJobs(prev => prev.filter(j => j.id !== jobId));
      toast.success("تم حذف الإعلان");
    } catch {
      toast.error("فشل الحذف");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-28" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("~/")} className="p-2 rounded-xl hover:bg-muted transition-colors active:scale-90">
          <ArrowLeft className="w-5 h-5 rotate-180" />
        </button>
        <Briefcase className="w-5 h-5 text-yellow-400" />
        <h1 className="text-lg font-black flex-1">الوظائف 💼</h1>
        {myId && (
          <button
            onClick={() => setShowPost(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-black"
            style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)" }}
          >
            <Plus className="w-3.5 h-3.5" /> نشر إعلان
          </button>
        )}
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث عن وظيفة أو بلد..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
          />
        </div>

        {/* Type filter */}
        <div className="flex gap-2">
          {[{ val: "all", label: "الكل" }, { val: "offer", label: "عروض" }, { val: "request", label: "طلبات" }].map(f => (
            <button
              key={f.val}
              onClick={() => setFilter(f.val as any)}
              className="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={filter === f.val
                ? { background: "#fbbf24", color: "#000" }
                : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className="shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all"
              style={category === cat
                ? { background: "#7c3aed", color: "#fff" }
                : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
          </div>
        )}

        {/* Jobs list */}
        {!loading && (
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                {jobs.length === 0 ? "لا توجد إعلانات بعد — كن أول من ينشر!" : "لا توجد نتائج"}
              </div>
            )}
            {filtered.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl p-4 space-y-2"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-black text-sm leading-snug flex-1">{job.title}</h3>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={job.jobType === "offer"
                        ? { background: "rgba(16,185,129,0.15)", color: "#10b981" }
                        : { background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}
                    >
                      {job.jobType === "offer" ? "عرض" : "طلب"}
                    </span>
                    {myId && job.authorId === myId && (
                      <button
                        onClick={() => handleDelete(job.id)}
                        className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                        title="حذف"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">{job.description}</p>

                <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                  {job.country && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.country}</span>}
                  <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{job.category}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(job.createdAt)}</span>
                  <span className="mr-auto font-bold" style={{ color: "#fbbf24" }}>@{job.authorName}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Post Job Modal */}
      <AnimatePresence>
        {showPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center"
            onClick={e => e.target === e.currentTarget && setShowPost(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="w-full max-w-md rounded-t-3xl p-6 space-y-4"
              style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-black text-base">نشر إعلان وظيفي</h2>
                <button onClick={() => setShowPost(false)} className="p-1.5 rounded-xl hover:bg-muted"><X className="w-4 h-4" /></button>
              </div>

              <input
                value={newJob.title}
                onChange={e => setNewJob(p => ({ ...p, title: e.target.value }))}
                placeholder="عنوان الإعلان..."
                className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-sm focus:outline-none"
              />

              <div className="flex gap-2">
                {["offer", "request"].map(t => (
                  <button
                    key={t}
                    onClick={() => setNewJob(p => ({ ...p, type: t as any }))}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                    style={newJob.type === t
                      ? { background: "#fbbf24", color: "#000" }
                      : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
                  >
                    {t === "offer" ? "عرض عمل" : "طلب موظف"}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  value={newJob.country}
                  onChange={e => setNewJob(p => ({ ...p, country: e.target.value }))}
                  placeholder="البلد..."
                  className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-sm focus:outline-none"
                />
                <select
                  value={newJob.category}
                  onChange={e => setNewJob(p => ({ ...p, category: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-sm focus:outline-none"
                >
                  {CATEGORIES.filter(c => c !== "الكل").map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <textarea
                value={newJob.description}
                onChange={e => setNewJob(p => ({ ...p, description: e.target.value }))}
                placeholder="وصف الإعلان..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-sm focus:outline-none resize-none"
              />

              <button
                onClick={handlePost}
                disabled={posting || !newJob.title.trim() || !newJob.description.trim()}
                className="w-full py-3 rounded-xl font-black text-black disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)" }}
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : "نشر الإعلان"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
