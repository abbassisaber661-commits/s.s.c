import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";

type Stage =
  | "title"       // 0-2s   — SKILLLEAGUE glows in
  | "name"        // 2-4s   — player name rises
  | "greetings"   // 4-6s   — multilingual flash
  | "tagline"     // 6-7.5s — tagline
  | "leagues"     // 7.5-10s — leagues reveal
  | "enter"       // flash + ENTERING MATCH…
  | "done";

const GREETINGS = ["Welcome", "Bienvenue", "مرحباً بك", "Bienvenido"];
const LEAGUES_LIST = [
  { icon: "🥉", name: "Training League",  color: "#cd7f32" },
  { icon: "🥈", name: "Coin League",      color: "#c0c0c0" },
  { icon: "🥇", name: "Pro League",       color: "#ffd700" },
  { icon: "👑", name: "Champion League",  color: "#a78bfa" },
];

export default function CinematicIntro() {
  const [, go]          = useLocation();
  const { user, authUser, isGuest } = useGame();
  const [stage, setStage]           = useState<Stage>("title");
  const [greetIdx, setGreetIdx]     = useState(0);
  const [leagueIdx, setLeagueIdx]   = useState(-1);
  const [flash, setFlash]           = useState(false);
  const timerRef                    = useRef<ReturnType<typeof setTimeout>[]>([]);

  const playerName =
    user?.username || authUser?.username || (isGuest ? "Champion" : "Player");

  const schedule = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timerRef.current.push(t);
  };

  useEffect(() => {
    // Stage 1 → title (already mounted)
    // Stage 2 → name at 2000ms
    schedule(() => setStage("name"), 2000);
    // Stage 3 → greetings at 4000ms
    schedule(() => { setStage("greetings"); setGreetIdx(0); }, 4000);
    schedule(() => setGreetIdx(1), 4500);
    schedule(() => setGreetIdx(2), 5000);
    schedule(() => setGreetIdx(3), 5500);
    // Stage 4 → tagline at 6000ms
    schedule(() => setStage("tagline"), 6000);
    // Stage 5 → leagues at 7500ms
    schedule(() => { setStage("leagues"); setLeagueIdx(0); }, 7500);
    schedule(() => setLeagueIdx(1), 8050);
    schedule(() => setLeagueIdx(2), 8600);
    schedule(() => setLeagueIdx(3), 9150);
    // End → flash at 9800ms
    schedule(() => { setStage("enter"); setFlash(true); }, 9800);
    schedule(() => setFlash(false), 10100);
    // Navigate at 10600ms
    schedule(() => { setStage("done"); go("/hub"); }, 10600);

    return () => timerRef.current.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden flex flex-col"
      style={{
        background: "radial-gradient(ellipse at 50% 30%, #1a0533 0%, #07020f 70%, #000 100%)",
      }}
    >
      {/* White flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key="flash"
            className="absolute inset-0 z-50 bg-white pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
        )}
      </AnimatePresence>

      {/* ── FIXED HEADER: SKILLLEAGUE (always visible after stage 1) ── */}
      <AnimatePresence>
        {stage !== "title" && (
          <motion.div
            key="header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute top-0 left-0 right-0 flex justify-center pt-10 z-20"
          >
            <span
              className="text-xl font-black tracking-[0.25em] uppercase"
              style={{
                background: "linear-gradient(135deg, #e9d5ff, #a78bfa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 12px rgba(167,139,250,0.6))",
              }}
            >
              SKILLLEAGUE
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CENTER STAGE AREA ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">

        {/* Stage 1: Title zoom-in */}
        <AnimatePresence>
          {stage === "title" && (
            <motion.div
              key="big-title"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.15, y: -60 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <motion.h1
                className="text-6xl font-black tracking-tight leading-none"
                animate={{
                  textShadow: [
                    "0 0 20px rgba(167,139,250,0.3)",
                    "0 0 60px rgba(167,139,250,0.9)",
                    "0 0 20px rgba(167,139,250,0.3)",
                  ],
                }}
                transition={{ duration: 1.4, repeat: Infinity }}
                style={{
                  background: "linear-gradient(135deg, #e9d5ff 0%, #a78bfa 50%, #818cf8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                SKILLLEAGUE
              </motion.h1>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage 2: Player name */}
        <AnimatePresence>
          {stage === "name" && (
            <motion.div
              key="player-name"
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -80 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <p className="text-2xl font-black text-white/50 mb-1 tracking-widest uppercase text-sm">
                Player
              </p>
              <h2
                className="text-5xl font-black"
                style={{
                  background: "linear-gradient(135deg, #fff, #c4b5fd)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 20px rgba(167,139,250,0.7))",
                }}
              >
                {playerName}
              </h2>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage 3: Greetings flash */}
        <AnimatePresence mode="wait">
          {stage === "greetings" && (
            <motion.div
              key={`greet-${greetIdx}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.22 }}
              className="text-center"
            >
              <span
                className="text-4xl font-black"
                style={{
                  background:
                    greetIdx === 2
                      ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                      : "linear-gradient(135deg, #e9d5ff, #a78bfa)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 16px rgba(167,139,250,0.6))",
                }}
              >
                {GREETINGS[greetIdx]}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage 4: Tagline */}
        <AnimatePresence>
          {stage === "tagline" && (
            <motion.div
              key="tagline"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -60 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
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

        {/* Stage 5: Leagues reveal */}
        {stage === "leagues" && (
          <div className="w-full max-w-xs space-y-3">
            {LEAGUES_LIST.map((lg, i) => (
              <AnimatePresence key={lg.name}>
                {leagueIdx >= i && (
                  <motion.div
                    initial={{ opacity: 0, y: 60, rotateX: -25 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    exit={{ opacity: 0, y: -60 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    style={{ perspective: 600 }}
                  >
                    <div
                      className="flex items-center gap-4 rounded-2xl px-5 py-4"
                      style={{
                        background: `linear-gradient(135deg, ${lg.color}18, transparent)`,
                        border: `1px solid ${lg.color}40`,
                        boxShadow: `0 4px 20px ${lg.color}20`,
                      }}
                    >
                      <span className="text-3xl">{lg.icon}</span>
                      <span
                        className="text-lg font-black"
                        style={{ color: lg.color }}
                      >
                        {lg.name}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            ))}
          </div>
        )}

        {/* End: ENTERING MATCH */}
        <AnimatePresence>
          {stage === "enter" && (
            <motion.div
              key="entering"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="text-center"
            >
              <p
                className="text-2xl font-black tracking-widest uppercase"
                style={{
                  background: "linear-gradient(135deg, #fff, #a78bfa)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 20px rgba(167,139,250,0.8))",
                }}
              >
                ENTERING MATCH...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
        <motion.div
          className="h-full"
          style={{
            background: "linear-gradient(90deg, #7c3aed, #818cf8)",
            boxShadow: "0 0 8px rgba(124,58,237,0.8)",
          }}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 10.6, ease: "linear" }}
        />
      </div>

      {/* Skip button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1 }}
        onClick={() => go("/hub")}
        className="absolute bottom-6 right-6 text-xs text-white/40 hover:text-white/70 transition-colors"
      >
        Skip ›
      </motion.button>
    </div>
  );
}
