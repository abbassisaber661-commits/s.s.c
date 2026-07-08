import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, MessageSquare, Trophy, Coins, BadgeCheck,
  Bell, ShieldAlert, ChevronLeft, Menu, X, RefreshCw, Search,
  Trash2, EyeOff, Eye, CheckCircle, XCircle, UserX, UserCheck,
  Clock, AlertTriangle, Send, Lock, Activity, TrendingUp, Crown,
} from "lucide-react";
import { api, getJwtRole } from "@/lib/apiClient";

/* ═══════════════════════════ Access Gate ═══════════════════════════ */
function useOwnerAccess() {
  const [role, setRole] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    setRole(getJwtRole());
    setChecked(true);
  }, []);
  return { isOwner: role === "admin", checked };
}

/* ═══════════════════════════ Theme ═══════════════════════════ */
const GOLD = "#D4AF37";
const GOLD_SOFT = "rgba(212,175,55,0.15)";
const BG = "linear-gradient(160deg,#050505 0%,#0a0906 45%,#0d0b06 100%)";
const CARD_BG = "rgba(255,255,255,0.03)";
const CARD_BORDER = "1px solid rgba(212,175,55,0.15)";

const n = (v: string | number | undefined) => Number(v ?? 0).toLocaleString();

function fmtDate(ts: string | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

/* ═══════════════════════════ Shared UI ═══════════════════════════ */
function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h2 className="text-white font-black text-lg">{title}</h2>
        {subtitle && <p className="text-white/35 text-xs mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color = GOLD }: { label: string; value: string; icon: any; color?: string }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-1.5 relative overflow-hidden"
      style={{ background: CARD_BG, border: CARD_BORDER }}>
      <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-10"
        style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)`, transform: "translate(30%, -30%)" }} />
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-xs font-medium leading-tight">{label}</p>
        <Icon size={13} style={{ color, opacity: 0.8 }} />
      </div>
      <p className="text-white font-black text-xl leading-none" style={{ color }}>{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-10 text-center text-white/25 text-sm">{text}</div>
  );
}

function LoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
      ))}
    </div>
  );
}

function IconBtn({ onClick, icon: Icon, color, title }: { onClick: () => void; icon: any; color: string; title: string }) {
  return (
    <button onClick={onClick} title={title}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
      style={{ background: `${color}18`, border: `1px solid ${color}35` }}>
      <Icon size={13} style={{ color }} />
    </button>
  );
}

/* ═══════════════════════════ 1. Overview ═══════════════════════════ */
function OverviewSection() {
  const [stats, setStats] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.ownerDashboard.overview();
      setStats(data as unknown as Record<string, string>);
    } catch { /* noop */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <SectionHeader
        title="نظرة عامة على المنصة"
        subtitle="إحصائيات حية للاعبين والمحتوى والاقتصاد"
        action={
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
            style={{ background: GOLD_SOFT, color: GOLD, border: `1px solid ${GOLD}40` }}>
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            تحديث
          </button>
        }
      />
      {loading || !stats ? <LoadingGrid count={9} /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <StatCard label="إجمالي اللاعبين" value={n(stats.total_players)} icon={Users} />
            <StatCard label="نشط (24س)" value={n(stats.active_24h)} icon={Activity} color="#34d399" />
            <StatCard label="جديد اليوم" value={n(stats.new_players_24h)} icon={TrendingUp} color="#60a5fa" />
            <StatCard label="موثّقون" value={n(stats.verified_players)} icon={BadgeCheck} color="#818cf8" />
            <StatCard label="بانتظار التوثيق" value={n(stats.pending_verifications)} icon={Clock} color="#fbbf24" />
            <StatCard label="محظورون" value={n(stats.suspended_players)} icon={UserX} color="#f87171" />
            <StatCard label="إجمالي المنشورات" value={n(stats.total_posts)} icon={MessageSquare} />
            <StatCard label="إجمالي التعليقات" value={n(stats.total_comments)} icon={MessageSquare} color="#f472b6" />
            <StatCard label="مباريات (24س)" value={n(stats.matches_24h)} icon={Trophy} color="#fb923c" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="اشتراكات فعّالة" value={n(stats.active_subscriptions)} icon={Crown} color={GOLD} />
            <StatCard label="Pi مؤكد" value={n(stats.total_pi_confirmed)} icon={Coins} color={GOLD} />
            <StatCard label="حجم اقتصاد DN$" value={n(stats.total_dn_volume)} icon={Coins} color="#fb923c" />
            <StatCard label="بلاغات مفتوحة" value={n(stats.open_flags)} icon={AlertTriangle} color="#f87171" />
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════ 2. Users ═══════════════════════════ */
interface AdminUser {
  id: string; username: string; avatar: string; level: number; matchesPlayed: number;
  verified: boolean; verificationStatus: string; suspended: boolean; createdAt: string; lastActiveAt: string;
}

function UsersSection() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.owner.users(page, limit, search);
      setUsers(data.users as AdminUser[]);
      setTotal(data.total);
    } catch { /* noop */ } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: "force-verify" | "remove-verify" | "suspend") => {
    setBusy(id);
    try {
      if (action === "force-verify") await api.owner.forceVerify(id);
      if (action === "remove-verify") await api.owner.removeVerify(id);
      if (action === "suspend") await api.owner.suspend(id);
      toast.success("تم التحديث");
      load();
    } catch { toast.error("فشل الإجراء"); } finally { setBusy(null); }
  };

  return (
    <div>
      <SectionHeader title="إدارة المستخدمين" subtitle={`${total} مستخدم`} />
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="بحث باسم المستخدم..."
          className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none text-white"
          style={{ background: CARD_BG, border: CARD_BORDER }} />
      </div>

      {loading ? <LoadingGrid count={6} /> : users.length === 0 ? <EmptyState text="لا يوجد مستخدمون" /> : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="rounded-2xl p-3 flex items-center gap-3"
              style={{ background: CARD_BG, border: CARD_BORDER }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: GOLD_SOFT, color: GOLD }}>
                {u.username?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-white text-sm font-bold truncate">{u.username}</p>
                  {u.verified && <BadgeCheck size={12} style={{ color: "#60a5fa" }} />}
                  {u.suspended && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>محظور</span>}
                </div>
                <p className="text-white/30 text-xs">Lv.{u.level} · {u.matchesPlayed} مباراة · {fmtDate(u.createdAt)}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {busy === u.id ? <RefreshCw size={13} className="animate-spin text-white/40" /> : (
                  <>
                    {u.verified
                      ? <IconBtn onClick={() => act(u.id, "remove-verify")} icon={XCircle} color="#f87171" title="إزالة التوثيق" />
                      : <IconBtn onClick={() => act(u.id, "force-verify")} icon={CheckCircle} color="#60a5fa" title="توثيق فوري" />}
                    <IconBtn onClick={() => act(u.id, "suspend")} icon={u.suspended ? UserCheck : UserX} color={u.suspended ? "#34d399" : "#f87171"} title={u.suspended ? "إلغاء الحظر" : "حظر"} />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {total > limit && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-30" style={{ background: CARD_BG, color: "white" }}>السابق</button>
          <span className="text-white/40 text-xs">{page} / {Math.ceil(total / limit)}</span>
          <button disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-30" style={{ background: CARD_BG, color: "white" }}>التالي</button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════ 3. Social Content ═══════════════════════════ */
interface AdminPost {
  id: string; username: string; content: string; imageUrl: string | null;
  likes: number; replies: number; views: number; isPinned: boolean; isPublic: boolean; createdAt: string;
}

function SocialSection() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, unknown>[]>([]);
  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.ownerDashboard.posts(page, limit, search);
      setPosts(data.posts as unknown as AdminPost[]);
      setTotal(data.total);
    } catch { /* noop */ } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const toggleVisibility = async (id: string, isPublic: boolean) => {
    setBusy(id);
    try { await api.ownerDashboard.setPostVisibility(id, !isPublic); toast.success("تم التحديث"); load(); }
    catch { toast.error("فشل الإجراء"); } finally { setBusy(null); }
  };

  const removePost = async (id: string) => {
    setBusy(id);
    try { await api.ownerDashboard.deletePost(id); toast.success("تم الحذف"); load(); }
    catch { toast.error("فشل الحذف"); } finally { setBusy(null); }
  };

  const viewComments = async (postId: string) => {
    if (openComments === postId) { setOpenComments(null); return; }
    setOpenComments(postId);
    try { setComments(await api.ownerDashboard.postComments(postId)); } catch { setComments([]); }
  };

  const removeComment = async (commentId: string, postId: string) => {
    try { await api.ownerDashboard.deleteComment(commentId); setComments(await api.ownerDashboard.postComments(postId)); toast.success("تم حذف التعليق"); }
    catch { toast.error("فشل حذف التعليق"); }
  };

  return (
    <div>
      <SectionHeader title="إدارة المحتوى الاجتماعي" subtitle={`${total} منشور`} />
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="بحث باسم الكاتب..."
          className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none text-white"
          style={{ background: CARD_BG, border: CARD_BORDER }} />
      </div>

      {loading ? <LoadingGrid count={6} /> : posts.length === 0 ? <EmptyState text="لا توجد منشورات" /> : (
        <div className="space-y-2">
          {posts.map((p) => (
            <div key={p.id} className="rounded-2xl p-3" style={{ background: CARD_BG, border: CARD_BORDER }}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-white text-sm font-bold">{p.username}</p>
                    {!p.isPublic && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>مخفي</span>}
                  </div>
                  <p className="text-white/50 text-xs mt-1 line-clamp-2">{p.content || "(بدون نص)"}</p>
                  <p className="text-white/25 text-[11px] mt-1">
                    ❤ {p.likes} · 💬 {p.replies} · 👁 {p.views} · {fmtDate(p.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {busy === p.id ? <RefreshCw size={13} className="animate-spin text-white/40" /> : (
                    <>
                      <IconBtn onClick={() => viewComments(p.id)} icon={MessageSquare} color="#60a5fa" title="التعليقات" />
                      <IconBtn onClick={() => toggleVisibility(p.id, p.isPublic)} icon={p.isPublic ? EyeOff : Eye} color="#fbbf24" title={p.isPublic ? "إخفاء" : "إظهار"} />
                      <IconBtn onClick={() => removePost(p.id)} icon={Trash2} color="#f87171" title="حذف" />
                    </>
                  )}
                </div>
              </div>

              {openComments === p.id && (
                <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  {comments.length === 0 ? <p className="text-white/25 text-xs">لا توجد تعليقات</p> : comments.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 text-xs">
                      <p className="text-white/60 truncate"><span className="text-white/80 font-bold">{c.username}:</span> {c.content}</p>
                      <button onClick={() => removeComment(c.id, p.id)} className="text-red-400/70 hover:text-red-400 flex-shrink-0"><Trash2 size={11} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {total > limit && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-30" style={{ background: CARD_BG, color: "white" }}>السابق</button>
          <span className="text-white/40 text-xs">{page} / {Math.ceil(total / limit)}</span>
          <button disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-30" style={{ background: CARD_BG, color: "white" }}>التالي</button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════ 4. SkillLeague Management ═══════════════════════════ */
function LeaguesSection() {
  const [data, setData] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [leagues, recent] = await Promise.all([
        api.ownerDashboard.leagues(),
        api.ownerDashboard.recentMatches(20),
      ]);
      setData(leagues as any[]);
      setMatches(recent as any[]);
    } catch { /* noop */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <SectionHeader title="إدارة الدوريات والمواسم" subtitle="الترتيب، المواسم، والمباريات الأخيرة"
        action={
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
            style={{ background: GOLD_SOFT, color: GOLD, border: `1px solid ${GOLD}40` }}>
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> تحديث
          </button>
        } />

      {loading ? <LoadingGrid count={4} /> : (
        <div className="grid md:grid-cols-2 gap-3 mb-6">
          {data.map((d) => (
            <div key={d.league?.id} className="rounded-2xl p-4" style={{ background: CARD_BG, border: CARD_BORDER }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-bold text-sm">{d.league?.emblem} {d.league?.name ?? d.league?.id}</p>
                <span className="text-xs text-white/30">جولة {d.season?.currentRound ?? "—"}/{d.season?.totalRounds ?? 30}</span>
              </div>
              <p className="text-white/30 text-xs mb-2">{d.totalPlayers} لاعب في هذا الموسم</p>
              <div className="space-y-1">
                {(d.topStandings ?? []).slice(0, 5).map((s: any, i: number) => (
                  <div key={s.playerId ?? i} className="flex items-center justify-between text-xs">
                    <span className="text-white/60">#{i + 1} {s.playerName}</span>
                    <span className="text-white/40">{s.points} نقطة</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">مباريات أخيرة</h3>
      {loading ? <LoadingGrid count={4} /> : matches.length === 0 ? <EmptyState text="لا توجد مباريات" /> : (
        <div className="space-y-1.5">
          {matches.map((m: any) => (
            <div key={m.id} className="rounded-xl px-3 py-2 flex items-center justify-between text-xs"
              style={{ background: CARD_BG, border: CARD_BORDER }}>
              <span className="text-white/60">{m.playerAId} vs {m.playerBId}</span>
              <span className="text-white/30">{fmtDate(m.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════ 5. Economy & Pi ═══════════════════════════ */
function EconomySection() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api.ownerDashboard.economy()); } catch { /* noop */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <SectionHeader title="الاقتصاد ونظام Pi" subtitle="محافظ اللاعبين، الاشتراكات، ومدفوعات Pi" />
      {loading || !data ? <LoadingGrid count={4} /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard label="Pi مؤكد" value={n(data.piTotals?.confirmed_total)} icon={Coins} />
            <StatCard label="Pi قيد الانتظار" value={n(data.piTotals?.pending_total)} icon={Clock} color="#fbbf24" />
            <StatCard label="هدايا مكتملة" value={n(data.piTotals?.gift_count)} icon={TrendingUp} color="#f472b6" />
            <StatCard label="مشتريات مكتملة" value={n(data.piTotals?.purchase_count)} icon={Trophy} color="#60a5fa" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">الاشتراكات الفعّالة</h3>
              <div className="space-y-1.5">
                {(data.subscriptionsByPlan ?? []).length === 0 ? <EmptyState text="لا توجد اشتراكات" /> :
                  data.subscriptionsByPlan.map((s: any) => (
                    <div key={s.plan} className="rounded-xl px-3 py-2 flex items-center justify-between text-sm"
                      style={{ background: CARD_BG, border: CARD_BORDER }}>
                      <span className="text-white/70 font-semibold">{s.plan}</span>
                      <span className="font-bold" style={{ color: GOLD }}>{s.count}</span>
                    </div>
                  ))}
              </div>

              <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2 mt-5">أعلى الأرصدة (DN$)</h3>
              <div className="space-y-1.5">
                {(data.topBalances ?? []).map((b: any, i: number) => (
                  <div key={i} className="rounded-xl px-3 py-2 flex items-center justify-between text-xs"
                    style={{ background: CARD_BG, border: CARD_BORDER }}>
                    <span className="text-white/60">{b.username} (Lv.{b.level})</span>
                    <span className="text-white/40">{n(b.dn)} DN$</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">آخر مدفوعات Pi</h3>
              <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                {(data.piPayments ?? []).length === 0 ? <EmptyState text="لا توجد مدفوعات" /> :
                  data.piPayments.map((p: any) => (
                    <div key={p.id} className="rounded-xl px-3 py-2 flex items-center justify-between text-xs"
                      style={{ background: CARD_BG, border: CARD_BORDER }}>
                      <div>
                        <p className="text-white/60">{p.kind} · {p.status}</p>
                        <p className="text-white/25 text-[10px]">{fmtDate(p.createdAt)}</p>
                      </div>
                      <span className="font-bold" style={{ color: GOLD }}>{p.amount}π</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════ 6. Verification ═══════════════════════════ */
function VerificationSection() {
  const [pending, setPending] = useState<any[]>([]);
  const [verified, setVerified] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, v] = await Promise.all([api.verification.pending(), api.ownerDashboard.verifiedList()]);
      setPending(p as any[]);
      setVerified(v as any[]);
    } catch { /* noop */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const id = setInterval(load, 30_000); return () => clearInterval(id); }, [load]);

  const act = async (userId: string, action: "approve" | "reject") => {
    setBusy(userId);
    try {
      if (action === "approve") await api.verification.approve(userId);
      else await api.verification.reject(userId);
      toast.success(action === "approve" ? "تم قبول التوثيق" : "تم رفض التوثيق");
      load();
    } catch { toast.error("فشل الإجراء"); } finally { setBusy(null); }
  };

  return (
    <div>
      <SectionHeader title="إدارة التوثيق" subtitle={`${pending.length} طلب بانتظار المراجعة`} />
      {loading ? <LoadingGrid count={4} /> : pending.length === 0 ? <EmptyState text="لا توجد طلبات معلّقة" /> : (
        <div className="space-y-2 mb-6">
          {pending.map((u) => (
            <div key={u.id} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: CARD_BG, border: CARD_BORDER }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: GOLD_SOFT, color: GOLD }}>{u.username?.[0]?.toUpperCase() ?? "?"}</div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">{u.username}</p>
                <p className="text-white/30 text-xs">Lv.{u.level} · {u.matchesPlayed} مباراة</p>
              </div>
              {busy === u.id ? <RefreshCw size={13} className="animate-spin text-white/40" /> : (
                <div className="flex items-center gap-1.5">
                  <IconBtn onClick={() => act(u.id, "approve")} icon={CheckCircle} color="#34d399" title="قبول" />
                  <IconBtn onClick={() => act(u.id, "reject")} icon={XCircle} color="#f87171" title="رفض" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">حسابات موثّقة</h3>
      {loading ? <LoadingGrid count={4} /> : verified.length === 0 ? <EmptyState text="لا يوجد حسابات موثقة بعد" /> : (
        <div className="grid md:grid-cols-2 gap-2">
          {verified.map((u: any) => (
            <div key={u.id} className="rounded-xl px-3 py-2 flex items-center gap-2 text-sm" style={{ background: CARD_BG, border: CARD_BORDER }}>
              <BadgeCheck size={14} style={{ color: "#60a5fa" }} />
              <span className="text-white/70">{u.username}</span>
              <span className="text-white/25 text-xs ml-auto">Lv.{u.level}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════ 7. Notifications / Announcements ═══════════════════════════ */
function AnnouncementsSection() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setHistory(await api.ownerDashboard.announcements()); } catch { /* noop */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (!title.trim() || !body.trim()) { toast.error("العنوان والنص مطلوبان"); return; }
    setSending(true);
    try {
      const res = await api.ownerDashboard.announce(title.trim(), body.trim());
      toast.success(`تم الإرسال إلى ${res.recipients} مستخدم`);
      setTitle(""); setBody("");
      load();
    } catch { toast.error("فشل الإرسال"); } finally { setSending(false); }
  };

  return (
    <div>
      <SectionHeader title="الإشعارات والإعلانات" subtitle="إرسال إعلان لجميع المستخدمين" />

      <div className="rounded-2xl p-4 space-y-3 mb-6" style={{ background: CARD_BG, border: CARD_BORDER }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الإعلان"
          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-white"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="نص الإعلان" rows={3}
          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-white resize-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
        <button onClick={send} disabled={sending}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
          style={{ background: GOLD, color: "#0a0a0a" }}>
          <Send size={14} /> {sending ? "جارٍ الإرسال..." : "إرسال للجميع"}
        </button>
      </div>

      <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">سجل الإعلانات</h3>
      {loading ? <LoadingGrid count={3} /> : history.length === 0 ? <EmptyState text="لا يوجد إعلانات سابقة" /> : (
        <div className="space-y-2">
          {history.map((h: any) => (
            <div key={h.broadcast_id} className="rounded-xl p-3" style={{ background: CARD_BG, border: CARD_BORDER }}>
              <div className="flex items-center justify-between">
                <p className="text-white text-sm font-bold">{h.title}</p>
                <span className="text-white/25 text-[11px]">{fmtDate(h.created_at)}</span>
              </div>
              <p className="text-white/50 text-xs mt-1">{h.body}</p>
              <p className="text-white/25 text-[11px] mt-1">أُرسل إلى {n(h.recipients)} مستخدم</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════ 8. Security & Logs ═══════════════════════════ */
function SecuritySection() {
  const [suspicious, setSuspicious] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"flags" | "logs">("flags");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([
        api.admin.suspicious(),
        api.admin.logs(100).catch(() => []),
      ]);
      setSuspicious(s as any[]);
      setLogs(l as any[]);
    } catch { /* noop */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id: string) => {
    setBusy(id);
    try { await api.admin.resolveSuspicious(id); toast.success("تم الحل"); load(); }
    catch { toast.error("فشل الإجراء"); } finally { setBusy(null); }
  };

  return (
    <div>
      <SectionHeader title="الأمان والسجلات" subtitle="الأنشطة المشبوهة وسجل التدقيق"
        action={
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
            style={{ background: GOLD_SOFT, color: GOLD, border: `1px solid ${GOLD}40` }}>
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> تحديث
          </button>
        } />

      <div className="flex gap-2 mb-4">
        {([
          { id: "flags", label: `أنشطة مشبوهة (${suspicious.length})`, icon: AlertTriangle },
          { id: "logs", label: "سجل التدقيق", icon: Lock },
        ] as const).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: active ? GOLD_SOFT : CARD_BG,
                color: active ? GOLD : "rgba(255,255,255,0.5)",
                border: active ? `1px solid ${GOLD}40` : CARD_BORDER,
              }}>
              <Icon size={12} /> {t.label}
            </button>
          );
        })}
      </div>

      {loading ? <LoadingGrid count={4} /> : tab === "flags" ? (
        suspicious.length === 0 ? <EmptyState text="لا توجد أنشطة مشبوهة" /> : (
          <div className="space-y-2">
            {suspicious.map((s: any) => (
              <div key={s.id} className="rounded-xl p-3 flex items-start gap-3" style={{ background: CARD_BG, border: CARD_BORDER }}>
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5"
                  style={{ color: s.severity === "high" ? "#f87171" : s.severity === "medium" ? "#fbbf24" : "#60a5fa" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold">{s.type}</p>
                  <p className="text-white/40 text-xs">Player: {s.player_id ?? "—"} · {fmtDate(s.created_at)}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>{s.severity}</span>
                {busy === s.id ? <RefreshCw size={13} className="animate-spin text-white/40 flex-shrink-0" /> :
                  <IconBtn onClick={() => resolve(s.id)} icon={CheckCircle} color="#34d399" title="تمييز كمحلول" />}
              </div>
            ))}
          </div>
        )
      ) : (
        logs.length === 0 ? <EmptyState text="لا توجد سجلات" /> : (
          <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
            {logs.map((l: any, i: number) => (
              <div key={l.id ?? i} className="rounded-xl px-3 py-2 text-xs" style={{ background: CARD_BG, border: CARD_BORDER }}>
                <div className="flex items-center justify-between">
                  <span className="text-white/70 font-semibold">{l.action ?? l.type ?? "event"}</span>
                  <span className="text-white/25">{fmtDate(l.created_at)}</span>
                </div>
                {l.player_id && <p className="text-white/30 mt-0.5">Player: {l.player_id}</p>}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

/* ═══════════════════════════ Main Dashboard Shell ═══════════════════════════ */
type SectionId = "overview" | "users" | "social" | "leagues" | "economy" | "verification" | "notifications" | "security";

const NAV: { id: SectionId; label: string; icon: any }[] = [
  { id: "overview",      label: "نظرة عامة",      icon: LayoutDashboard },
  { id: "users",         label: "المستخدمون",      icon: Users },
  { id: "social",        label: "المحتوى الاجتماعي", icon: MessageSquare },
  { id: "leagues",       label: "الدوريات",        icon: Trophy },
  { id: "economy",       label: "الاقتصاد و Pi",   icon: Coins },
  { id: "verification",  label: "التوثيق",         icon: BadgeCheck },
  { id: "notifications", label: "الإعلانات",       icon: Bell },
  { id: "security",      label: "الأمان والسجلات", icon: ShieldAlert },
];

export default function OwnerDashboard() {
  const { isOwner, checked } = useOwnerAccess();
  const [, navigate] = useLocation();
  const [section, setSection] = useState<SectionId>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (checked && !isOwner) navigate("/settings");
  }, [checked, isOwner, navigate]);

  if (!checked) return null;
  if (!isOwner) return null;

  const ActiveIcon = NAV.find((i) => i.id === section)?.icon ?? LayoutDashboard;

  return (
    <div className="min-h-screen w-full flex" style={{ background: BG }}>
      {/* ── Sidebar (desktop) ─────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 flex-shrink-0 p-4"
        style={{ borderRight: "1px solid rgba(212,175,55,0.15)" }}>
        <div className="flex items-center gap-2.5 px-2 py-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${GOLD}, #8a6d1f)`, boxShadow: `0 0 18px ${GOLD}55` }}>
            <Crown size={16} className="text-black" />
          </div>
          <div>
            <p className="text-white font-black text-sm leading-tight">Owner Control</p>
            <p className="text-white/30 text-[10px]">S.S.C · لوحة تحكم خاصة</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button key={item.id} onClick={() => setSection(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: active ? GOLD_SOFT : "transparent",
                  color: active ? GOLD : "rgba(255,255,255,0.55)",
                  border: active ? `1px solid ${GOLD}40` : "1px solid transparent",
                }}>
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <button onClick={() => navigate("/settings")}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/40 hover:text-white/70 transition-colors">
          <ChevronLeft size={15} /> العودة للإعدادات
        </button>
      </aside>

      {/* ── Mobile top bar ────────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 py-3.5"
        style={{ background: "rgba(5,5,5,0.9)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${GOLD}25` }}>
        <button onClick={() => navigate("/settings")}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}>
          <ChevronLeft size={15} className="text-white/60" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <ActiveIcon size={15} style={{ color: GOLD }} />
          <p className="text-white font-bold text-sm">{NAV.find((i) => i.id === section)?.label}</p>
        </div>
        <button onClick={() => setMobileNavOpen(true)}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}>
          <Menu size={15} className="text-white/60" />
        </button>
      </div>

      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div className="md:hidden fixed inset-0 z-40 flex"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setMobileNavOpen(false)} />
            <motion.div className="relative w-72 h-full p-4 flex flex-col"
              style={{ background: "#0a0906" }}
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "tween", duration: 0.2 }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white font-black text-sm">Owner Control</p>
                <button onClick={() => setMobileNavOpen(false)}><X size={18} className="text-white/50" /></button>
              </div>
              <nav className="flex-1 space-y-1">
                {NAV.map((item) => {
                  const Icon = item.icon;
                  const active = section === item.id;
                  return (
                    <button key={item.id} onClick={() => { setSection(item.id); setMobileNavOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: active ? GOLD_SOFT : "transparent", color: active ? GOLD : "rgba(255,255,255,0.55)" }}>
                      <Icon size={15} /> {item.label}
                    </button>
                  );
                })}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 px-4 md:px-8 py-6 pt-20 md:pt-8 pb-16 max-w-5xl">
        <AnimatePresence mode="wait">
          <motion.div key={section}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {section === "overview" && <OverviewSection />}
            {section === "users" && <UsersSection />}
            {section === "social" && <SocialSection />}
            {section === "leagues" && <LeaguesSection />}
            {section === "economy" && <EconomySection />}
            {section === "verification" && <VerificationSection />}
            {section === "notifications" && <AnnouncementsSection />}
            {section === "security" && <SecuritySection />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
