import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MatchResult {
  league: string;
  leagueName: string;
  leagueColor: string;
  leagueIcon: string;
  playerName: string;
  score: number;
  correct: number;
  accuracy: number;
  total: number;
  opponents: { name: string; score: number }[];
}

// ── Prize config ──────────────────────────────────────────────────────────────

function getPrize(rank: number, total: number, league: string): number {
  if (league === "training") return 0;
  if (league === "bronze" || league === "coin") {
    const paidPlaces = total <= 5 ? 2 : 4;
    if (rank > paidPlaces) return 0;
    const prizes = [50, 30, 20, 10];
    return prizes[rank - 1] ?? 0;
  }
  if (league === "gold" || league === "pro") {
    if (rank <= 4) return [120, 80, 50, 30][rank - 1] ?? 0;
    return [15, 10, 8, 5][rank - 5] ?? 0;
  }
  return 0;
}

// ── Rank badge ────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const cfg =
    rank === 1 ? { emoji: "👑", color: "#ffd700", label: "Champion",   glow: "rgba(255,215,0,0.5)" } :
    rank === 2 ? { emoji: "🥈", color: "#c0c0c0", label: "Runner-Up",  glow: "rgba(192,192,192,0.4)" } :
    rank === 3 ? { emoji: "🥉", color: "#cd7f32", label: "Third",      glow: "rgba(205,127,50,0.4)" } :
    rank <= 5   ? { emoji: "⭐", color: "#a78bfa", label: `Rank #${rank}`, glow: "rgba(167,139,250,0.3)" } :
                  { emoji: "🎮", color: "#64748b", label: `Rank #${rank}`, glow: "rgba(100,116,139,0.2)" };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.3 }}
      className="flex flex-col items-center gap-2"
    >
      <motion.div
        className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
        animate={{ boxShadow: [`0 0 20px ${cfg.glow}`, `0 0 50px ${cfg.glow}`, `0 0 20px ${cfg.glow}`] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: `${cfg.color}18`,
          border: `2px solid ${cfg.color}60`,
        }}
      >
        {cfg.emoji}
      </motion.div>
      <span className="text-sm font-black tracking-widest uppercase" style={{ color: cfg.color }}>
        {cfg.label}
      </span>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Results() {
  const [, go] = useLocation();
  const { addCoins } = useGame();

  const [result, setResult] = useState<MatchResult | null>(null);
  const [showBoard, setShowBoard] = useState(false);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("sl_match_result");
    if (raw) {
      try {
        const r: MatchResult = JSON.parse(raw);
        setResult(r);
        sessionStorage.removeItem("sl_match_result");
        const allPs = [...r.opponents, { name: r.playerName, score: r.score }].sort((a, b) => b.score - a.score);
        const rank  = allPs.findIndex((p) => p.name === r.playerName) + 1;
        const prize = getPrize(rank, allPs.length, r.league);
        if (prize > 0) addCoins(prize);
      } catch (_) { /* ignore */ }
    }
    // Show leaderboard after entrance
    setTimeout(() => setShowBoard(true), 900);
  }, []);

  // Derived rankings
  const allPlayers = result
    ? [...result.opponents, { name: result.playerName, score: result.score }]
        .sort((a, b) => b.score - a.score)
    : [];

  const myRank = result
    ? allPlayers.findIndex((p) => p.name === result.playerName) + 1
    : 0;

  const prize = result ? getPrize(myRank, allPlayers.length, result.league) : 0;

  // Confetti for top 3
  useEffect(() => {
    if (myRank > 0 && myRank <= 3) setConfetti(true);
  }, [myRank]);

  // Fallback if no result in session storage
  if (!result) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-6"
        style={{ background: "#000" }}
      >
        <p className="text-white/40 text-sm">No match data found.</p>
        <button
          onClick={() => go("/hub")}
          className="px-6 py-3 rounded-2xl font-bold text-sm text-white"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          Return to Leagues
        </button>
      </div>
    );
  }

  const lc = result.leagueColor;

  return (
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{ background: `radial-gradient(ellipse at 50% 0%, ${lc}18 0%, #060010 55%, #000 100%)` }}
    >
      {/* Confetti particles */}
      {confetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
          {Array.from({ length: 30 }, (_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-sm"
              style={{
                left: `${Math.random() * 100}%`,
                background: [lc, "#ffd700", "#fff", "#a78bfa", "#22c55e"][i % 5],
              }}
              initial={{ y: -20, opacity: 1, rotate: 0 }}
              animate={{ y: "110vh", opacity: 0, rotate: 360 * (Math.random() > 0.5 ? 1 : -1) }}
              transition={{ duration: 2.5 + Math.random() * 2, delay: Math.random() * 0.8, ease: "easeIn" }}
            />
          ))}
        </div>
      )}

      <div className="relative z-20 max-w-md mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-xs font-bold tracking-[0.3em] uppercase mb-1" style={{ color: `${lc}99` }}>
            {result.leagueIcon} {result.leagueName} League
          </p>
          <h1
            className="text-4xl font-black tracking-tight"
            style={{
              background: "linear-gradient(135deg, #fff, rgba(255,255,255,0.7))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 16px rgba(255,255,255,0.2))",
            }}
          >
            MATCH COMPLETE
          </h1>
        </motion.div>

        {/* Your result */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-3xl p-6 flex flex-col items-center gap-5"
          style={{
            background: `linear-gradient(135deg, ${lc}20 0%, rgba(255,255,255,0.04) 100%)`,
            border: `1px solid ${lc}40`,
            boxShadow: `0 8px 40px ${lc}20`,
          }}
        >
          <RankBadge rank={myRank} />

          {/* Stats row */}
          <div className="flex items-center gap-6 w-full justify-center">
            {[
              { val: result.score,           label: "Score",    color: lc },
              { val: `${result.accuracy}%`,  label: "Accuracy", color: result.accuracy >= 70 ? "#4ade80" : "#f87171" },
              { val: `${result.correct}/${result.total}`, label: "Correct", color: "rgba(255,255,255,0.7)" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-0.5">
                <motion.span
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-2xl font-black tabular-nums"
                  style={{ color: s.color }}
                >
                  {s.val}
                </motion.span>
                <span className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Prize */}
          {prize > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, type: "spring" }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl"
              style={{
                background: "rgba(251,191,36,0.15)",
                border: "1px solid rgba(251,191,36,0.4)",
              }}
            >
              <span className="text-xl">🪙</span>
              <span className="font-black text-base" style={{ color: "#fbbf24" }}>
                +{prize} Coins Earned!
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* Leaderboard */}
        <AnimatePresence>
          {showBoard && (
            <motion.div
              key="board"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-3xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
              >
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Final Rankings
                </span>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {allPlayers.length} players
                </span>
              </div>

              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                {allPlayers.map((p, i) => {
                  const isMe   = p.name === result.playerName;
                  const rank   = i + 1;
                  const rankPrize = getPrize(rank, allPlayers.length, result.league);
                  const rankMedal =
                    rank === 1 ? "👑" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

                  return (
                    <motion.div
                      key={p.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 + 0.1 }}
                      className="flex items-center gap-3 px-5 py-3"
                      style={{ background: isMe ? `${lc}12` : "transparent" }}
                    >
                      {/* Rank */}
                      <div className="w-8 flex items-center justify-center">
                        {rankMedal ? (
                          <span className="text-lg">{rankMedal}</span>
                        ) : (
                          <span className="text-sm font-black tabular-nums" style={{ color: "rgba(255,255,255,0.3)" }}>
                            {rank}
                          </span>
                        )}
                      </div>

                      {/* Avatar dot */}
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                        style={{
                          background: isMe ? `${lc}30` : "rgba(255,255,255,0.07)",
                          border: `1px solid ${isMe ? lc + "60" : "rgba(255,255,255,0.1)"}`,
                          color: isMe ? lc : "rgba(255,255,255,0.6)",
                        }}
                      >
                        {p.name[0].toUpperCase()}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-bold truncate"
                          style={{ color: isMe ? lc : "rgba(255,255,255,0.75)" }}
                        >
                          {isMe ? `${p.name} (You)` : p.name}
                        </p>
                      </div>

                      {/* Score */}
                      <span className="text-sm font-black tabular-nums" style={{ color: "rgba(255,255,255,0.6)" }}>
                        {p.score}
                      </span>

                      {/* Prize */}
                      {rankPrize > 0 && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                          style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
                          +{rankPrize}🪙
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col gap-3"
        >
          {/* Return to leagues (primary) */}
          <motion.button
            onClick={() => go("/hub")}
            whileTap={{ scale: 0.96 }}
            className="w-full h-14 rounded-2xl font-black text-base text-white relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${lc}cc, ${lc}88)`,
              boxShadow: `0 0 30px ${lc}40`,
            }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)", x: "-100%" }}
              animate={{ x: ["−100%", "200%"] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            />
            <span className="relative z-10 tracking-wider">🏟️ Return to Leagues</span>
          </motion.button>

          {/* Home */}
          <button
            onClick={() => go("/")}
            className="w-full h-11 rounded-2xl font-bold text-sm transition-all active:scale-95"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            ← Back to Home
          </button>
        </motion.div>
      </div>
    </div>
  );
}
