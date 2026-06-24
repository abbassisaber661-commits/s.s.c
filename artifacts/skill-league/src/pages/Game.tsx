/**
 * Game.tsx — League Challenge mode (Optimized & Stable)
 */

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import {
  generateMatchQuestions,
  calcScore,
  type Question,
} from "@/lib/match-engine";

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

const TOTAL_QUESTIONS = 10;
const TICK_MS = 100;
const FB_MS = 1200;

// ─────────────────────────────────────────────
// ROUTES + META
// ─────────────────────────────────────────────

const ROUTE_TO_TIER: Record<string, string> = {
  training: "training",
  bronze: "coin",
  gold: "pro",
  "division-iii": "training",
  "division-ii": "coin",
  professional: "pro",
  champions: "champion",
};

const LEAGUE_META: Record<string, { name: string; color: string; icon: string }> = {
  training: { name: "Training", color: "#22d3ee", icon: "🥉" },
  bronze: { name: "Coin", color: "#f59e0b", icon: "🥈" },
  gold: { name: "Pro", color: "#f43f5e", icon: "🥇" },
  "division-iii": { name: "Division III", color: "#cd7f32", icon: "🥉" },
  "division-ii": { name: "Division II", color: "#94a3b8", icon: "🥈" },
  professional: { name: "Professional League", color: "#ffd700", icon: "🥇" },
  champions: { name: "Champions League", color: "#a78bfa", icon: "🏆" },
};

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type Phase = "question" | "feedback" | "done";

interface Opponent {
  name: string;
  score: number;
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

export default function Game() {
  const [, go] = useLocation();
  const [, params] = useRoute<{ league: string }>("/game/:league");

  const league = params?.league ?? "bronze";
  const meta = LEAGUE_META[league] ?? LEAGUE_META.bronze;
  const tier = ROUTE_TO_TIER[league] ?? "coin";

  const { user, authUser, isGuest, recordMatch } = useGame();

  const playerName =
    user?.username ||
    authUser?.username ||
    (isGuest ? "Champion" : "Player");

  // ─────────────────────────────
  // QUESTIONS (stable generation)
  // ─────────────────────────────
  const questions = useMemo<Question[]>(() => {
    const qs = generateMatchQuestions(TOTAL_QUESTIONS, tier);
    console.log("[SkillLeague] questions generated:", qs.length);
    return qs;
  }, [tier]);

  // ─────────────────────────────
  // STATE
  // ─────────────────────────────
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [correct, setCorrect] = useState(0);

  const [elapsedMs, setElapsedMs] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("question");
  const [done, setDone] = useState(false);
  const [lastPts, setLastPts] = useState(0);

  // ─────────────────────────────
  // REFS
  // ─────────────────────────────
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const opponentsRef = useRef<Opponent[]>(
    Array.from({ length: 6 }, (_, i) => ({
      name: `AI_${i}`,
      score: 0,
    }))
  );

  const q = questions[qIdx];

  // ─────────────────────────────
  // TIMER
  // ─────────────────────────────
  const startTimer = useCallback(() => {
    setElapsedMs(0);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setElapsedMs((t) => t + TICK_MS);
    }, TICK_MS);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  // ─────────────────────────────
  // NEXT QUESTION
  // ─────────────────────────────
  const nextQuestion = useCallback(() => {
    setChosen(null);
    setPhase("question");
    setLastPts(0);

    const next = qIdx + 1;

    if (next >= TOTAL_QUESTIONS) {
      setDone(true);
      stopTimer();
      return;
    }

    setQIdx(next);
    startTimer();
  }, [qIdx, startTimer, stopTimer]);

  // ─────────────────────────────
  // ANSWER
  // ─────────────────────────────
  const handleAnswer = useCallback(
    (idx: number) => {
      if (chosen !== null || phase !== "question") return;

      stopTimer();

      const isCorrect = idx === q.correctIndex;
      const timeLeft = Math.max(0, q.timeLimitMs - elapsedMs);

      const streak = isCorrect ? combo + 1 : 0;

      const pts = isCorrect
        ? calcScore(true, timeLeft, q.timeLimitMs, streak)
        : 0;

      setChosen(idx);
      setPhase("feedback");

      if (isCorrect) {
        setCombo((c) => c + 1);
        setCorrect((c) => c + 1);
        setScore((s) => s + pts);
        setLastPts(pts);
      } else {
        setCombo(0);
        setLastPts(0);
      }

      nextRef.current = setTimeout(nextQuestion, FB_MS);
    },
    [chosen, phase, q, elapsedMs, combo, nextQuestion, stopTimer]
  );

  // ─────────────────────────────
  // EFFECTS
  // ─────────────────────────────
  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, []);

  useEffect(() => {
    if (!done && phase === "question" && elapsedMs >= q.timeLimitMs) {
      handleAnswer(-1);
    }
  }, [elapsedMs]);

  useEffect(() => {
    const iv = setInterval(() => {
      opponentsRef.current.forEach((o) => {
        if (Math.random() > 0.4) o.score += 3;
      });
    }, 2500);

    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!done) return;

    const accuracy = Math.round((correct / TOTAL_QUESTIONS) * 100);

    sessionStorage.setItem(
      "sl_match_result",
      JSON.stringify({
        league,
        score,
        correct,
        accuracy,
        total: TOTAL_QUESTIONS,
      })
    );

    try {
      recordMatch(league, score, accuracy, combo, correct);
    } catch {}

    setTimeout(() => go("/results"), 700);
  }, [done]);

  // ─────────────────────────────
  // DONE SCREEN
  // ─────────────────────────────
  if (done) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-3xl font-black"
          style={{ color: meta.color }}
        >
          MATCH COMPLETE
        </motion.div>
      </div>
    );
  }

  // ─────────────────────────────
  // UI
  // ─────────────────────────────
  return (
    <div className="fixed inset-0 flex flex-col bg-black text-white">

      {/* TOP BAR */}
      <div className="h-14 flex justify-between items-center px-4 border-b border-white/10">
        <div style={{ color: meta.color }} className="font-bold">
          {meta.icon} {meta.name}
        </div>

        <div className="font-black">{score}</div>

        <div>
          {qIdx + 1}/{TOTAL_QUESTIONS}
        </div>
      </div>

      {/* QUESTION */}
      <div className="flex-1 flex items-center justify-center">
        <motion.div key={qIdx} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

          <div className="text-center mb-6 font-bold">
            {q.prompt}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {q.options.map((opt, i) => {
              const state =
                phase !== "question"
                  ? i === q.correctIndex
                    ? "correct"
                    : i === chosen
                    ? "wrong"
                    : "disabled"
                  : "idle";

              return (
                <button
                  key={opt.id}
                  onClick={() => handleAnswer(i)}
                  disabled={phase !== "question"}
                  className="p-4 rounded-xl border bg-white/5"
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

        </motion.div>
      </div>

      {/* TIMER */}
      <div className="h-16 flex items-center justify-center border-t border-white/10">
        <div className="text-sm opacity-70">
          {elapsedMs} ms
        </div>
      </div>

    </div>
  );
}