import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useGame } from '@/contexts/GameContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Swords, Zap } from 'lucide-react';
import { Link } from 'wouter';
import {
  PvpPlayer, PvpRound, PvpMatchState,
  createBotOpponent, getBotAccuracy, getBotReactionMs, scorePvpAnswer,
  PVP_GAME_DURATION, PVP_ROUND_RESULT_DELAY,
} from '@/lib/pvp-engine';
import { COLORS, Color, generateChallenge, LEAGUES, LeagueId } from '@/lib/game-engine';
import WinAnimation from '@/components/WinAnimation';
import { getLevelTitle } from '@/lib/xp';

type SearchPhase = 'searching' | 'found' | 'countdown' | 'battle' | 'finished';

const LEAGUES_PVP: { id: LeagueId; label: string; color: string; stake: number }[] = [
  { id: 'bronze', label: 'Bronze',   color: '#CD7F32', stake: 30 },
  { id: 'silver', label: 'Silver',   color: '#A8A9AD', stake: 75 },
  { id: 'elite',  label: 'Elite',    color: '#FFD700', stake: 150 },
];

export default function PvP() {
  const { username, coins, level, pvpWins, pvpLosses, recordPvpResult } = useGame();
  const [, setLocation] = useLocation();

  const [searchPhase, setSearchPhase] = useState<SearchPhase>('searching');
  const [selectedLeague, setSelectedLeague] = useState<LeagueId | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(PVP_GAME_DURATION);
  const [player, setPlayer] = useState<PvpPlayer | null>(null);
  const [opponent, setOpponent] = useState<PvpPlayer | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<ReturnType<typeof generateChallenge> | null>(null);
  const [roundPhase, setRoundPhase] = useState<'playing' | 'result' | 'waiting'>('waiting');
  const [playerResult, setPlayerResult] = useState<boolean | null>(null);
  const [botResult, setBotResult] = useState<boolean | null>(null);
  const [winner, setWinner] = useState<'player' | 'opponent' | 'draw' | null>(null);
  const [showWinAnim, setShowWinAnim] = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);

  const playerRef = useRef<PvpPlayer | null>(null);
  const opponentRef = useRef<PvpPlayer | null>(null);
  const challengeRef = useRef<ReturnType<typeof generateChallenge> | null>(null);
  const roundPhaseRef = useRef<'playing' | 'result' | 'waiting'>('waiting');
  const leagueRef = useRef<LeagueId>('bronze');
  const doneRef = useRef(false);
  const roundStartRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
  };

  const updatePlayer = (fn: (p: PvpPlayer) => PvpPlayer) => {
    setPlayer(p => {
      if (!p) return p;
      const updated = fn(p);
      playerRef.current = updated;
      return updated;
    });
  };

  const updateOpponent = (fn: (p: PvpPlayer) => PvpPlayer) => {
    setOpponent(p => {
      if (!p) return p;
      const updated = fn(p);
      opponentRef.current = updated;
      return updated;
    });
  };

  const finishBattle = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearTimers();

    const p = playerRef.current;
    const o = opponentRef.current;
    if (!p || !o) return;

    const won = p.score > o.score;
    const draw = p.score === o.score;
    const result = won ? 'player' : draw ? 'draw' : 'opponent';
    setWinner(result);
    setSearchPhase('finished');

    const league = LEAGUES[leagueRef.current];
    const stake = LEAGUES_PVP.find(l => l.id === leagueRef.current)?.stake ?? 30;
    const earned = won ? Math.round(stake * 2.2) : draw ? stake : 0;
    const xp = won ? 80 : draw ? 30 : 15;
    setCoinsEarned(earned);
    setXpEarned(xp);

    if (won) setTimeout(() => setShowWinAnim(true), 300);
    recordPvpResult(won, o.level, earned);
  }, [recordPvpResult]);

  const nextRound = useCallback(() => {
    if (doneRef.current) return;
    const c = generateChallenge(4);
    challengeRef.current = c;
    setCurrentChallenge(c);
    setPlayerResult(null);
    setBotResult(null);
    roundPhaseRef.current = 'playing';
    setRoundPhase('playing');
    roundStartRef.current = Date.now();

    const botAcc = getBotAccuracy(leagueRef.current);
    const botCorrect = Math.random() < botAcc;
    const botMs = getBotReactionMs(leagueRef.current, c.type);

    botTimerRef.current = setTimeout(() => {
      if (roundPhaseRef.current !== 'playing' || doneRef.current) return;
      const timeoutMs = LEAGUES[leagueRef.current]?.challengeTimeout ?? 2500;

      const botTarget = c.type !== 'memory' ? (c as any).target.id : null;
      const botAnswer = botCorrect ? botTarget : 'wrong';
      setBotResult(botCorrect);

      const pts = scorePvpAnswer(botCorrect, botMs, timeoutMs, opponentRef.current?.streak ?? 0, c.type);
      updateOpponent(o => ({
        ...o,
        score: Math.max(0, o.score + pts),
        correct: o.correct + (botCorrect ? 1 : 0),
        errors: o.errors + (botCorrect ? 0 : 1),
        streak: botCorrect ? o.streak + 1 : 0,
      }));

      // If player hasn't answered yet, wait a bit more then resolve
      setTimeout(() => {
        if (roundPhaseRef.current === 'playing' && !doneRef.current) {
          setPlayerResult(false);
          updatePlayer(p => ({ ...p, errors: p.errors + 1, streak: 0 }));
          roundPhaseRef.current = 'result';
          setRoundPhase('result');
          setTimeout(() => { if (!doneRef.current) nextRound(); }, PVP_ROUND_RESULT_DELAY);
        }
      }, 800);
    }, botMs);
  }, []);

  const handleTap = (color: Color) => {
    if (roundPhaseRef.current !== 'playing' || doneRef.current) return;
    const c = challengeRef.current;
    if (!c || c.type === 'memory') return;

    const elapsed = Date.now() - roundStartRef.current;
    const timeoutMs = LEAGUES[leagueRef.current]?.challengeTimeout ?? 2500;
    const correct = color.id === (c as any).target.id;

    setPlayerResult(correct);
    const pts = scorePvpAnswer(correct, elapsed, timeoutMs, playerRef.current?.streak ?? 0, c.type);
    updatePlayer(p => ({
      ...p,
      score: Math.max(0, p.score + pts),
      correct: p.correct + (correct ? 1 : 0),
      errors: p.errors + (correct ? 0 : 1),
      streak: correct ? p.streak + 1 : 0,
    }));

    roundPhaseRef.current = 'result';
    setRoundPhase('result');
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    setTimeout(() => { if (!doneRef.current) nextRound(); }, PVP_ROUND_RESULT_DELAY);
  };

  const startBattle = (leagueId: LeagueId) => {
    leagueRef.current = leagueId;
    setSelectedLeague(leagueId);

    const p: PvpPlayer = { id: 'player', name: username, score: 0, correct: 0, errors: 0, streak: 0, isBot: false, level };
    const o = createBotOpponent(leagueId, level);
    playerRef.current = p;
    opponentRef.current = o;
    setPlayer(p);
    setOpponent(o);
    setSearchPhase('found');

    setTimeout(() => {
      setSearchPhase('countdown');
      let c = 3;
      setCountdown(c);
      const cd = setInterval(() => {
        c--;
        setCountdown(c);
        if (c <= 0) {
          clearInterval(cd);
          setSearchPhase('battle');
          doneRef.current = false;

          let t = PVP_GAME_DURATION;
          setTimeLeft(t);
          timerRef.current = setInterval(() => {
            t--;
            setTimeLeft(t);
            if (t <= 0) finishBattle();
          }, 1000);

          nextRound();
        }
      }, 1000);
    }, 1500);
  };

  useEffect(() => () => clearTimers(), []);

  const levelInfo = (l: number) => getLevelTitle(l);
  const stake = LEAGUES_PVP.find(l => l.id === selectedLeague)?.stake ?? 0;

  if (searchPhase === 'searching') {
    return (
      <div className="min-h-screen bg-background flex flex-col p-5 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/"><button className="p-2 rounded-full hover:bg-card"><ArrowLeft className="w-5 h-5" /></button></Link>
          <h1 className="text-2xl font-bold flex-1">PvP Battle</h1>
          <div className="text-sm text-muted-foreground">{pvpWins}W / {pvpLosses}L</div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-xl font-black text-primary">
              {username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-bold">{username}</div>
              <div className="text-sm" style={{ color: levelInfo(level).color }}>Lv.{level} · {levelInfo(level).title}</div>
            </div>
            <div className="ml-auto text-yellow-400 font-bold">{coins} 🪙</div>
          </div>
        </div>

        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Choose Arena</h2>
        <div className="space-y-3 mb-6">
          {LEAGUES_PVP.map(l => {
            const canAfford = coins >= l.stake;
            const isUnlocked = true;
            return (
              <button
                key={l.id}
                onClick={() => canAfford ? startBattle(l.id) : null}
                disabled={!canAfford}
                className="w-full p-4 rounded-2xl border text-left transition-all active:scale-[0.98] disabled:opacity-40"
                style={{ borderColor: `${l.color}40`, backgroundColor: `${l.color}10` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-lg" style={{ color: l.color }}>{l.label} Arena</div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      Stake: <span className="font-bold text-yellow-400">{l.stake} 🪙</span> · Win: <span className="font-bold text-green-400">+{Math.round(l.stake * 2.2)} 🪙</span>
                    </div>
                  </div>
                  <Swords className="w-6 h-6" style={{ color: l.color }} />
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-xs font-bold text-muted-foreground uppercase mb-2">PvP Scoring</div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>✅ Correct answer: <span className="text-green-400 font-bold">+10 pts + speed bonus</span></div>
            <div>❌ Wrong answer: <span className="text-red-400 font-bold">-2 pts</span></div>
            <div>🔥 Streak ×3: <span className="text-orange-400 font-bold">+5 bonus</span></div>
          </div>
        </div>
      </div>
    );
  }

  if (searchPhase === 'found' || searchPhase === 'countdown') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-6 text-center"
        >
          <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
            {searchPhase === 'found' ? 'Opponent Found!' : 'Get Ready!'}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 bg-card border border-border rounded-2xl p-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl font-black text-primary mx-auto mb-2">
                {username.slice(0, 2).toUpperCase()}
              </div>
              <div className="font-bold text-sm">{username}</div>
              <div className="text-xs text-muted-foreground">Lv.{level}</div>
            </div>

            <div className="text-3xl font-black text-muted-foreground">VS</div>

            <div className="flex-1 bg-card border border-red-500/30 rounded-2xl p-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center text-2xl font-black text-red-400 mx-auto mb-2">
                {opponent?.name.slice(0, 2).toUpperCase() ?? '??'}
              </div>
              <div className="font-bold text-sm">{opponent?.name ?? '...'}</div>
              <div className="text-xs text-muted-foreground">Lv.{opponent?.level ?? '?'}</div>
            </div>
          </div>

          {searchPhase === 'countdown' && (
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-8xl font-black tabular-nums"
              style={{ color: 'hsl(var(--primary))' }}
            >
              {countdown > 0 ? countdown : 'GO!'}
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  if (searchPhase === 'battle' && player && opponent && currentChallenge) {
    const c = currentChallenge;
    const isFeedback = roundPhase === 'result';

    return (
      <div className="min-h-screen bg-background flex flex-col select-none"
        style={{
          background: roundPhase === 'result'
            ? playerResult
              ? 'radial-gradient(circle at center,#2EE87A15,hsl(var(--background)) 70%)'
              : 'radial-gradient(circle at center,#FF3A5E15,hsl(var(--background)) 70%)'
            : 'hsl(var(--background))',
          transition: 'background 0.2s',
        }}
      >
        {/* HUD */}
        <div className="px-4 pt-4 pb-2 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-xs font-black text-primary">
                {username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{username}</div>
                <div className="text-xl font-black tabular-nums text-primary">{player.score}</div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black tabular-nums" style={{ color: timeLeft <= 10 ? '#FF3A5E' : 'inherit' }}>
                {timeLeft}
              </div>
              <div className="text-xs text-muted-foreground">sec</div>
            </div>
            <div className="flex-1 flex items-center gap-2 justify-end">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">{opponent.name}</div>
                <div className="text-xl font-black tabular-nums text-red-400">{opponent.score}</div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center text-xs font-black text-red-400">
                {opponent.name.slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>

          <div className="flex gap-1">
            <div className="flex-1 h-1.5 rounded-full bg-card overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, (player.score / Math.max(1, player.score + opponent.score)) * 100)}%` }} />
            </div>
            <div className="flex-1 h-1.5 rounded-full bg-card overflow-hidden">
              <div className="h-full bg-red-400 rounded-full transition-all duration-300 ml-auto"
                style={{ width: `${Math.max(0, (opponent.score / Math.max(1, player.score + opponent.score)) * 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Indicators */}
        <div className="flex justify-between px-4 mb-2 text-xs font-bold">
          <div className={playerResult === null ? 'text-muted-foreground' : playerResult ? 'text-green-400' : 'text-red-400'}>
            {playerResult === null ? '...' : playerResult ? '✓ +pts' : '✗ -2'}
            {player.streak >= 3 && <span className="text-orange-400 ml-1">🔥×{player.streak}</span>}
          </div>
          <div className={botResult === null ? 'text-muted-foreground' : botResult ? 'text-red-300' : 'text-green-300'}>
            {botResult === null ? '...' : botResult ? '✓ +pts' : '✗'}
          </div>
        </div>

        {/* Challenge */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-6 gap-6">
          {c.type !== 'memory' && (
            <>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {c.type === 'reaction' ? 'TAP THIS' : 'MATCH THIS'}
              </div>
              <div className="w-28 h-28 rounded-3xl"
                style={{ backgroundColor: (c as any).target.hex, boxShadow: `0 0 50px ${(c as any).target.hex}88` }} />
              <div className="grid gap-3 w-full max-w-xs"
                style={{ gridTemplateColumns: `repeat(${Math.min((c as any).options.length, 2)}, 1fr)` }}>
                {(c as any).options.map((opt: Color) => (
                  <button
                    key={opt.id}
                    onClick={() => handleTap(opt)}
                    disabled={isFeedback}
                    className="h-20 rounded-2xl active:scale-95 transition-transform disabled:opacity-60"
                    style={{ backgroundColor: opt.hex, boxShadow: `0 4px 20px ${opt.hex}55` }}
                  />
                ))}
              </div>
            </>
          )}

          {c.type === 'memory' && (
            <div className="text-center text-muted-foreground text-sm">
              <div className="text-4xl mb-2">🧠</div>
              <div>Memory challenge in PvP!</div>
              <div className="text-xs mt-1">(Bot handles this automatically)</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (searchPhase === 'finished' && player && opponent) {
    const won = winner === 'player';
    const draw = winner === 'draw';
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5 text-center">
        <WinAnimation show={showWinAnim && won} label="VICTORY!" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm space-y-4"
        >
          <div className="text-6xl mb-2">{won ? '🏆' : draw ? '🤝' : '💀'}</div>
          <div className="text-4xl font-black" style={{ color: won ? '#FFD700' : draw ? '#A8A9AD' : '#FF3A5E' }}>
            {won ? 'VICTORY' : draw ? 'DRAW' : 'DEFEAT'}
          </div>

          <div className="flex gap-3">
            <div className="flex-1 bg-card border border-primary/30 rounded-2xl p-4">
              <div className="text-xs text-muted-foreground mb-1">{username}</div>
              <div className="text-3xl font-black text-primary tabular-nums">{player.score}</div>
              <div className="text-xs text-muted-foreground mt-1">{player.correct}✓ {player.errors}✗</div>
            </div>
            <div className="flex-1 bg-card border border-red-500/30 rounded-2xl p-4">
              <div className="text-xs text-muted-foreground mb-1">{opponent.name}</div>
              <div className="text-3xl font-black text-red-400 tabular-nums">{opponent.score}</div>
              <div className="text-xs text-muted-foreground mt-1">{opponent.correct}✓ {opponent.errors}✗</div>
            </div>
          </div>

          {coinsEarned > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-3 flex items-center justify-center gap-2">
              <span className="text-2xl">🪙</span>
              <span className="text-xl font-black text-yellow-400">+{coinsEarned} Coins</span>
            </div>
          )}
          <div className="bg-card border border-border rounded-2xl p-3 text-sm text-muted-foreground">
            +{xpEarned} XP earned
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => { setSearchPhase('searching'); setSelectedLeague(null); doneRef.current = false; clearTimers(); }}
              className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-lg active:scale-95 transition-transform"
            >
              Play Again
            </button>
            <Link href="/">
              <button className="w-full h-12 rounded-2xl border border-border text-muted-foreground font-medium active:scale-95 transition-transform">
                Home
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
