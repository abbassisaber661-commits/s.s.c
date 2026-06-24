/**
 * DailyRewards.tsx  →  Unified Daily Tasks Page
 * ─────────────────────────────────────────────
 * Shows 4 daily tasks with real-time progress and explicit Claim buttons.
 * Tasks reset every UTC day. No random rewards — Coins only.
 *
 *  1. Daily Login         →  5 🪙
 *  2. Social Activity     → 10 🪙  (5 likes given + 5 comments given)
 *  3. Create Content      → 10 🪙  (1 post + 1 story)
 *  4. Play Match          → 10 🪙  (1 completed match)
 */

import { useState, useEffect, useCallback } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link } from "wouter";
import { ChevronLeft, CheckCircle2, Lock, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { playTap, playCorrect } from "@/lib/sounds";
import { isRTL } from "@/lib/i18n";
import { api, getStoredPlayerId } from "@/lib/apiClient";

// ── Types ──────────────────────────────────────────────────────────────────

interface DailyStatus {
  date: string;
  loginClaimed: boolean;
  likesGiven: number;
  commentsGiven: number;
  socialRewardClaimed: boolean;
  socialComplete: boolean;
  postsCount: number;
  storiesCount: number;
  contentRewardClaimed: boolean;
  contentComplete: boolean;
  matchPlayed: boolean;
  matchPlayedClaimed: boolean;
}

type ClaimTask = 'login' | 'social' | 'content' | 'match';

// ── Progress Bar ───────────────────────────────────────────────────────────

function ProgressBar({ value, max, color = '#3b82f6' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

// ── Task Card ──────────────────────────────────────────────────────────────

interface TaskCardProps {
  icon: string;
  title: string;
  coins: number;
  complete: boolean;
  claimed: boolean;
  rows: { label: string; value: number; max: number; done: boolean }[];
  onClaim: () => void;
  claiming: boolean;
  rtl: boolean;
  ar: boolean;
  delay?: number;
}

function TaskCard({
  icon, title, coins, complete, claimed, rows, onClaim, claiming, rtl, ar, delay = 0
}: TaskCardProps) {
  const txt = {
    claim:    ar ? `استلم ${coins} 🪙` : `Claim ${coins} 🪙`,
    claimed:  ar ? '✓ تم الاستلام'  : '✓ Claimed',
    coins_label: ar ? 'كوينز' : 'Coins',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`rounded-2xl border p-4 space-y-3 transition-all ${
        claimed
          ? 'border-green-500/40 bg-green-500/5'
          : complete
            ? 'border-primary/60 bg-primary/5'
            : 'border-border bg-card'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <div>
            <p className="text-sm font-bold leading-tight">{title}</p>
            <p className="text-xs text-yellow-400 font-black">+{coins} 🪙</p>
          </div>
        </div>
        {claimed && <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />}
        {!claimed && !complete && <Lock className="w-4 h-4 text-muted-foreground shrink-0" />}
      </div>

      {/* Progress rows */}
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className={`text-muted-foreground ${row.done ? 'line-through opacity-50' : ''}`}>
                {row.label}
              </span>
              <span className={`font-bold tabular-nums ${row.done ? 'text-green-400' : 'text-foreground'}`}>
                {row.done ? '✓' : `${row.value}/${row.max}`}
              </span>
            </div>
            {!row.done && <ProgressBar value={row.value} max={row.max} color={complete ? '#22c55e' : '#3b82f6'} />}
          </div>
        ))}
      </div>

      {/* Claim button */}
      {!claimed && (
        <button
          disabled={!complete || claiming}
          onClick={() => { playTap(); onClaim(); }}
          className={`w-full py-2 rounded-xl text-sm font-black transition-all active:scale-95 flex items-center justify-center gap-2 ${
            complete
              ? 'bg-primary text-primary-foreground hover:opacity-90'
              : 'bg-white/5 text-muted-foreground cursor-not-allowed'
          }`}
        >
          {claiming
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : complete
              ? txt.claim
              : (ar ? 'أكمل المهمة أولاً' : 'Complete task first')}
        </button>
      )}
      {claimed && (
        <div className="w-full py-2 rounded-xl text-sm font-black text-center text-green-400 bg-green-500/10">
          {txt.claimed}
        </div>
      )}
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function DailyRewards() {
  const { language } = useGame();
  const rtl = isRTL(language);
  const ar  = language === 'ar';
  const playerId = getStoredPlayerId();

  const [status, setStatus]       = useState<DailyStatus | null>(null);
  const [loading, setLoading]     = useState(true);
  const [claiming, setClaiming]   = useState<ClaimTask | null>(null);
  const [toast, setToast]         = useState<{ msg: string; coins?: number } | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!playerId) { setLoading(false); return; }
    try {
      const data = await api.daily.status(playerId);
      setStatus(data as unknown as DailyStatus);
    } catch {
      // silent — show cached state
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleClaim = async (task: ClaimTask) => {
    if (!playerId || claiming) return;
    setClaiming(task);
    try {
      const result = await api.daily.claim(playerId, task);
      if (result.awarded) {
        playCorrect();
        setToast({ msg: ar ? `+${result.coins} كوينز!` : `+${result.coins} Coins!`, coins: result.coins });
        setTimeout(() => setToast(null), 3000);
      }
      await fetchStatus();
    } catch {
      // silent
    } finally {
      setClaiming(null);
    }
  };

  if (!playerId) {
    return (
      <div dir={rtl ? 'rtl' : 'ltr'} className="min-h-screen bg-background flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-4xl mb-4">🔐</p>
          <p className="text-muted-foreground text-sm">
            {ar ? 'يرجى تسجيل الدخول لرؤية مهامك اليومية' : 'Please log in to see your daily tasks'}
          </p>
          <Link href="/">
            <button className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
              {ar ? 'تسجيل الدخول' : 'Log In'}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const s = status;

  const tasks: TaskCardProps[] = s ? [
    {
      icon: '🔑',
      title: ar ? 'تسجيل الدخول اليومي' : 'Daily Login',
      coins: 5,
      complete: true,
      claimed: s.loginClaimed,
      rows: [{ label: ar ? 'افتح التطبيق مرة واحدة' : 'Open the app once', value: 1, max: 1, done: true }],
      onClaim: () => handleClaim('login'),
      claiming: claiming === 'login',
      rtl, ar,
      delay: 0,
    },
    {
      icon: '❤️',
      title: ar ? 'النشاط الاجتماعي' : 'Social Activity',
      coins: 10,
      complete: s.socialComplete,
      claimed: s.socialRewardClaimed,
      rows: [
        { label: ar ? 'إعجابات على منشورات مختلفة' : 'Likes on different posts', value: s.likesGiven,    max: 5, done: s.likesGiven    >= 5 },
        { label: ar ? 'تعليقات على منشورات مختلفة' : 'Comments on posts',        value: s.commentsGiven, max: 5, done: s.commentsGiven >= 5 },
      ],
      onClaim: () => handleClaim('social'),
      claiming: claiming === 'social',
      rtl, ar,
      delay: 0.05,
    },
    {
      icon: '✍️',
      title: ar ? 'إنشاء محتوى' : 'Create Content',
      coins: 10,
      complete: s.contentComplete,
      claimed: s.contentRewardClaimed,
      rows: [
        { label: ar ? 'نشر منشور واحد'  : 'Post once',  value: s.postsCount,   max: 1, done: s.postsCount   >= 1 },
        { label: ar ? 'نشر ستوري واحدة' : 'Post a story', value: s.storiesCount, max: 1, done: s.storiesCount >= 1 },
      ],
      onClaim: () => handleClaim('content'),
      claiming: claiming === 'content',
      rtl, ar,
      delay: 0.1,
    },
    {
      icon: '⚽',
      title: ar ? 'العب مباراة' : 'Play a Match',
      coins: 10,
      complete: s.matchPlayed,
      claimed: s.matchPlayedClaimed,
      rows: [{ label: ar ? 'أكمل مباراة كاملة' : 'Complete one full match', value: s.matchPlayed ? 1 : 0, max: 1, done: s.matchPlayed }],
      onClaim: () => handleClaim('match'),
      claiming: claiming === 'match',
      rtl, ar,
      delay: 0.15,
    },
  ] : [];

  const totalCoins  = 5 + 10 + 10 + 10;
  const earnedCoins = s
    ? (s.loginClaimed ? 5 : 0) + (s.socialRewardClaimed ? 10 : 0) +
      (s.contentRewardClaimed ? 10 : 0) + (s.matchPlayedClaimed ? 10 : 0)
    : 0;
  const completedCount = s
    ? [s.loginClaimed, s.socialRewardClaimed, s.contentRewardClaimed, s.matchPlayedClaimed].filter(Boolean).length
    : 0;

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="min-h-screen bg-background text-foreground pb-28">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/60 px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="p-2 rounded-xl hover:bg-card active:scale-95 transition-all" onClick={playTap}>
            <ChevronLeft className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-black">
            🎯 {ar ? 'المهام اليومية' : 'Daily Tasks'}
          </h1>
          {s && (
            <p className="text-xs text-muted-foreground">
              {completedCount}/4 {ar ? 'مهام مكتملة' : 'completed'} · {earnedCoins}/{totalCoins} 🪙
            </p>
          )}
        </div>
        {s && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{ar ? 'يتجدد في' : 'Resets'}</p>
            <p className="text-xs font-bold text-primary">00:00 UTC</p>
          </div>
        )}
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-3">

        {/* Progress summary */}
        {s && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold">
                {ar ? 'التقدم اليومي' : 'Daily Progress'}
              </span>
              <span className="text-sm font-black text-yellow-400">
                {earnedCoins}/{totalCoins} 🪙
              </span>
            </div>
            <ProgressBar value={completedCount} max={4} color="#f59e0b" />
            <div className="flex justify-between mt-1">
              {[0,1,2,3].map(i => (
                <div key={i} className={`w-2 h-2 rounded-full ${i < completedCount ? 'bg-yellow-400' : 'bg-white/10'}`} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Task cards */}
        {!loading && tasks.map((task, i) => (
          <TaskCard key={i} {...task} />
        ))}

        {/* Gems info */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-2"
          >
            <p className="text-sm font-bold">
              💎 {ar ? 'أين تكسب الجواهر؟' : 'How to Earn Gems?'}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {ar
                ? 'الجواهر تأتي فقط من نتائج الدوريات. كلما ارتقيت، كبرت مكافآتك.'
                : 'Gems come exclusively from league results. The higher your league, the bigger the rewards.'}
            </p>
            {[
              { league: ar ? 'الدوري 3' : 'League 3',       reward: ar ? 'البطل = 1 💎'                         : 'Champion = 1 💎' },
              { league: ar ? 'الدوري 2' : 'League 2',       reward: '1st = 2 💎  ·  2nd = 1 💎' },
              { league: ar ? 'الاحترافي' : 'Pro',           reward: '1st = 3  ·  2nd = 2  ·  3rd = 1 💎' },
              { league: ar ? 'الأبطال' : 'Champions',       reward: '1st=4  ·  2nd=3  ·  3rd=2  ·  4th=1 💎' },
            ].map(item => (
              <div key={item.league} className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-purple-400">{item.league}</span>
                <span className="text-xs text-muted-foreground">{item.reward}</span>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-yellow-400 text-black font-black text-sm px-6 py-3 rounded-2xl shadow-xl z-50"
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
