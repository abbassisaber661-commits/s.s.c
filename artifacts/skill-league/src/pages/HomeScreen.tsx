import { useState, useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { getLevelTitle, xpProgressInLevel } from "@/lib/xp";
import { getFameTitle } from "@/lib/fame";
import { getVerificationStatus } from "@/lib/verified";
import { getActiveLockTier } from "@/lib/pi-lock";
import { getActiveVIPTier } from "@/lib/vip";

import { getDailyChallenges, todayString } from "@/lib/challenges";
import { getWeeklyMissions, getWeekString } from "@/lib/weekly-challenges";
import { getNotifications, unreadCount } from "@/lib/messages";
import { getUnreadCount as getNewsUnread } from "@/lib/news";
import { loadStreakData } from "@/lib/login-streak";
import { getJourneyTier } from "@/lib/journey";
import { loadLocalGems } from "@/lib/economy";
import { Bell } from "lucide-react";

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

function NavBtn({
  href,
  icon,
  label,
  color,
  badge,
}: {
  href: string;
  icon: string;
  label: string;
  color?: string;
  badge?: number;
}) {
  return (
    <Link href={href} className="block">
      <button
        className="relative w-full h-16 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
        style={
          color
            ? { borderColor: color + "40", backgroundColor: color + "12", border: `1px solid ${color}40` }
            : {
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }
        }
      >
        <span className="text-xl leading-none">{icon}</span>
        <span
          className="text-[10px] font-bold leading-none"
          style={color ? { color } : { color: "rgba(255,255,255,0.5)" }}
        >
          {label}
        </span>
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center px-1">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p
      className="text-[10px] uppercase tracking-widest font-bold px-1 mb-2"
      style={{ color: "rgba(255,255,255,0.3)" }}
    >
      {label}
    </p>
  );
}

export default function HomeScreen() {
  const [, go] = useLocation();
  const game   = useGame();
  const {
    user, authUser, isGuest, logout,
    coins, elo, xp, level, pvpWins, pvpLosses, fame,
    dailyChallenge, weeklyChallenge,
    verificationLevel, piLockTierId, piLockExpiry,
  } = game;

  const [pressed,    setPressed]    = useState(false);
  const [unread,     setUnread]     = useState(0);
  const [newsUnread, setNewsUnread] = useState(0);
  const [gems,       setGems]       = useState(0);
  const [top5,       setTop5]       = useState<any[]>([]);

  useEffect(() => {
    setUnread(unreadCount(getNotifications()));
    setNewsUnread(getNewsUnread());
    setGems(loadLocalGems());
  }, [coins]); // re-check gems whenever coins update (both change after a match)

  useEffect(() => {
    async function fetchTop5() {
      try {
        const res = await fetch("/api/league-system/top5");
        const data = await res.json();
        setTop5(data);
      } catch { /* silently ignore */ }
    }
    fetchTop5();
  }, []);

  const { title: levelTitle, color: levelColor } = getLevelTitle(level);
  const { pct: xpPct }        = xpProgressInLevel(xp);
  const fameTitle             = getFameTitle(fame || 0);
  const verif                 = getVerificationStatus((verificationLevel ?? 0) as 0 | 1 | 2);
  const activeLock            = getActiveLockTier(piLockTierId ?? null, piLockExpiry ?? null);
  const activeVIP             = getActiveVIPTier();
  const journeyTier           = useMemo(() => getJourneyTier(game as any), [elo, level]);
  const streakData            = useMemo(() => loadStreakData(), []);

  const today        = todayString();
  const completed    = dailyChallenge.date === today ? dailyChallenge.completed : [];
  const pendingDaily = getDailyChallenges(today).length - completed.length;
  const thisWeek     = getWeekString();
  const wc           = weeklyChallenge?.week === thisWeek ? weeklyChallenge : { week: thisWeek, completedIds: [], progress: {} };
  const pendingW     = getWeeklyMissions(thisWeek).length - wc.completedIds.length;
  const totalPending = pendingDaily + pendingW;

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
          HERO SECTION — SKILLLEAGUE + PLAY button
      ══════════════════════════════════════════════════════════ */}
      <div className="relative min-h-[85vh] flex flex-col items-center justify-center overflow-hidden">
        {/* Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {PARTICLES.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                background: p.color,
              }}
              animate={{ y: [0, -36, 0], opacity: [0.15, 0.6, 0.15] }}
              transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
            />
          ))}
        </div>

        {/* Ambient glow */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 460,
            height: 460,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background:
              "radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)",
          }}
        />

        {/* Top bar */}
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
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <Bell className="w-4 h-4" style={{ color: "rgba(255,255,255,0.6)" }} />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
            </Link>
            {gems > 0 && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-black"
                style={{
                  background: "rgba(139,92,246,0.12)",
                  border: "1px solid rgba(139,92,246,0.25)",
                  color: "#c084fc",
                }}
              >
                {gems} 💎
              </div>
            )}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-black"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#fbbf24",
              }}
            >
              {coins} 🪙
            </div>
          </motion.div>
        </div>

        {/* Main hero content */}
        <div className="flex flex-col items-center gap-8 z-10 px-6 pt-16">
          {/* Logo + title */}
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
              className="w-24 h-24 rounded-[1.8rem] flex items-center justify-center text-5xl"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}
            >
              🏆
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

          {/* Player badge row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex items-center gap-3 flex-wrap justify-center"
          >
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span className="font-black tabular-nums" style={{ color: levelColor }}>
                Lv.{level}
              </span>
              <span style={{ color: "rgba(255,255,255,0.45)" }}>{levelTitle}</span>
              <div className="w-px h-3" style={{ background: "rgba(255,255,255,0.15)" }} />
              <span className="font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>
                π {playerName}
              </span>
              {verif.badge && (
                <span className="font-bold text-xs" style={{ color: verif.color }}>
                  {verif.badge}
                </span>
              )}
            </div>

            {/* ELO + journey */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
              style={{
                background: `${journeyTier.color}12`,
                border: `1px solid ${journeyTier.color}30`,
              }}
            >
              <span>{journeyTier.icon}</span>
              <span className="font-bold" style={{ color: journeyTier.color }}>
                {elo} ELO
              </span>
            </div>
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
                        "0 0 50px rgba(124,58,237,0.85), 0 0 100px rgba(79,70,229,0.4)",
                        "0 0 28px rgba(124,58,237,0.5), 0 0 56px rgba(79,70,229,0.2)",
                      ],
                    }
              }
              transition={
                pressed
                  ? { duration: 0.32 }
                  : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
              }
              className="relative w-64 h-[72px] rounded-3xl font-black text-3xl text-white tracking-widest"
              style={{
                background:
                  "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4f46e5 100%)",
              }}
            >
              <div
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.16) 0%, transparent 55%)",
                }}
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

          {/* ↓ Scroll indicator — visible right below PLAY */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: [0, 0.7, 0], y: [0, 8, 0] }}
            transition={{ delay: 1.5, duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-1"
          >
            <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
              More
            </span>
            <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
              <path d="M2 2L10 10L18 2" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>
        </div>

        {/* Scroll hint at very bottom of hero */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.4, 0] }}
          transition={{ delay: 2.5, duration: 2.2, repeat: Infinity }}
          className="absolute bottom-5 left-0 right-0 flex justify-center"
        >
          <span className="text-white/20 text-base">↓</span>
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          QUICK STATS + SHORTCUTS
      ══════════════════════════════════════════════════════════ */}
      <div className="max-w-md mx-auto px-4 pb-28 space-y-4 pt-2">

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl px-4 py-3 flex items-center gap-5 justify-center"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {[
            { val: coins,                              label: "Coins",   color: "#fbbf24" },
            { val: elo,                                label: "ELO",     color: "#a78bfa" },
            { val: `${pvpWins}W / ${pvpLosses}L`,     label: "PvP",     color: "rgba(255,255,255,0.7)" },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="text-base font-black tabular-nums" style={{ color: s.color }}>{s.val}</span>
              <span className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</span>
            </div>
          ))}
          {activeLock && (
            <>
              <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.1)" }} />
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-base font-black" style={{ color: activeLock.color }}>{activeLock.icon}</span>
                <span className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>Locked</span>
              </div>
            </>
          )}
        </motion.div>

        {/* Quick-access shortcuts */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <SectionLabel label="Quick Access" />
          <div className="grid grid-cols-3 gap-2">
            <NavBtn href="/journey"          icon="🗺️" label="Journey"     color="#60a5fa" />
            <NavBtn href="/daily-challenges" icon="🔥" label="Challenges"  badge={totalPending} />
            <NavBtn href="/leaderboard"      icon="📊" label="Leaderboard" />
            <NavBtn href="/daily-rewards"    icon="🎁" label="Rewards"     color="#10b981" />
            <NavBtn href="/messages"         icon="🔔" label="Messages"    color="#FF9B3A" badge={unread} />
            <NavBtn href="/seasons"          icon="🌀" label="Seasons"     color="#B44FFF" />
          </div>
        </motion.div>

        {/* ── Top 5 Players Per League ─────────────────── */}
        <LeagueTop5Section top5={top5} />

      </div>
    </div>
  );
}

// ── League Top 5 Section ──────────────────────────────────────────────────────

function LeagueTop5Section({ top5 }: { top5: any[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
      <SectionLabel label="Top Players Per League" />
      <div className="space-y-3">
      {top5.map((league, li) => ( 
    
          <motion.div
            key={league.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 + li * 0.08 }}
            className="rounded-2xl overflow-hidden"
            style={{
              background: `linear-gradient(135deg, rgba(${league.colorRgb},0.12) 0%, rgba(0,0,0,0.6) 100%)`,
              border: `1.5px solid rgba(${league.colorRgb},0.22)`,
            }}
          >
            {/* Card header */}
            <Link href={league.href}>
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer active:opacity-80"
                style={{ borderBottom: `1px solid rgba(${league.colorRgb},0.15)` }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{league.emblem}</span>
                  <span className="text-[13px] font-black" style={{ color: league.color }}>
                    {league.name}
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
                  عرض الكل ›
                </span>
              </div>
            </Link>

            {/* Players list */}
            <div className="px-3 py-2 space-y-1">
              {league.players.map((p) => {
                const medal = p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : p.rank === 3 ? "🥉" : null;
                return (
                  <div
                    key={p.rank}
                    className="flex items-center gap-3 px-2 py-2 rounded-xl"
                    style={
                      p.rank <= 3
                        ? { background: `rgba(${league.colorRgb},0.07)` }
                        : {}
                    }
                  >
                    {/* Rank */}
                    <div
                      className="w-6 text-center text-[11px] font-black tabular-nums shrink-0"
                      style={{
                        color: p.rank === 1 ? "#ffd700" : p.rank === 2 ? "#a8a9ad" : p.rank === 3 ? "#cd7f32" : "rgba(255,255,255,0.3)",
                      }}
                    >
                      {medal ?? p.rank}
                    </div>

                    {/* Name */}
                    <span className="flex-1 text-[12px] font-bold truncate" style={{ color: "rgba(255,255,255,0.8)" }}>
                      {p.name}
                    </span>

                    {/* LP */}
                    <div className="text-right shrink-0">
                      <div className="text-[12px] font-black tabular-nums" style={{ color: league.color }}>
                        {p.lp}
                      </div>
                      <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>LP</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
