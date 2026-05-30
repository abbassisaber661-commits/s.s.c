import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";

// Stages — no big title zoom; SKILLLEAGUE stays fixed at top throughout.
type Stage = "name" | "greetings" | "tagline" | "leagues" | "enter" | "done";

const GREETINGS = ["Welcome", "Bienvenue", "مرحباً بك", "Bienvenido"];

const LEAGUES_LIST = [
  { icon: "🥉", name: "Training League",  sub: "دوري تدريبي",  color: "#cd7f32" },
  { icon: "🥈", name: "Coin League",      sub: "10 لاعبين",    color: "#c0c0c0" },
  { icon: "🥇", name: "Pro League",       sub: "Top 8 فقط",    color: "#ffd700" },
  { icon: "👑", name: "Champion League",  sub: "مستقبلي 🔒",   color: "#a78bfa" },
];

export default function CinematicIntro() {
  const [, go]        = useLocation();
  const { user, authUser, isGuest } = useGame();
  const [stage, setStage]         = useState<Stage>("name");
  const [greetIdx, setGreetIdx]   = useState(0);
  // -1 = no league showing; 0-3 = which one is currently visible
  const [leagueIdx, setLeagueIdx] = useState(-1);
  const [flash, setFlash]         = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const playerName =
    user?.username || authUser?.username || (isGuest ? "Champion" : "Player");

  const at = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
  };

  useEffect(() => {
    // ── Stage 1: Player name (0 → 1800ms) ──────────────────────────────
    // already set on mount

    // ── Stage 2: Greetings (1800ms → 3800ms) 4 × 500ms ─────────────────
    at(() => { setStage("greetings"); setGreetIdx(0); }, 1800);
    at(() => setGreetIdx(1), 2300);
    at(() => setGreetIdx(2), 2800);
    at(() => setGreetIdx(3), 3300);

    // ── Stage 3: Tagline (3800ms → 5300ms) ──────────────────────────────
    at(() => setStage("tagline"), 3800);

    // ── Stage 4: Leagues — one at a time, each rises & fades ────────────
    // Each slot = 900ms: 350ms rise, 200ms hold, 350ms exit
    at(() => { setStage("leagues"); setLeagueIdx(0); }, 5300);
    at(() => setLeagueIdx(-1), 6100);   // hide 0
    at(() => setLeagueIdx(1),  6200);   // show 1
    at(() => setLeagueIdx(-1), 7000);   // hide 1
    at(() => setLeagueIdx(2),  7100);   // show 2
    at(() => setLeagueIdx(-1), 7900);   // hide 2
    at(() => setLeagueIdx(3),  8000);   // show 3
    at(() => setLeagueIdx(-1), 8800);   // hide 3

    // ── Stage 5: Enter (8900ms) ──────────────────────────────────────────
    at(() => { setStage("enter"); setFlash(true); }, 8900);
    at(() => setFlash(false), 9200);

    // ── Navigate to hub (9800ms) ─────────────────────────────────────────
    at(() => { setStage("done"); go("/hub"); }, 9800);

    return () => timers.current.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, #1a0533 0%, #07020f 70%, #000 100%)",
      }}
    >
      {/* White flash */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key="flash"
            className="absolute inset-0 z-50 bg-white pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
        )}
      </AnimatePresence>

      {/* ── SKILLLEAGUE — fixed top header, visible from second 0 ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute top-0 left-0 right-0 flex justify-center pt-10 z-20 pointer-events-none"
      >
        <span
          className="text-xl font-black tracking-[0.25em] uppercase"
          style={{
            background: "linear-gradient(135deg, #e9d5ff, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 14px rgba(167,139,250,0.7))",
          }}
        >
          SKILLLEAGUE
        </span>
      </motion.div>

      {/* ── CENTER STAGE ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">

        {/* Stage 1 — Player name: rises from bottom, exits upward */}
        <AnimatePresence mode="wait">
          {stage === "name" && (
            <motion.div
              key="name"
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -80 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <p
                className="text-xs font-bold tracking-[0.3em] uppercase mb-2"
                style={{ color: "rgba(167,139,250,0.6)" }}
              >
                Player
              </p>
              <h2
                className="text-5xl font-black"
                style={{
                  background: "linear-gradient(135deg, #fff 0%, #c4b5fd 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 24px rgba(167,139,250,0.8))",
                }}
              >
                {playerName}
              </h2>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage 2 — Greetings: one word at a time, rises & exits upward */}
        <AnimatePresence mode="wait">
          {stage === "greetings" && (
            <motion.div
              key={`greet-${greetIdx}`}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              <span
                className="text-5xl font-black"
                style={{
                  background:
                    greetIdx === 2
                      ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                      : "linear-gradient(135deg, #e9d5ff, #a78bfa)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 20px rgba(167,139,250,0.7))",
                }}
              >
                {GREETINGS[greetIdx]}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage 3 — Tagline: rises then exits upward */}
        <AnimatePresence mode="wait">
          {stage === "tagline" && (
            <motion.div
              key="tagline"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -60 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="text-center px-4"
            >
              <p
                className="text-3xl font-black leading-snug"
                style={{
                  background: "linear-gradient(135deg, #fff 0%, #c4b5fd 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                "Game of Excitement
                <br />
                &amp; Challenge"
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage 4 — Leagues: each one rises from bottom, stays, then exits upward */}
        <AnimatePresence mode="wait">
          {stage === "leagues" && leagueIdx >= 0 && (
            <motion.div
              key={`league-${leagueIdx}`}
              initial={{ opacity: 0, y: 80, rotateX: -20 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, y: -80 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
              style={{ perspective: 600 }}
              className="w-full max-w-xs"
            >
              <div
                className="flex items-center gap-5 rounded-2xl px-6 py-5"
                style={{
                  background: `linear-gradient(135deg, ${LEAGUES_LIST[leagueIdx].color}22, transparent)`,
                  border: `1px solid ${LEAGUES_LIST[leagueIdx].color}50`,
                  boxShadow: `0 8px 40px ${LEAGUES_LIST[leagueIdx].color}25`,
                }}
              >
                <span className="text-4xl">{LEAGUES_LIST[leagueIdx].icon}</span>
                <div>
                  <p
                    className="text-xl font-black"
                    style={{ color: LEAGUES_LIST[leagueIdx].color }}
                  >
                    {LEAGUES_LIST[leagueIdx].name}
                  </p>
                  <p
                    className="text-xs mt-0.5 font-medium"
                    style={{ color: `${LEAGUES_LIST[leagueIdx].color}90` }}
                  >
                    {LEAGUES_LIST[leagueIdx].sub}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage 5 — ENTERING MATCH */}
        <AnimatePresence>
          {stage === "enter" && (
            <motion.div
              key="enter"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <p
                className="text-2xl font-black tracking-[0.2em] uppercase"
                style={{
                  background: "linear-gradient(135deg, #fff, #a78bfa)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 24px rgba(167,139,250,0.9))",
                }}
              >
                ENTERING MATCH...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "rgba(255,255,255,0.05)" }}>
        <motion.div
          className="h-full"
          style={{
            background: "linear-gradient(90deg, #7c3aed, #818cf8)",
            boxShadow: "0 0 8px rgba(124,58,237,0.8)",
          }}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 9.8, ease: "linear" }}
        />
      </div>

      {/* Skip */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.35 }}
        transition={{ delay: 0.8 }}
        onClick={() => { timers.current.forEach(clearTimeout); go("/hub"); }}
        className="absolute bottom-5 right-5 text-xs text-white/40 hover:text-white/70 transition-colors"
      >
        Skip ›
      </motion.button>
    </div>
  );
}
