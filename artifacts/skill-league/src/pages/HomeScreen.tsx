import { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { getLevelTitle, xpProgressInLevel } from "@/lib/xp";
import { getVerificationStatus } from "@/lib/verified";
import { loadStreakData } from "@/lib/login-streak";
import { Bell } from "lucide-react";
import { Logo } from "@/components/Logo";

// ── Particles (seeded, stable across renders) ─────────────────────────────────
const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  x: ((i * 137.5) % 100),
  y: ((i * 97.3) % 100),
  size: 1.5 + (i % 5),
  color: i % 3 === 0 ? "#a78bfa" : i % 3 === 1 ? "#60a5fa" : "#f472b6",
  dur: 4 + (i % 4),
  delay: (i * 0.4) % 4,
}));

// ── League grid data ──────────────────────────────────────────────────────────
const LEAGUES = [
  {
    id:       "training",
    name:     "Division 3",
    nameAr:   "الدوري الثالث",
    emblem:   "🥉",
    color:    "#60a5fa",
    colorRgb: "96,165,250",
    href:     "/leaderboard?division=training",
  },
  {
    id:       "coin",
    name:     "Division 2",
    nameAr:   "الدوري الثاني",
    emblem:   "🥈",
    color:    "#a78bfa",
    colorRgb: "167,139,250",
    href:     "/leaderboard?division=coin",
  },
  {
    id:       "pro",
    name:     "Professional",
    nameAr:   "الدوري الاحترافي",
    emblem:   "🏅",
    color:    "#f59e0b",
    colorRgb: "245,158,11",
    href:     "/leaderboard?division=pro",
  },
  {
    id:       "champion",
    name:     "Champions",
    nameAr:   "دوري الأبطال",
    emblem:   "🏆",
    color:    "#f472b6",
    colorRgb: "244,114,182",
    href:     "/leaderboard?division=champion",
  },
];

export default function HomeScreen() {
  const [, go]    = useLocation();
  const game      = useGame();
  const {
    user, authUser, isGuest,
    dnBalance, xp, level,
    verificationLevel,
  } = game;

  const [pressed, setPressed] = useState(false);
  const unreadCount           = 0;

  const { title: levelTitle, color: levelColor } = getLevelTitle(level);
  const { pct: xpPct }   = xpProgressInLevel(xp);
  const verif              = getVerificationStatus((verificationLevel ?? 0) as 0 | 1 | 2);
  const streakData         = useMemo(() => loadStreakData(), []);

  const playerName =
    user?.username || authUser?.username || (isGuest ? "ضيف" : "Player");

  const handlePlay = () => {
    if (pressed) return;
    setPressed(true);
    setTimeout(() => go("/league-select"), 320);
  };

  return (
    <div
      className="min-h-screen w-full overflow-y-auto"
      style={{
        background:
          "radial-gradient(ellipse at 50% 25%, #1a0533 0%, #0a0118 55%, #000 100%)",
      }}
    >
      {/* ══════════════════════════════════════════════════════════
          HERO — full viewport, centered
      ══════════════════════════════════════════════════════════ */}
      <div className="relative min-h-[80vh] flex flex-col items-center justify-center overflow-hidden">

        {/* Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {PARTICLES.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full"
              style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: p.color }}
              animate={{ y: [0, -36, 0], opacity: [0.15, 0.6, 0.15] }}
              transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
            />
          ))}
        </div>

        {/* Ambient glow */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 500, height: 500,
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)",
          }}
        />

        {/* ── Top bar ── */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-5 z-10">
          {/* Streak */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{
              background: "rgba(251,146,60,0.12)",
              border: "1px solid rgba(251,146,60,0.25)",
              color: "#fb923c",
            }}
          >
            🔥 {streakData.currentStreak} يوم
          </motion.div>

          {/* Right HUD */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-2"
          >
            <Link href="/notifications">
              <button
                className="relative p-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <Bell className="w-4 h-4" style={{ color: "rgba(255,255,255,0.6)" }} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </Link>
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-black"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#fbbf24" }}
            >
              {dnBalance} 🪙
            </div>
          </motion.div>
        </div>

        {/* ── Main hero content ── */}
        <div className="flex flex-col items-center gap-8 z-10 px-6 pt-20">

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.75, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-3"
          >
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 28px rgba(124,58,237,0.4)",
                  "0 0 65px rgba(124,58,237,0.75)",
                  "0 0 28px rgba(124,58,237,0.4)",
                ],
              }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              className="w-24 h-24 rounded-[1.8rem] flex items-center justify-center overflow-hidden"
            >
              <Logo size={96} rounded="rounded-[1.8rem]" />
            </motion.div>

            <div className="text-center">
              <h1
                className="text-5xl font-black tracking-tight"
                style={{
                  background: "linear-gradient(135deg, #e9d5ff, #a78bfa, #818cf8)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 18px rgba(167,139,250,0.5))",
                }}
              >
                SKILLLEAGUE
              </h1>
              <p
                className="text-[10px] uppercase tracking-[0.3em] mt-1 font-medium"
                style={{ color: "rgba(167,139,250,0.55)" }}
              >
                Game of Skill &amp; Challenge
              </p>
            </div>
          </motion.div>

          {/* Player badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <span className="font-black tabular-nums" style={{ color: levelColor }}>Lv.{level}</span>
            <span style={{ color: "rgba(255,255,255,0.45)" }}>{levelTitle}</span>
            <div className="w-px h-3" style={{ background: "rgba(255,255,255,0.15)" }} />
            <span className="font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>{playerName}</span>
            {verif.badge && (
              <span className="font-bold text-xs" style={{ color: verif.color }}>{verif.badge}</span>
            )}
          </motion.div>

          {/* XP bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="w-64"
          >
            <div className="flex justify-between text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>
              <span>XP</span>
              <span>{xpPct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: levelColor }}
                initial={{ width: 0 }}
                animate={{ width: `${xpPct}%` }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.6 }}
              />
            </div>
          </motion.div>

          {/* ▶ PLAY button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.button
              onClick={handlePlay}
              whileTap={{ scale: 0.93 }}
              animate={
                pressed
                  ? { scale: [1, 1.06, 0], opacity: [1, 1, 0] }
                  : {
                      boxShadow: [
                        "0 0 28px rgba(124,58,237,0.5), 0 0 56px rgba(79,70,229,0.2)",
                        "0 0 60px rgba(124,58,237,0.95), 0 0 120px rgba(79,70,229,0.5)",
                        "0 0 28px rgba(124,58,237,0.5), 0 0 56px rgba(79,70,229,0.2)",
                      ],
                    }
              }
              transition={
                pressed
                  ? { duration: 0.32 }
                  : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
              }
              className="relative w-72 h-[80px] rounded-3xl font-black text-3xl text-white tracking-widest"
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4f46e5 100%)",
              }}
            >
              <div
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 55%)" }}
              />
              <span className="relative z-10">▶ PLAY</span>
            </motion.button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-[11px]"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            One button. Infinite competition.
          </motion.p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          LEAGUES GRID 2×2
      ══════════════════════════════════════════════════════════ */}
      <div className="max-w-md mx-auto px-4 pb-28 pt-2">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center text-[10px] uppercase tracking-widest font-bold mb-4"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          الدوريات
        </motion.p>

        <div className="grid grid-cols-2 gap-3">
          {LEAGUES.map((league, i) => (
            <motion.div
              key={league.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.09 }}
            >
              <Link href={league.href}>
                <button
                  className="w-full h-28 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"
                  style={{
                    background: `linear-gradient(135deg, rgba(${league.colorRgb},0.14) 0%, rgba(0,0,0,0.55) 100%)`,
                    border: `1.5px solid rgba(${league.colorRgb},0.28)`,
                  }}
                >
                  <span className="text-3xl leading-none">{league.emblem}</span>
                  <span
                    className="text-[13px] font-black leading-tight text-center px-2"
                    style={{ color: league.color }}
                  >
                    {league.name}
                  </span>
                </button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
