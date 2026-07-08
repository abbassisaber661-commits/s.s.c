/**
 * DailyTasksSection.tsx  →  Boutique / Daily Tasks
 * ─────────────────────────────────────────────────
 * Shows all 5 server-tracked daily tasks:
 *   1. Daily Login        → +1 DN$  (claim on the spot)
 *   2. Play Match         → +1 DN$  (navigate to Match Arena)
 *   3. Create Content     → +1 DN$  (1 post + 1 story → Feed)
 *   4. Social Interaction → +3 DN$  (5 likes + 5 comments given → Feed)
 *   5. Get Popular        → +2 DN$  (receive 3 likes on your posts)
 *
 * All tracking is server-authoritative. Resets at UTC midnight.
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import { playTap, playCorrect } from "@/lib/sounds";
import DNCurrencyIcon from "@/components/ui/DNCurrencyIcon";

// ── Types ──────────────────────────────────────────────────────────────────

interface DailyStatus {
  date: string;
  // Task 1: Login
  loginClaimed: boolean;
  // Task 2: Social
  likesGiven: number;
  commentsGiven: number;
  socialRewardClaimed: boolean;
  socialComplete: boolean;
  // Task 3: Content
  postsCount: number;
  storiesCount: number;
  contentRewardClaimed: boolean;
  contentComplete: boolean;
  // Task 4: Match
  matchPlayed: boolean;
  matchPlayedClaimed: boolean;
  // Task 5: Interaction (Get Popular)
  likesReceived: number;
  interactionRewardClaimed: boolean;
  interactionComplete: boolean;
}

type ClaimTask = "login" | "social" | "content" | "match" | "interaction";

interface TaskDef {
  taskId: ClaimTask;
  icon: string;
  label: string;
  sublabel: string; // progress hint
  dn: number;
  complete: boolean;
  claimed: boolean;
  goTo: string | null; // null = claim in-place (no navigation needed)
}

// ── Reset timer helper ─────────────────────────────────────────────────────

function msUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1,
  ));
  return midnight.getTime() - now.getTime();
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function DailyTasksSection({ language }: { language?: string }) {
  const ar = language === "ar";
  const [, navigate] = useLocation();
  const playerId = getStoredPlayerId();

  const [status, setStatus] = useState<DailyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<ClaimTask | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(msUntilMidnightUTC());

  // Refresh countdown every second
  useEffect(() => {
    const id = setInterval(() => setCountdown(msUntilMidnightUTC()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!playerId) { setLoading(false); return; }
    try {
      const data = await api.daily.status(playerId);
      setStatus(data as unknown as DailyStatus);
    } catch {
      // silent — keep last known state
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 20_000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  // ── Claim handler ─────────────────────────────────────────────────────────

  const handleClaim = async (taskId: ClaimTask) => {
    if (!playerId || claiming) return;
    playTap();
    setClaiming(taskId);
    try {
      const result = await api.daily.claim(playerId, taskId);
      if (result.awarded) {
        playCorrect();
        const msg = ar ? `+${result.dn ?? 0} DN$ 🎉` : `+${result.dn ?? 0} DN$ 🎉`;
        setToast(msg);
        setTimeout(() => setToast(null), 2500);
      }
      await fetchStatus();
    } catch {
      // silent
    } finally {
      setClaiming(null);
    }
  };

  const handleGo = (goTo: string) => {
    playTap();
    navigate(goTo);
  };

  // ── Guard: not logged in ──────────────────────────────────────────────────

  if (!playerId) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 text-center text-xs text-muted-foreground">
        {ar ? "سجّل الدخول لرؤية مهامك اليومية" : "Log in to see your daily tasks"}
      </div>
    );
  }

  // ── Build task list ────────────────────────────────────────────────────────

  const s = status;

  const tasks: TaskDef[] = s ? [
    {
      taskId: "login",
      icon: "🌅",
      label: ar ? "تسجيل الدخول اليومي" : "Daily Login",
      sublabel: ar ? "مرة واحدة يومياً" : "Once per day",
      dn: 1,
      complete: true,          // always claimable (no prerequisite)
      claimed: s.loginClaimed,
      goTo: null,              // claim in-place
    },
    {
      taskId: "match",
      icon: "⚽",
      label: ar ? "العب مباراة" : "Play a Match",
      sublabel: ar ? "أكمل مباراة واحدة" : "Complete 1 match",
      dn: 1,
      complete: s.matchPlayed,
      claimed: s.matchPlayedClaimed,
      goTo: "/match-arena",
    },
    {
      taskId: "content",
      icon: "📝",
      label: ar ? "أنشئ محتوى" : "Create Content",
      sublabel: s
        ? ar
          ? `${s.postsCount}/1 منشور · ${s.storiesCount}/1 ستوري`
          : `${s.postsCount}/1 post · ${s.storiesCount}/1 story`
        : "",
      dn: 1,
      complete: s.contentComplete,
      claimed: s.contentRewardClaimed,
      goTo: "/feed?compose=1",
    },
    {
      taskId: "social",
      icon: "💬",
      label: ar ? "تفاعل اجتماعي" : "Be Social",
      sublabel: s
        ? ar
          ? `${Math.min(s.likesGiven, 5)}/5 إعجاب · ${Math.min(s.commentsGiven, 5)}/5 تعليق`
          : `${Math.min(s.likesGiven, 5)}/5 likes · ${Math.min(s.commentsGiven, 5)}/5 comments`
        : "",
      dn: 3,
      complete: s.socialComplete,
      claimed: s.socialRewardClaimed,
      goTo: "/feed",
    },
    {
      taskId: "interaction",
      icon: "⭐",
      label: ar ? "كن مشهوراً" : "Get Popular",
      sublabel: s
        ? ar
          ? `${Math.min(s.likesReceived, 3)}/3 إعجاب على منشوراتك`
          : `${Math.min(s.likesReceived, 3)}/3 likes on your posts`
        : "",
      dn: 2,
      complete: s.interactionComplete,
      claimed: s.interactionRewardClaimed,
      goTo: "/feed",
    },
  ] : [];

  const claimedCount  = tasks.filter(t => t.claimed).length;
  const totalDN       = tasks.reduce((acc, t) => acc + t.dn, 0);
  const earnedDN      = tasks.filter(t => t.claimed).reduce((acc, t) => acc + t.dn, 0);
  const progressPct   = tasks.length ? Math.round((claimedCount / tasks.length) * 100) : 0;
  const allDone       = claimedCount === tasks.length;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3 relative">

      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-muted-foreground">
            {ar ? "التقدم اليومي" : "Daily Progress"}
          </span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
            <Clock className="w-3 h-3" />
            <span>{ar ? "يعاد الضبط خلال" : "Resets in"} {formatCountdown(countdown)}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-black text-yellow-400">
            {earnedDN}/{totalDN} DN$
          </div>
          <div className="text-[10px] text-muted-foreground">
            {claimedCount}/{tasks.length} {ar ? "مكتمل" : "done"}
          </div>
        </div>
      </div>

      {/* ── Progress bar ───────────────────────────────────────────────────── */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${allDone ? 'bg-green-400' : 'bg-primary'}`}
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {/* ── Loading spinner ─────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {/* ── Task rows ──────────────────────────────────────────────────────── */}
      {!loading && tasks.map((task, i) => (
        <motion.div
          key={task.taskId}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`flex items-center gap-3 rounded-xl border p-3 ${
            task.claimed
              ? "border-green-500/30 bg-green-500/5"
              : task.complete
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-background/40"
          }`}
        >
          {/* Icon */}
          <span className="text-xl w-8 text-center flex-shrink-0">{task.icon}</span>

          {/* Label + sublabel */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate leading-snug">{task.label}</div>
            {task.sublabel && (
              <div className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">
                {task.sublabel}
              </div>
            )}
          </div>

          {/* Reward badge */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs font-black text-yellow-400">+{task.dn}</span>
            <DNCurrencyIcon size="xs" />
          </div>

          {/* Action button */}
          {task.claimed ? (
            <div className="flex items-center gap-1 text-xs font-bold text-green-400 flex-shrink-0 min-w-[68px] justify-center">
              <CheckCircle2 className="w-4 h-4" />
              <span>{ar ? "تم" : "Done"}</span>
            </div>
          ) : task.complete ? (
            <button
              disabled={claiming === task.taskId}
              onClick={() => handleClaim(task.taskId)}
              className="text-xs font-black min-w-[68px] h-8 px-3 rounded-lg bg-primary text-primary-foreground active:scale-95 transition-transform flex items-center justify-center flex-shrink-0"
            >
              {claiming === task.taskId
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : (ar ? "استلام" : "Claim")}
            </button>
          ) : task.goTo ? (
            <button
              onClick={() => handleGo(task.goTo!)}
              className="text-xs font-black min-w-[68px] h-8 px-3 rounded-lg border border-primary/40 text-primary active:scale-95 transition-transform flex-shrink-0"
            >
              {ar ? "انطلق" : "Go →"}
            </button>
          ) : null}
        </motion.div>
      ))}

      {/* ── All-done banner ────────────────────────────────────────────────── */}
      {!loading && allDone && tasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl bg-green-500/10 border border-green-500/30 p-3 text-center text-xs font-bold text-green-400"
        >
          🎉 {ar ? "أحسنت! أكملت جميع مهام اليوم!" : "All done! Come back tomorrow for more rewards."}
        </motion.div>
      )}

      {/* ── Reward toast ───────────────────────────────────────────────────── */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-3 right-4 bg-yellow-400 text-black text-xs font-black px-3 py-1 rounded-full shadow-lg"
        >
          {toast}
        </motion.div>
      )}
    </div>
  );
}
