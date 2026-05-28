import { useState, useEffect, useRef } from 'react';
import { useLocation, useParams } from 'wouter';
import { useGame } from '@/contexts/GameContext';
import { useT } from '@/lib/i18n';
import {
  COLORS, Color, Challenge,
  generateChallenge, getPoints,
  LEAGUES, LeagueId,
} from '@/lib/game-engine';
import { motion, AnimatePresence } from 'framer-motion';
import { playCorrect, playWrong, playStreak, playTick, playWin, playLose } from '@/lib/sounds';

type Phase = 'waiting' | 'playing' | 'memory_show' | 'memory_input' | 'feedback_good' | 'feedback_bad' | 'done';

const GAME_DURATION = 30;

const LEAGUE_LABELS: Record<string, string> = {
  training: 'تدريب', bronze: 'برونز', silver: 'فضة', elite: 'نخبة',
};

const CHALLENGE_LABELS: Record<string, string> = {
  reaction: 'اضغط على اللون الصحيح',
  decision: 'طابق اللون المستهدف',
  memory:   'كرّر التسلسل',
};

export default function Game() {
  const params = useParams<{ league: string }>();
  const league = params.league as LeagueId;
  const [, setLocation] = useLocation();
  const ctx = useGame();
  const { language, recordMatch } = ctx;
  const t = useT(language);
  const config = LEAGUES[league];

  const [phase,         setPhase]         = useState<Phase>('waiting');
  const [timeLeft,      setTimeLeft]      = useState(GAME_DURATION);
  const [score,         setScore]         = useState(0);
  const [streak,        setStreak]        = useState(0);
  const [challenge,     setChallenge]     = useState<Challenge | null>(null);
  const [memoryShowIdx, setMemoryShowIdx] = useState(-1);
  const [memoryInput,   setMemoryInput]   = useState<string[]>([]);
  const [countdownNum,  setCountdownNum]  = useState<number | null>(null);

  const phaseRef    = useRef<Phase>('waiting');
  const scoreRef    = useRef(0);
  const streakRef   = useRef(0);
  const bestRef     = useRef(0);
  const correctRef  = useRef(0);
  const totalRef    = useRef(0);
  const doneRef     = useRef(false);
  const challengeRef= useRef<Challenge | null>(null);
  const memInRef    = useRef<string[]>([]);
  const recordRef   = useRef(recordMatch);
  recordRef.current = recordMatch;

  const gameTickRef = useRef<ReturnType<typeof setInterval>  | null>(null);
  const actionRef   = useRef<ReturnType<typeof setTimeout>   | null>(null);
  const seqRef      = useRef<ReturnType<typeof setTimeout>   | null>(null);
  const nextFnRef   = useRef<() => void>(() => {});

  useEffect(() => {
    if (!config) setLocation('/leagues');
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

  const addScore = (pts: number) => { scoreRef.current += pts; setScore(scoreRef.current); };

  const recordAnswer = (correct: boolean, type: Challenge['type']) => {
    totalRef.current += 1;
    if (correct) {
      correctRef.current += 1;
      const s = streakRef.current + 1;
      streakRef.current = s;
      if (s > bestRef.current) bestRef.current = s;
      setStreak(s);
      addScore(getPoints(type, s));
      playCorrect();
      if (s > 0 && s % 3 === 0) playStreak(s);
    } else {
      streakRef.current = 0;
      setStreak(0);
      playWrong();
    }
  };

  const doFeedback = (good: boolean) => {
    const p: Phase = good ? 'feedback_good' : 'feedback_bad';
    phaseRef.current = p;
    setPhase(p);
    setTimeout(() => { if (!doneRef.current) nextFnRef.current(); }, 320);
  };

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

  const nextChallenge = () => {
    if (doneRef.current) return;
    clearAction();
    const c = generateChallenge(config?.memorySeqLen ?? 4);
    challengeRef.current = c;
    setChallenge(c);
    memInRef.current = [];
    setMemoryInput([]);
    if (c.type === 'memory') {
      phaseRef.current = 'memory_show';
      setPhase('memory_show');
      setMemoryShowIdx(-1);
      seqRef.current = setTimeout(() => runSequence(c.sequence, 0), 600);
    } else {
      phaseRef.current = 'playing';
      setPhase('playing');
      const timeout = config?.challengeTimeout ?? 2500;
      actionRef.current = setTimeout(() => {
        if (phaseRef.current !== 'playing' || doneRef.current) return;
        recordAnswer(false, c.type);
        doFeedback(false);
      }, timeout);
    }
  };

  nextFnRef.current = nextChallenge;

  const finishGame = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (gameTickRef.current) { clearInterval(gameTickRef.current); gameTickRef.current = null; }
    clearAction();
    phaseRef.current = 'done';
    setPhase('done');
    const s   = scoreRef.current;
    const acc = totalRef.current > 0 ? Math.round((correctRef.current / totalRef.current) * 100) : 0;
    recordRef.current(league, s, acc, bestRef.current, correctRef.current);
    if (acc >= 60 && s > 0) playWin(); else playLose();
    setTimeout(() => setLocation('/results'), 700);
  };

  const doCountdown = () => {
    setCountdownNum(3);
    playTick();
    setTimeout(() => { setCountdownNum(2); playTick(); }, 1000);
    setTimeout(() => { setCountdownNum(1); playTick(); }, 2000);
    setTimeout(() => {
      setCountdownNum(null);
      startGame();
    }, 3000);
  };

  const startGame = () => {
    doneRef.current = false;
    scoreRef.current = streakRef.current = bestRef.current = correctRef.current = totalRef.current = 0;
    setScore(0); setStreak(0); setTimeLeft(GAME_DURATION);
    let time = GAME_DURATION;
    gameTickRef.current = setInterval(() => {
      time -= 1;
      setTimeLeft(time);
      if (time <= 5 && time > 0) playTick(true);
      if (time <= 0) finishGame();
    }, 1000);
    nextFnRef.current();
  };

  const handleTap = (color: Color) => {
    if (doneRef.current) return;
    const c = challengeRef.current;
    if (!c) return;
    if ((c.type === 'reaction' || c.type === 'decision') && phaseRef.current === 'playing') {
      clearAction();
      recordAnswer(color.id === c.target.id, c.type);
      doFeedback(color.id === c.target.id);
    } else if (c.type === 'memory' && phaseRef.current === 'memory_input') {
      const next = [...memInRef.current, color.id];
      memInRef.current = next;
      setMemoryInput([...next]);
      const expected = c.sequence[next.length - 1].id;
      if (color.id !== expected) {
        clearAction(); recordAnswer(false, 'memory'); doFeedback(false);
      } else if (next.length === c.sequence.length) {
        clearAction(); recordAnswer(true, 'memory'); doFeedback(true);
      }
    }
  };

  if (!config) return null;

  const pct        = (timeLeft / GAME_DURATION) * 100;
  const isFeedback = phase === 'feedback_good' || phase === 'feedback_bad';
  const isUrgent   = timeLeft <= 5 && phase !== 'waiting' && phase !== 'done';

  return (
    <div dir="rtl"
      className="min-h-screen flex flex-col select-none overflow-hidden transition-colors duration-200"
      style={{
        background:
          phase === 'feedback_good' ? 'radial-gradient(circle at center,#2EE87A1A,hsl(var(--background)) 65%)' :
          phase === 'feedback_bad'  ? 'radial-gradient(circle at center,#FF3A5E1A,hsl(var(--background)) 65%)' :
          'hsl(var(--background))',
      }}
    >
      {/* ── Header ── */}
      <div className="px-4 pt-safe pt-4 pb-3 flex items-center gap-3">
        {/* League badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold"
          style={{ background: config.themeColor + '22', color: config.themeColor, border: `1px solid ${config.themeColor}50` }}>
          {LEAGUE_LABELS[league] ?? league}
        </div>

        {/* Timer */}
        <div className="relative flex-1 h-3 bg-card rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${pct}%`, background: isUrgent ? '#FF3A5E' : config.themeColor }}
            animate={isUrgent ? { opacity: [1, 0.5, 1] } : {}}
            transition={isUrgent ? { repeat: Infinity, duration: 0.5 } : {}} />
        </div>

        {/* Timer number */}
        <motion.div
          animate={isUrgent ? { scale: [1, 1.15, 1] } : {}}
          transition={isUrgent ? { repeat: Infinity, duration: 0.5 } : {}}
          className="w-10 text-center text-2xl font-black font-mono tabular-nums"
          style={{ color: isUrgent ? '#FF3A5E' : 'hsl(var(--foreground))' }}>
          {timeLeft}
        </motion.div>
      </div>

      {/* ── Score + Streak ── */}
      <div className="flex items-center justify-between px-5 pb-3">
        <div className="flex items-center gap-2">
          {streak >= 3 && (
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40">
              <span className="text-orange-400 text-xs font-black">🔥 ×{streak}</span>
            </motion.div>
          )}
        </div>
        <motion.div
          key={score}
          initial={{ scale: 1.3, color: config.themeColor }}
          animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
          transition={{ duration: 0.25 }}
          className="text-3xl font-black tabular-nums">
          {score}
        </motion.div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-8 gap-6">

        {/* COUNTDOWN OVERLAY */}
        <AnimatePresence>
          {countdownNum !== null && (
            <motion.div
              key={countdownNum}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex items-center justify-center z-50 bg-background/80 backdrop-blur-sm">
              <span className="text-9xl font-black" style={{ color: config.themeColor,
                textShadow: `0 0 60px ${config.themeColor}88` }}>
                {countdownNum}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WAITING */}
        {phase === 'waiting' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6">
            {/* League info card */}
            <div className="rounded-2xl border p-4 text-center space-y-1 max-w-xs w-full"
              style={{ borderColor: config.themeColor + '40', background: config.themeColor + '0D' }}>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">اختبار المهارة</div>
              <div className="text-xl font-black" style={{ color: config.themeColor }}>
                {LEAGUE_LABELS[league] ?? league}
              </div>
              <div className="text-xs text-muted-foreground">30 ثانية · {config.difficulty === 4 ? 'صعب جداً' : config.difficulty === 3 ? 'صعب' : config.difficulty === 2 ? 'متوسط' : 'سهل'}</div>
            </div>

            {/* Play button */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={doCountdown}
              className="w-40 h-40 rounded-full text-white text-2xl font-black uppercase tracking-wider"
              style={{ background: `radial-gradient(circle, ${config.themeColor}dd, ${config.themeColor})`,
                boxShadow: `0 0 60px ${config.themeColor}55, 0 0 120px ${config.themeColor}22` }}>
              <span className="block text-3xl mb-1">🎮</span>
              العب
            </motion.button>
          </motion.div>
        )}

        {/* REACTION / DECISION */}
        {(phase === 'playing' || isFeedback) && challenge && challenge.type !== 'memory' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col items-center gap-6">
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">
                {CHALLENGE_LABELS[challenge.type] ?? t('tap_this')}
              </p>
              <motion.div
                key={challenge.target.id}
                initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="w-36 h-36 rounded-[28px] mx-auto"
                style={{ backgroundColor: challenge.target.hex,
                  boxShadow: `0 0 60px ${challenge.target.hex}88, 0 8px 32px ${challenge.target.hex}44` }} />
            </div>
            <div className="grid gap-3 w-full max-w-xs"
              style={{ gridTemplateColumns: `repeat(${Math.min(challenge.options.length, 2)}, 1fr)` }}>
              {challenge.options.map(c => (
                <motion.button key={c.id}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => handleTap(c)} disabled={isFeedback}
                  className="h-28 rounded-2xl disabled:opacity-50 transition-opacity"
                  style={{ backgroundColor: c.hex, boxShadow: `0 6px 28px ${c.hex}55` }} />
              ))}
            </div>
          </motion.div>
        )}

        {/* MEMORY SHOW */}
        {phase === 'memory_show' && challenge && challenge.type === 'memory' && (
          <div className="flex flex-col items-center gap-5 w-full">
            <div className="text-center space-y-1">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                {memoryShowIdx === -1 ? 'استعد...' : `اللون ${memoryShowIdx + 1} من ${challenge.sequence.length}`}
              </p>
              <p className="text-xs text-muted-foreground">شاهد التسلسل بعناية</p>
            </div>
            <div className="grid grid-cols-5 gap-3 w-full max-w-xs">
              {COLORS.map(c => {
                const active = memoryShowIdx >= 0 && challenge.sequence[memoryShowIdx]?.id === c.id;
                return (
                  <motion.div key={c.id}
                    animate={{ scale: active ? 1.28 : 1, opacity: active ? 1 : 0.18 }}
                    transition={{ duration: 0.15 }}
                    className="aspect-square rounded-xl"
                    style={{ backgroundColor: c.hex, boxShadow: active ? `0 0 32px ${c.hex}` : 'none' }} />
                );
              })}
            </div>
            <div className="flex gap-2">
              {challenge.sequence.map((c, i) => (
                <motion.div key={i} animate={{ backgroundColor: i <= memoryShowIdx ? c.hex : 'transparent' }}
                  className="w-3 h-3 rounded-full" style={{ border: `2px solid ${c.hex}` }} />
              ))}
            </div>
          </div>
        )}

        {/* MEMORY INPUT */}
        {(phase === 'memory_input' || (isFeedback && challenge?.type === 'memory')) && challenge && challenge.type === 'memory' && (
          <div className="flex flex-col items-center gap-5 w-full">
            <div className="text-center">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">كرّر التسلسل</p>
              <p className="text-xs text-muted-foreground mt-0.5">{memoryInput.length} / {challenge.sequence.length}</p>
            </div>
            <div className="flex gap-2">
              {challenge.sequence.map((c, i) => (
                <motion.div key={i}
                  animate={{ scale: memoryInput[i] ? 1.2 : 1, opacity: memoryInput[i] ? 1 : 0.35 }}
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: memoryInput[i] ? challenge.sequence[i].hex : 'transparent',
                    border: `2px solid ${challenge.sequence[i].hex}` }} />
              ))}
            </div>
            <div className="grid grid-cols-5 gap-3 w-full max-w-xs">
              {COLORS.map(c => (
                <motion.button key={c.id}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => handleTap(c)} disabled={isFeedback}
                  className="aspect-square rounded-xl disabled:opacity-50"
                  style={{ backgroundColor: c.hex, boxShadow: `0 4px 16px ${c.hex}55` }} />
              ))}
            </div>
          </div>
        )}

        {/* DONE */}
        {phase === 'done' && (
          <motion.p
            animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }}
            className="text-muted-foreground text-lg font-bold">
            جاري حساب نتائجك...
          </motion.p>
        )}
      </div>

      {/* ── Feedback flash overlay ── */}
      <AnimatePresence>
        {isFeedback && (
          <motion.div
            key={phase}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="w-32 h-32 rounded-full"
              style={{ backgroundColor: phase === 'feedback_good' ? '#2EE87A' : '#FF3A5E' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
