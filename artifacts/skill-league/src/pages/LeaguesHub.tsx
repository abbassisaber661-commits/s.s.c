import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { getLevelTitle } from "@/lib/xp";

// ── Types ────────────────────────────────────────────────────────────────────

type LeagueId = "training" | "coin" | "pro" | "champion";

interface League {
  id: LeagueId;
  icon: string;
  name: string;
  tag: string;
  tagline: string;
  desc: string;
  requirements: string[];
  primaryColor: string;
  glowColor: string;
  accent: string;
  locked: boolean;
  featured: boolean;
  entryCost: number;
  maxPlayers: number | null;
}

const LEAGUES: League[] = [
  {
    id: "training",
    icon: "🥉",
    name: "Training",
    tag: "LEAGUE",
    tagline: "Learn & Improve",
    desc: "Master the fundamentals. No stakes, no pressure — just pure skill building.",
    requirements: ["Free entry", "Open to all players", "No ranking impact"],
    primaryColor: "#22d3ee",
    glowColor: "rgba(34,211,238,0.35)",
    accent: "#0e7490",
    locked: false,
    featured: false,
    entryCost: 0,
    maxPlayers: null,
  },
  {
    id: "coin",
    icon: "🥈",
    name: "Coin",
    tag: "LEAGUE",
    tagline: "Competitive Rewards",
    desc: "The main arena. 10 players enter, champions rise. Real stakes, real rewards.",
    requirements: [
      "10 Players Required to Start",
      "Same Questions — Random Order",
      "Anti-Cheat: Server-Side Scoring",
      "Top 4 earn Coin rewards",
    ],
    primaryColor: "#f59e0b",
    glowColor: "rgba(245,158,11,0.4)",
    accent: "#b45309",
    locked: false,
    featured: true,
    entryCost: 5,
    maxPlayers: 10,
  },
  {
    id: "pro",
    icon: "🥇",
    name: "Pro",
    tag: "LEAGUE",
    tagline: "Elite Knockout Battles",
    desc: "Survive or go home. Top 8 Coin League finishers only. Every match is a battle.",
    requirements: [
      "Top 8 from Coin League only",
      "Single-elimination bracket",
      "1 vs 8, 2 vs 7 seeding",
      "70% prize → top 4 · 30% → bottom 4",
    ],
    primaryColor: "#f43f5e",
    glowColor: "rgba(244,63,94,0.35)",
    accent: "#9f1239",
    locked: false,
    featured: false,
    entryCost: 20,
    maxPlayers: 8,
  },
  {
    id: "champion",
    icon: "👑",
    name: "Champion",
    tag: "LEAGUE",
    tagline: "Coming Soon",
    desc: "The ultimate arena awaits. Legends only. Next season, the gates open.",
    requirements: ["Season Qualifier Required", "Invite-Only Entry", "Launching Next Season"],
    primaryColor: "#a78bfa",
    glowColor: "rgba(167,139,250,0.3)",
    accent: "#6d28d9",
    locked: true,
    featured: false,
    entryCost: 0,
    maxPlayers: null,
  },
];

// ── Floating particles (background) ─────────────────────────────────────────

const BG_PARTICLES = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  x: ((i * 137.5) % 100),
  y: ((i * 97.3) % 100),
  size: 1 + (i % 3),
  color:
    i % 4 === 0 ? "#a78bfa" :
    i % 4 === 1 ? "#22d3ee" :
    i % 4 === 2 ? "#f59e0b" :
    "#f43f5e",
  dur: 5 + (i % 6),
  delay: (i * 0.3) % 5,
}));

// ── 3D tilt hook ─────────────────────────────────────────────────────────────

function useTilt(active: boolean) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotX = useTransform(y, [-0.5, 0.5], [8, -8]);
  const rotY = useTransform(x, [-0.5, 0.5], [-8, 8]);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleLeave = () => { x.set(0); y.set(0); };

  return { rotX, rotY, handleMove, handleLeave };
}

// ── Queue counter (fake) ─────────────────────────────────────────────────────

const FAKE_NAMES = [
  "Ahmed_π","Nour99","PiMaster","Khalid88","Zara_x",
  "Leo2024","SkyKing","ProPi","FastHand","ByteWolf",
];

function useQueueCount(max: number | null) {
  const [count, setCount] = useState(() =>
    max ? Math.floor(Math.random() * (max - 2)) + 1 : 0,
  );
  useEffect(() => {
    if (!max) return;
    const iv = setInterval(() => {
      setCount((c) => {
        const delta = Math.random() > 0.55 ? 1 : -1;
        return Math.max(1, Math.min(max - 1, c + delta));
      });
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(iv);
  }, [max]);
  return count;
}

// ── League Card ───────────────────────────────────────────────────────────────

function LeagueCard({
  lg,
  index,
  isSelected,
  anySelected,
  onSelect,
}: {
  lg: League;
  index: number;
  isSelected: boolean;
  anySelected: boolean;
  onSelect: (id: LeagueId) => void;
}) {
  const { rotX, rotY, handleMove, handleLeave } = useTilt(!lg.locked && !anySelected);
  const queueCount = useQueueCount(lg.maxPlayers);
  const isBlurred  = anySelected && !isSelected;

  return (
    <motion.div
      initial={{ opacity: 0, y: 80, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.13 + 0.2,
        duration: 0.55,
        ease: [0.16, 1, 0.3, 1],
        scale: { type: "spring", stiffness: 260, damping: 18 },
      }}
      className="relative w-full"
      style={{ perspective: 900 }}
    >
      <motion.div
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        onClick={() => !lg.locked && onSelect(lg.id)}
        animate={
          isBlurred
            ? { filter: "blur(6px)", opacity: 0.3, scale: 0.97 }
            : { filter: "blur(0px)", opacity: 1, scale: 1 }
        }
        transition={{ duration: 0.35 }}
        style={{
          rotateX: rotX,
          rotateY: rotY,
          transformStyle: "preserve-3d",
          cursor: lg.locked ? "not-allowed" : "pointer",
        }}
        className="relative rounded-3xl overflow-hidden select-none"
      >
        {/* Card glass body */}
        <div
          className="relative rounded-3xl px-5 pt-5 pb-4 overflow-hidden"
          style={{
            background: lg.featured
              ? `linear-gradient(135deg, ${lg.primaryColor}28 0%, ${lg.primaryColor}10 50%, rgba(0,0,0,0.6) 100%)`
              : `linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)`,
            border: `1px solid ${lg.primaryColor}${lg.featured ? "60" : "35"}`,
            backdropFilter: "blur(20px)",
            boxShadow: lg.featured
              ? `0 0 0 1px ${lg.primaryColor}20, 0 8px 60px ${lg.glowColor}, inset 0 1px 0 rgba(255,255,255,0.1)`
              : `0 4px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)`,
          }}
        >
          {/* Animated glow orb (featured / champion) */}
          {(lg.featured || lg.locked) && (
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 200,
                height: 200,
                top: -80,
                right: -60,
                background: `radial-gradient(circle, ${lg.primaryColor}30 0%, transparent 70%)`,
              }}
              animate={
                lg.locked
                  ? { opacity: [0.3, 0.8, 0.3], scale: [1, 1.2, 1] }
                  : { opacity: [0.5, 1, 0.5], scale: [0.9, 1.1, 0.9] }
              }
              transition={{ duration: lg.locked ? 3 : 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          {/* Champion fog overlay */}
          {lg.locked && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.6) 100%)",
              }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          {/* Shine top edge */}
          <div
            className="absolute inset-x-0 top-0 h-px pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent, ${lg.primaryColor}80, transparent)`,
            }}
          />

          {/* Light rays (featured only) */}
          {lg.featured && (
            <motion.div
              className="absolute pointer-events-none"
              style={{
                width: 3,
                height: 120,
                top: -20,
                right: 48,
                background: `linear-gradient(to bottom, ${lg.primaryColor}80, transparent)`,
                borderRadius: 2,
                transformOrigin: "top center",
              }}
              animate={{ rotate: [-20, 20, -20], opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          {/* ── Card header ── */}
          <div className="flex items-start justify-between mb-3 relative z-10">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{
                  background: `linear-gradient(135deg, ${lg.primaryColor}30, ${lg.primaryColor}15)`,
                  border: `1px solid ${lg.primaryColor}50`,
                  boxShadow: `0 4px 20px ${lg.glowColor}`,
                }}
                animate={
                  lg.locked
                    ? { rotate: [0, 5, -5, 0] }
                    : lg.featured
                    ? { scale: [1, 1.05, 1] }
                    : { y: [0, -3, 0] }
                }
                transition={{
                  duration: lg.locked ? 4 : 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {lg.locked ? "🔒" : lg.icon}
              </motion.div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-xl font-black tracking-tight"
                    style={{ color: lg.primaryColor }}
                  >
                    {lg.name}
                  </span>
                  <span
                    className="text-xs font-bold tracking-widest"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    {lg.tag}
                  </span>
                </div>
                <p
                  className="text-xs font-medium mt-0.5"
                  style={{ color: `${lg.primaryColor}cc` }}
                >
                  {lg.tagline}
                </p>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-col items-end gap-1">
              {lg.featured && (
                <span
                  className="text-[10px] font-black px-2 py-0.5 rounded-full tracking-wider"
                  style={{
                    background: `${lg.primaryColor}25`,
                    border: `1px solid ${lg.primaryColor}60`,
                    color: lg.primaryColor,
                  }}
                >
                  MAIN
                </span>
              )}
              {lg.locked && (
                <span
                  className="text-[10px] font-black px-2 py-0.5 rounded-full tracking-wider"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  SOON
                </span>
              )}
              {lg.entryCost > 0 && !lg.locked && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  {lg.entryCost}🪙
                </span>
              )}
              {lg.entryCost === 0 && !lg.locked && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(34,197,94,0.12)",
                    border: "1px solid rgba(34,197,94,0.25)",
                    color: "#4ade80",
                  }}
                >
                  FREE
                </span>
              )}
            </div>
          </div>

          {/* ── Divider ── */}
          <div
            className="h-px mb-3"
            style={{
              background: `linear-gradient(90deg, ${lg.primaryColor}40, transparent)`,
            }}
          />

          {/* ── Queue bar (live) ── */}
          {lg.maxPlayers && !lg.locked && (
            <div className="mb-3 relative z-10">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Queue
                </span>
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-[10px] font-bold"
                  style={{ color: lg.primaryColor }}
                >
                  {queueCount}/{lg.maxPlayers} online
                </motion.span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  animate={{ width: `${(queueCount / lg.maxPlayers) * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{
                    background: `linear-gradient(90deg, ${lg.primaryColor}, ${lg.primaryColor}80)`,
                    boxShadow: `0 0 8px ${lg.primaryColor}80`,
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Footer ── */}
          <div className="flex items-center justify-between relative z-10">
            <p
              className="text-xs max-w-[70%] leading-snug"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              {lg.desc}
            </p>
            {!lg.locked && (
              <motion.div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
                style={{
                  background: `${lg.primaryColor}22`,
                  border: `1px solid ${lg.primaryColor}50`,
                  color: lg.primaryColor,
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                ›
              </motion.div>
            )}
          </div>
        </div>

        {/* Continuous glow ring (featured only) */}
        {lg.featured && (
          <motion.div
            className="absolute -inset-px rounded-3xl pointer-events-none"
            animate={{
              boxShadow: [
                `0 0 0 0 ${lg.primaryColor}00`,
                `0 0 0 3px ${lg.primaryColor}40`,
                `0 0 0 0 ${lg.primaryColor}00`,
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}

// ── League Detail Overlay ─────────────────────────────────────────────────────

function LeagueOverlay({
  lg,
  myLevel,
  coins,
  onClose,
  onEnter,
}: {
  lg: League;
  myLevel: number;
  coins: number;
  onClose: () => void;
  onEnter: () => void;
}) {
  const canAfford = coins >= lg.entryCost;
  const isElite   = lg.id === "pro" && myLevel < 20;

  return (
    <motion.div
      key="overlay"
      className="absolute inset-0 z-30 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        className="relative w-full max-w-md mx-4 mb-8 rounded-3xl overflow-hidden"
        initial={{ y: 80, scale: 0.94, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 60, scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: `linear-gradient(160deg, ${lg.primaryColor}20 0%, rgba(10,5,20,0.98) 60%)`,
          border: `1px solid ${lg.primaryColor}50`,
          boxShadow: `0 0 80px ${lg.glowColor}, inset 0 1px 0 rgba(255,255,255,0.07)`,
        }}
      >
        {/* Ambient top glow */}
        <div
          className="absolute top-0 inset-x-0 h-32 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${lg.primaryColor}35 0%, transparent 70%)`,
          }}
        />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          ✕
        </button>

        <div className="px-6 py-6 relative z-10">
          {/* Icon + title */}
          <div className="flex items-center gap-4 mb-5">
            <motion.div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{
                background: `linear-gradient(135deg, ${lg.primaryColor}30, ${lg.primaryColor}10)`,
                border: `1px solid ${lg.primaryColor}50`,
                boxShadow: `0 8px 30px ${lg.glowColor}`,
              }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              {lg.locked ? "🔒" : lg.icon}
            </motion.div>
            <div>
              <h2
                className="text-3xl font-black tracking-tight leading-none"
                style={{
                  background: `linear-gradient(135deg, #fff, ${lg.primaryColor})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: `drop-shadow(0 0 10px ${lg.primaryColor}80)`,
                }}
              >
                {lg.name.toUpperCase()}
              </h2>
              <p
                className="text-sm font-medium mt-1"
                style={{ color: `${lg.primaryColor}bb` }}
              >
                {lg.tagline}
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm mb-5 leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
            {lg.desc}
          </p>

          {/* Requirements */}
          <div
            className="rounded-2xl p-4 mb-5 space-y-2"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {lg.requirements.map((r) => (
              <div key={r} className="flex items-start gap-2.5 text-sm">
                <span style={{ color: lg.primaryColor }} className="mt-0.5 text-xs">
                  ●
                </span>
                <span style={{ color: "rgba(255,255,255,0.65)" }}>{r}</span>
              </div>
            ))}
          </div>

          {/* Entry cost row */}
          {lg.entryCost > 0 && !lg.locked && (
            <div
              className="flex items-center justify-between px-4 py-3 rounded-2xl mb-4"
              style={{
                background: canAfford ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${canAfford ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
              }}
            >
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                Entry cost
              </span>
              <span
                className="font-black text-sm"
                style={{ color: canAfford ? "#4ade80" : "#f87171" }}
              >
                {lg.entryCost} 🪙 {canAfford ? "✓" : "(insufficient)"}
              </span>
            </div>
          )}

          {/* ENTER button */}
          {lg.locked ? (
            <div
              className="w-full h-14 rounded-2xl flex items-center justify-center text-sm font-bold"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              🔒 Coming Soon — Next Season
            </div>
          ) : isElite ? (
            <div
              className="w-full h-14 rounded-2xl flex items-center justify-center text-sm font-bold"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              🥇 Qualify via Coin League first
            </div>
          ) : !canAfford ? (
            <div
              className="w-full h-14 rounded-2xl flex items-center justify-center text-sm font-bold"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#f87171",
              }}
            >
              Insufficient coins — need {lg.entryCost}🪙
            </div>
          ) : (
            <motion.button
              onClick={onEnter}
              whileTap={{ scale: 0.96 }}
              className="w-full h-14 rounded-2xl font-black text-base text-white relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${lg.primaryColor}, ${lg.accent})`,
                boxShadow: `0 0 30px ${lg.glowColor}, 0 4px 20px rgba(0,0,0,0.5)`,
              }}
            >
              <motion.div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                  x: "-100%",
                }}
                animate={{ x: ["−100%", "200%"] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
              />
              <span className="relative z-10 tracking-widest">⚡ ENTER {lg.name.toUpperCase()}</span>
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LeaguesHub() {
  const [, go]         = useLocation();
  const { user, authUser, isGuest, coins, level } = useGame();
  const { title: lvTitle, color: lvColor }        = getLevelTitle(level);
  const [selected, setSelected] = useState<LeagueId | null>(null);
  const [titleIn, setTitleIn]   = useState(false);
  const selectedLeague = LEAGUES.find((l) => l.id === selected) ?? null;

  const playerName =
    user?.username || authUser?.username || (isGuest ? "Champion" : "Player");

  // Animate title in on mount
  useEffect(() => { setTimeout(() => setTitleIn(true), 100); }, []);

  const handleSelect = (id: LeagueId) => setSelected(id);
  const handleClose  = () => setSelected(null);

  const handleEnter = () => {
    if (!selected) return;
    handleClose();
    if (selected === "training")  go("/match-entry/training");
    else if (selected === "coin") go("/match-entry/bronze");
    else if (selected === "pro")  go("/match-entry/gold");
  };

  return (
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{
        background:
          "radial-gradient(ellipse at 50% 20%, #0d0520 0%, #060111 55%, #000 100%)",
      }}
    >
      {/* ── Background particles ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {BG_PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top:  `${p.y}%`,
              width:  p.size,
              height: p.size,
              background: p.color,
            }}
            animate={{ y: [0, -30, 0], opacity: [0.1, 0.45, 0.1] }}
            transition={{
              duration: p.dur,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Light fog / nebula */}
        <div
          className="absolute"
          style={{
            width: 700,
            height: 700,
            top: "10%",
            left: "50%",
            transform: "translateX(-50%)",
            background:
              "radial-gradient(ellipse, rgba(124,58,237,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 min-h-full flex flex-col">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-5 pt-6 pb-2">
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => go("/")}
            className="flex items-center gap-1.5 text-sm font-bold transition-all active:scale-95"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            ‹ Home
          </motion.button>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2"
          >
            <div
              className="px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{
                background: `${lvColor}18`,
                border: `1px solid ${lvColor}35`,
                color: lvColor,
              }}
            >
              Lv.{level} {lvTitle}
            </div>
            <div
              className="px-3 py-1.5 rounded-xl text-sm font-black"
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

        {/* ── LEAGUES Title ── */}
        <div className="flex flex-col items-center pt-6 pb-8 px-5">
          <AnimatePresence>
            {titleIn && (
              <motion.div
                key="title"
                initial={{ opacity: 0, y: -30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="text-center"
              >
                <h1
                  className="text-5xl font-black tracking-[0.18em] uppercase"
                  style={{
                    background:
                      "linear-gradient(135deg, #ffffff 0%, #e9d5ff 50%, #a78bfa 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    filter: "drop-shadow(0 0 24px rgba(167,139,250,0.55))",
                  }}
                >
                  LEAGUES
                </h1>
                <motion.p
                  className="text-sm mt-2 font-medium"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                  animate={{ opacity: [0.35, 0.65, 0.35] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                >
                  Choose your competition level
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Cards ── */}
        <div className="flex-1 px-4 pb-10 max-w-md mx-auto w-full space-y-4">
          {LEAGUES.map((lg, i) => (
            <LeagueCard
              key={lg.id}
              lg={lg}
              index={i}
              isSelected={selected === lg.id}
              anySelected={selected !== null}
              onSelect={handleSelect}
            />
          ))}

          {/* Bottom player signature */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-center pt-2"
          >
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
              π {playerName}
            </span>
          </motion.div>
        </div>
      </div>

      {/* ── Detail Overlay ── */}
      <AnimatePresence>
        {selectedLeague && (
          <LeagueOverlay
            lg={selectedLeague}
            myLevel={level}
            coins={coins}
            onClose={handleClose}
            onEnter={handleEnter}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
