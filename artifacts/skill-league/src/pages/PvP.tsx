import { useState, useEffect, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Swords, Bot, Users, Zap, Shield, Clock, Wifi, WifiOff } from 'lucide-react';
import { Link } from 'wouter';
import { usePvpSocket } from '@/hooks/usePvpSocket';
import { useRealtime } from '@/contexts/RealtimeContext';
import {
  MatchType, BotDifficulty,
  getDailyBotCount, DAILY_BOT_LIMIT,
  getPvpRewardCoins, getPvpRewardXp, getEloChange,
} from '@/lib/matchmaking';
import { LEAGUES, LeagueId } from '@/lib/game-engine';
import { getLevelTitle } from '@/lib/xp';
import WinAnimation from '@/components/WinAnimation';
import GuestBanner from '@/components/GuestBanner';

const ARENAS: { id: LeagueId; label: string; icon: string; color: string; stake: number }[] = [
  { id: 'bronze', label: 'برونز',  icon: '🥉', color: '#CD7F32', stake: 30  },
  { id: 'silver', label: 'فضة',    icon: '🥈', color: '#A8A9AD', stake: 75  },
  { id: 'elite',  label: 'نخبة',   icon: '🥇', color: '#FFD700', stake: 150 },
];

const DIFF_LABEL: Record<string, { ar: string; color: string }> = {
  easy:   { ar: 'سهل',   color: '#22c55e' },
  medium: { ar: 'متوسط', color: '#f59e0b' },
  hard:   { ar: 'صعب',   color: '#ef4444' },
};

export default function PvP() {
  const { username, coins, level, elo, pvpWins, pvpLosses, recordPvpResult, isGuest } = useGame();
  const { connected } = useRealtime();

  const [selectedArena, setSelectedArena] = useState<LeagueId | null>(null);
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [showWinAnim, setShowWinAnim] = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [eloChange, setEloChange] = useState(0);

  const { state, joinQueue, cancelQueue, sendAnswer, forfeit, reset } = usePvpSocket({
    playerId: username,
    playerName: username,
    playerLevel: level,
    playerElo: elo,
  });

  const { phase, matchInfo, currentChallenge, scoreA, scoreB, streakA, streakB,
          roundNumber, lastResult, matchEnd, countdownSec, anticheatWarning } = state;

  useEffect(() => {
    if (phase !== 'searching') { setSearchSeconds(0); return; }
    const t = setInterval(() => setSearchSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') { setTimeLeft(60); return; }
    setTimeLeft(60);
    const t = setInterval(() => setTimeLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (!matchEnd) return;
    const stake = ARENAS.find(a => a.id === matchEnd.leagueId)?.stake ?? 30;
    const mt: MatchType = matchEnd.isBot ? 'bot' : 'pvp';
    const coins = getPvpRewardCoins(stake, matchEnd.won, matchEnd.draw, mt);
    const xp    = getPvpRewardXp(matchEnd.won, matchEnd.draw, mt);
    const eloChg = getEloChange(matchEnd.won, matchEnd.draw, elo * 100 + 800, elo, mt);
    setCoinsEarned(coins);
    setXpEarned(xp);
    setEloChange(eloChg);
    if (matchEnd.won) setTimeout(() => setShowWinAnim(true), 300);
    recordPvpResult(matchEnd.won, matchEnd.scoreB / 10, coins, eloChg, xp);
  }, [matchEnd]);

  const handleTap = (colorId: string) => {
    if (phase !== 'playing') return;
    sendAnswer(colorId);
  };

  const handleReset = () => {
    reset();
    setSelectedArena(null);
    setShowWinAnim(false);
    setCoinsEarned(0);
    setXpEarned(0);
    setEloChange(0);
  };

  const levelInfo = (l: number) => getLevelTitle(l);
  const botLeft = DAILY_BOT_LIMIT - getDailyBotCount();

  // ── LOBBY ──────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col max-w-md mx-auto px-4 py-5 pb-24" dir="rtl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/"><button className="p-2 rounded-full hover:bg-card active:scale-95 transition-transform"><ArrowLeft className="w-5 h-5" /></button></Link>
          <h1 className="text-2xl font-bold flex-1 flex items-center gap-2"><Swords className="w-6 h-6 text-primary" />معركة PvP</h1>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {connected ? 'متصل' : 'منقطع'}
            </div>
            <div className="text-sm text-muted-foreground">{pvpWins}ف / {pvpLosses}خ</div>
          </div>
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
          <span className="ml-auto text-xs text-muted-foreground">البحث: حقيقي أولاً → بوت احتياطي</span>
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
                onClick={() => !isGuest && canAfford && connected ? joinQueue(a.id, a.stake) : null}
                disabled={isGuest || !canAfford || !connected}
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

  // ── SEARCHING ──────────────────────────────────────────────────────────────
  if (phase === 'searching') {
    const arena = ARENAS.find(a => a.id === selectedArena) ?? ARENAS[0];
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5" dir="rtl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center space-y-8">
          <div className="relative mx-auto w-36 h-36">
            {[0, 1, 2].map(i => (
              <motion.div key={i} className="absolute inset-0 rounded-full border-2"
                style={{ borderColor: arena.color }}
                animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                transition={{ duration: 2, delay: i * 0.65, repeat: Infinity, ease: 'easeOut' }}
              />
            ))}
            <div className="absolute inset-0 rounded-full flex items-center justify-center text-4xl"
              style={{ background: `${arena.color}20`, border: `2px solid ${arena.color}40` }}>
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>⚔️</motion.div>
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-white mb-2">جاري البحث عن منافس…</p>
            <p className="text-muted-foreground text-sm">البحث أولاً عن لاعب حقيقي · {searchSeconds} ثانية</p>
          </div>
          <div className="flex justify-center gap-2">
            {[0,1,2].map(i => (
              <motion.div key={i} className="w-3 h-3 rounded-full" style={{ background: arena.color }}
                animate={{ y: [0, -10, 0] }} transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }} />
            ))}
          </div>
          <button onClick={cancelQueue} className="w-full h-12 rounded-2xl border border-border text-muted-foreground font-medium active:scale-95 transition-transform text-sm">
            إلغاء البحث
          </button>
        </motion.div>
      </div>
    );
  }

  // ── FOUND / COUNTDOWN ─────────────────────────────────────────────────────
  if ((phase === 'found' || phase === 'countdown') && matchInfo) {
    const isReal = !matchInfo.isBot;
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5" dir="rtl">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm space-y-5 text-center">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
            style={{
              background: isReal ? 'rgba(34,197,94,0.15)' : 'rgba(124,58,237,0.15)',
              border: `1px solid ${isReal ? 'rgba(34,197,94,0.4)' : 'rgba(124,58,237,0.4)'}`,
              color: isReal ? '#22c55e' : '#a78bfa',
            }}
          >
            {isReal
              ? <><Users className="w-4 h-4" />لاعب حقيقي وُجد!</>
              : <><Bot className="w-4 h-4" />بوت ذكي {matchInfo.botDifficulty ? `(${DIFF_LABEL[matchInfo.botDifficulty]?.ar})` : ''}</>
            }
          </motion.div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 bg-card border border-primary/30 rounded-2xl p-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl font-black text-primary mx-auto mb-2">
                {matchInfo.playerA.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="font-bold text-sm">{matchInfo.playerA.name}</div>
              <div className="text-xs text-muted-foreground">Lv.{matchInfo.playerA.level} · ELO {matchInfo.playerA.elo}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-black text-muted-foreground">VS</div>
            </div>
            <div className="flex-1 bg-card border border-red-500/30 rounded-2xl p-4">
              <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center text-2xl font-black text-red-400 mx-auto mb-2">
                {isReal ? <Users className="w-7 h-7" /> : <Bot className="w-7 h-7" />}
              </div>
              <div className="font-bold text-sm">{matchInfo.playerB.name}</div>
              <div className="text-xs text-muted-foreground">Lv.{matchInfo.playerB.level} · ELO {matchInfo.playerB.elo}</div>
            </div>
          </div>

          {phase === 'countdown' && (
            <motion.div key={countdownSec} initial={{ scale: 2.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-8xl font-black tabular-nums" style={{ color: 'hsl(var(--primary))' }}>
              {countdownSec > 0 ? countdownSec : '🚀'}
            </motion.div>
          )}
          {phase === 'found' && <p className="text-muted-foreground text-sm animate-pulse">تحضير المباراة…</p>}
        </motion.div>
      </div>
    );
  }

  // ── BATTLE ────────────────────────────────────────────────────────────────
  if (phase === 'playing' && currentChallenge && matchInfo) {
    const isFeedback = lastResult !== null;
    return (
      <div className="min-h-screen bg-background flex flex-col select-none"
        style={{
          background: isFeedback
            ? lastResult === 'correct'
              ? 'radial-gradient(circle at center,#22c55e18,hsl(var(--background)) 70%)'
              : 'radial-gradient(circle at center,#ef444418,hsl(var(--background)) 70%)'
            : 'hsl(var(--background))',
          transition: 'background 0.2s',
        }}>
        {/* Anti-cheat warning */}
        <AnimatePresence>
          {anticheatWarning && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold z-50">
              ⚠️ سرعة غير طبيعية!
            </motion.div>
          )}
        </AnimatePresence>

        {/* HUD */}
        <div className="px-4 pt-4 pb-2 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-xs font-black text-primary">
                {matchInfo.playerA.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-xs text-muted-foreground truncate max-w-[70px]">{matchInfo.playerA.name}</div>
                <div className="text-xl font-black tabular-nums text-primary">{scoreA}</div>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <motion.div className="text-2xl font-black tabular-nums"
                style={{ color: timeLeft <= 10 ? '#ef4444' : 'inherit' }}
                animate={timeLeft <= 10 ? { scale: [1, 1.15, 1] } : {}}>
                {timeLeft}
              </motion.div>
              <div className="text-xs text-muted-foreground">R{roundNumber}</div>
            </div>
            <div className="flex-1 flex items-center gap-2 justify-end">
              <div className="text-right">
                <div className="text-xs text-muted-foreground truncate max-w-[70px] text-right">{matchInfo.playerB.name}</div>
                <div className="text-xl font-black tabular-nums text-red-400 text-right">{scoreB}</div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center text-xs font-black text-red-400">
                {matchInfo.isBot ? '🤖' : matchInfo.playerB.name.slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Streak bars */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex gap-1">
              {[...Array(Math.min(5, streakA))].map((_, i) => (
                <div key={i} className="h-1.5 flex-1 rounded-full bg-orange-400" />
              ))}
              {[...Array(Math.max(0, 5 - streakA))].map((_, i) => (
                <div key={i} className="h-1.5 flex-1 rounded-full bg-border" />
              ))}
            </div>
            <div className="w-6" />
            <div className="flex-1 flex gap-1 flex-row-reverse">
              {[...Array(Math.min(5, streakB))].map((_, i) => (
                <div key={i} className="h-1.5 flex-1 rounded-full bg-red-400" />
              ))}
              {[...Array(Math.max(0, 5 - streakB))].map((_, i) => (
                <div key={i} className="h-1.5 flex-1 rounded-full bg-border" />
              ))}
            </div>
          </div>
        </div>

        {/* Challenge */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
          <motion.div key={currentChallenge.id}
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4">
            <div className="text-2xl font-bold"
              style={{ color: currentChallenge.type === 'stroop' ? currentChallenge.displayColor.hex : currentChallenge.target.hex }}>
              {currentChallenge.displayColor.name}
            </div>
            <div className="text-base text-muted-foreground">{currentChallenge.question}</div>
          </motion.div>

          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            {currentChallenge.options.map((color) => (
              <motion.button
                key={color.id}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleTap(color.id)}
                className="h-20 rounded-2xl font-bold text-white text-lg active:brightness-75"
                style={{ backgroundColor: color.hex }}
                disabled={lastResult !== null}
              >
                {color.name}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {lastResult && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`text-9xl ${lastResult === 'correct' ? '' : 'grayscale'}`}>
                {lastResult === 'correct' ? '✅' : '❌'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Forfeit */}
        <div className="px-4 pb-6">
          <button onClick={forfeit} className="text-xs text-muted-foreground underline">استسلام</button>
        </div>
      </div>
    );
  }

  // ── FINISHED ──────────────────────────────────────────────────────────────
  if (phase === 'finished' && matchEnd) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5 pb-24" dir="rtl">
        {showWinAnim && <WinAnimation />}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm space-y-5 text-center">
          <div className="text-6xl">{matchEnd.won ? '🏆' : matchEnd.draw ? '🤝' : '💀'}</div>
          <div className="text-3xl font-black">
            {matchEnd.won ? 'فزت!' : matchEnd.draw ? 'تعادل!' : 'خسرت!'}
          </div>

          {/* Score */}
          <div className="flex items-center justify-center gap-6 bg-card border border-border rounded-2xl p-4">
            <div className="text-center">
              <div className="text-3xl font-black text-primary">{matchEnd.scoreA}</div>
              <div className="text-xs text-muted-foreground">{matchInfo?.playerA.name}</div>
            </div>
            <div className="text-2xl font-black text-muted-foreground">vs</div>
            <div className="text-center">
              <div className="text-3xl font-black text-red-400">{matchEnd.scoreB}</div>
              <div className="text-xs text-muted-foreground">{matchInfo?.playerB.name}</div>
            </div>
          </div>

          {/* Rewards */}
          <div className="grid grid-cols-3 gap-3">
            {coinsEarned > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                <div className="text-yellow-400 font-black text-xl">+{coinsEarned}</div>
                <div className="text-xs text-muted-foreground">عملات</div>
              </div>
            )}
            {xpEarned > 0 && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3">
                <div className="text-purple-400 font-black text-xl">+{xpEarned}</div>
                <div className="text-xs text-muted-foreground">XP</div>
              </div>
            )}
            <div className={`rounded-xl p-3 ${eloChange >= 0 ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              <div className={`font-black text-xl ${eloChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {eloChange >= 0 ? '+' : ''}{eloChange}
              </div>
              <div className="text-xs text-muted-foreground">ELO</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleReset} className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-bold active:scale-95 transition-transform">
              مباراة جديدة
            </button>
            <Link href="/" className="flex-1">
              <button className="w-full h-12 rounded-2xl border border-border font-medium text-sm active:scale-95 transition-transform">
                الرئيسية
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
      <div className="text-center space-y-4">
        <div className="text-4xl animate-spin">⚙️</div>
        <p className="text-muted-foreground">جاري التحميل…</p>
      </div>
    </div>
  );
}
