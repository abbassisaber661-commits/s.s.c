import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useGame } from "@/contexts/GameContext";

const TOURNAMENTS = [
  {
    name: "Daily Open",
    icon: "🏆",
    desc: "بطولة يومية مفتوحة لجميع المستويات",
    prize: "500",
    status: "قريباً",
    color: "#4ade80",
    colorRgb: "74,222,128",
    badge: "SOON",
  },
  {
    name: "Weekly Cup",
    icon: "🥇",
    desc: "كأس أسبوعي بمخاطر عالية ومكافآت كبيرة",
    prize: "2,000",
    status: "قريباً",
    color: "#fbbf24",
    colorRgb: "251,191,36",
    badge: "SOON",
  },
  {
    name: "Pro Invitational",
    icon: "💠",
    desc: "بطولة النخبة — بالدعوة فقط",
    prize: "5,000",
    status: "دعوة فقط",
    color: "#a78bfa",
    colorRgb: "167,139,250",
    badge: "INVITE",
  },
  {
    name: "Champions Grand Prix",
    icon: "👑",
    desc: "أكبر حدث تنافسي في SkillLeague",
    prize: "10,000",
    status: "قريباً",
    color: "#f472b6",
    colorRgb: "244,114,182",
    badge: "SOON",
  },
];

const UPCOMING_EVENTS = [
  { date: "15 يونيو", name: "موسم جديد", icon: "🌀", desc: "بداية الموسم التنافسي الجديد" },
  { date: "22 يونيو", name: "كأس الأسبوع الأول", icon: "🏆", desc: "أول بطولة أسبوعية للموسم" },
  { date: "1 يوليو", name: "بطولة المحترفين", icon: "🥇", desc: "للمصنفين Pro فأعلى فقط" },
];

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  x: (i * 137.5) % 100,
  y: (i * 97.3) % 100,
  size: 1.5 + (i % 4),
  color: i % 3 === 0 ? "#a78bfa" : i % 3 === 1 ? "#60a5fa" : "#f472b6",
  dur: 4 + (i % 4),
  delay: (i * 0.35) % 3.5,
}));

export default function CompetePage() {
  const { elo } = useGame();

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

      {/* ── Back button ── */}
      <div className="relative z-20 px-4 pt-4">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm font-semibold active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
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
          SkillLeague · Competitive Hub
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
          className="text-[11px] font-black uppercase tracking-widest mb-3"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          🏆 البطولات القادمة
        </motion.div>

        <div className="space-y-3">
          {TOURNAMENTS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.08 }}
              className="relative rounded-3xl overflow-hidden p-4"
              style={{
                background: `linear-gradient(135deg, rgba(${t.colorRgb},0.12) 0%, rgba(0,0,0,0.6) 100%)`,
                border: `1.5px solid rgba(${t.colorRgb},0.22)`,
              }}
            >
              {/* Top bar */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: `linear-gradient(90deg, transparent, ${t.color}, transparent)` }}
              />

              <div className="flex items-center gap-4">
                {/* Icon */}
                <div
                  className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                  style={{
                    background: `rgba(${t.colorRgb},0.14)`,
                    border: `2px solid rgba(${t.colorRgb},0.3)`,
                  }}
                >
                  {t.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-base font-black text-white">{t.name}</span>
                    <span
                      className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        background: `rgba(${t.colorRgb},0.15)`,
                        color: t.color,
                        border: `1px solid rgba(${t.colorRgb},0.3)`,
                      }}
                    >
                      {t.badge}
                    </span>
                  </div>
                  <p className="text-[12px] mb-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {t.desc}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>
                      🪙 {t.prize} جائزة
                    </span>
                    <span className="text-[11px] font-bold" style={{ color: t.color }}>
                      {t.status}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ══ UPCOMING EVENTS ══ */}
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
          {UPCOMING_EVENTS.map((ev, i) => (
            <div
              key={ev.name}
              className="flex items-center gap-4 px-4 py-3.5"
              style={{
                borderBottom: i < UPCOMING_EVENTS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}
            >
              <div
                className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}
              >
                {ev.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black text-white">{ev.name}</div>
                <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.38)" }}>{ev.desc}</div>
              </div>
              <div
                className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg"
                style={{
                  background: "rgba(167,139,250,0.1)",
                  border: "1px solid rgba(167,139,250,0.2)",
                  color: "#a78bfa",
                }}
              >
                {ev.date}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ══ NOTICE ══ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="relative z-10 mx-4 rounded-2xl p-4 flex items-start gap-3"
        style={{
          background: "rgba(251,191,36,0.07)",
          border: "1px solid rgba(251,191,36,0.18)",
        }}
      >
        <span className="text-xl shrink-0">⚠️</span>
        <div>
          <div className="text-xs font-black text-white/80 mb-0.5">البطولات قيد الإعداد</div>
          <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            للعب الآن، استخدم زر <span style={{ color: "#a78bfa" }}>PLAY</span> في الصفحة الرئيسية للدخول إلى نظام الدوريات الرسمي.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
