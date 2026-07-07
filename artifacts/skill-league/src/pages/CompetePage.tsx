import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { useQuery } from "@tanstack/react-query";
import { leagueApi, type Tournament } from "@/lib/league-api";

// ── Helpers ──────────────────────────────────────────────────────────────────

function tournamentMeta(type: string) {
  const map: Record<string, { color: string; colorRgb: string; icon: string }> = {
    daily:   { color: "#4ade80", colorRgb: "74,222,128",  icon: "🏆" },
    weekly:  { color: "#fbbf24", colorRgb: "251,191,36",  icon: "🥇" },
    invite:  { color: "#a78bfa", colorRgb: "167,139,250", icon: "💠" },
    champion:{ color: "#f472b6", colorRgb: "244,114,182", icon: "👑" },
    monthly: { color: "#f472b6", colorRgb: "244,114,182", icon: "👑" },
  };
  return map[type] ?? { color: "#60a5fa", colorRgb: "96,165,250", icon: "🏅" };
}

function statusBadge(t: Tournament): string {
  if (t.status === "full") return "FULL";
  const now = new Date();
  if (t.startAt && new Date(t.startAt) > now) return "SOON";
  if (t.status === "open") return "OPEN";
  return "ENDED";
}

function statusLabel(t: Tournament): string {
  if (t.status === "full") return "ممتلئ";
  const now = new Date();
  if (t.startAt && new Date(t.startAt) > now) return "قريباً";
  if (t.status === "open") return "مفتوح";
  return "منتهي";
}

function statusColor(t: Tournament): string {
  const badge = statusBadge(t);
  if (badge === "FULL") return "#f87171";
  if (badge === "SOON") return "#fbbf24";
  if (badge === "OPEN") return "#4ade80";
  return "#6b7280";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
}

function fmtDN(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : String(n);
}

// ── Particles ────────────────────────────────────────────────────────────────

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  x: (i * 137.5) % 100,
  y: (i * 97.3) % 100,
  size: 1.5 + (i % 4),
  color: i % 3 === 0 ? "#a78bfa" : i % 3 === 1 ? "#60a5fa" : "#f472b6",
  dur: 4 + (i % 4),
  delay: (i * 0.35) % 3.5,
}));

// ── Tournament card ───────────────────────────────────────────────────────────

function TournamentCard({ t, index }: { t: Tournament; index: number }) {
  const meta  = tournamentMeta(t.type);
  const badge = statusBadge(t);
  const sColor = statusColor(t);

  return (
    <motion.div
      key={t.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 + index * 0.08 }}
      className="relative rounded-3xl overflow-hidden p-4"
      style={{
        background: `linear-gradient(135deg, rgba(${meta.colorRgb},0.12) 0%, rgba(0,0,0,0.6) 100%)`,
        border: `1.5px solid rgba(${meta.colorRgb},0.22)`,
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)` }}
      />

      <div className="flex items-center gap-4">
        <div
          className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
          style={{
            background: `rgba(${meta.colorRgb},0.14)`,
            border: `2px solid rgba(${meta.colorRgb},0.3)`,
          }}
        >
          {meta.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-base font-black text-white">{t.name}</span>
            <span
              className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                background: `rgba(${meta.colorRgb},0.15)`,
                color: sColor,
                border: `1px solid rgba(${meta.colorRgb},0.3)`,
              }}
            >
              {badge}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>
              DN$ {fmtDN(t.rewardDN)} جائزة
            </span>
            <span className="text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>
              👥 {(t.participants ?? []).length}/{t.size}
            </span>
            <span className="text-[11px] font-bold" style={{ color: meta.color }}>
              {statusLabel(t)}
            </span>
          </div>

          {t.startAt && (
            <div className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.22)" }}>
              يبدأ {formatDate(t.startAt)}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Upcoming event row ────────────────────────────────────────────────────────

function UpcomingRow({ t, index, total }: { t: Tournament; index: number; total: number }) {
  const meta = tournamentMeta(t.type);
  return (
    <div
      className="flex items-center gap-4 px-4 py-3.5"
      style={{
        borderBottom: index < total - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
      }}
    >
      <div
        className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl"
        style={{ background: `rgba(${meta.colorRgb},0.1)`, border: `1px solid rgba(${meta.colorRgb},0.2)` }}
      >
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-black text-white">{t.name}</div>
        <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.38)" }}>
          DN$ {fmtDN(t.rewardDN)} · 👥 {t.size} لاعب
        </div>
      </div>
      <div
        className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg"
        style={{
          background: `rgba(${meta.colorRgb},0.1)`,
          border: `1px solid rgba(${meta.colorRgb},0.2)`,
          color: meta.color,
        }}
      >
        {t.startAt ? formatDate(t.startAt) : "قريباً"}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CompetePage() {
  const { elo } = useGame();

  const { data: tournaments = [], isLoading, refetch } = useQuery({
    queryKey: ["tournaments"],
    queryFn:  () => leagueApi.getTournaments(),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const now = new Date();

  const active   = tournaments.filter(t => t.status !== "closed" && t.status !== "ended");
  const upcoming = tournaments.filter(t => t.startAt && new Date(t.startAt) > now);

  return (
    <div
      className="min-h-screen pb-28 overflow-x-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #0f002e 0%, #07010f 55%, #000 100%)" }}
    >
      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: p.color }}
            animate={{ y: [0, -28, 0], opacity: [0.1, 0.5, 0.1] }}
            transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* ── Back button + refresh ── */}
      <div className="relative z-20 px-4 pt-4 flex items-center justify-between">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm font-semibold active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <RefreshCw className="w-4 h-4" style={{ color: "rgba(255,255,255,0.35)" }} />
        </button>
      </div>

      {/* ══ HEADER ══ */}
      <div className="relative z-10 px-5 pt-4 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] font-black uppercase tracking-[0.35em] mb-2"
          style={{ color: "rgba(167,139,250,0.55)" }}
        >
          S.S.C · Competitive Hub
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl font-black tracking-tight"
          style={{
            background: "linear-gradient(135deg, #fff 0%, #e9d5ff 40%, #a78bfa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 18px rgba(167,139,250,0.5))",
          }}
        >
          البطولات
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm mt-1"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          Tournaments & Competitive Events
        </motion.p>
      </div>

      {/* ══ PLAY CTA ══ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative z-10 mx-4 mb-6 rounded-3xl overflow-hidden p-5"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(79,70,229,0.15) 100%)",
          border: "1.5px solid rgba(124,58,237,0.4)",
          boxShadow: "0 0 40px rgba(124,58,237,0.2)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div
              className="text-[10px] font-black uppercase tracking-widest mb-1"
              style={{ color: "rgba(167,139,250,0.6)" }}
            >
              مستعد للمنافسة؟
            </div>
            <div className="text-xl font-black text-white">العب الآن في الدوريات</div>
            <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              ⚡ {elo} ELO · الدوري الرسمي
            </div>
          </div>
          <Link href="/league-select">
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="px-5 py-3 rounded-2xl font-black text-sm text-white flex items-center gap-2"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                boxShadow: "0 0 24px rgba(124,58,237,0.5)",
              }}
            >
              ▶ PLAY
            </motion.div>
          </Link>
        </div>
      </motion.div>

      {/* ══ TOURNAMENTS ══ */}
      <div className="relative z-10 px-4 mb-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-[11px] font-black uppercase tracking-widest mb-3 flex items-center justify-between"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          <span>🏆 البطولات</span>
          {!isLoading && (
            <span style={{ color: "rgba(255,255,255,0.18)" }}>
              {active.length} بطولة
            </span>
          )}
        </motion.div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#a78bfa" }} />
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>جارٍ تحميل البطولات…</p>
          </div>
        ) : active.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <span className="text-4xl">🏆</span>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>لا توجد بطولات نشطة حالياً</p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((t, i) => (
              <TournamentCard key={t.id} t={t} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* ══ UPCOMING EVENTS ══ */}
      {upcoming.length > 0 && (
        <div className="relative z-10 px-4 mb-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="text-[11px] font-black uppercase tracking-widest mb-3"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            📅 الأحداث القادمة
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.58 }}
            className="rounded-3xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {upcoming.map((t, i) => (
              <UpcomingRow key={t.id} t={t} index={i} total={upcoming.length} />
            ))}
          </motion.div>
        </div>
      )}

      {/* ══ LIVE BADGE ══ */}
      {!isLoading && tournaments.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="relative z-10 mx-4 rounded-2xl p-4 flex items-start gap-3"
          style={{
            background: "rgba(74,222,128,0.07)",
            border: "1px solid rgba(74,222,128,0.18)",
          }}
        >
          <span className="text-xl shrink-0">⚡</span>
          <div>
            <div className="text-xs font-black text-white/80 mb-0.5">بيانات مباشرة</div>
            <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              البطولات تُحدَّث تلقائياً من قاعدة البيانات. للعب اضغط{" "}
              <span style={{ color: "#a78bfa" }}>PLAY</span>.
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
