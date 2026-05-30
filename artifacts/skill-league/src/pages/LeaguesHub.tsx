import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { getLevelTitle } from "@/lib/xp";

// ── Fake queue names for realism ──────────────────────────────────────────────
const FAKE_NAMES = [
  "Ahmed_π", "Nour99", "PiMaster", "Khalid88", "Zara_x",
  "Leo2024", "SkyKing", "ProPi", "FastHand", "ByteWolf",
  "Omar_π", "Lena42", "XRacer", "NeonQ", "AcePlayer",
  "TopDog", "FlashPi", "PixelPro", "CobraK", "ZeroCool",
];

// ── League definitions ────────────────────────────────────────────────────────
const LEAGUES = [
  {
    id: "training",
    icon: "🥉",
    name: "Training League",
    subtitle: "المجانية — Open to all",
    color: "#cd7f32",
    glow: "rgba(205,127,50,0.25)",
    status: "open",
    description: "Practice mode. No entry cost, no ranking impact.",
    maxQueue: null,
    entryCost: 0,
  },
  {
    id: "coin",
    icon: "🥈",
    name: "Coin League",
    subtitle: "دوري العملات — 10-player match",
    color: "#c0c0c0",
    glow: "rgba(192,192,192,0.2)",
    status: "queue",
    description: "Join the queue. Match starts when 10 players are ready.",
    maxQueue: 10,
    entryCost: 5,
  },
  {
    id: "pro",
    icon: "🥇",
    name: "Pro League",
    subtitle: "دوري المحترفين — Top 8 only",
    color: "#ffd700",
    glow: "rgba(255,215,0,0.2)",
    status: "elite",
    description: "Knockout bracket. Only top 8 Coin League finishers qualify.",
    maxQueue: 8,
    entryCost: 20,
  },
  {
    id: "champion",
    icon: "👑",
    name: "Champion League",
    subtitle: "قريباً — Coming Soon",
    color: "#a78bfa",
    glow: "rgba(167,139,250,0.2)",
    status: "locked",
    description: "The ultimate arena. Champions only. Launching next season.",
    maxQueue: null,
    entryCost: 0,
  },
] as const;

type LeagueId = "training" | "coin" | "pro" | "champion";

// ── Queue state ───────────────────────────────────────────────────────────────
interface QueueState {
  players: string[];
  localJoined: boolean;
}

function useQueueSimulator(leagueId: LeagueId, maxQueue: number | null) {
  const [queue, setQueue] = useState<QueueState>({ players: [], localJoined: false });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const joinQueue = (myName: string) => {
    setQueue((q) => {
      if (q.localJoined) return q;
      return { players: [...q.players, myName], localJoined: true };
    });
  };

  const leaveQueue = () => {
    setQueue((q) => ({
      players: q.players.filter((_, i) => i !== q.players.length - 1),
      localJoined: false,
    }));
  };

  useEffect(() => {
    if (!maxQueue) return;
    // Start with 1-3 random "players already in queue"
    const initial = FAKE_NAMES.slice(0, Math.floor(Math.random() * 3) + 1);
    setQueue({ players: initial, localJoined: false });

    // Randomly add/remove players every 3-7s
    intervalRef.current = setInterval(() => {
      setQueue((q) => {
        const currentFakes = q.players.filter((p) => FAKE_NAMES.includes(p));
        if (q.players.length < maxQueue - 1 && Math.random() > 0.3) {
          const available = FAKE_NAMES.filter((n) => !q.players.includes(n));
          if (!available.length) return q;
          const next = available[Math.floor(Math.random() * available.length)];
          return { ...q, players: [...q.players, next] };
        } else if (currentFakes.length > 1 && Math.random() > 0.6) {
          const removeIdx = Math.floor(Math.random() * currentFakes.length);
          const toRemove = currentFakes[removeIdx];
          return { ...q, players: q.players.filter((p) => p !== toRemove) };
        }
        return q;
      });
    }, 3500 + Math.random() * 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxQueue]);

  return { queue, joinQueue, leaveQueue };
}

// ── League Card ───────────────────────────────────────────────────────────────
function LeagueCard({
  lg,
  myName,
  myLevel,
  coins,
  onEnter,
}: {
  lg: (typeof LEAGUES)[number];
  myName: string;
  myLevel: number;
  coins: number;
  onEnter: (id: LeagueId) => void;
}) {
  const { queue, joinQueue, leaveQueue } = useQueueSimulator(
    lg.id,
    lg.maxQueue,
  );
  const [expanded, setExpanded] = useState(false);
  const [matchReady, setMatchReady] = useState(false);
  const filled = lg.maxQueue ? queue.players.length : 0;
  const pct = lg.maxQueue ? (filled / lg.maxQueue) * 100 : 0;

  // Check if queue is full → match ready
  useEffect(() => {
    if (lg.maxQueue && filled >= lg.maxQueue && queue.localJoined) {
      setMatchReady(true);
    }
  }, [filled, queue.localJoined, lg.maxQueue]);

  const canAfford = coins >= lg.entryCost;
  const isLocked  = lg.status === "locked";
  const isElite   = lg.status === "elite" && myLevel < 20;

  const handleJoin = () => {
    if (isLocked || !canAfford) return;
    if (lg.status === "open") { onEnter(lg.id); return; }
    if (queue.localJoined) { leaveQueue(); return; }
    joinQueue(myName);
  };

  const handleEnterMatch = () => onEnter(lg.id);

  return (
    <motion.div
      layout
      onClick={() => setExpanded((e) => !e)}
      className="rounded-3xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
      style={{
        background: `linear-gradient(135deg, ${lg.glow}, rgba(255,255,255,0.03))`,
        border: `1px solid ${lg.color}35`,
        boxShadow: expanded ? `0 8px 40px ${lg.color}25` : "none",
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-4 p-5">
        <motion.span
          className="text-4xl"
          animate={expanded ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          {lg.icon}
        </motion.span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-lg text-white">{lg.name}</span>
            {isLocked && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
              >
                SOON
              </span>
            )}
            {isElite && !isLocked && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,215,0,0.15)", color: "#ffd700" }}
              >
                TOP 8
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: `${lg.color}99` }}>
            {lg.subtitle}
          </p>

          {/* Queue bar */}
          {lg.maxQueue && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span style={{ color: "rgba(255,255,255,0.45)" }}>
                  Queue: {filled}/{lg.maxQueue}
                </span>
                {queue.localJoined && (
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    style={{ color: lg.color }}
                    className="font-bold"
                  >
                    ● In Queue
                  </motion.span>
                )}
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${lg.color}, ${lg.color}88)`,
                    boxShadow: `0 0 6px ${lg.color}80`,
                  }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Chevron */}
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          className="text-white/30 text-lg"
        >
          ›
        </motion.span>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div
              className="px-5 pb-5 pt-1 border-t"
              style={{ borderColor: `${lg.color}20` }}
            >
              <p
                className="text-sm mb-4"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                {lg.description}
              </p>

              {/* Stats row */}
              <div className="flex gap-4 mb-4">
                {lg.entryCost > 0 && (
                  <div
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl"
                    style={{
                      background: canAfford
                        ? "rgba(251,191,36,0.12)"
                        : "rgba(239,68,68,0.12)",
                      border: `1px solid ${canAfford ? "rgba(251,191,36,0.3)" : "rgba(239,68,68,0.3)"}`,
                      color: canAfford ? "#fbbf24" : "#f87171",
                    }}
                  >
                    <span className="font-black">{lg.entryCost}🪙</span>
                    <span className="opacity-70">entry</span>
                  </div>
                )}
                {lg.entryCost === 0 && !isLocked && (
                  <div
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl"
                    style={{
                      background: "rgba(34,197,94,0.12)",
                      border: "1px solid rgba(34,197,94,0.3)",
                      color: "#4ade80",
                    }}
                  >
                    FREE
                  </div>
                )}
                {lg.maxQueue && (
                  <div
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    {lg.maxQueue} players
                  </div>
                )}
              </div>

              {/* Player avatars in queue */}
              {lg.maxQueue && queue.players.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {queue.players.map((name, i) => (
                    <motion.div
                      key={name}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        background:
                          name === myName
                            ? `${lg.color}30`
                            : "rgba(255,255,255,0.07)",
                        border: `1px solid ${name === myName ? lg.color + "60" : "rgba(255,255,255,0.1)"}`,
                        color:
                          name === myName ? lg.color : "rgba(255,255,255,0.55)",
                      }}
                    >
                      {name === myName ? "● You" : name}
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Match-ready CTA */}
              <AnimatePresence>
                {matchReady && (
                  <motion.button
                    key="match-ready"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={(e) => { e.stopPropagation(); handleEnterMatch(); }}
                    className="w-full h-14 rounded-2xl font-black text-base text-white mb-3"
                    style={{
                      background: `linear-gradient(135deg, ${lg.color}, ${lg.color}cc)`,
                      boxShadow: `0 0 30px ${lg.color}60`,
                    }}
                  >
                    ⚡ MATCH READY — Enter Now!
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Action button */}
              {!matchReady && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleJoin(); }}
                  disabled={isLocked || !canAfford || isElite}
                  className="w-full h-12 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
                  style={
                    !isLocked && canAfford && !isElite
                      ? {
                          background: queue.localJoined
                            ? "rgba(239,68,68,0.15)"
                            : `linear-gradient(135deg, ${lg.color}30, ${lg.color}18)`,
                          border: `1px solid ${queue.localJoined ? "rgba(239,68,68,0.4)" : lg.color + "50"}`,
                          color: queue.localJoined ? "#f87171" : lg.color,
                        }
                      : {
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "rgba(255,255,255,0.3)",
                        }
                  }
                >
                  {isLocked
                    ? "🔒 Coming Soon"
                    : isElite
                    ? "🥇 Qualify via Coin League first"
                    : !canAfford
                    ? `Need ${lg.entryCost}🪙`
                    : lg.status === "open"
                    ? "▶ Enter Training"
                    : queue.localJoined
                    ? "✕ Leave Queue"
                    : `+ Join Queue (${filled}/${lg.maxQueue})`}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LeaguesHub() {
  const [, go] = useLocation();
  const { user, authUser, isGuest, coins, level } = useGame();
  const { title: lvTitle, color: lvColor } = getLevelTitle(level);

  const playerName =
    user?.username || authUser?.username || (isGuest ? "Champion" : "Player");

  const handleEnter = (id: LeagueId) => {
    if (id === "training" || id === "coin") {
      go(`/game/${id === "coin" ? "bronze" : "training"}`);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, #1a0533 0%, #07020f 60%, #000 100%)",
      }}
    >
      {/* Back */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => go("/")}
        className="absolute top-5 left-5 z-10 flex items-center gap-1.5 text-sm font-bold transition-all active:scale-95"
        style={{ color: "rgba(255,255,255,0.45)" }}
      >
        ‹ Home
      </motion.button>

      {/* Coins HUD */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="absolute top-5 right-5 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
        style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#fbbf24",
        }}
      >
        {coins} 🪙
      </motion.div>

      <div className="flex flex-col items-center pt-16 pb-10 px-5 w-full max-w-md mx-auto gap-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mt-2"
        >
          <h1
            className="text-3xl font-black tracking-tight"
            style={{
              background: "linear-gradient(135deg, #e9d5ff, #a78bfa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 16px rgba(167,139,250,0.5))",
            }}
          >
            LEAGUES HUB
          </h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: `${lvColor}20`,
                border: `1px solid ${lvColor}40`,
                color: lvColor,
              }}
            >
              Lv.{level} {lvTitle}
            </span>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              {playerName}
            </span>
          </div>
        </motion.div>

        {/* League cards */}
        <div className="w-full space-y-3">
          {LEAGUES.map((lg, i) => (
            <motion.div
              key={lg.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 + 0.2 }}
            >
              <LeagueCard
                lg={lg}
                myName={playerName}
                myLevel={level}
                coins={coins}
                onEnter={handleEnter}
              />
            </motion.div>
          ))}
        </div>

        {/* Rules quick-ref */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="w-full rounded-2xl p-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-widest mb-3"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            Game Rules
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            {[
              "🎨 Color matching",
              "🔷 Shape matching",
              "⚡ Fast reaction",
              "⏱️ 3–6s per question",
              "🖥️ Server-side scoring",
              "🎯 Accuracy + Speed",
            ].map((r) => (
              <div key={r} className="flex items-center gap-1.5">
                <span>{r}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Daily shortcut */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          onClick={() => go("/dashboard")}
          className="text-xs py-2 transition-colors"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          View Full Dashboard →
        </motion.button>
      </div>
    </div>
  );
}
