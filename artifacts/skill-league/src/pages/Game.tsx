import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";

// ── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_QUESTIONS = 10;

const COLORS = [
  { name: "Red",    hex: "#ef4444" },
  { name: "Blue",   hex: "#3b82f6" },
  { name: "Green",  hex: "#22c55e" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Orange", hex: "#f97316" },
  { name: "Pink",   hex: "#ec4899" },
  { name: "Cyan",   hex: "#06b6d4" },
];

const SHAPES = [
  { name: "Circle",   symbol: "●" },
  { name: "Square",   symbol: "■" },
  { name: "Triangle", symbol: "▲" },
  { name: "Diamond",  symbol: "◆" },
  { name: "Star",     symbol: "★" },
];

const LEAGUE_META: Record<string, { name: string; color: string; icon: string }> = {
  training: { name: "Training", color: "#22d3ee", icon: "🥉" },
  bronze:   { name: "Coin",     color: "#f59e0b", icon: "🥈" },
  gold:     { name: "Pro",      color: "#f43f5e", icon: "🥇" },
};

const FAKE_NAMES = [
  "Ahmed_π","Nour99","PiMaster","Khalid88","Zara_x","Leo2024","FastHand","ByteWolf","CobraK","SkyKing",
];

// ── Types ─────────────────────────────────────────────────────────────────────

type QType = "color_match" | "shape_match" | "quick_pick";

interface Option { label: string; color?: string; shape?: string; isCorrect: boolean }
interface Question {
  id: number;
  type: QType;
  prompt: string;
  target?: { color?: string; shape?: string; label: string };
  options: Option[];
  timeLimit: number;
}
interface Opponent { name: string; score: number }

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick<T>(arr: T[], n: number): T[] { return shuffle(arr).slice(0, n); }

// ── Question Generator ────────────────────────────────────────────────────────

function generateQuestions(): Question[] {
  const qs: Question[] = [];
  const types: QType[] = ["color_match", "shape_match", "quick_pick"];
  for (let i = 0; i < TOTAL_QUESTIONS; i++) {
    const type = types[i % types.length];
    const timeLimit = 3 + Math.floor(Math.random() * 4);

    if (type === "color_match") {
      const correct = COLORS[Math.floor(Math.random() * COLORS.length)];
      const wrong   = pick(COLORS.filter((c) => c.name !== correct.name), 3);
      const opts    = shuffle([
        { label: correct.name, color: correct.hex, isCorrect: true },
        ...wrong.map((c) => ({ label: c.name, color: c.hex, isCorrect: false })),
      ]);
      qs.push({ id: i, type, prompt: "Match this color →", target: { color: correct.hex, label: correct.name }, options: opts, timeLimit });
    } else if (type === "shape_match") {
      const correct = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const wrong   = pick(SHAPES.filter((s) => s.name !== correct.name), 3);
      const opts    = shuffle([
        { label: correct.symbol, shape: correct.name, isCorrect: true },
        ...wrong.map((s) => ({ label: s.symbol, shape: s.name, isCorrect: false })),
      ]);
      qs.push({ id: i, type, prompt: "Find the matching shape →", target: { shape: correct.name, label: correct.symbol }, options: opts, timeLimit });
    } else {
      const tc = COLORS[Math.floor(Math.random() * COLORS.length)];
      const ts = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const dc = pick(COLORS.filter((c) => c.name !== tc.name), 3);
      const ds = shuffle(SHAPES.filter((s) => s.name !== ts.name));
      const opts = shuffle([
        { label: ts.symbol, color: tc.hex, isCorrect: true },
        { label: ds[0].symbol, color: dc[0].hex, isCorrect: false },
        { label: ds[1].symbol, color: dc[1].hex, isCorrect: false },
        { label: ds[2].symbol, color: dc[2].hex, isCorrect: false },
      ]);
      qs.push({ id: i, type, prompt: `Find the ${tc.name} ${ts.name} →`, target: { color: tc.hex, label: ts.symbol }, options: opts, timeLimit });
    }
  }
  return shuffle(qs);
}

// ── Circular Timer ────────────────────────────────────────────────────────────

function CircularTimer({ total, elapsed, color }: { total: number; elapsed: number; color: string }) {
  const R   = 34;
  const C   = 2 * Math.PI * R;
  const pct = Math.max(0, 1 - elapsed / total);
  const rem = Math.max(0, total - elapsed);
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
        style={{ color: urgent ? "#fca5a5" : "white" }}
      >
        {rem.toFixed(1)}
      </motion.span>
    </div>
  );
}

// ── Live Rank Panel ───────────────────────────────────────────────────────────

function LiveRank({ opponents, myScore, myName, color }: { opponents: Opponent[]; myScore: number; myName: string; color: string }) {
  const all = [...opponents, { name: myName, score: myScore }].sort((a, b) => b.score - a.score);
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute right-3 top-[74px] z-20 w-[128px] rounded-2xl overflow-hidden"
      style={{ background: "rgba(0,0,0,0.88)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)" }}
    >
      <div className="px-3 py-1.5 text-[9px] font-bold tracking-widest uppercase" style={{ color, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        LIVE
      </div>
      {all.slice(0, 6).map((p, i) => (
        <div key={p.name} className="flex items-center gap-1.5 px-3 py-1" style={{ background: p.name === myName ? `${color}15` : "transparent" }}>
          <span className="text-[9px] font-black w-4 tabular-nums" style={{ color: i === 0 ? "#ffd700" : "rgba(255,255,255,0.35)" }}>
            {i + 1}
          </span>
          <span className="text-[9px] truncate flex-1" style={{ color: p.name === myName ? color : "rgba(255,255,255,0.6)", fontWeight: p.name === myName ? 700 : 400 }}>
            {p.name === myName ? "You" : p.name}
          </span>
          <span className="text-[9px] tabular-nums font-bold" style={{ color: "rgba(255,255,255,0.45)" }}>
            {p.score}
          </span>
        </div>
      ))}
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Game() {
  const [, go]     = useLocation();
  const [, params] = useRoute<{ league: string }>("/game/:league");
  const league     = params?.league ?? "bronze";
  const meta       = LEAGUE_META[league] ?? LEAGUE_META.bronze;
  const { user, authUser, isGuest, recordMatch } = useGame();
  const playerName = user?.username || authUser?.username || (isGuest ? "Champion" : "Player");

  const [questions]   = useState<Question[]>(() => generateQuestions());
  const [qIdx, setQIdx]       = useState(0);
  const [score, setScore]     = useState(0);
  const [combo, setCombo]     = useState(0);
  const [correct, setCorrect] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [chosen, setChosen]   = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [showRank, setShowRank] = useState(false);
  const [done, setDone]       = useState(false);
  const [lastPts, setLastPts] = useState(0);

  const [opponents] = useState<Opponent[]>(() =>
    pick(FAKE_NAMES, 5 + Math.floor(Math.random() * 4)).map((name) => ({ name, score: 0 })),
  );
  const opRef = useRef(opponents);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const q = questions[qIdx];

  // ── Timer ──
  const startTimer = useCallback(() => {
    setElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed((e) => +(e + 0.1).toFixed(1)), 100);
  }, []);
  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // ── Advance ──
  const advance = useCallback(() => {
    setChosen(null); setFeedback(null); setShowRank(false); setLastPts(0);
    const next = qIdx + 1;
    if (next >= TOTAL_QUESTIONS) { setDone(true); stopTimer(); return; }
    setQIdx(next);
    startTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIdx]);

  // ── Timeout ──
  useEffect(() => {
    if (!done && chosen === null && elapsed >= q.timeLimit) {
      stopTimer(); setCombo(0); setFeedback("wrong"); setShowRank(true);
      nextRef.current = setTimeout(advance, 1300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  // ── Opponent ticker ──
  useEffect(() => {
    const iv = setInterval(() => {
      opRef.current.forEach((o) => { if (Math.random() > 0.4) o.score += 60 + Math.floor(Math.random() * 140); });
    }, 2200 + Math.random() * 1800);
    return () => clearInterval(iv);
  }, []);

  // ── Start ──
  useEffect(() => {
    startTimer();
    return () => { stopTimer(); if (nextRef.current) clearTimeout(nextRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Navigate to results ──
  useEffect(() => {
    if (!done) return;
    const accuracy = Math.round((correct / TOTAL_QUESTIONS) * 100);
    sessionStorage.setItem("sl_match_result", JSON.stringify({
      league, leagueName: meta.name, leagueColor: meta.color, leagueIcon: meta.icon,
      playerName, score, correct, accuracy, total: TOTAL_QUESTIONS,
      opponents: opRef.current.map((o) => ({ ...o })),
    }));
    try { recordMatch(league, score, accuracy, combo, correct); } catch (_) { /* ignore */ }
    setTimeout(() => go("/results"), 700);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // ── Answer ──
  const handleAnswer = (idx: number) => {
    if (chosen !== null || feedback !== null) return;
    stopTimer();
    setChosen(idx);
    const isCorrect = q.options[idx].isCorrect;
    if (isCorrect) {
      const newCombo   = combo + 1;
      const speedBonus = Math.floor(Math.max(0, q.timeLimit - elapsed) * 12);
      const mult       = newCombo >= 5 ? 2 : newCombo >= 3 ? 1.5 : 1;
      const pts        = Math.round((100 + speedBonus) * mult);
      setCombo(newCombo); setCorrect((c) => c + 1); setScore((s) => s + pts); setLastPts(pts);
      setFeedback("correct");
    } else {
      setCombo(0); setFeedback("wrong");
    }
    setShowRank(true);
    nextRef.current = setTimeout(advance, 1200);
  };

  // ── Done flash ──
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

  const comboLabel = combo >= 5 ? "×2 COMBO 🔥🔥" : combo >= 3 ? "×1.5 COMBO 🔥" : null;

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

      {/* Q PROGRESS */}
      <div className="h-1 shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
        <motion.div className="h-full" animate={{ width: `${(qIdx / TOTAL_QUESTIONS) * 100}%` }}
          transition={{ duration: 0.4 }}
          style={{ background: `linear-gradient(90deg, ${meta.color}, ${meta.color}80)`, boxShadow: `0 0 6px ${meta.color}80` }} />
      </div>

      {/* COMBO BANNER */}
      <AnimatePresence>
        {comboLabel && feedback === "correct" && (
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
      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-6 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div key={qIdx} initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm flex flex-col items-center gap-5">

            {/* Prompt */}
            <p className="text-xl font-black text-center leading-tight"
              style={{ background: "linear-gradient(135deg,#fff,rgba(255,255,255,0.75))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {q.prompt}
            </p>

            {/* Target */}
            {q.target && (
              <motion.div initial={{ scale: 0.65 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 320, damping: 18 }}>
                {q.type === "color_match" && (
                  <div className="w-24 h-24 rounded-3xl shadow-2xl"
                    style={{ background: q.target.color, boxShadow: `0 0 50px ${q.target.color}90` }} />
                )}
                {q.type === "shape_match" && (
                  <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}>
                    {q.target.label}
                  </div>
                )}
                {q.type === "quick_pick" && (
                  <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
                    style={{ background: `${q.target.color}28`, border: `2px solid ${q.target.color}70`, boxShadow: `0 0 30px ${q.target.color}50`, color: q.target.color }}>
                    {q.target.label}
                  </div>
                )}
              </motion.div>
            )}

            {/* Options */}
            <div className="grid grid-cols-2 gap-3 w-full">
              {q.options.map((opt, i) => {
                const isChosen  = chosen === i;
                const isCorrect = opt.isCorrect;
                const revealed  = chosen !== null;
                let borderC = "rgba(255,255,255,0.12)";
                let bg      = "rgba(255,255,255,0.06)";
                let shadow  = "none";
                if (revealed && isCorrect)            { borderC = "#22c55e"; bg = "rgba(34,197,94,0.2)";  shadow = "0 0 20px rgba(34,197,94,0.4)"; }
                if (revealed && isChosen && !isCorrect){ borderC = "#ef4444"; bg = "rgba(239,68,68,0.2)";  shadow = "0 0 20px rgba(239,68,68,0.35)"; }
                return (
                  <motion.button key={i} onClick={() => handleAnswer(i)} disabled={chosen !== null}
                    whileTap={chosen === null ? { scale: 0.93 } : {}}
                    className="h-[68px] rounded-2xl flex items-center justify-center gap-2.5 font-bold text-base transition-all"
                    style={{ background: bg, border: `2px solid ${borderC}`, boxShadow: shadow, cursor: chosen !== null ? "default" : "pointer" }}>
                    {q.type === "color_match" && opt.color && (
                      <div className="w-8 h-8 rounded-xl shrink-0" style={{ background: opt.color }} />
                    )}
                    {q.type === "shape_match" && (
                      <span className="text-3xl text-white">{opt.label}</span>
                    )}
                    {q.type === "quick_pick" && (
                      <span className="text-4xl" style={{ color: opt.color }}>{opt.label}</span>
                    )}
                    {q.type !== "quick_pick" && (
                      <span className="text-sm" style={{
                        color: revealed && isCorrect ? "#4ade80" : revealed && isChosen ? "#f87171" : "rgba(255,255,255,0.75)" }}>
                        {q.type === "color_match" ? opt.label : opt.shape}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* FEEDBACK OVERLAY */}
      <AnimatePresence>
        {feedback && (
          <motion.div key={`fb${qIdx}`} className="absolute inset-0 pointer-events-none flex items-center justify-center z-20"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 1.15, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="px-8 py-5 rounded-3xl text-center"
              style={{
                background: feedback === "correct" ? "rgba(34,197,94,0.28)" : "rgba(239,68,68,0.28)",
                border: `2px solid ${feedback === "correct" ? "rgba(34,197,94,0.65)" : "rgba(239,68,68,0.55)"}`,
                backdropFilter: "blur(8px)",
              }}>
              <p className="text-4xl mb-1">{feedback === "correct" ? "✓" : "✗"}</p>
              <p className="text-xl font-black" style={{ color: feedback === "correct" ? "#4ade80" : "#f87171" }}>
                {feedback === "correct" ? `+${lastPts}` : "Miss!"}
              </p>
              {feedback === "correct" && combo >= 2 && (
                <p className="text-xs mt-1 font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>{combo} in a row</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM TIMER */}
      <div className="flex items-center justify-center py-4 shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <CircularTimer total={q.timeLimit} elapsed={elapsed} color={meta.color} />
      </div>
    </div>
  );
}
