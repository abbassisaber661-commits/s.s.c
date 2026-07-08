/**
 * DailyTasksSection.tsx  →  Boutique / Daily Tasks (compact horizontal rows)
 * ───────────────────────────────────────────────────────────────────────
 * Reuses the existing daily-economy backend (api.daily.status / api.daily.claim)
 * — no DB / backend changes. Shows 3 tasks: Play Match, Create Post, Social
 * Interaction, each as a single horizontal row:
 *
 *   ⚽ Play Match          +1 DN$          [Check]
 *
 * Flow: [Check] → navigate to the related page.
 *       Once the backend marks the task complete → button becomes [Claim].
 *       [Claim] → awards DN$ via the existing claim endpoint, then shows ✓ Claimed.
 *       Resets automatically every day (handled server-side).
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import { playTap, playCorrect } from "@/lib/sounds";

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

type ClaimTask = "social" | "content" | "match";

interface TaskDef {
  taskId: ClaimTask;
  icon: string;
  label: string;
  dn: number;
  complete: boolean;
  claimed: boolean;
  goTo: string;
}

export default function DailyTasksSection({ language }: { language?: string }) {
  const ar = language === "ar";
  const [, navigate] = useLocation();
  const playerId = getStoredPlayerId();

  const [status, setStatus] = useState<DailyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<ClaimTask | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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
    const interval = setInterval(fetchStatus, 20_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleClaim = async (taskId: ClaimTask) => {
    if (!playerId || claiming) return;
    playTap();
    setClaiming(taskId);
    try {
      const result = await api.daily.claim(playerId, taskId);
      if (result.awarded) {
        playCorrect();
        setToast(ar ? `+${result.dn ?? 0} DN$ 🎉` : `+${result.dn ?? 0} DN$ 🎉`);
        setTimeout(() => setToast(null), 2500);
      }
      await fetchStatus();
    } catch {
      // silent
    } finally {
      setClaiming(null);
    }
  };

  const handleCheck = (goTo: string) => {
    playTap();
    navigate(goTo);
  };

  if (!playerId) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 text-center text-xs text-muted-foreground">
        {ar ? "سجّل الدخول لرؤية مهامك اليومية" : "Log in to see your daily tasks"}
      </div>
    );
  }

  const s = status;
  const tasks: TaskDef[] = s ? [
    {
      taskId: "match",
      icon: "⚽",
      label: ar ? "العب مباراة" : "Play Match",
      dn: 1,
      complete: s.matchPlayed,
      claimed: s.matchPlayedClaimed,
      goTo: "/match-arena",
    },
    {
      taskId: "content",
      icon: "📝",
      label: ar ? "أنشئ منشوراً" : "Create Post",
      dn: 1,
      complete: s.contentComplete,
      claimed: s.contentRewardClaimed,
      goTo: "/feed?compose=1",
    },
    {
      taskId: "social",
      icon: "💬",
      label: ar ? "تفاعل اجتماعي" : "Social Interaction",
      dn: 3,
      complete: s.socialComplete,
      claimed: s.socialRewardClaimed,
      goTo: "/feed",
    },
  ] : [];

  const completedCount = tasks.filter(t => t.claimed).length;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3 relative">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground">
          {ar ? "التقدم اليومي" : "Daily Progress"}
        </span>
        <span className="text-xs font-black text-yellow-400">
          {completedCount}/{tasks.length} {ar ? "مكتمل" : "done"}
        </span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

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
          <span className="text-xl w-8 text-center flex-shrink-0">{task.icon}</span>
          <span className="flex-1 min-w-0 text-sm font-bold truncate">{task.label}</span>
          <span className="text-xs font-black text-yellow-400 flex-shrink-0">+{task.dn} DN$</span>

          {task.claimed ? (
            <div className="flex items-center gap-1 text-xs font-bold text-green-400 flex-shrink-0 min-w-[72px] justify-center">
              <CheckCircle2 className="w-4 h-4" />
              <span>{ar ? "تم" : "Done"}</span>
            </div>
          ) : task.complete ? (
            <button
              disabled={claiming === task.taskId}
              onClick={() => handleClaim(task.taskId)}
              className="text-xs font-black min-w-[72px] h-8 px-3 rounded-lg bg-primary text-primary-foreground active:scale-95 transition-transform flex items-center justify-center flex-shrink-0"
            >
              {claiming === task.taskId
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : (ar ? "استلام" : "Claim")}
            </button>
          ) : (
            <button
              onClick={() => handleCheck(task.goTo)}
              className="text-xs font-black min-w-[72px] h-8 px-3 rounded-lg border border-primary/40 text-primary active:scale-95 transition-transform flex-shrink-0"
            >
              {ar ? "تحقق" : "Check"}
            </button>
          )}
        </motion.div>
      ))}

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="absolute -top-3 right-4 bg-yellow-400 text-black text-xs font-black px-3 py-1 rounded-full shadow-lg"
        >
          {toast}
        </motion.div>
      )}
    </div>
  );
}
