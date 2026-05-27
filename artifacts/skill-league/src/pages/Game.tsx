import { useState, useEffect, useRef } from 'react';
import { useLocation, useParams } from 'wouter';
import { useGame } from '@/contexts/GameContext';
import {
  COLORS,
  Color,
  Challenge,
  generateChallenge,
  getPoints,
  LEAGUES,
  LeagueType,
} from '@/lib/game-engine';

type Phase =
  | 'waiting'
  | 'playing'
  | 'memory_show'
  | 'memory_input'
  | 'feedback_good'
  | 'feedback_bad'
  | 'done';

const GAME_DURATION = 30;
const CHALLENGE_TIMEOUT = 2500;

export default function Game() {
  const params = useParams<{ league: string }>();
  const league = params.league as LeagueType;
  const [, setLocation] = useLocation();
  const { updateCurrency, updateHighScore, setLastResult } = useGame();
  const config = LEAGUES[league];

  const [phase, setPhase] = useState<Phase>('waiting');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [memoryShowIdx, setMemoryShowIdx] = useState(-1);
  const [memoryInput, setMemoryInput] = useState<string[]>([]);

  // Mutable refs — safe to read from stale closures inside timers
  const phaseRef     = useRef<Phase>('waiting');
  const scoreRef     = useRef(0);
  const streakRef    = useRef(0);
  const bestRef      = useRef(0);
  const correctRef   = useRef(0);
  const totalRef     = useRef(0);
  const doneRef      = useRef(false);
  const challengeRef = useRef<Challenge | null>(null);
  const memInRef     = useRef<string[]>([]);

  const gameTickRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const actionRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextFnRef    = useRef<() => void>(() => {});

  useEffect(() => {
    if (!config) setLocation('/');
    return () => {
      if (gameTickRef.current) clearInterval(gameTickRef.current);
      if (actionRef.current)   clearTimeout(actionRef.current);
      if (seqRef.current)      clearTimeout(seqRef.current);
    };
  }, []);

  const clearAction = () => {
    if (actionRef.current) { clearTimeout(actionRef.current); actionRef.current = null; }
    if (seqRef.current)    { clearTimeout(seqRef.current);    seqRef.current    = null; }
  };

  /* ── helpers ── */
  const addScore = (pts: number) => {
    scoreRef.current += pts;
    setScore(scoreRef.current);
  };

  const recordAnswer = (correct: boolean, type: Challenge['type']) => {
    totalRef.current += 1;
    if (correct) {
      correctRef.current += 1;
      const s = streakRef.current + 1;
      streakRef.current = s;
      if (s > bestRef.current) bestRef.current = s;
      setStreak(s);
      addScore(getPoints(type, s));
    } else {
      streakRef.current = 0;
      setStreak(0);
    }
  };

  const doFeedback = (good: boolean) => {
    const p: Phase = good ? 'feedback_good' : 'feedback_bad';
    phaseRef.current = p;
    setPhase(p);
    setTimeout(() => {
      if (!doneRef.current) nextFnRef.current();
    }, 350);
  };

  /* ── memory sequence animation ── */
  const runSequence = (seq: Color[], idx: number) => {
    if (doneRef.current) return;
    if (idx >= seq.length) {
      setMemoryShowIdx(-1);
      phaseRef.current = 'memory_input';
      setPhase('memory_input');
      actionRef.current = setTimeout(() => {
        if (phaseRef.current !== 'memory_input' || doneRef.current) return;
        recordAnswer(false, 'memory');
        doFeedback(false);
      }, seq.length * 3000);
      return;
    }
    setMemoryShowIdx(idx);
    seqRef.current = setTimeout(() => {
      setMemoryShowIdx(-1);
      seqRef.current = setTimeout(() => runSequence(seq, idx + 1), 150);
    }, 700);
  };

  /* ── next challenge ── */
  const nextChallenge = () => {
    if (doneRef.current) return;
    clearAction();

    const c = generateChallenge();
    challengeRef.current = c;
    setChallenge(c);
    memInRef.current = [];
    setMemoryInput([]);

    if (c.type === 'memory') {
      phaseRef.current = 'memory_show';
      setPhase('memory_show');
      setMemoryShowIdx(-1);
      seqRef.current = setTimeout(() => runSequence(c.sequence, 0), 700);
    } else {
      phaseRef.current = 'playing';
      setPhase('playing');
      actionRef.current = setTimeout(() => {
        if (phaseRef.current !== 'playing' || doneRef.current) return;
        recordAnswer(false, c.type);
        doFeedback(false);
      }, CHALLENGE_TIMEOUT);
    }
  };

  nextFnRef.current = nextChallenge;

  /* ── finish game ── */
  const finishGame = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (gameTickRef.current) { clearInterval(gameTickRef.current); gameTickRef.current = null; }
    clearAction();
    phaseRef.current = 'done';
    setPhase('done');

    const s = scoreRef.current;
    const acc = totalRef.current > 0 ? Math.round((correctRef.current / totalRef.current) * 100) : 0;
    const coins  = (league === 'training' || league === 'easy') ? Math.max(5, Math.floor(s / 5)) : 0;
    const tokens = (league === 'ranked'   || league === 'elite') ? Math.max(1, Math.floor(s / 50)) : 0;

    if (config) {
      if (config.entryCostType === 'coins')  updateCurrency(-config.entryCost, 0);
      if (config.entryCostType === 'tokens') updateCurrency(0, -config.entryCost);
    }
    updateCurrency(coins, tokens);
    updateHighScore(league, s);
    setLastResult(s, acc, coins, tokens, bestRef.current, correctRef.current);

    setTimeout(() => setLocation('/results'), 600);
  };

  /* ── start game ── */
  const startGame = () => {
    doneRef.current  = false;
    scoreRef.current = streakRef.current = bestRef.current = correctRef.current = totalRef.current = 0;
    setScore(0); setStreak(0); setTimeLeft(GAME_DURATION);

    let t = GAME_DURATION;
    gameTickRef.current = setInterval(() => {
      t -= 1;
      setTimeLeft(t);
      if (t <= 0) finishGame();
    }, 1000);

    nextFnRef.current();
  };

  /* ── tap handler ── */
  const handleTap = (color: Color) => {
    if (doneRef.current) return;
    const c = challengeRef.current;
    if (!c) return;

    if ((c.type === 'reaction' || c.type === 'decision') && phaseRef.current === 'playing') {
      clearAction();
      const correct = color.id === c.target.id;
      recordAnswer(correct, c.type);
      doFeedback(correct);

    } else if (c.type === 'memory' && phaseRef.current === 'memory_input') {
      const next = [...memInRef.current, color.id];
      memInRef.current = next;
      setMemoryInput([...next]);

      const expected = c.sequence[next.length - 1].id;
      if (color.id !== expected) {
        clearAction();
        recordAnswer(false, 'memory');
        doFeedback(false);
      } else if (next.length === c.sequence.length) {
        clearAction();
        recordAnswer(true, 'memory');
        doFeedback(true);
      }
    }
  };

  if (!config) return null;

  const pct = (timeLeft / GAME_DURATION) * 100;
  const isFeedback = phase === 'feedback_good' || phase === 'feedback_bad';

  /* ── render ── */
  return (
    <div
      className="min-h-screen flex flex-col select-none overflow-hidden"
      style={{
        background:
          phase === 'feedback_good' ? 'radial-gradient(circle at center, #2EE87A22 0%, hsl(var(--background)) 70%)' :
          phase === 'feedback_bad'  ? 'radial-gradient(circle at center, #FF3A5E22 0%, hsl(var(--background)) 70%)' :
          'hsl(var(--background))',
        transition: 'background 0.2s',
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-4 px-5 pt-5 pb-3">
        <div className="w-12 text-center">
          <div
            className="text-3xl font-black font-mono tabular-nums leading-none"
            style={{ color: timeLeft <= 5 ? '#FF3A5E' : 'inherit' }}
          >
            {timeLeft}
          </div>
        </div>
        <div className="flex-1 h-2 bg-card rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${pct}%`,
              background: timeLeft <= 5 ? '#FF3A5E' : 'hsl(var(--primary))',
            }}
          />
        </div>
        <div className="w-20 text-right">
          <div className="text-2xl font-black tabular-nums">{score}</div>
          {streak >= 3 && (
            <div className="text-xs font-bold text-orange-400">×{streak}</div>
          )}
        </div>
      </div>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-8 gap-8">

        {/* WAITING */}
        {phase === 'waiting' && (
          <div className="flex flex-col items-center gap-8">
            <p className="text-muted-foreground uppercase tracking-widest text-sm">Ready?</p>
            <button
              data-testid="button-start"
              onClick={startGame}
              className="w-44 h-44 rounded-full text-white text-2xl font-black uppercase tracking-wider active:scale-95 transition-transform"
              style={{
                background: 'hsl(var(--primary))',
                boxShadow: '0 0 60px hsl(var(--primary) / 0.5)',
              }}
            >
              START
            </button>
          </div>
        )}

        {/* REACTION / DECISION */}
        {(phase === 'playing' || isFeedback) && challenge && challenge.type !== 'memory' && (
          <>
            {/* Target */}
            <div className="text-center space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                {challenge.type === 'reaction' ? 'TAP THIS' : 'MATCH THIS'}
              </p>
              <div
                className="w-32 h-32 rounded-3xl mx-auto"
                style={{
                  backgroundColor: challenge.target.hex,
                  boxShadow: `0 0 50px ${challenge.target.hex}88`,
                }}
              />
            </div>

            {/* Buttons */}
            <div
              className="grid gap-4 w-full max-w-xs"
              style={{ gridTemplateColumns: `repeat(${Math.min(challenge.options.length, 2)}, 1fr)` }}
            >
              {challenge.options.map((c) => (
                <button
                  key={c.id}
                  data-testid={`button-color-${c.id}`}
                  onClick={() => handleTap(c)}
                  disabled={isFeedback}
                  className="h-24 rounded-2xl active:scale-95 transition-transform disabled:opacity-60"
                  style={{
                    backgroundColor: c.hex,
                    boxShadow: `0 4px 24px ${c.hex}55`,
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* MEMORY SHOW */}
        {phase === 'memory_show' && challenge && challenge.type === 'memory' && (
          <div className="flex flex-col items-center gap-6 w-full">
            <p className="text-sm text-muted-foreground uppercase tracking-widest">
              {memoryShowIdx === -1 ? 'WATCH CAREFULLY' : `${memoryShowIdx + 1} / ${challenge.sequence.length}`}
            </p>

            <div className="grid grid-cols-5 gap-3 w-full max-w-xs">
              {COLORS.map((c) => {
                const active = memoryShowIdx >= 0 && challenge.sequence[memoryShowIdx]?.id === c.id;
                return (
                  <div
                    key={c.id}
                    className="aspect-square rounded-xl transition-all duration-150"
                    style={{
                      backgroundColor: c.hex,
                      opacity: active ? 1 : 0.18,
                      transform: active ? 'scale(1.25)' : 'scale(1)',
                      boxShadow: active ? `0 0 32px ${c.hex}` : 'none',
                    }}
                  />
                );
              })}
            </div>

            <div className="flex gap-2">
              {challenge.sequence.map((c, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full transition-all duration-200"
                  style={{
                    backgroundColor: i <= memoryShowIdx ? c.hex : 'transparent',
                    border: `2px solid ${c.hex}`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* MEMORY INPUT */}
        {(phase === 'memory_input' || (isFeedback && challenge?.type === 'memory')) && challenge && challenge.type === 'memory' && (
          <div className="flex flex-col items-center gap-6 w-full">
            <p className="text-sm text-muted-foreground uppercase tracking-widest">REPEAT THE SEQUENCE</p>

            <div className="flex gap-2">
              {challenge.sequence.map((c, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full transition-all duration-200"
                  style={{
                    backgroundColor: memoryInput[i] ? challenge.sequence[i].hex : 'transparent',
                    border: `2px solid ${challenge.sequence[i].hex}`,
                    opacity: memoryInput[i] ? 1 : 0.35,
                  }}
                />
              ))}
            </div>

            <div className="grid grid-cols-5 gap-3 w-full max-w-xs">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  data-testid={`button-mem-${c.id}`}
                  onClick={() => handleTap(c)}
                  disabled={isFeedback}
                  className="aspect-square rounded-xl active:scale-90 transition-transform disabled:opacity-60"
                  style={{
                    backgroundColor: c.hex,
                    boxShadow: `0 4px 16px ${c.hex}55`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {phase === 'done' && (
          <p className="text-muted-foreground animate-pulse">Finishing…</p>
        )}
      </div>
    </div>
  );
}
