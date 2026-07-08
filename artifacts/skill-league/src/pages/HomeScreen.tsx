import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { leagueApi, type SeasonEntry, type LeagueId } from "@/lib/league-api";
import { getStoredPlayerId } from "@/lib/apiClient";
import GCVSection from "@/components/home/GCVSection";

// ── Division definitions (mirror Leaderboard.tsx) ──────────────────────────

type DivisionId = "training" | "coin" | "pro" | "champion";

interface DivisionDef {
  id: DivisionId;
  leagueId: LeagueId;
  label: string;
  emoji: string;
  color: string;
  rgb: string;
}

const DIVISIONS: DivisionDef[] = [
  { id: "training", leagueId: "coins",    label: "Division III",     emoji: "🎯", color: "#3AB4FF", rgb: "58,180,255"  },
  { id: "coin",     leagueId: "pro",      label: "Division II",      emoji: "🪙", color: "#FFD93D", rgb: "255,217,61"  },
  { id: "pro",      leagueId: "elite",    label: "Pro League",       emoji: "🏆", color: "#2EE87A", rgb: "46,232,122"  },
  { id: "champion", leagueId: "champion", label: "Champions League", emoji: "👑", color: "#B44FFF", rgb: "180,79,255"  },
];

const medalFor  = (i: number) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
const rankColor = (i: number) =>
  i === 0 ? "#FFD700" : i === 1 ? "#A8A9AD" : i === 2 ? "#CD7F32" : "rgba(255,255,255,0.3)";

// ── HomeScreen ────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [, go]  = useLocation();
  const { isGuest, username, language } = useGame();
  const playerId = getStoredPlayerId();

  const [pressed,  setPressed]  = useState(false);
  const [selected, setSelected] = useState<DivisionId>("training");
  const [entries,  setEntries]  = useState<SeasonEntry[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const topPad = isGuest ? 88 : 52;

  const load = useCallback(async (div: DivisionId) => {
    setLoading(true);
    setError(null);
    try {
      const leagueId = DIVISIONS.find(d => d.id === div)!.leagueId;
      const data = await leagueApi.getStandings(leagueId);
      setEntries(data);
    } catch {
      setError("Could not load standings");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(selected); }, [selected, load]);

  const handlePlay = () => {
    if (pressed) return;
    setPressed(true);
    setTimeout(() => go("/league-select"), 320);
  };

  const div = DIVISIONS.find(d => d.id === selected)!;

  return (
    <div
      className="min-h-screen w-full overflow-y-auto pb-28"
      style={{
        background: "radial-gradient(ellipse at 50% 25%, #1a0533 0%, #0a0118 55%, #000 100%)",
        paddingTop: topPad + 32,
      }}
    >
      {/* ── GCV Consensus ── */}
      <div className="mb-6">
        <GCVSection language={language} />
      </div>

      {/* ── Play button ── */}
      <div className="flex justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 28 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
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
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 55%)",
              }}
            />
            <span className="relative z-10">▶ PLAY</span>
          </motion.button>
        </motion.div>
      </div>

      {/* ── League Standings ── */}
      <div className="max-w-md mx-auto px-4 mt-10">

        {/* Section label */}
        <p
          className="text-center text-[10px] uppercase tracking-widest font-bold mb-4"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          League Standings
        </p>

        {/* Division tabs */}
        <div
          className="grid grid-cols-4 gap-1 p-1 rounded-2xl mb-4"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {DIVISIONS.map(d => (
            <button
              key={d.id}
              onClick={() => setSelected(d.id)}
              className="flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all duration-200"
              style={
                d.id === selected
                  ? { background: `rgba(${d.rgb},0.18)`, border: `1px solid rgba(${d.rgb},0.4)` }
                  : { border: "1px solid transparent" }
              }
            >
              <span className="text-base leading-none">{d.emoji}</span>
              <span
                className="text-[9px] font-black leading-tight text-center"
                style={{ color: d.id === selected ? d.color : "rgba(255,255,255,0.35)" }}
              >
                {d.label.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>

        {/* Division banner */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between px-4 py-3 rounded-2xl mb-3"
            style={{
              background: `linear-gradient(135deg, rgba(${div.rgb},0.14) 0%, rgba(0,0,0,0.5) 100%)`,
              border: `1.5px solid rgba(${div.rgb},0.28)`,
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{div.emoji}</span>
              <div>
                <div className="text-sm font-black" style={{ color: div.color }}>{div.label}</div>
                <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Current Season</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-black tabular-nums" style={{ color: "rgba(255,255,255,0.7)" }}>
                {loading ? "—" : entries.length}
              </div>
              <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>players</div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Standings rows */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-3 py-14"
            >
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: div.color }} />
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</p>
            </motion.div>
          )}

          {!loading && error && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-3 py-14"
            >
              <span className="text-4xl">⚠️</span>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{error}</p>
              <button
                onClick={() => load(selected)}
                className="text-xs px-4 py-2 rounded-xl font-bold"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}
              >
                Retry
              </button>
            </motion.div>
          )}

          {!loading && !error && entries.length === 0 && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-3 py-14"
            >
              <span className="text-4xl">🏆</span>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No players in {div.label} yet</p>
            </motion.div>
          )}

          {!loading && !error && entries.length > 0 && (
            <motion.div key={`rows-${selected}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {entries.map((entry, i) => {
                const isMe = entry.playerId === playerId || entry.playerName === username;
                const medal = medalFor(i);
                const played = entry.wins + entry.draws + entry.losses;
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.025, 0.4) }}
                    className="flex items-center gap-3 px-3 py-3 rounded-2xl"
                    style={
                      isMe
                        ? { background: `rgba(${div.rgb},0.1)`, border: `1.5px solid rgba(${div.rgb},0.45)` }
                        : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }
                    }
                  >
                    {/* Rank */}
                    <div
                      className="w-7 text-center font-black text-sm shrink-0 tabular-nums"
                      style={{ color: rankColor(i) }}
                    >
                      {medal ?? `${i + 1}`}
                    </div>

                    {/* Name + record */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span
                          className="font-bold text-sm truncate"
                          style={{ color: isMe ? div.color : "rgba(255,255,255,0.88)" }}
                        >
                          {entry.playerName}
                        </span>
                        {isMe && (
                          <span
                            className="text-[9px] font-black px-1.5 py-0.5 rounded-md"
                            style={{ background: `rgba(${div.rgb},0.22)`, color: div.color }}
                          >
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                          {played}P · {entry.wins}W {entry.draws}D {entry.losses}L
                        </span>
                      </div>
                    </div>

                    {/* Points */}
                    <div className="text-right shrink-0">
                      <div
                        className="text-sm font-black tabular-nums"
                        style={{ color: div.color }}
                      >
                        {entry.points}
                      </div>
                      <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>pts</div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
