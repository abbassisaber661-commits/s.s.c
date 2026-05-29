import { useState, useRef, useEffect } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link } from "wouter";
import { ChevronLeft, Gift, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { playTap, playCoin } from "@/lib/sounds";
import { isRTL } from "@/lib/i18n";
import { loadStreakData } from "@/lib/login-streak";

const SPIN_SEGMENTS = [
  { label: '50 🪙',  value: 50,   type: 'coins', color: '#fbbf24', weight: 30 },
  { label: '+100 XP', value: 100,  type: 'xp',    color: '#a78bfa', weight: 25 },
  { label: '100 🪙', value: 100,  type: 'coins', color: '#f59e0b', weight: 20 },
  { label: '+200 XP', value: 200,  type: 'xp',    color: '#8b5cf6', weight: 15 },
  { label: '250 🪙', value: 250,  type: 'coins', color: '#06b6d4', weight: 6  },
  { label: '500 🪙', value: 500,  type: 'coins', color: '#10b981', weight: 3  },
  { label: '🎁 Box', value: 1,    type: 'box',   color: '#f97316', weight: 1  },
];

const SPIN_KEY = 'skill_league_spin_ts';
const SURPRISE_KEY = 'skill_league_surprise_ts';

function canSpinToday() {
  const ts = localStorage.getItem(SPIN_KEY);
  if (!ts) return true;
  return new Date().toDateString() !== new Date(parseInt(ts)).toDateString();
}
function markSpun() { localStorage.setItem(SPIN_KEY, String(Date.now())); }

function canSurpriseToday() {
  const ts = localStorage.getItem(SURPRISE_KEY);
  if (!ts) return true;
  return new Date().toDateString() !== new Date(parseInt(ts)).toDateString();
}
function markSurprise() { localStorage.setItem(SURPRISE_KEY, String(Date.now())); }

const WEEK_REWARDS = [
  { day: 1, icon: '🪙', coins: 50,   xp: 0   },
  { day: 2, icon: '⚡', coins: 0,    xp: 100  },
  { day: 3, icon: '💎', coins: 100,  xp: 100  },
  { day: 4, icon: '🌟', coins: 150,  xp: 0   },
  { day: 5, icon: '🎁', coins: 200,  xp: 200  },
  { day: 6, icon: '🏆', coins: 300,  xp: 0   },
  { day: 7, icon: '👑', coins: 500,  xp: 500  },
];

export default function DailyRewards() {
  const { language, coins, addCoins } = useGame();
  const rtl = isRTL(language);

  const streak = loadStreakData();
  const currentDay = ((streak.currentStreak - 1) % 7) + 1;

  const [spinAvail, setSpinAvail]     = useState(canSpinToday());
  const [surpriseAvail, setSurpriseAvail] = useState(canSurpriseToday());
  const [spinning, setSpinning]       = useState(false);
  const [spinResult, setSpinResult]   = useState<typeof SPIN_SEGMENTS[0] | null>(null);
  const [rotation, setRotation]       = useState(0);
  const [openingSurprise, setOpeningSurprise] = useState(false);
  const [surpriseResult, setSurpriseResult]   = useState<{ icon: string; label: string; coins: number; xp: number } | null>(null);
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function weightedPick() {
    const total = SPIN_SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
    let rand = Math.random() * total;
    for (const seg of SPIN_SEGMENTS) {
      rand -= seg.weight;
      if (rand <= 0) return seg;
    }
    return SPIN_SEGMENTS[0];
  }

  function handleSpin() {
    if (!spinAvail || spinning) return;
    playTap();
    setSpinning(true);
    setSpinResult(null);

    const winner = weightedPick();
    const winnerIdx = SPIN_SEGMENTS.indexOf(winner);
    const segDeg = 360 / SPIN_SEGMENTS.length;
    const targetAngle = 360 - (winnerIdx * segDeg + segDeg / 2);
    const spins = 5 * 360;
    const finalRotation = rotation + spins + (targetAngle - (rotation % 360));

    setRotation(finalRotation);

    setTimeout(() => {
      setSpinResult(winner);
      setSpinning(false);
      markSpun();
      setSpinAvail(false);
      if (winner.type === 'coins') {
        addCoins(winner.value);
        playCoin();
      }
      showToast(`🎉 ${language === 'ar' ? 'فزت بـ' : 'You won'} ${winner.label}!`, true);
    }, 3500);
  }

  const SURPRISE_PRIZES = [
    { icon: '🪙', label: '75 Coins',  coins: 75,  xp: 0   },
    { icon: '⚡', label: '+150 XP',   coins: 0,   xp: 150 },
    { icon: '💎', label: '200 Coins', coins: 200, xp: 0   },
    { icon: '🌟', label: '+300 XP',   coins: 0,   xp: 300 },
    { icon: '🎁', label: '125 Coins + 100 XP', coins: 125, xp: 100 },
  ];

  function handleSurprise() {
    if (!surpriseAvail || openingSurprise) return;
    playTap();
    setOpeningSurprise(true);
    setTimeout(() => {
      const prize = SURPRISE_PRIZES[Math.floor(Math.random() * SURPRISE_PRIZES.length)];
      setSurpriseResult(prize);
      if (prize.coins > 0) addCoins(prize.coins);
      markSurprise();
      setSurpriseAvail(false);
      setOpeningSurprise(false);
      playCoin();
    }, 1200);
  }

  const segDeg = 360 / SPIN_SEGMENTS.length;

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="min-h-screen bg-background text-foreground pb-24">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/60 px-4 py-3 flex items-center gap-3">
        <Link href="/"><button className="p-2 rounded-xl hover:bg-card active:scale-95 transition-all" onClick={playTap}><ChevronLeft className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} /></button></Link>
        <h1 className="text-lg font-black flex-1">🎁 {language === 'ar' ? 'المكافآت اليومية' : 'Daily Rewards'}</h1>
        <div className="text-sm font-black text-orange-400">🔥 {streak.currentStreak}</div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-5">

        {/* Weekly streak calendar */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-bold mb-3">
            🔥 {language === 'ar' ? `سلسلة ${streak.currentStreak} يوم` : `${streak.currentStreak}-Day Streak`}
          </p>
          <div className="grid grid-cols-7 gap-1">
            {WEEK_REWARDS.map(r => {
              const isCurrent = r.day === currentDay;
              const isDone    = r.day < currentDay;
              return (
                <div key={r.day}
                  className={`rounded-xl p-2 text-center transition-all ${
                    isCurrent ? 'border-2 border-primary bg-primary/10 scale-105' :
                    isDone    ? 'bg-green-500/10 border border-green-500/30 opacity-60' :
                                'bg-card border border-border opacity-40'
                  }`}>
                  <div className="text-lg">{r.icon}</div>
                  <div className="text-[8px] text-muted-foreground font-bold">
                    {language === 'ar' ? `ي${r.day}` : `D${r.day}`}
                  </div>
                  {r.coins > 0 && <div className="text-[8px] text-yellow-400 font-black">+{r.coins}</div>}
                  {r.xp > 0   && <div className="text-[8px] text-purple-400 font-black">+{r.xp}xp</div>}
                  {isDone && <div className="text-[8px] text-green-400">✓</div>}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Spin Wheel */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-yellow-400" />
            <p className="text-sm font-bold">{language === 'ar' ? 'عجلة الحظ' : 'Spin Wheel'}</p>
            {!spinAvail && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-bold ml-auto">
              {language === 'ar' ? 'تعود غداً' : 'Tomorrow'}
            </span>}
          </div>

          {/* Wheel */}
          <div className="relative flex items-center justify-center">
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
              <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[16px] border-l-transparent border-r-transparent border-t-primary" />
            </div>

            <motion.div
              style={{ rotate: rotation }}
              animate={{ rotate: rotation }}
              transition={{ duration: 3.5, ease: [0.2, 0, 0, 1] }}
              className="w-52 h-52 rounded-full relative overflow-hidden border-4 border-border shadow-xl"
            >
              {SPIN_SEGMENTS.map((seg, i) => {
                const angle = i * segDeg;
                return (
                  <div key={i}
                    style={{
                      position: 'absolute',
                      width: '50%',
                      height: '50%',
                      top: '50%',
                      left: '50%',
                      transformOrigin: '0 0',
                      transform: `rotate(${angle}deg) skewY(${90 - segDeg}deg)`,
                      background: seg.color + 'cc',
                      borderRight: '2px solid rgba(0,0,0,0.2)',
                    }}
                  />
                );
              })}
              {/* Labels */}
              {SPIN_SEGMENTS.map((seg, i) => {
                const angle = i * segDeg + segDeg / 2;
                const rad = (angle - 90) * (Math.PI / 180);
                const x = 50 + 34 * Math.cos(rad);
                const y = 50 + 34 * Math.sin(rad);
                return (
                  <div key={i} style={{
                    position: 'absolute',
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                    fontSize: '9px',
                    fontWeight: 800,
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                  }}>
                    {seg.label}
                  </div>
                );
              })}
              {/* Center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-background/90 border-2 border-border flex items-center justify-center text-sm font-black">⭐</div>
              </div>
            </motion.div>
          </div>

          {spinResult && (
            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
              className="mt-3 p-3 rounded-xl text-center font-bold text-sm"
              style={{ background: spinResult.color + '20', color: spinResult.color }}>
              🎉 {language === 'ar' ? `فزت بـ ${spinResult.label}!` : `You won ${spinResult.label}!`}
            </motion.div>
          )}

          <Button onClick={handleSpin} disabled={!spinAvail || spinning} className="w-full mt-4 font-bold">
            {spinning ? (language === 'ar' ? '🌀 تدور...' : '🌀 Spinning...') :
             !spinAvail ? (language === 'ar' ? '🔒 غداً' : '🔒 Come back tomorrow') :
             (language === 'ar' ? '🎰 أدِر العجلة' : '🎰 Spin the Wheel')}
          </Button>
        </motion.div>

        {/* Surprise Box */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-4 h-4 text-pink-400" />
            <p className="text-sm font-bold">{language === 'ar' ? 'صندوق المفاجأة' : 'Surprise Box'}</p>
            {!surpriseAvail && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-bold ml-auto">
              {language === 'ar' ? 'تعود غداً' : 'Tomorrow'}
            </span>}
          </div>

          <div className="flex items-center justify-center">
            <motion.div
              animate={openingSurprise ? { rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 0.9, 1.1, 1] } : {}}
              transition={{ duration: 1.2, repeat: openingSurprise ? Infinity : 0 }}
              className="text-7xl cursor-pointer" onClick={surpriseAvail ? handleSurprise : undefined}>
              {surpriseResult ? surpriseResult.icon : openingSurprise ? '✨' : '🎁'}
            </motion.div>
          </div>

          {surpriseResult && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 rounded-xl text-center font-bold text-sm bg-pink-500/10 text-pink-400">
              🎉 {surpriseResult.label}
              {surpriseResult.coins > 0 && ` +${surpriseResult.coins} 🪙`}
              {surpriseResult.xp > 0 && ` +${surpriseResult.xp} XP`}
            </motion.div>
          )}

          <Button onClick={handleSurprise} disabled={!surpriseAvail || openingSurprise}
            className="w-full mt-4 font-bold bg-pink-500 hover:bg-pink-600 text-white">
            {openingSurprise ? (language === 'ar' ? '✨ تفتح...' : '✨ Opening...') :
             !surpriseAvail ? (language === 'ar' ? '🔒 غداً' : '🔒 Come back tomorrow') :
             (language === 'ar' ? '🎁 افتح المفاجأة' : '🎁 Open Surprise')}
          </Button>
        </motion.div>

        {/* Weekend bonus */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-yellow-400" />
            <div>
              <div className="font-bold text-sm">{language === 'ar' ? '⚡ مكافأة نهاية الأسبوع' : '⚡ Weekend Bonus'}</div>
              <div className="text-xs text-muted-foreground">{language === 'ar' ? 'مكافآت مضاعفة كل سبت وأحد!' : 'Double rewards every Saturday & Sunday!'}</div>
            </div>
            <div className="ml-auto text-xs font-bold text-yellow-400 text-right">
              <div>x2</div>
              <div>{language === 'ar' ? 'مكافآت' : 'Rewards'}</div>
            </div>
          </div>
        </motion.div>

      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 48 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-bold shadow-xl z-50 border ${
              toast.ok ? 'bg-green-500/15 border-green-500/40 text-green-400' : 'bg-red-500/15 border-red-500/40 text-red-400'
            }`}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
