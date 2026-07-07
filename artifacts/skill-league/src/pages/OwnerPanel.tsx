import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  ShieldCheck, Users, Activity, Clock, TrendingUp, AlertTriangle,
  Search, ChevronLeft, ChevronRight, CheckCircle, XCircle,
  UserX, UserCheck, Eye, RefreshCw, BarChart3, Lock, BadgeCheck,
} from "lucide-react";
import { api, getToken } from "@/lib/apiClient";

/* ─── JWT role decoder (client-side, no signature needed) ─────────────── */
function getJwtRole(): string | null {
  try {
    const token = getToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

function useOwnerAccess() {
  const [role, setRole] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    setRole(getJwtRole());
    setChecked(true);
  }, []);
  return { isOwner: role === "admin", checked };
}

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface OverviewStats {
  total_players: string;
  active_7d: string;
  active_24h: string;
  verified_players: string;
  pending_verifications: string;
  suspended_players: string;
  new_players_24h: string;
  matches_24h: string;
  total_gifts: string;
  total_dn_volume: string;
  open_flags: string;
}

interface AdminUser {
  id: string;
  username: string;
  avatar: string;
  level: number;
  matchesPlayed: number;
  verified: boolean;
  verificationStatus: string;
  suspended: boolean;
  createdAt: string;
  lastActiveAt: string;
}

interface PendingRequest {
  id: string;
  username: string;
  avatar: string;
  level: number;
  matchesPlayed: number;
  verificationRequestedAt: string | null;
  createdAt: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const n = (v: string | number | undefined) => Number(v ?? 0).toLocaleString();

function timeAgo(ts: string | null | undefined) {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function shortDate(ts: string | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function verificationBadge(status: string, verified: boolean) {
  if (verified || status === "approved") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" }}>
      <BadgeCheck size={10} /> Verified
    </span>
  );
  if (status === "pending") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)" }}>
      <Clock size={10} /> Pending
    </span>
  );
  if (status === "rejected") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
      <XCircle size={10} /> Rejected
    </span>
  );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)" }}>
      None
    </span>
  );
}

/* ─── Section: Overview Cards ────────────────────────────────────────────── */
function OverviewSection({ stats, loading, onRefresh }: { stats: OverviewStats | null; loading: boolean; onRefresh: () => void }) {
  const cards = stats ? [
    { label: "Total Users",         value: n(stats.total_players),      icon: Users,        color: "#60a5fa", glow: "rgba(59,130,246,0.2)" },
    { label: "Active (7 days)",      value: n(stats.active_7d),          icon: Activity,     color: "#34d399", glow: "rgba(52,211,153,0.2)" },
    { label: "Verified Users",       value: n(stats.verified_players),   icon: BadgeCheck,   color: "#818cf8", glow: "rgba(129,140,248,0.2)" },
    { label: "Pending Verification", value: n(stats.pending_verifications), icon: Clock,     color: "#fbbf24", glow: "rgba(251,191,36,0.2)" },
    { label: "Total Gifts Sent",     value: n(stats.total_gifts),        icon: TrendingUp,   color: "#f472b6", glow: "rgba(244,114,182,0.2)" },
    { label: "DN Economy Volume",    value: n(stats.total_dn_volume),    icon: BarChart3,    color: "#fb923c", glow: "rgba(251,146,60,0.2)" },
  ] : [];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white/70 text-xs font-bold uppercase tracking-widest">Platform Overview</h2>
        <button onClick={onRefresh} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
            ))
          : cards.map((c) => {
              const Icon = c.icon;
              return (
                <motion.div key={c.label}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                  className="rounded-2xl p-4 flex flex-col gap-1.5 relative overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(12px)" }}>
                  <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-20"
                    style={{ background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`, transform: "translate(30%, -30%)" }} />
                  <div className="flex items-center justify-between">
                    <p className="text-white/40 text-xs font-medium leading-tight">{c.label}</p>
                    <Icon size={13} style={{ color: c.color, opacity: 0.7 }} />
                  </div>
                  <p className="text-white font-black text-xl leading-none" style={{ color: c.color }}>{c.value}</p>
                </motion.div>
              );
            })}
      </div>

      {/* Secondary row */}
      {stats && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: "New today",     value: n(stats.new_players_24h) },
            { label: "Matches / 24h", value: n(stats.matches_24h) },
            { label: "Open flags",    value: n(stats.open_flags) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl px-3 py-2.5 text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-white font-bold text-sm">{s.value}</p>
              <p className="text-white/30 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Section: Verification Control ─────────────────────────────────────── */
function VerificationSection() {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.verification.pending();
      setRequests(data as PendingRequest[]);
    } catch { /* access denied or empty */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  // Poll every 30s
  useEffect(() => {
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, [fetch]);

  const act = async (userId: string, username: string, action: "approve" | "reject") => {
    if (busy) return;
    setBusy(userId);
    try {
      if (action === "approve") {
        await api.verification.approve(userId);
        toast.success(`✅ ${username} verified`);
      } else {
        await api.verification.reject(userId);
        toast.success(`❌ ${username} rejected`);
      }
      setRequests(prev => prev.filter(r => r.id !== userId));
    } catch { toast.error("Action failed"); }
    finally { setBusy(null); }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white/70 text-xs font-bold uppercase tracking-widest">
          Verification Requests {requests.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-black" style={{ background: "#fbbf24", color: "#000" }}>
              {requests.length}
            </span>
          )}
        </h2>
        <button onClick={fetch}
          className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1">
          <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="h-16 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
      ) : requests.length === 0 ? (
        <div className="rounded-2xl flex items-center gap-3 px-4 py-4"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <CheckCircle size={18} className="text-emerald-400 opacity-60" />
          <p className="text-white/30 text-sm">No pending requests</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {requests.map((r) => (
              <motion.div key={r.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30, scale: 0.95 }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(59,130,246,0.15)" }}>
                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm overflow-hidden"
                  style={{ background: "linear-gradient(135deg,#1e3a5f,#1e40af)" }}>
                  {r.avatar?.startsWith("data:") || r.avatar?.startsWith("http")
                    ? <img src={r.avatar} alt="" className="w-full h-full object-cover" />
                    : <span>{r.username[0]?.toUpperCase()}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold truncate">@{r.username}</p>
                  <p className="text-white/30 text-xs">Lv {r.level} · {r.matchesPlayed} matches · {timeAgo(r.verificationRequestedAt)}</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => act(r.id, r.username, "approve")} disabled={!!busy}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
                    style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.4)" }}>
                    {busy === r.id ? <RefreshCw size={12} className="animate-spin text-blue-400" /> : <CheckCircle size={13} className="text-blue-400" />}
                  </button>
                  <button onClick={() => act(r.id, r.username, "reject")} disabled={!!busy}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                    <XCircle size={13} className="text-red-400" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/* ─── Section: User Management Table ────────────────────────────────────── */
function UsersSection({ onViewProfile }: { onViewProfile: (id: string) => void }) {
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState<string | null>(null);
  const [search, setSearch]   = useState("");
  const [searchInput, setSearchInput] = useState("");
  const LIMIT = 15;

  const fetchUsers = useCallback(async (p: number, s: string) => {
    setLoading(true);
    try {
      const data = await api.owner.users(p, LIMIT, s);
      setUsers(data.users);
      setTotal(Number(data.total));
    } catch { /* forbidden */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(page, search); }, [page, search, fetchUsers]);

  const handleSearch = () => { setPage(1); setSearch(searchInput); };

  const act = async (userId: string, action: "force-verify" | "remove-verify" | "suspend") => {
    if (busy) return;
    setBusy(userId + action);
    try {
      if (action === "force-verify") {
        await api.owner.forceVerify(userId);
        toast.success("User verified ✅");
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, verified: true, verificationStatus: "approved" } : u));
      } else if (action === "remove-verify") {
        await api.owner.removeVerify(userId);
        toast.success("Verification removed");
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, verified: false, verificationStatus: "none" } : u));
      } else {
        const res = await api.owner.suspend(userId);
        toast.success(res.suspended ? "User suspended" : "User unsuspended");
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, suspended: res.suspended } : u));
      }
    } catch { toast.error("Action failed"); }
    finally { setBusy(null); }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white/70 text-xs font-bold uppercase tracking-widest">
          User Management <span className="ml-1 text-white/30 font-normal normal-case">({n(total)})</span>
        </h2>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2 px-3 rounded-xl h-9"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Search size={13} className="text-white/30 flex-shrink-0" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Search username…"
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/25"
          />
        </div>
        <button onClick={handleSearch}
          className="px-4 h-9 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
          style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.35)" }}>
          Search
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
        {/* Header */}
        <div className="grid px-4 py-2.5"
          style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr auto", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {["User", "Joined", "Status", "Activity", "Actions"].map(h => (
            <p key={h} className="text-white/30 text-xs font-bold uppercase tracking-wide">{h}</p>
          ))}
        </div>

        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse mx-4 my-2 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }} />
            ))
          : users.map((u, i) => (
              <motion.div key={u.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                className="grid items-center px-4 py-3 gap-2 transition-colors hover:bg-white/[0.02]"
                style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr auto", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>

                {/* User */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-bold overflow-hidden"
                    style={{ background: "linear-gradient(135deg,#1e3a5f,#1e1b4b)" }}>
                    {u.avatar?.startsWith("data:") || u.avatar?.startsWith("http")
                      ? <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                      : <span>{u.username[0]?.toUpperCase()}</span>}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-white text-xs font-bold truncate">@{u.username}</p>
                      {u.suspended && (
                        <span className="px-1 rounded text-[9px] font-black" style={{ background: "rgba(239,68,68,0.2)", color: "#f87171" }}>BANNED</span>
                      )}
                    </div>
                    <p className="text-white/25 text-[10px] truncate">Lv {u.level}</p>
                  </div>
                </div>

                {/* Joined */}
                <p className="text-white/35 text-xs">{shortDate(u.createdAt)}</p>

                {/* Status */}
                <div>{verificationBadge(u.verificationStatus, u.verified)}</div>

                {/* Activity */}
                <p className="text-white/35 text-xs">{u.matchesPlayed} matches</p>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button onClick={() => onViewProfile(u.id)} title="View profile"
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90 hover:bg-white/10">
                    <Eye size={11} className="text-white/40" />
                  </button>
                  {!u.verified ? (
                    <button onClick={() => act(u.id, "force-verify")} title="Force verify" disabled={!!busy}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90 hover:bg-blue-500/20 disabled:opacity-40">
                      <UserCheck size={11} className="text-blue-400" />
                    </button>
                  ) : (
                    <button onClick={() => act(u.id, "remove-verify")} title="Remove verification" disabled={!!busy}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90 hover:bg-purple-500/20 disabled:opacity-40">
                      <BadgeCheck size={11} className="text-purple-400 opacity-60" />
                    </button>
                  )}
                  <button onClick={() => act(u.id, "suspend")} title={u.suspended ? "Unsuspend" : "Suspend"} disabled={!!busy}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90 hover:bg-red-500/20 disabled:opacity-40">
                    <UserX size={11} className={u.suspended ? "text-emerald-400" : "text-red-400 opacity-60"} />
                  </button>
                </div>
              </motion.div>
            ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 px-1">
          <p className="text-white/25 text-xs">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 transition-all active:scale-90"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <ChevronLeft size={13} className="text-white/60" />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 transition-all active:scale-90"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <ChevronRight size={13} className="text-white/60" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function OwnerPanel() {
  const [, navigate] = useLocation();
  const { isOwner, checked } = useOwnerAccess();

  const [stats, setStats]       = useState<OverviewStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await api.owner.overview();
      setStats(data);
    } catch { /* forbidden */ }
    finally { setStatsLoading(false); }
  }, []);

  useEffect(() => {
    if (isOwner) fetchStats();
  }, [isOwner, fetchStats]);

  // Access denied
  if (!checked) return null;

  if (!isOwner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: "linear-gradient(160deg,#060610,#0a0818,#060610)" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <Lock size={28} className="text-red-400" />
        </div>
        <p className="text-white font-bold text-lg">Access Denied</p>
        <p className="text-white/30 text-sm mt-1 mb-6">Owner access required</p>
        <button onClick={() => navigate("/")}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white/70 transition-all active:scale-95"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col"
      style={{ background: "linear-gradient(160deg,#060610 0%,#0a0818 40%,#060d1f 100%)" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4"
        style={{ background: "rgba(6,6,16,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <button onClick={() => navigate("/")}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ChevronLeft size={15} className="text-white/60" />
        </button>

        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", boxShadow: "0 0 16px rgba(79,70,229,0.4)" }}>
            <ShieldCheck size={14} className="text-white" />
          </div>
          <div>
            <p className="text-white font-black text-sm leading-tight">Owner Control Center</p>
            <p className="text-white/30 text-[10px]">S.S.C Admin · Private</p>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-1.5">
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-emerald-400/70 text-xs font-semibold">Live</span>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-5 pb-10 max-w-2xl mx-auto w-full">
        <OverviewSection stats={stats} loading={statsLoading} onRefresh={fetchStats} />
        <VerificationSection />
        <UsersSection onViewProfile={(id) => navigate(`/profile/${id}`)} />

        {/* System Monitor */}
        <div>
          <h2 className="text-white/70 text-xs font-bold uppercase tracking-widest mb-3">System Monitor</h2>
          <div className="grid grid-cols-2 gap-3">
            {stats && [
              { label: "Active flags",    value: n(stats.open_flags),    icon: AlertTriangle, color: "#f87171" },
              { label: "Suspended users", value: n(stats.suspended_players), icon: UserX, color: "#fb923c" },
              { label: "Active today",    value: n(stats.active_24h),    icon: Activity,      color: "#34d399" },
              { label: "New today",       value: n(stats.new_players_24h), icon: Users,       color: "#60a5fa" },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="rounded-2xl p-3 flex items-center gap-3"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${c.color}18`, border: `1px solid ${c.color}30` }}>
                    <Icon size={14} style={{ color: c.color }} />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{c.value}</p>
                    <p className="text-white/30 text-xs">{c.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
