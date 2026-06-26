/**
 * Game.tsx — League Challenge mode (Training / Coin / Pro)
 *
 * [DEBUG] Question generator: generateMatchQuestions() from match-engine.ts
 * All puzzle types (image_puzzle, word_assembly, logic_pattern + 6 classic)
 * are generated here. See console for per-match confirmation.
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import {
  generateMatchQuestions,
  calcScore,
  type Question,
  type Option,
} from "@/lib/match-engine";

// ── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_QUESTIONS = 10;
const TICK_MS         = 100;
const FB_MS           = 1200;
const WORD_CORRECT_SIGNAL = 999;

// ── League metadata ───────────────────────────────────────────────────────────

/** Maps the URL route segment to a match-engine tier string. */
const ROUTE_TO_TIER: Record<string, string> = {
  training:      "training",
  bronze:        "coin",
  gold:          "pro",
  "division-iii":  "training",
  "division-ii":   "coin",
  professional:  "pro",
  champions:     "champion",
};

const LEAGUE_META: Record<string, { name: string; color: string; icon: string }> = {
  training:      { name: "Training",            color: "#22d3ee", icon: "🥉" },
  bronze:        { name: "Coin",                color: "#f59e0b", icon: "🥈" },
  gold:          { name: "Pro",                 color: "#f43f5e", icon: "🥇" },
  "division-iii":  { name: "Division III",      color: "#cd7f32", icon: "🥉" },
  "division-ii":   { name: "Division II",       color: "#94a3b8", icon: "🥈" },
  professional:  { name: "Professional League", color: "#ffd700", icon: "🥇" },
  champions:     { name: "Champions League",    color: "#a78bfa", icon: "🏆" },
};

const FAKE_NAMES = [
  "Ahmed_π","Nour99","PiMaster","Khalid88","Zara_x",
  "Leo2024","FastHand","ByteWolf","CobraK","SkyKing",
];

// ── Types ─────────────────────────────────────────────────────────────────────

type LetterState = "correct" | "wrong-pos" | "wrong";
type Phase = "question" | "feedback" | "done";
interface Opponent { name: string; score: number }

// ── Sub-components ────────────────────────────────────────────────────────────

/** Circular countdown timer that works in milliseconds. */
function CircularTimer({ totalMs, elapsedMs, color }: { totalMs: number; elapsedMs: number; color: string }) {
  const R    = 34;
  const C    = 2 * Math.PI * R;
  const pct  = Math.max(0, 1 - elapsedMs / totalMs);
  const rem  = Math.max(0, (totalMs - elapsedMs) / 1000);
  const urgent = pct < 0.35;
  return (
    <div className="relative w-[76px] h-[76px] flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="76" height="76">
        <circle cx="38" cy="38" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
        <motion.circle
          cx="38" cy="38" r={R} fill="none"
          stroke={urgent ? "#ef4444" : color}
          strokeWidth="5" strokeLinecap="round"
          strokeDasharray={C}
          animate={{ strokeDashoffset: C * (1 - pct) }}
          transition={{ duration: 0.12, ease: "linear" }}
        />
      </svg>
      <motion.span
        animate={urgent ? { scale: [1, 1.1, 1] } : {}}
        transition={urgent ? { duration: 0.5, repeat: Infinity } : {}}
        className="text-xl font-black tabular-nums relative z-10"
        style={{ color: urgent ? "#fca5a5" : "white" }}>
        {rem.toFixed(1)}
      </motion.span>
    </div>
  );
}

/** Mini live-rank sidebar. */
function LiveRank({ opponents, myScore, myName, color }:
  { opponents: Opponent[]; myScore: number; myName: string; color: string }) {
  const all = [...opponents, { name: myName, score: myScore }].sort((a, b) => b.score - a.score);
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      className="absolute right-3 top-[74px] z-20 w-[128px] rounded-2xl overflow-hidden"
      style={{ background: "rgba(0,0,0,0.88)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)" }}>
      <div className="px-3 py-1.5 text-[9px] font-bold tracking-widest uppercase"
        style={{ color, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>LIVE</div>
      {all.slice(0, 6).map((p, i) => (
        <div key={p.name} className="flex items-center gap-1.5 px-3 py-1"
          style={{ background: p.name === myName ? `${color}15` : "transparent" }}>
          <span className="text-[9px] font-black w-4 tabular-nums"
            style={{ color: i === 0 ? "#ffd700" : "rgba(255,255,255,0.35)" }}>{i + 1}</span>
          <span className="text-[9px] truncate flex-1"
            style={{ color: p.name === myName ? color : "rgba(255,255,255,0.6)", fontWeight: p.name === myName ? 700 : 400 }}>
            {p.name === myName ? "You" : p.name}
          </span>
          <span className="text-[9px] tabular-nums font-bold"
            style={{ color: "rgba(255,255,255,0.45)" }}>{p.score}</span>
        </div>
      ))}
    </motion.div>
  );
}

/** Renders the question stimulus — shared across all question types. */
function QuestionDisplay({ q }: { q: Question }) {
  const d = q.display;
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-4 w-full">
      {/* Classic types show a short instruction as the prompt; trivia types embed it in display */}
      {d.kind !== "trivia" && (
        <p className="text-xs font-bold text-white/50 uppercase tracking-widest text-center">{q.prompt}</p>
      )}

      {d.kind === "color_block" && (
        <div style={{ width: 140, height: 140, borderRadius: 24, background: d.value,
          boxShadow: `0 0 60px ${d.value}60, 0 0 20px ${d.value}40` }} />
      )}

      {d.kind === "text_prompt" && (
        <div className="flex flex-col items-center gap-2">
          {d.label && <p className="text-xs text-white/40">{d.label}</p>}
          <div className="text-5xl font-black tracking-tight"
            style={{ color: d.color ?? "#fff", textShadow: `0 0 40px ${d.color ?? "#fff"}80` }}>
            {d.value}
          </div>
        </div>
      )}

      {d.kind === "shape_char" && (
        <div style={{ fontSize: 100, lineHeight: 1, color: d.color ?? "#fff",
          filter: `drop-shadow(0 0 24px ${d.color ?? "#fff"}80)`, userSelect: "none" }}>
          {d.value}
        </div>
      )}

      {d.kind === "sequence" && (
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {((d.extra ?? []) as string[]).map((hex, i) => (
            <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: i * 0.07, type: "spring", stiffness: 400, damping: 22 }}>
              <div style={{ width: 48, height: 48, borderRadius: 24, background: hex,
                boxShadow: `0 0 12px ${hex}60` }} />
            </motion.div>
          ))}
          <div className="flex items-center justify-center rounded-full border-2 border-dashed border-white/40 text-white/60 text-xl font-black"
            style={{ width: 48, height: 48 }}>?</div>
        </div>
      )}

      {d.kind === "emoji_prompt" && (
        <div className="flex flex-col items-center gap-2">
          <div className="text-8xl leading-none"
            style={{ filter: `drop-shadow(0 0 20px ${d.color ?? "#fff"}60)` }}>{d.value}</div>
          {d.label && (
            <div className="text-sm font-bold px-4 py-1 rounded-full"
              style={{ background: (d.color ?? "#fff") + "20", color: d.color ?? "#fff",
                border: `1px solid ${d.color ?? "#fff"}40` }}>{d.label}</div>
          )}
        </div>
      )}

      {d.kind === "image_grid" && d.gridEmojis && (() => {
        const cols     = d.gridCols ?? d.gridSize ?? 3;
        // Scale cell size down for larger grids to fit the screen
        const cellSize = cols <= 3 ? 54 : cols === 4 ? 44 : 36;
        const fontSize = cols <= 3 ? "1.875rem" : cols === 4 ? "1.5rem" : "1.125rem";
        return (
          <div className="flex flex-col items-center gap-2">
            {d.label && <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{d.label}</p>}
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {d.gridEmojis.map((emoji, i) => {
                const isMissing = emoji === "";
                const isBlank   = emoji === "？";
                return (
                  <motion.div key={i} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.025, 0.4), type: "spring", stiffness: 400, damping: 22 }}
                    className="flex items-center justify-center rounded-lg select-none"
                    style={{
                      width: cellSize, height: cellSize,
                      fontSize,
                      background: isMissing
                        ? "rgba(255,255,255,0.04)"
                        : isBlank
                        ? "rgba(255,255,255,0.02)"
                        : "rgba(255,255,255,0.08)",
                      border: isMissing
                        ? "2px dashed rgba(255,255,255,0.35)"
                        : isBlank
                        ? "1px dashed rgba(255,255,255,0.12)"
                        : "1px solid rgba(255,255,255,0.1)",
                    }}>
                    {isMissing
                      ? <span className="text-white/50 font-black" style={{ fontSize: "0.875rem" }}>?</span>
                      : isBlank
                      ? <span className="text-white/20" style={{ fontSize: "0.75rem" }}>·</span>
                      : emoji}
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {d.kind === "logic_eq" && d.logicLines && (
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          {d.label && <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{d.label}</p>}
          <div className="bg-white/5 rounded-2xl px-6 py-5 space-y-2.5 w-full border border-white/[0.08]">
            {d.logicLines.map((line, i) => {
              const isLast = i === d.logicLines!.length - 1;
              return (
                <motion.p key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`font-black tabular-nums text-center ${isLast ? "text-2xl" : "text-base"}`}
                  style={{ color: isLast ? (d.color ?? "#FFD93D") : "rgba(255,255,255,0.85)" }}>
                  {line}
                </motion.p>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Trivia display — knowledge questions (sports / culture / philosophy / religion / visual) */}
      {d.kind === "trivia" && (
        <div className="flex flex-col items-center gap-3 w-full max-w-sm">
          {/* Category badge */}
          {d.label && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider"
              style={{
                background: (d.color ?? "#fff") + "18",
                border: `1px solid ${d.color ?? "#fff"}40`,
                color: d.color ?? "#fff",
              }}>
              {d.label === "Sports"     && "⚽ Sports"}
              {d.label === "Culture"    && "🌍 Culture"}
              {d.label === "Philosophy" && "🧠 Philosophy"}
              {d.label === "Religion"   && "📖 Religion"}
              {d.label === "Visual"     && "👁 Visual"}
              {!["Sports","Culture","Philosophy","Religion","Visual"].includes(d.label) && d.label}
            </motion.div>
          )}
          {/* Question text — prominent */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="w-full rounded-2xl px-5 py-4 text-center"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${d.color ?? "#fff"}20`,
            }}>
            <p className="text-sm font-bold leading-relaxed text-white/90">
              {d.value}
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}

/** Letter-tile word builder component for word_assembly questions. */
function WordBuilder({
  q, phase, onCorrect,
}: { q: Question; phase: Phase; onCorrect: () => void }) {
  const [assembled, setAssembled] = useState<string[]>([]);
  const [usedIds,   setUsedIds]   = useState<Set<string>>(new Set());
  const [feedback,  setFeedback]  = useState<LetterState[]>([]);
  const [shaking,   setShaking]   = useState(false);
  const [allCorrect, setAllCorrect] = useState(false);

  const target = (q as { wordTarget?: string }).wordTarget ?? "";
  const slots  = target.length;

  useEffect(() => {
    setAssembled([]);
    setUsedIds(new Set());
    setFeedback([]);
    setShaking(false);
    setAllCorrect(false);
  }, [q.id]);

  function addLetter(letter: string, id: string) {
    if (assembled.length >= slots || phase !== "question") return;
    const newAssembled = [...assembled, letter];
    const newUsedIds   = new Set([...usedIds, id]);
    setAssembled(newAssembled);
    setUsedIds(newUsedIds);

    if (newAssembled.length === slots) {
      const attempt = newAssembled.join("");
      if (attempt === target) {
        setFeedback(newAssembled.map(() => "correct"));
        setAllCorrect(true);
        setTimeout(onCorrect, 120);
      } else {
        const fb: LetterState[] = newAssembled.map((c, i) => {
          if (c === target[i]) return "correct";
          if (target.includes(c)) return "wrong-pos";
          return "wrong";
        });
        setFeedback(fb);
        setShaking(true);
        setTimeout(() => {
          setAssembled([]);
          setUsedIds(new Set());
          setFeedback([]);
          setShaking(false);
        }, 850);
      }
    }
  }

  function backspace() {
    if (assembled.length === 0 || phase !== "question") return;
    const newA = assembled.slice(0, -1);
    const ids  = [...usedIds];
    ids.pop();
    setAssembled(newA);
    setUsedIds(new Set(ids));
    if (feedback.length > 0) setFeedback([]);
  }

  function slotBg(i: number) {
    if (i >= assembled.length) return "rgba(255,255,255,0.06)";
    const fb = feedback[i];
    if (!fb)              return "rgba(58,180,255,0.18)";
    if (fb === "correct") return "rgba(46,232,122,0.30)";
    if (fb === "wrong-pos") return "rgba(255,217,61,0.28)";
    return "rgba(255,58,94,0.28)";
  }

  function slotBorder(i: number) {
    if (i >= assembled.length) return "1.5px solid rgba(255,255,255,0.12)";
    const fb = feedback[i];
    if (!fb)              return "1.5px solid rgba(58,180,255,0.5)";
    if (fb === "correct") return "1.5px solid #2EE87A90";
    if (fb === "wrong-pos") return "1.5px solid #FFD93D90";
    return "1.5px solid #FF3A5E90";
  }

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* Slots */}
      <motion.div className="flex gap-2 justify-center flex-wrap"
        animate={shaking ? { x: [-6, 6, -5, 5, -3, 3, 0] } : {}}
        transition={{ duration: 0.5 }}>
        {Array.from({ length: slots }).map((_, i) => (
          <motion.div key={i}
            animate={allCorrect && feedback[i] === "correct" ? { scale: [1, 1.15, 1] } : {}}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-center rounded-xl font-black text-lg select-none"
            style={{ width: 44, height: 44, background: slotBg(i), border: slotBorder(i) }}>
            {assembled[i] ?? ""}
          </motion.div>
        ))}
        {assembled.length > 0 && phase === "question" && (
          <button onClick={backspace}
            className="flex items-center justify-center rounded-xl border"
            style={{ width: 44, height: 44, border: "1.5px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>⌫</button>
        )}
      </motion.div>

      {/* Letter bank */}
      <div className="flex flex-wrap gap-2 justify-center max-w-[280px]">
        {q.options.map(opt => {
          const used = usedIds.has(opt.id);
          return (
            <button key={opt.id} disabled={used || phase !== "question"}
              onClick={() => addLetter(opt.value, opt.id)}
              className="flex items-center justify-center rounded-xl font-black text-base transition-all select-none"
              style={{
                width: 44, height: 44,
                background:  used ? "rgba(255,255,255,0.03)" : "rgba(180,79,255,0.15)",
                border:      used ? "1.5px solid rgba(255,255,255,0.06)" : "1.5px solid rgba(180,79,255,0.5)",
                color:       used ? "rgba(255,255,255,0.2)" : "#fff",
                cursor:      used ? "not-allowed" : "pointer",
              }}>
              {opt.value}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-[10px] text-white/35">
        {[["#2EE87A","Correct"],["#FFD93D","Wrong spot"],["#FF3A5E","Not in word"]].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: c }} />{l}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Answer option button — handles all option kinds from match-engine. */
function OptionBtn({
  opt, state, accent, onClick,
}: { opt: Option; state: "idle"|"correct"|"wrong"|"disabled"; accent?: string; onClick: () => void }) {
  const stateStyle =
    state === "correct"  ? "border-green-400 bg-green-400/20 shadow-[0_0_20px_rgba(74,222,128,0.4)]" :
    state === "wrong"    ? "border-red-500 bg-red-500/20" :
    state === "disabled" ? "border-white/10 bg-white/5 opacity-40 cursor-default" :
                           "border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/30 cursor-pointer";
  return (
    <button
      className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 transition-all duration-150 active:scale-95 select-none overflow-hidden h-20 ${stateStyle}`}
      onClick={onClick}
      disabled={state === "disabled"}>
      {state === "correct" && (
        <div className="absolute inset-0 flex items-center justify-center text-green-400 text-3xl">✓</div>
      )}
      <div className={state !== "idle" && state !== "disabled" ? "opacity-30" : ""}>
        {opt.kind === "color"  && <>
          <div className="w-10 h-10 rounded-xl mx-auto"
            style={{ background: opt.value, boxShadow: `0 0 16px ${opt.value}60` }} />
          <span className="text-[11px] text-white/70 font-medium">{opt.label}</span>
        </>}
        {opt.kind === "shape"  && <>
          <div className="text-3xl leading-none" style={{ color: accent ?? "#fff" }}>{opt.value}</div>
          <span className="text-[11px] text-white/70">{opt.label}</span>
        </>}
        {opt.kind === "emoji"  && <div className="text-4xl leading-none">{opt.value}</div>}
        {opt.kind === "text"   && <span className="text-sm font-black text-white">{opt.label}</span>}
        {opt.kind === "number" && <span className="text-2xl font-black text-white tabular-nums">{opt.label}</span>}
      </div>
    </button>
  );
}

/** Badge shown beside puzzle-type questions. */
function PuzzleBadge({ type }: { type: string }) {
  const MAP: Record<string, { label: string; color: string; icon: string }> = {
    image_puzzle:      { label: "Image Puzzle",  color: "#FF8C42", icon: "🧩" },
    word_assembly:     { label: "Word Builder",  color: "#B44FFF", icon: "🔤" },
    logic_pattern:     { label: "Logic Puzzle",  color: "#2EE87A", icon: "🧠" },
    puzzle_assembly:   { label: "Grid Puzzle",   color: "#FF8C42", icon: "🗂️" },
    visual_deception:  { label: "Visual Trap",   color: "#FF3A5E", icon: "👁" },
  };
  const cfg = MAP[type];
  if (!cfg) return null;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black"
      style={{ background: cfg.color + "18", border: `1px solid ${cfg.color}40`, color: cfg.color }}>
      {cfg.icon} {cfg.label}
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Game() {
  const [, go]     = useLocation();
  const [, params] = useRoute<{ league: string }>("/game/:league");
  const league     = params?.league ?? "bronze";
  const meta       = LEAGUE_META[league] ?? LEAGUE_META.bronze;
  const tier       = ROUTE_TO_TIER[league] ?? "coin";
  const { user, authUser, isGuest, recordMatch } = useGame();
  const playerName = user?.username || authUser?.username || (isGuest ? "Champion" : "Player");

  // ── [DEBUG] Confirm new generator is active ─────────────────────────────────
  const [questions] = useState<Question[]>(() => {
    const qs = generateMatchQuestions(TOTAL_QUESTIONS, tier);
    console.log(
      `[SkillLeague] generateMatchQuestions used — league="${league}" tier="${tier}" count=${qs.length}`,
      qs.map(q => q.type),
    );
    return qs;
  });

  const [qIdx,     setQIdx]     = useState(0);
  const [score,    setScore]    = useState(0);
  const [combo,    setCombo]    = useState(0);
  const [correct,  setCorrect]  = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [chosen,   setChosen]   = useState<number | null>(null);
  const [phase,    setPhase]    = useState<Phase>("question");
  const [showRank, setShowRank] = useState(false);
  const [done,     setDone]     = useState(false);
  const [lastPts,  setLastPts]  = useState(0);

  const [opponents] = useState<Opponent[]>(() =>
    (FAKE_NAMES.sort(() => Math.random() - 0.5).slice(0, 5 + Math.floor(Math.random() * 4)))
      .map(name => ({ name, score: 0 })),
  );
  const opRef = useRef(opponents);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const q = questions[qIdx];

  // ── Timer ───────────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    setElapsedMs(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsedMs(e => e + TICK_MS), TICK_MS);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // ── Advance ─────────────────────────────────────────────────────────────────
  const advance = useCallback(() => {
    setChosen(null);
    setPhase("question");
    setShowRank(false);
    setLastPts(0);
    const next = qIdx + 1;
    if (next >= TOTAL_QUESTIONS) { setDone(true); stopTimer(); return; }
    setQIdx(next);
    startTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIdx]);

  // ── Timeout ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!done && chosen === null && phase === "question" && elapsedMs >= q.timeLimitMs) {
      stopTimer();
      setCombo(0);
      setPhase("feedback");
      setShowRank(true);
      nextRef.current = setTimeout(advance, FB_MS);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedMs]);

  // ── Opponent ticker — scores in 3-pt increments to match new scoring system ─
  useEffect(() => {
    const iv = setInterval(() => {
      opRef.current.forEach(o => {
        // ~60% chance to answer correctly (3 pts), else 0 — simulates real match
        if (Math.random() > 0.40) o.score += 3;
      });
    }, 2500 + Math.random() * 2000);
    return () => clearInterval(iv);
  }, []);

  // ── Start ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    startTimer();
    return () => { stopTimer(); if (nextRef.current) clearTimeout(nextRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Navigate to results ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!done) return;
    const accuracy = Math.round((correct / TOTAL_QUESTIONS) * 100);
    sessionStorage.setItem("sl_match_result", JSON.stringify({
      league, leagueName: meta.name, leagueColor: meta.color, leagueIcon: meta.icon,
      playerName, score, correct, accuracy, total: TOTAL_QUESTIONS,
      opponents: opRef.current.map(o => ({ ...o })),
    }));
    try { recordMatch(league, score, accuracy, combo, correct); } catch (_) { /* ignore */ }
    setTimeout(() => go("/results"), 700);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // ── Answer handler ──────────────────────────────────────────────────────────
  const handleAnswer = (rawIdx: number) => {
    if (chosen !== null || phase !== "question") return;
    stopTimer();

    const isWordSignal = rawIdx === WORD_CORRECT_SIGNAL;
    const isCorrect = isWordSignal
      ? true
      : rawIdx === q.correctIndex;

    const timeLeftMs  = Math.max(0, q.timeLimitMs - elapsedMs);
    const streakCount = isCorrect ? combo + 1 : 0;
    const pts         = isCorrect ? calcScore(true, timeLeftMs, q.timeLimitMs, streakCount) : 0;

    // Use correctIndex as the "chosen" display sentinel for word_assembly
    const chosenDisplay = isWordSignal ? q.correctIndex : rawIdx;
    setChosen(chosenDisplay);
    setPhase("feedback");

    if (isCorrect) {
      setCombo(c => c + 1);
      setCorrect(c => c + 1);
      setScore(s => s + pts);
      setLastPts(pts);
    } else {
      setCombo(0);
    }

    setShowRank(true);
    nextRef.current = setTimeout(advance, FB_MS);
  };

  // ── Done flash ──────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "#000" }}>
        <motion.p initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          className="text-3xl font-black tracking-widest" style={{ color: meta.color }}>
          MATCH COMPLETE
        </motion.p>
      </div>
    );
  }

  const comboLabel = combo >= 5 ? "5 in a row! 🔥🔥" : combo >= 3 ? "3 in a row! 🔥" : null;
  const isPuzzle   =
    q.type === "image_puzzle"    ||
    q.type === "word_assembly"   ||
    q.type === "logic_pattern"   ||
    q.type === "puzzle_assembly" ||
    q.type === "visual_deception";

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: `radial-gradient(ellipse at 50% 0%, ${meta.color}14 0%, #050010 55%, #000 100%)` }}>

      {/* TOP BAR */}
      <div className="flex items-center justify-between px-4 h-16 shrink-0"
        style={{ borderBottom: `1px solid ${meta.color}25` }}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.icon}</span>
          <div>
            <p className="text-xs font-bold leading-none" style={{ color: meta.color }}>{meta.name} League</p>
            <p className="text-[10px] leading-none mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{playerName}</p>
          </div>
        </div>
        <motion.div key={score} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="flex flex-col items-center">
          <span className="text-2xl font-black tabular-nums text-white">{score}</span>
          <span className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Score</span>
        </motion.div>
        <div className="flex flex-col items-end">
          <span className="text-sm font-black text-white">
            {qIdx + 1}<span style={{ color: "rgba(255,255,255,0.3)" }}>/{TOTAL_QUESTIONS}</span>
          </span>
          <span className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Q</span>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="h-1 shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
        <motion.div className="h-full" animate={{ width: `${(qIdx / TOTAL_QUESTIONS) * 100}%` }}
          transition={{ duration: 0.4 }}
          style={{ background: `linear-gradient(90deg, ${meta.color}, ${meta.color}80)`,
            boxShadow: `0 0 6px ${meta.color}80` }} />
      </div>

      {/* PUZZLE BADGE */}
      {isPuzzle && (
        <div className="px-4 pt-2">
          <PuzzleBadge type={q.type} />
        </div>
      )}

      {/* COMBO BANNER */}
      <AnimatePresence>
        {comboLabel && phase === "feedback" && (
          <motion.div key={`c${combo}`} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute top-[72px] left-0 right-0 flex justify-center z-30 pointer-events-none">
            <span className="text-sm font-black px-4 py-1.5 rounded-full"
              style={{ background: `${meta.color}30`, border: `1px solid ${meta.color}60`, color: meta.color }}>
              {comboLabel}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LIVE RANK */}
      <AnimatePresence>
        {showRank && <LiveRank opponents={opRef.current} myScore={score} myName={playerName} color={meta.color} />}
      </AnimatePresence>

      {/* QUESTION AREA */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-4 min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div key={qIdx} initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -40, scale: 0.95 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm flex flex-col items-center gap-5">

            {/* Word Assembly — special layout */}
            {q.type === "word_assembly" ? (
              <>
                <QuestionDisplay q={q} />
                <WordBuilder
                  key={q.id}
                  q={q}
                  phase={phase}
                  onCorrect={() => handleAnswer(WORD_CORRECT_SIGNAL)}
                />
              </>
            ) : (
              <>
                {/* All other types */}
                <QuestionDisplay q={q} />

                {/* Options grid — wider for 5–7 options */}
                <div className={`grid gap-3 w-full ${
                  q.options.length <= 4 ? "grid-cols-2" :
                  q.options.length <= 6 ? "grid-cols-3" : "grid-cols-4"
                }`}>
                  {q.options.map((opt, i) => {
                    const st: "idle"|"correct"|"wrong"|"disabled" =
                      phase === "feedback"
                        ? i === q.correctIndex   ? "correct"
                        : i === chosen           ? "wrong"
                        :                          "disabled"
                        : "idle";
                    return (
                      <OptionBtn key={opt.id} opt={opt} state={st}
                        accent={q.display.color}
                        onClick={() => { if (phase === "question") handleAnswer(i); }} />
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* FEEDBACK OVERLAY */}
      <AnimatePresence>
        {phase === "feedback" && (
          <motion.div key={`fb${qIdx}`} className="absolute inset-0 pointer-events-none flex items-center justify-center z-20"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {lastPts > 0 && (
              <motion.div initial={{ scale: 0.5, y: 0 }} animate={{ scale: 1, y: -40 }} exit={{ scale: 1.1, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="px-8 py-5 rounded-3xl text-center"
                style={{
                  background: "rgba(34,197,94,0.28)",
                  border: "2px solid rgba(34,197,94,0.65)",
                  backdropFilter: "blur(8px)",
                }}>
                <p className="text-4xl mb-1">✓</p>
                <p className="text-xl font-black" style={{ color: "#4ade80" }}>+{lastPts}</p>
                {combo >= 2 && (
                  <p className="text-xs mt-1 font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>{combo} in a row</p>
                )}
              </motion.div>
            )}
            {lastPts === 0 && chosen !== null && (
              <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 1.15, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="px-8 py-5 rounded-3xl text-center"
                style={{
                  background: "rgba(239,68,68,0.28)",
                  border: "2px solid rgba(239,68,68,0.55)",
                  backdropFilter: "blur(8px)",
                }}>
                <p className="text-4xl mb-1">✗</p>
                <p className="text-xl font-black" style={{ color: "#f87171" }}>Miss!</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM TIMER */}
      <div className="flex items-center justify-center py-4 shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <CircularTimer totalMs={q.timeLimitMs} elapsedMs={elapsedMs} color={meta.color} />
      </div>
    </div>
  );
}
