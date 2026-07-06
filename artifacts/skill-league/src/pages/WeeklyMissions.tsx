import { useGame } from "@/contexts/GameContext";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";
import {
  getWeeklyMissions, getWeekString, getMissionProgress, isMissionComplete,
} from "@/lib/weekly-challenges";

function daysUntilNextWeek(): number {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  const daysToMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  return daysToMonday;
}

export default function WeeklyMissions() {
  const { weeklyChallenge, dnBalance } = useGame();
  const thisWeek = getWeekString();
  const missions = getWeeklyMissions(thisWeek);
  const wc       = weeklyChallenge?.week === thisWeek ? weeklyChallenge : { week: thisWeek, completedIds: [], progress: {} };
  const daysLeft = daysUntilNextWeek();
  const completedCount = wc.completedIds.length;

  const totalCoins = missions.reduce((s, m) => s + m.rewardDN, 0);
  const totalXp    = missions.reduce((s, m) => s + m.rewardXp, 0);

  return (
    <div className="min-h-screen bg-background text-foreground pb-10">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/daily-challenges">
          <button className="p-1 rounded-lg hover:bg-card active:scale-95 transition-transform">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="text-lg font-bold flex-1">Weekly Missions</h1>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{daysLeft}d left</span>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl font-black text-primary">
            {completedCount}/{missions.length}
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold">Weekly Missions</div>
            <div className="text-xs text-muted-foreground">{thisWeek.replace('-W', ' · Week ')}</div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-yellow-400 font-semibold">Up to {totalCoins} 🪙</span>
              <span className="text-xs text-purple-400 font-semibold">Up to {totalXp} XP</span>
            </div>
          </div>
        </motion.div>

        {/* Progress bar */}
        <div className="h-2 bg-card rounded-full overflow-hidden border border-border/50">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / missions.length) * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>

        {/* Missions */}
        {missions.map((mission, idx) => {
          const done     = isMissionComplete(wc, mission);
          const progress = getMissionProgress(wc, mission);
          const pct      = Math.min(100, Math.round((progress / mission.target) * 100));

          return (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.06 }}
              className={`rounded-2xl border bg-card p-4 space-y-3 ${done ? 'border-green-500/30 bg-green-500/5' : 'border-border'}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{mission.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{mission.title}</span>
                    {done && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{mission.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-yellow-400 font-bold">+{mission.rewardDN} DN$</div>
                  <div className="text-xs text-purple-400">+{mission.rewardXp} XP</div>
                </div>
              </div>

              {!done && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{progress} / {mission.target}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.06 + 0.3 }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Info */}
        <div className="rounded-2xl border border-border/40 bg-card/40 p-4 text-xs text-muted-foreground space-y-1">
          <p>• Missions reset every Monday at midnight UTC</p>
          <p>• Complete all 5 missions for the full reward</p>
          <p>• Progress is tracked automatically across all game modes</p>
        </div>
      </div>
    </div>
  );
}
