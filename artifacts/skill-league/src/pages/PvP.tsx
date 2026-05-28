import { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Swords, Zap, Shield, Bot, Users, Clock } from 'lucide-react';
import { Link } from 'wouter';
import {
  PvpPlayer, scorePvpAnswer,
  PVP_GAME_DURATION, PVP_ROUND_RESULT_DELAY,
} from '@/lib/pvp-engine';
import {
  startMatchmaking, MatchmakingResult, MatchType, BotDifficulty,
  getBotAccuracyByDifficulty, getBotReactionByDifficulty, getBotLevelByDifficulty,
  getBotEloByDifficulty, getEloChange, getPvpRewardCoins, getPvpRewardXp,
  getDailyBotCount, canPlayBotMatch, DAILY_BOT_LIMIT,
} from '@/lib/matchmaking';
import { COLORS, Color, generateChallenge, LEAGUES, LeagueId } from '@/lib/game-engine';
import { getLevelTitle } from '@/lib/xp';
import WinAnimation from '@/components/WinAnimation';
import GuestBanner from '@/components/GuestBanner';

type Phase = 'lobby' | 'matchmaking' | 'found' | 'countdown' | 'battle' | 'finished';

const ARENAS: { id: LeagueId; label: string; icon: string; color: string; stake: number }[] = [
  { id: 'bronze', label: 'برونز',  icon: '🥉', color: '#CD7F32', stake: 30  },
  { id: 'silver', label: 'فضة',    icon: '🥈', color: '#A8A9AD', stake: 75  },
  { id: 'elite',  label: 'نخبة',   icon: '🥇', color: '#FFD700', stake: 150 },
];

const DIFF_LABEL: Record<BotDifficulty, { ar: string; color: string }> = {
  easy:   { ar: 'سهل',   color: '#22c55e' },
  medium: { ar: 'متوسط', color: '#f59e0b' },
  hard:   { ar: 'صعب',   color: '#ef4444' },
};

export default function PvP() {
  const { username, coins, level, elo, pvpWins, pvpLosses, recordPvpResult, isGuest } = useGame();

  const [phase, setPhase] = useState<Phase>('lobby');
  const [selectedArena, setSelectedArena] = useState<LeagueId | null>(null);
  const [matchResult, setMatchResult] = useState<MatchmakingResult | null>(null);
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(PVP_GAME_DURATION);

  const [player, setPlayer] = useState<PvpPlayer | null>(null);
  const [opponent, setOpponent] = useState<PvpPlayer | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<ReturnType<typeof generateChallenge> | null>(null);
  const [roundPhase, setRoundPhase] = useState<'playing' | 'result'>('playing');
  const [playerResult, setPlayerResult] = useState<boolean | null>(null);
  const [botResult, setBotResult] = useState<boolean | null>(null);
  const [winner, setWinner] = useState<'player' | 'opponent' | 'draw' | null>(null);
  const [showWinAnim, setShowWinAnim] = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [eloChange, setEloChange] = useState(0);
  const [cancelSearch, setCancelSearch] = useState(false);

  const playerRef    = useRef<PvpPlayer | null>(null);
  const opponentRef  = useRef<PvpPlayer | null>(null);
  const challengeRef = useRef<ReturnType<typeof generateChallenge> | null>(null);
  const roundPhaseRef = useRef<'playing' | 'result'>('playing');
  const leagueRef    = useRef<LeagueId>('bronze');
  const matchRef     = useRef<MatchmakingResult | null>(null);
  const doneRef      = useRef(false);
  const roundStartRef = useRef(0);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const botTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    if (searchTimerRef.current) clearInterval(searchTimerRef.current);
  };

  const updatePlayer   = (fn: (p: PvpPlayer) => PvpPlayer) => setPlayer(p => { if (!p) return p; const u = fn(p); playerRef.current = u; return u; });
  const updateOpponent = (fn: (p: PvpPlayer) => PvpPlayer) => setOpponent(p => { if (!p) return p; const u = fn(p); opponentRef.current = u; return u; });

  const finishBattle = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearTimers();

    const p = playerRef.current;
    const o = opponentRef.current;
    const mr = matchRef.current;
    if (!p || !o || !mr) return;

    const won = p.score > o.score;
    const draw = p.score === o.score;
    const result: 'player' | 'opponent' | 'draw' = won ? 'player' : draw ? 'draw' : 'opponent';
    setWinner(result);

    const stake = ARENAS.find(a => a.id === leagueRef.current)?.stake ?? 30;
    const coins = getPvpRewardCoins(stake, won, draw, mr.type);
    const xp    = getPvpRewardXp(won, draw, mr.type);
    const elo   = getEloChange(won, draw, p.level * 100 + 800, mr.opponentElo, mr.type);

    setCoinsEarned(coins);
    setXpEarned(xp);
    setEloChange(elo);
    if (won) setTimeout(() => setShowWinAnim(true), 300);
    recordPvpResult(won, o.level, coins);
    setPhase('finished');
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

    const mr = matchRef.current;
    if (!mr) return;

    const botAcc = mr.difficulty
      ? getBotAccuracyByDifficulty(mr.difficulty)
      : mr.type === 'pvp' ? 0.80 : 0.75;

    const botMs = mr.difficulty
      ? getBotReactionByDifficulty(mr.difficulty, c.type)
      : 900 + Math.random() * 400;

    const botCorrect = Math.random() < botAcc;
    const timeoutMs = LEAGUES[leagueRef.current]?.challengeTimeout ?? 2500;

    botTimerRef.current = setTimeout(() => {
      if (roundPhaseRef.current !== 'playing' || doneRef.current) return;
      setBotResult(botCorrect);
      const pts = scorePvpAnswer(botCorrect, botMs, timeoutMs, opponentRef.current?.streak ?? 0, c.type);
      updateOpponent(o => ({
        ...o,
        score:   Math.max(0, o.score + pts),
        correct: o.correct + (botCorrect ? 1 : 0),
        errors:  o.errors  + (botCorrect ? 0 : 1),
        streak:  botCorrect ? o.streak + 1 : 0,
      }));
      setTimeout(() => {
        if (roundPhaseRef.current === 'playing' && !doneRef.current) {
          setPlayerResult(false);
          updatePlayer(p => ({ ...p, errors: p.errors + 1, streak: 0 }));
          roundPhaseRef.current = 'result';
          setRoundPhase('result');
          setTimeout(() => { if (!doneRef.current) nextRound(); }, PVP_ROUND_RESULT_DELAY);
        }
      }, 700);
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
      score:   Math.max(0, p.score + pts),
      correct: p.correct + (correct ? 1 : 0),
      errors:  p.errors  + (correct ? 0 : 1),
      streak:  correct ? p.streak + 1 : 0,
    }));
    roundPhaseRef.current = 'result';
    setRoundPhase('result');
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    setTimeout(() => { if (!doneRef.current) nextRound(); }, PVP_ROUND_RESULT_DELAY);
  };

  const beginBattle = (mr: MatchmakingResult, leagueId: LeagueId) => {
    const p: PvpPlayer = { id: 'player', name: username, score: 0, correct: 0, errors: 0, streak: 0, isBot: false, level };
    const o: PvpPlayer = { id: 'opp', name: mr.opponentName, score: 0, correct: 0, errors: 0, streak: 0, isBot: mr.type === 'bot', level: mr.opponentLevel };
    playerRef.current  = p;
    opponentRef.current = o;
    matchRef.current   = mr;
    leagueRef.current  = leagueId;
    setPlayer(p);
    setOpponent(o);
    setPhase('countdown');
    let c = 3;
    setCountdown(c);
    const cd = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(cd);
        setPhase('battle');
        doneRef.current = false;
        let t = PVP_GAME_DURATION;
        setTimeLeft(t);
        timerRef.current = setInterval(() => { t--; setTimeLeft(t); if (t <= 0) finishBattle(); }, 1000);
        nextRound();
      }
    }, 1000);
  };

  const startSearch = (leagueId: LeagueId) => {
    if (isGuest) return;
    const arena = ARENAS.find(a => a.id === leagueId)!;
    if (coins < arena.stake) return;

    setSelectedArena(leagueId);
    setSearchSeconds(0);
    setCancelSearch(false);
    setPhase('matchmaking');

    let s = 0;
    searchTimerRef.current = setInterval(() => {
      s++;
      setSearchSeconds(s);
    }, 1000);

    startMatchmaking(level, elo, leagueId).then(mr => {
      clearTimers();
      if (cancelSearch) return;
      setMatchResult(mr);
      setPhase('found');
      setTimeout(() => beginBattle(mr, leagueId), 2000);
    });
  };

  const cancelMatchmaking = () => {
    setCancelSearch(true);
    clearTimers();
    setPhase('lobby');
    setSelectedArena(null);
  };

  const reset = () => {
    clearTimers();
    doneRef.current = false;
    setPhase('lobby');
    setSelectedArena(null);
    setMatchResult(null);
    setPlayer(null);
    setOpponent(null);
    setWinner(null);
    setShowWinAnim(false);
    setCoinsEarned(0);
    setXpEarned(0);
    setEloChange(0);
    playerRef.current  = null;
    opponentRef.current = null;
    matchRef.current   = null;
  };

  useEffect(() => () => clearTimers(), []);

  const levelInfo = (l: number) => getLevelTitle(l);
  const botLeft = DAILY_BOT_LIMIT - getDailyBotCount();

  // ── LOBBY ──────────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col max-w-md mx-auto px-4 py-5 pb-24" dir="rtl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/"><button className="p-2 rounded-full hover:bg-card active:scale-95 transition-transform"><ArrowLeft className="w-5 h-5" /></button></Link>
          <h1 className="text-2xl font-bold flex-1 flex items-center gap-2"><Swords className="w-6 h-6 text-primary" />معركة PvP</h1>
          <div className="text-sm text-muted-foreground">{pvpWins}ف / {pvpLosses}خ</div>
        </div>

        <GuestBanner message="المعارك الحية متاحة فقط للأعضاء المسجّلين." />

        {/* Player card */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-5 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-lg font-black text-primary">
            {username.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="font-bold">{username}</div>
            <div className="text-sm" style={{ color: levelInfo(level).color }}>Lv.{level} · {levelInfo(level).title}</div>
          </div>
          <div className="text-right">
            <div className="text-yellow-400 font-bold tabular-nums">{coins} 🪙</div>
            <div className="text-xs text-muted-foreground">ELO {elo}</div>
          </div>
        </div>

        {/* Bot limit info */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border mb-4 text-sm">
          <Bot className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">مباريات بوت اليوم:</span>
          <span className="font-bold" style={{ color: botLeft > 5 ? '#22c55e' : botLeft > 2 ? '#f59e0b' : '#ef4444' }}>
            {botLeft}/{DAILY_BOT_LIMIT}
          </span>
        </div>

        {/* Arenas */}
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">اختر الحلبة</p>
        <div className="space-y-3 mb-6">
          {ARENAS.map(a => {
            const canAfford = coins >= a.stake;
            return (
              <motion.button
                key={a.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => !isGuest && canAfford ? startSearch(a.id) : null}
                disabled={isGuest || !canAfford}
                className="w-full p-4 rounded-2xl border text-right transition-all disabled:opacity-40"
                style={{ borderColor: `${a.color}40`, backgroundColor: `${a.color}10` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-lg" style={{ color: a.color }}>{a.icon} حلبة {a.label}</div>
                    <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                      <span>رهان: <span className="text-yellow-400 font-bold">{a.stake} 🪙</span></span>
                      <span>·</span>
                      <span className="text-green-400 font-bold">فوز PvP: +{getPvpRewardCoins(a.stake, true, false, 'pvp')} 🪙</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      فوز بوت: +{getPvpRewardCoins(a.stake, true, false, 'bot')} 🪙
                    </div>
                  </div>
                  <Swords className="w-6 h-6 opacity-70" style={{ color: a.color }} />
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Scoring guide */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase mb-2">نظام النقاط</p>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>✅ إجابة صحيحة: <span className="text-green-400 font-bold">+10 نقطة + مكافأة سرعة</span></div>
            <div>❌ إجابة خاطئة: <span className="text-red-400 font-bold">-2 نقطة</span></div>
            <div>🔥 سلسلة ×3: <span className="text-orange-400 font-bold">+5 مكافأة</span></div>
            <div className="pt-1 border-t border-border mt-1">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> PvP: ELO كامل + مكافآت أعلى</span>
              <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> بوت: ELO جزئي + مكافآت أقل</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MATCHMAKING ─────────────────────────────────────────────────────────────
  if (phase === 'matchmaking') {
    const arena = ARENAS.find(a => a.id === selectedArena);
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5" dir="rtl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center space-y-8"
        >
          {/* Animated search ring */}
          <div className="relative mx-auto w-36 h-36">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border-2"
                style={{ borderColor: arena?.color ?? '#7c3aed' }}
                animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                transition={{ duration: 2, delay: i * 0.65, repeat: Infinity, ease: 'easeOut' }}
              />
            ))}
            <div className="absolute inset-0 rounded-full flex items-center justify-center text-4xl"
              style={{ background: `${arena?.color ?? '#7c3aed'}20`, border: `2px solid ${arena?.color ?? '#7c3aed'}40` }}>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ⚔️
              </motion.div>
            </div>
          </div>

          <div>
            <p className="text-2xl font-black text-white mb-2">جاري البحث عن منافس…</p>
            <p className="text-muted-foreground text-sm">حلبة {arena?.label} · {searchSeconds} ثانية</p>
          </div>

          {/* Loading dots */}
          <div className="flex justify-center gap-2">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-3 h-3 rounded-full"
                style={{ background: arena?.color ?? '#7c3aed' }}
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
              />
            ))}
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p className="flex items-center justify-center gap-1"><Users className="w-3.5 h-3.5" /> يبحث عن لاعب حقيقي أولاً</p>
            <p className="flex items-center justify-center gap-1"><Bot className="w-3.5 h-3.5" /> إذا لم يُوجد → بوت ذكي احتياطي</p>
          </div>

          <button
            onClick={cancelMatchmaking}
            className="w-full h-12 rounded-2xl border border-border text-muted-foreground font-medium active:scale-95 transition-transform text-sm"
          >
            إلغاء البحث
          </button>
        </motion.div>
      </div>
    );
  }

  // ── FOUND ───────────────────────────────────────────────────────────────────
  if ((phase === 'found' || phase === 'countdown') && matchResult) {
    const arena = ARENAS.find(a => a.id === selectedArena);
    const isReal = matchResult.type === 'pvp';
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm space-y-5 text-center"
        >
          {/* Match type badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
            style={{
              background: isReal ? 'rgba(34,197,94,0.15)' : 'rgba(124,58,237,0.15)',
              border: `1px solid ${isReal ? 'rgba(34,197,94,0.4)' : 'rgba(124,58,237,0.4)'}`,
              color: isReal ? '#22c55e' : '#a78bfa',
            }}
          >
            {isReal ? <><Users className="w-4 h-4" />لاعب حقيقي وُجد!</> : <><Bot className="w-4 h-4" />بوت ذكي {matchResult.difficulty ? `(${DIFF_LABEL[matchResult.difficulty].ar})` : ''}</>}
          </motion.div>

          {/* VS card */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 bg-card border border-primary/30 rounded-2xl p-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl font-black text-primary mx-auto mb-2">
                {username.slice(0, 2).toUpperCase()}
              </div>
              <div className="font-bold text-sm">{username}</div>
              <div className="text-xs text-muted-foreground">Lv.{level} · ELO {elo}</div>
            </div>

            <div className="flex flex-col items-center">
              <div className="text-3xl font-black text-muted-foreground">VS</div>
              {arena && <div className="text-xs mt-1" style={{ color: arena.color }}>{arena.icon}</div>}
            </div>

            <div className="flex-1 bg-card border border-red-500/30 rounded-2xl p-4">
              <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center text-2xl font-black text-red-400 mx-auto mb-2">
                {isReal ? <Users className="w-7 h-7" /> : <Bot className="w-7 h-7" />}
              </div>
              <div className="font-bold text-sm">{matchResult.opponentName}</div>
              <div className="text-xs text-muted-foreground">Lv.{matchResult.opponentLevel} · ELO {matchResult.opponentElo}</div>
            </div>
          </div>

          {phase === 'countdown' && (
            <motion.div
              key={countdown}
              initial={{ scale: 2.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-8xl font-black tabular-nums"
              style={{ color: 'hsl(var(--primary))' }}
            >
              {countdown > 0 ? countdown : '🚀'}
            </motion.div>
          )}

          {phase === 'found' && (
            <p className="text-muted-foreground text-sm animate-pulse">تحضير المباراة…</p>
          )}
        </motion.div>
      </div>
    );
  }

  // ── BATTLE ──────────────────────────────────────────────────────────────────
  if (phase === 'battle' && player && opponent && currentChallenge) {
    const c = currentChallenge;
    const isFeedback = roundPhase === 'result';
    const isReal = matchResult?.type === 'pvp';

    return (
      <div className="min-h-screen bg-background flex flex-col select-none"
        style={{
          background: isFeedback
            ? playerResult
              ? 'radial-gradient(circle at center,#22c55e18,hsl(var(--background)) 70%)'
              : 'radial-gradient(circle at center,#ef444418,hsl(var(--background)) 70%)'
            : 'hsl(var(--background))',
          transition: 'background 0.2s',
        }}
      >
        {/* HUD */}
        <div className="px-4 pt-4 pb-2 space-y-2">
          <div className="flex items-center gap-3">
            {/* Player */}
            <div className="flex-1 flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-xs font-black text-primary">
                {username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-xs text-muted-foreground truncate max-w-[70px]">{username}</div>
                <div className="text-xl font-black tabular-nums text-primary">{player.score}</div>
              </div>
            </div>

            {/* Timer */}
            <div className="flex flex-col items-center">
              <motion.div
                className="text-2xl font-black tabular-nums"
                style={{ color: timeLeft <= 10 ? '#ef4444' : 'inherit' }}
                animate={timeLeft <= 10 ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.5, repeat: timeLeft <= 10 ? Infinity : 0 }}
              >
                {timeLeft}
              </motion.div>
              <div className="text-xs text-muted-foreground">ثانية</div>
            </div>

            {/* Opponent */}
            <div className="flex-1 flex items-center gap-2 justify-end">
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  {isReal ? <Users className="w-3 h-3 text-green-400" /> : <Bot className="w-3 h-3 text-purple-400" />}
                  <div className="text-xs text-muted-foreground truncate max-w-[65px]">{opponent.name}</div>
                </div>
                <div className="text-xl font-black tabular-nums text-red-400">{opponent.score}</div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center text-xs font-black text-red-400">
                {isReal ? <Users className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {/* Score bars */}
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

        {/* Answer feedback */}
        <div className="flex justify-between px-4 mb-2 text-xs font-bold">
          <div className={playerResult === null ? 'text-muted-foreground' : playerResult ? 'text-green-400' : 'text-red-400'}>
            {playerResult === null ? '...' : playerResult ? '✓ +نقاط' : '✗ -2'}
            {player.streak >= 3 && <span className="text-orange-400 ml-1">🔥×{player.streak}</span>}
          </div>
          <div className={botResult === null ? 'text-muted-foreground' : botResult ? 'text-red-300' : 'text-green-300'}>
            {botResult === null ? '...' : botResult ? '✓ +نقاط' : '✗'}
          </div>
        </div>

        {/* Challenge */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-6 gap-6">
          {c.type !== 'memory' && (
            <>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {c.type === 'reaction' ? 'انقر هذا اللون' : 'طابق اللون'}
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
            <div className="text-center text-muted-foreground">
              <div className="text-5xl mb-3">🧠</div>
              <p className="font-bold">تحدي الذاكرة</p>
              <p className="text-xs mt-1">البوت يعالج هذا تلقائياً</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── FINISHED ────────────────────────────────────────────────────────────────
  if (phase === 'finished' && player && opponent) {
    const won  = winner === 'player';
    const draw = winner === 'draw';
    const isReal = matchResult?.type === 'pvp';

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5 text-center" dir="rtl">
        <WinAnimation show={showWinAnim && won} label="انتصرت!" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm space-y-4"
        >
          <div className="text-6xl">{won ? '🏆' : draw ? '🤝' : '💀'}</div>
          <div className="text-4xl font-black" style={{ color: won ? '#FFD700' : draw ? '#A8A9AD' : '#ef4444' }}>
            {won ? 'فوز!' : draw ? 'تعادل' : 'هزيمة'}
          </div>

          {/* Match type label */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
            style={{
              background: isReal ? 'rgba(34,197,94,0.15)' : 'rgba(124,58,237,0.15)',
              color: isReal ? '#22c55e' : '#a78bfa',
            }}>
            {isReal ? <><Users className="w-3 h-3" />مباراة PvP حقيقية</> : <><Bot className="w-3 h-3" />مباراة ضد بوت</>}
          </div>

          {/* Scores */}
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

          {/* Rewards */}
          <div className="space-y-2">
            {coinsEarned > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-3 flex items-center justify-center gap-2">
                <span className="text-2xl">🪙</span>
                <span className="text-xl font-black text-yellow-400">+{coinsEarned} عملة</span>
              </div>
            )}
            <div className="flex gap-2">
              <div className="flex-1 bg-card border border-border rounded-xl p-2.5 text-center">
                <div className="text-xs text-muted-foreground">XP</div>
                <div className="font-bold text-primary">+{xpEarned}</div>
              </div>
              <div className="flex-1 bg-card border border-border rounded-xl p-2.5 text-center">
                <div className="text-xs text-muted-foreground">ELO</div>
                <div className={`font-bold ${eloChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {eloChange >= 0 ? '+' : ''}{eloChange}
                </div>
              </div>
            </div>
            {!isReal && (
              <p className="text-xs text-muted-foreground text-center">
                مكافآت مباريات البوت مخفضة للحفاظ على التوازن الاقتصادي
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              onClick={reset}
              className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-lg active:scale-95 transition-transform"
            >
              ألعب مجدداً
            </button>
            <Link href="/"><button className="w-full h-12 rounded-2xl border border-border text-muted-foreground font-medium active:scale-95 transition-transform">
              الرئيسية
            </button></Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
