import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { playCorrect, playWrong, playStreak, playTap, playWin, playLose } from '@/lib/sounds';
import {
  generateMatchQuestions, calcScore, simulateBotQuestion,
  MATCH_BOTS, type Question, type Option,
} from '@/lib/match-engine';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'searching' | 'found' | 'countdown' | 'question' | 'feedback' | 'results';

interface AnswerRecord {
  correct:    boolean;
  points:     number;
  timeLeftMs: number;
  timeLimitMs:number;
}

interface PlayerRow { id: string; name: string; avatar: string; score: number; isPlayer: boolean }

const TOTAL_Q  = 10;
const TICK_MS  = 50;
const FB_MS    = 750;

// ─── Small display helpers ────────────────────────────────────────────────────

function ColorCircle({ hex, size = 52 }: { hex: string; size?: number }) {
  return <div style={{ width: size, height: size, borderRadius: size / 2, background: hex,
    boxShadow: `0 0 12px ${hex}60`, flexShrink: 0 }} />;
}

function QuestionDisplay({ q }: { q: Question }) {
  const d = q.display;
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-4 w-full">
      <p className="text-xs font-bold text-white/50 uppercase tracking-widest text-center">{q.prompt}</p>

      {d.kind === 'color_block' && (
        <div style={{ width: 160, height: 160, borderRadius: 28, background: d.value,
          boxShadow: `0 0 60px ${d.value}60, 0 0 20px ${d.value}40` }} />
      )}

      {d.kind === 'text_prompt' && (
        <div className="flex flex-col items-center gap-2">
          {d.label && <p className="text-xs text-white/40">{d.label}</p>}
          <div className="text-6xl font-black tracking-tight"
            style={{ color: d.color ?? '#fff', textShadow: `0 0 40px ${d.color ?? '#fff'}80` }}>
            {d.value}
          </div>
        </div>
      )}

      {d.kind === 'shape_char' && (
        <div style={{ fontSize: 110, lineHeight: 1, color: d.color ?? '#fff',
          filter: `drop-shadow(0 0 24px ${d.color ?? '#fff'}80)`, userSelect: 'none' }}>
          {d.value}
        </div>
      )}

      {d.kind === 'sequence' && (
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {(d.extra ?? []).map((hex, i) => (
            <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: i * 0.07, type: 'spring', stiffness: 400, damping: 22 }}>
              <ColorCircle hex={hex} size={52} />
            </motion.div>
          ))}
          <div className="flex items-center justify-center rounded-full border-2 border-dashed border-white/40 text-white/60 text-xl font-black"
            style={{ width: 52, height: 52 }}>?</div>
        </div>
      )}

      {d.kind === 'emoji_prompt' && (
        <div className="flex flex-col items-center gap-2">
          <div className="text-8xl leading-none"
            style={{ filter: `drop-shadow(0 0 20px ${d.color ?? '#fff'}60)` }}>{d.value}</div>
          {d.label && (
            <div className="text-sm font-bold px-4 py-1 rounded-full"
              style={{ background: (d.color ?? '#fff') + '20', color: d.color ?? '#fff',
                border: `1px solid ${d.color ?? '#fff'}40` }}>
              {d.label}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OptionBtn({
  opt, state, accent, onClick,
}: { opt: Option; state: 'idle'|'correct'|'wrong'|'disabled'; accent?: string; onClick: () => void }) {
  const stateStyle =
    state === 'correct'  ? 'border-green-400 bg-green-400/20 shadow-[0_0_20px_rgba(74,222,128,0.4)]' :
    state === 'wrong'    ? 'border-red-500 bg-red-500/20' :
    state === 'disabled' ? 'border-white/10 bg-white/5 opacity-40 cursor-default' :
                           'border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/30 cursor-pointer';

  return (
    <button
      className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 transition-all duration-150 active:scale-95 select-none overflow-hidden h-20 ${stateStyle}`}
      onClick={onClick}
      disabled={state === 'disabled'}>
      {state === 'correct' && (
        <div className="absolute inset-0 flex items-center justify-center text-green-400 text-3xl">✓</div>
      )}
      <div className={state !== 'idle' && state !== 'disabled' ? 'opacity-30' : ''}>
        {opt.kind === 'color' && <>
          <div className="w-10 h-10 rounded-xl mx-auto"
            style={{ background: opt.value, boxShadow: `0 0 16px ${opt.value}60` }} />
          <span className="text-[11px] text-white/70 font-medium">{opt.label}</span>
        </>}
        {opt.kind === 'shape' && <>
          <div className="text-3xl leading-none" style={{ color: accent ?? '#fff' }}>{opt.value}</div>
          <span className="text-[11px] text-white/70">{opt.label}</span>
        </>}
        {opt.kind === 'emoji' && <div className="text-4xl leading-none">{opt.value}</div>}
        {opt.kind === 'text'  && <>
          <div style={{ width: 20, height: 20, borderRadius: 4, background: opt.value, marginBottom: 2 }} />
          <span className="text-sm font-black text-white">{opt.label}</span>
        </>}
      </div>
    </button>
  );
}

function TimerBar({ timeLeft, timeLimit }: { timeLeft: number; timeLimit: number }) {
  const frac  = Math.max(0, timeLeft / timeLimit);
  const color = frac > 0.5 ? '#2EE87A' : frac > 0.25 ? '#FFD93D' : '#FF3A5E';
  return (
    <div className="w-full space-y-1.5">
      <div className="flex justify-between items-center px-1">
        <span className="text-xs text-white/40">Time</span>
        <span className="text-sm font-black tabular-nums" style={{ color }}>{Math.ceil(timeLeft / 1000)}s</span>
      </div>
      <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full"
          style={{ width: `${frac * 100}%`, background: color,
            boxShadow: `0 0 10px ${color}80`, transition: 'background 0.3s' }} />
      </div>
    </div>
  );
}

function RankStrip({ rows }: { rows: PlayerRow[] }) {
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
      {sorted.map((p, rank) => (
        <div key={p.id}
          className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl shrink-0"
          style={p.isPlayer ? { background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)' }
                            : { background: 'rgba(255,255,255,0.05)' }}>
          <span className="text-base leading-none">{p.avatar}</span>
          <span className="text-[10px] font-bold" style={{ color: rank === 0 ? '#FFD93D' : '#ffffff60' }}>
            #{rank + 1}
          </span>
          <span className="text-[9px] tabular-nums font-black text-white/50">
            {p.score > 0 ? p.score.toLocaleString() : '–'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MatchArena() {
  const [, setLocation] = useLocation();
  const { authUser }    = useGame();
  const playerName      = authUser?.username ?? 'You';

  const [phase,     setPhase]     = useState<Phase>('idle');
  const [cdNum,     setCdNum]     = useState(3);
  const [qIndex,    setQIndex]    = useState(0);
  const [currentQ,  setCurrentQ]  = useState<Question | null>(null);
  const [timeLeft,  setTimeLeft]  = useState(0);
  const [score,     setScore]     = useState(0);
  const [streak,    setStreak]    = useState(0);
  const [selIdx,    setSelIdx]    = useState<number | null>(null);
  const [lastPts,   setLastPts]   = useState(0);
  const [botScores, setBotScores] = useState([0, 0, 0, 0]);
  const [answers,   setAnswers]   = useState<AnswerRecord[]>([]);
  const [finalRows, setFinalRows] = useState<PlayerRow[]>([]);

  // Mutable refs — safe to read inside callbacks without stale closures
  const questionsRef   = useRef<Question[]>([]);
  const qIndexRef      = useRef(0);
  const scoreRef       = useRef(0);
  const streakRef      = useRef(0);
  const timeLeftRef    = useRef(0);
  const botScoresRef   = useRef([0, 0, 0, 0]);
  const botStreaksRef  = useRef([0, 0, 0, 0]);
  const phaseRef       = useRef<Phase>('idle');
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const botTimersRef   = useRef<ReturnType<typeof setTimeout>[]>([]);
  const answersRef     = useRef<AnswerRecord[]>([]);

  // Keep phase ref in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  function clearAllTimers() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    botTimersRef.current.forEach(clearTimeout);
    botTimersRef.current = [];
  }

  useEffect(() => () => clearAllTimers(), []);

  // ── Finish match ──────────────────────────────────────────────────────────
  function finishMatch() {
    clearAllTimers();
    const rows: PlayerRow[] = [
      { id: 'player', name: playerName, avatar: '👤', score: scoreRef.current, isPlayer: true },
      ...MATCH_BOTS.map((b, i) => ({ id: b.id, name: b.name, avatar: b.avatar, score: botScoresRef.current[i], isPlayer: false })),
    ];
    setFinalRows(rows);
    const playerRankPos = [...rows].sort((a, b) => b.score - a.score).findIndex(r => r.isPlayer);
    if (playerRankPos === 0) playWin(); else playLose();
    setPhase('results');
    phaseRef.current = 'results';
  }

  // ── Advance to next question or finish ────────────────────────────────────
  function advanceQuestion() {
    const nextIdx = qIndexRef.current + 1;
    if (nextIdx >= TOTAL_Q) {
      finishMatch();
    } else {
      qIndexRef.current = nextIdx;
      setQIndex(nextIdx);
      loadQuestion(nextIdx);
    }
  }

  // ── Handle player tapping an option ──────────────────────────────────────
  function handleAnswer(optIdx: number, timedOut = false) {
    if (phaseRef.current !== 'question') return;
    clearAllTimers();
    phaseRef.current = 'feedback';
    setPhase('feedback');

    const q = questionsRef.current[qIndexRef.current];
    if (!q) return;

    const correct     = !timedOut && optIdx === q.correctIndex;
    const newStreak   = correct ? streakRef.current + 1 : 0;
    const pts         = calcScore(correct, timeLeftRef.current, q.timeLimitMs, streakRef.current);
    const newScore    = scoreRef.current + pts;

    scoreRef.current  = newScore;
    streakRef.current = newStreak;
    answersRef.current.push({ correct, points: pts, timeLeftMs: timeLeftRef.current, timeLimitMs: q.timeLimitMs });

    setSelIdx(timedOut ? null : optIdx);
    setLastPts(pts);
    setScore(newScore);
    setStreak(newStreak);
    setAnswers([...answersRef.current]);

    if (!timedOut) {
      if (correct) { playCorrect(); if (newStreak >= 3) playStreak(newStreak); }
      else playWrong();
    }

    setTimeout(advanceQuestion, FB_MS);
  }

  // ── Load a question ───────────────────────────────────────────────────────
  function loadQuestion(idx: number) {
    const q = questionsRef.current[idx];
    if (!q) return;
    timeLeftRef.current = q.timeLimitMs;

    setCurrentQ(q);
    setTimeLeft(q.timeLimitMs);
    setSelIdx(null);
    setLastPts(0);
    phaseRef.current = 'question';
    setPhase('question');

    // Schedule bot answers
    MATCH_BOTS.forEach((bot, bi) => {
      const res = simulateBotQuestion(bot, q.timeLimitMs, botStreaksRef.current[bi]);
      const t   = setTimeout(() => {
        botScoresRef.current[bi] += res.points;
        botStreaksRef.current[bi] = res.correct ? botStreaksRef.current[bi] + 1 : 0;
        setBotScores([...botScoresRef.current]);
      }, res.timeMs);
      botTimersRef.current.push(t);
    });

    // Start countdown timer
    timerRef.current = setInterval(() => {
      timeLeftRef.current -= TICK_MS;
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        handleAnswer(-1, true);
      }
    }, TICK_MS);
  }

  // ── Enter match ───────────────────────────────────────────────────────────
  function enterMatch() {
    playTap();
    clearAllTimers();
    const qs = generateMatchQuestions(TOTAL_Q);
    questionsRef.current  = qs;
    qIndexRef.current     = 0;
    scoreRef.current      = 0;
    streakRef.current     = 0;
    answersRef.current    = [];
    botScoresRef.current  = [0, 0, 0, 0];
    botStreaksRef.current = [0, 0, 0, 0];

    setScore(0); setStreak(0); setQIndex(0); setAnswers([]);
    setBotScores([0, 0, 0, 0]);
    setPhase('searching');
    phaseRef.current = 'searching';
  }

  // ── Phase-level transitions ───────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'searching') {
      const t = setTimeout(() => setPhase('found'), 1600);
      return () => clearTimeout(t);
    }
    if (phase === 'found') {
      const t = setTimeout(() => setPhase('countdown'), 2600);
      return () => clearTimeout(t);
    }
    if (phase === 'countdown') {
      setCdNum(3);
      const t1 = setTimeout(() => setCdNum(2), 900);
      const t2 = setTimeout(() => setCdNum(1), 1800);
      const t3 = setTimeout(() => { loadQuestion(0); }, 2700);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
    return undefined;
  }, [phase]); // eslint-disable-line

  // ── Live ranking ──────────────────────────────────────────────────────────
  const liveRows: PlayerRow[] = [
    { id: 'player', name: playerName, avatar: '👤', score, isPlayer: true },
    ...MATCH_BOTS.map((b, i) => ({ id: b.id, name: b.name, avatar: b.avatar, score: botScores[i], isPlayer: false })),
  ];
  const playerRank = [...liveRows].sort((a, b) => b.score - a.score).findIndex(r => r.isPlayer) + 1;

  const bg: React.CSSProperties = {
    minHeight: '100dvh',
    background: 'linear-gradient(160deg,#07071A 0%,#0F0B2A 50%,#07071A 100%)',
    color: '#fff',
  };

  // ══════════════════════ IDLE ══════════════════════
  if (phase === 'idle') return (
    <div style={bg} className="flex flex-col items-center justify-center px-6 pb-12">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="flex flex-col items-center gap-8 w-full max-w-xs">
        <div className="relative">
          <div className="text-7xl">⚔️</div>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-4 rounded-full border-2 border-dashed border-purple-500/30" />
        </div>
        <div className="text-center">
          <div className="text-3xl font-black tracking-tight">Match Arena</div>
          <div className="text-sm text-white/50 mt-1">10 questions · Speed &amp; accuracy wins</div>
        </div>
        <div className="w-full grid grid-cols-3 gap-3">
          {[
            { icon: '🧠', label: '5 types',  sub: 'of challenge' },
            { icon: '⚡', label: 'Speed',    sub: 'bonus pts'    },
            { icon: '🔥', label: 'Streak',   sub: 'multiplier'   },
          ].map(item => (
            <div key={item.label} className="flex flex-col items-center gap-1 bg-white/5 rounded-2xl py-4 px-2">
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs font-black">{item.label}</span>
              <span className="text-[10px] text-white/40">{item.sub}</span>
            </div>
          ))}
        </div>
        <div className="w-full bg-white/5 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Opponents</p>
          {MATCH_BOTS.map(b => (
            <div key={b.id} className="flex items-center gap-3">
              <span className="text-xl">{b.avatar}</span>
              <span className="text-sm font-bold flex-1">{b.name}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full"
                    style={{ background: i < Math.round(b.skill * 5) ? '#B44FFF' : '#ffffff15' }} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <motion.button whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.03 }}
          onClick={enterMatch}
          className="w-full py-5 rounded-2xl text-xl font-black tracking-wide relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#B44FFF,#3AB4FF)', boxShadow: '0 0 40px rgba(180,79,255,0.5)' }}>
          <motion.div animate={{ x: ['0%','100%'] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
            style={{ left: '-33%' }} />
          ⚔️ ENTER MATCH
        </motion.button>
        <button onClick={() => setLocation('/leagues')}
          className="text-sm text-white/30 hover:text-white/60 transition-colors">
          ← Back to Leagues
        </button>
      </motion.div>
    </div>
  );

  // ══════════════════════ SEARCHING ══════════════════════
  if (phase === 'searching') return (
    <div style={bg} className="flex flex-col items-center justify-center gap-8">
      <div className="relative">
        <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="w-24 h-24 rounded-full border-4 border-purple-500/50 flex items-center justify-center text-4xl">
          🔍
        </motion.div>
        {[0, 1, 2].map(i => (
          <motion.div key={i} className="absolute inset-0 rounded-full border-2 border-purple-500/20"
            animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, delay: i * 0.5, repeat: Infinity }} />
        ))}
      </div>
      <div className="text-center space-y-1">
        <div className="text-xl font-black">Finding opponents</div>
        <div className="flex gap-1 justify-center">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-2 h-2 rounded-full bg-purple-400"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
              transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }} />
          ))}
        </div>
      </div>
    </div>
  );

  // ══════════════════════ FOUND ══════════════════════
  if (phase === 'found') return (
    <div style={bg} className="flex flex-col items-center justify-center gap-8 px-6">
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
        <div className="text-4xl font-black text-center"
          style={{ background: 'linear-gradient(135deg,#FFD93D,#FF8C42)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          MATCH FOUND!
        </div>
        <div className="text-sm text-white/40 mt-1 text-center">Get ready to compete</div>
      </motion.div>
      <div className="w-full max-w-xs space-y-3">
        <motion.div initial={{ x: -60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="flex items-center gap-3 bg-blue-500/15 border border-blue-500/30 rounded-2xl px-4 py-3">
          <span className="text-2xl">👤</span>
          <span className="font-black flex-1">{playerName}</span>
          <span className="text-xs text-blue-300 font-bold px-2 py-0.5 bg-blue-500/20 rounded-full">YOU</span>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.35 }}
            className="text-green-400 text-xl font-black">✓</motion.div>
        </motion.div>
        {MATCH_BOTS.map((b, i) => (
          <motion.div key={b.id} initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.15 }}
            className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
            <span className="text-2xl">{b.avatar}</span>
            <span className="font-bold flex-1 text-white/80">{b.name}</span>
            <div className="h-1 w-16 rounded-full bg-white/10 overflow-hidden">
              <motion.div className="h-full bg-white/40 rounded-full"
                initial={{ width: '0%' }} animate={{ width: '100%' }}
                transition={{ duration: 1.2 + i * 0.2, delay: 0.3 + i * 0.1 }} />
            </div>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 1.5 + i * 0.15 }} className="text-green-400 text-xl">✓</motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  // ══════════════════════ COUNTDOWN ══════════════════════
  if (phase === 'countdown') return (
    <div style={bg} className="flex flex-col items-center justify-center gap-4">
      <div className="text-sm text-white/40 uppercase tracking-widest">Get ready…</div>
      <AnimatePresence mode="wait">
        <motion.div key={cdNum}
          initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="text-[120px] font-black leading-none tabular-nums"
          style={{ color: cdNum > 1 ? '#fff' : '#2EE87A',
            textShadow: `0 0 60px ${cdNum > 1 ? '#ffffff60' : '#2EE87A80'}` }}>
          {cdNum === 0 ? 'GO!' : cdNum}
        </motion.div>
      </AnimatePresence>
    </div>
  );

  // ══════════════════════ QUESTION / FEEDBACK ══════════════════════
  if ((phase === 'question' || phase === 'feedback') && currentQ) {
    const isCorrect = selIdx !== null && selIdx === currentQ.correctIndex;
    return (
      <div style={{ ...bg, display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 flex-1">
            <span>👤</span>
            <span className="text-sm font-black truncate max-w-[80px]">{playerName}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5">
            <span className="text-yellow-400 font-black text-sm">⚡</span>
            <span className="font-black text-sm tabular-nums">{score.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 bg-white/10 rounded-xl px-3 py-1.5">
            <span className="text-xs text-white/60">🏆</span>
            <span className="font-black text-sm">#{playerRank}</span>
          </div>
        </div>

        {/* Mini ranking strip */}
        <div className="px-4 pb-3">
          <RankStrip rows={liveRows} />
        </div>

        {/* Progress + streak row */}
        <div className="flex items-center justify-between px-4 pb-2">
          <span className="text-xs text-white/40">Q {qIndex + 1} / {TOTAL_Q}</span>
          {streak >= 2 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="text-orange-400 font-black text-xs">🔥 ×{streak}</motion.span>
          )}
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_Q }).map((_, i) => (
              <div key={i} className="w-4 h-1 rounded-full"
                style={{
                  background: i < qIndex
                    ? (answers[i]?.correct ? '#2EE87A' : '#FF3A5E')
                    : i === qIndex ? '#ffffff60' : '#ffffff15',
                }} />
            ))}
          </div>
        </div>

        {/* Question display */}
        <div className="flex-1 flex items-center justify-center px-4 py-2 relative">
          <AnimatePresence mode="wait">
            <motion.div key={currentQ.id} className="w-full max-w-xs flex justify-center"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
              <QuestionDisplay q={currentQ} />
            </motion.div>
          </AnimatePresence>

          {/* Feedback overlay */}
          <AnimatePresence>
            {phase === 'feedback' && (
              <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none"
                style={{ background: isCorrect ? 'rgba(46,232,122,0.09)' : 'rgba(255,58,94,0.09)' }} />
            )}
          </AnimatePresence>

          {/* Points popup */}
          <AnimatePresence>
            {phase === 'feedback' && lastPts > 0 && (
              <motion.div key="pts" initial={{ opacity: 0, y: 0, scale: 0.8 }}
                animate={{ opacity: 1, y: -30, scale: 1.1 }} exit={{ opacity: 0, y: -60 }}
                className="absolute top-4 right-4 text-2xl font-black text-yellow-400 pointer-events-none"
                style={{ textShadow: '0 0 20px rgba(255,215,0,0.8)' }}>
                +{lastPts}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Options grid */}
        <div className="px-4 pb-3 grid grid-cols-2 gap-3">
          {currentQ.options.map((opt, i) => {
            const st =
              phase === 'feedback'
                ? i === currentQ.correctIndex ? 'correct'
                : i === selIdx               ? 'wrong'
                :                               'disabled'
                : 'idle';
            return (
              <OptionBtn key={opt.id} opt={opt} state={st}
                accent={currentQ.display.color}
                onClick={() => { if (phase === 'question') { playTap(); handleAnswer(i); } }} />
            );
          })}
        </div>

        {/* Timer bar */}
        <div className="px-4 pb-6">
          <TimerBar timeLeft={phase === 'feedback' ? 0 : timeLeft} timeLimit={currentQ.timeLimitMs} />
        </div>
      </div>
    );
  }

  // ══════════════════════ RESULTS ══════════════════════
  if (phase === 'results') {
    const sorted     = [...finalRows].sort((a, b) => b.score - a.score);
    const rank       = sorted.findIndex(r => r.isPlayer) + 1;
    const isWinner   = rank === 1;
    const correctCnt = answers.filter(a => a.correct).length;
    const speedTotal = answers.reduce((s, a) => s + (a.correct ? Math.floor((a.timeLeftMs / a.timeLimitMs) * 200) : 0), 0);
    const bestStreak = answers.reduce((best, _, i, arr) => {
      let s = 0, mx = 0;
      for (let j = 0; j <= i; j++) { s = arr[j]?.correct ? s + 1 : 0; mx = Math.max(mx, s); }
      return mx;
    }, 0);

    return (
      <div style={{ ...bg, display: 'flex', flexDirection: 'column', paddingBottom: 32 }}>
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-2 pt-10 pb-6 px-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
            className="text-7xl">
            {isWinner ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🎯'}
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-center">
            <div className="text-3xl font-black"
              style={{ color: isWinner ? '#FFD93D' : rank <= 3 ? '#C0C0C0' : '#fff' }}>
              {isWinner ? 'WINNER!' : rank === 2 ? '2nd Place' : rank === 3 ? '3rd Place' : `#${rank} Place`}
            </div>
            <div className="text-sm text-white/50 mt-1">
              {isWinner ? 'You dominated the match!' : rank <= 2 ? 'Great performance!' : "Keep training — you'll get there!"}
            </div>
          </motion.div>
        </motion.div>

        {/* Score breakdown */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="mx-4 bg-white/5 rounded-2xl p-4 space-y-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/60">Total Score</span>
            <span className="text-2xl font-black text-yellow-400">{score.toLocaleString()}</span>
          </div>
          <div className="h-px bg-white/10" />
          {[
            { icon: '✅', label: 'Correct answers', value: `${correctCnt} / ${TOTAL_Q}` },
            { icon: '⚡', label: 'Speed bonus',      value: `+${speedTotal}`             },
            { icon: '🔥', label: 'Best streak',      value: `${bestStreak}×`             },
          ].map(r => (
            <div key={r.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{r.icon}</span>
                <span className="text-sm text-white/60">{r.label}</span>
              </div>
              <span className="text-sm font-bold">{r.value}</span>
            </div>
          ))}
        </motion.div>

        {/* Final leaderboard */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="mx-4 mb-6">
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2 px-1">Final Ranking</p>
          <div className="bg-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
            {sorted.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                className={`flex items-center gap-3 px-4 py-3 ${p.isPlayer ? 'bg-blue-500/10' : ''}`}>
                <span className="text-base font-black w-7"
                  style={{ color: i === 0 ? '#FFD93D' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#ffffff40' }}>
                  {i === 0 ? '👑' : `#${i + 1}`}
                </span>
                <span className="text-xl">{p.avatar}</span>
                <span className={`font-bold flex-1 text-sm ${p.isPlayer ? 'text-blue-300' : 'text-white/80'}`}>{p.name}</span>
                <span className="font-black tabular-nums"
                  style={{ color: i === 0 ? '#FFD93D' : '#ffffff80' }}>
                  {p.score.toLocaleString()}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          className="flex gap-3 px-4">
          <button onClick={enterMatch}
            className="flex-1 py-4 rounded-2xl font-black text-sm"
            style={{ background: 'linear-gradient(135deg,#B44FFF,#3AB4FF)', boxShadow: '0 0 30px rgba(180,79,255,0.4)' }}>
            ⚔️ Play Again
          </button>
          <button onClick={() => setLocation('/leagues')}
            className="flex-1 py-4 rounded-2xl font-black text-sm bg-white/10 border border-white/15">
            🏆 Leagues
          </button>
        </motion.div>
      </div>
    );
  }

  return null;
}
