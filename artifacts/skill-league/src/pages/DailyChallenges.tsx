import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { useT } from "@/lib/i18n";
import { Link } from "wouter";
import { ArrowLeft, Coins, Zap, Calendar, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDailyChallenges, DailyChallenge, todayString } from "@/lib/challenges";
import { LEAGUES } from "@/lib/game-engine";
import { getWeeklyMissions, getWeekString, getMissionProgress, isMissionComplete } from "@/lib/weekly-challenges";
import { motion } from "framer-motion";

function buildDesc(c: DailyChallenge): string {
  if (c.type === 'score') {
    const leagueName = c.league ? c.league.charAt(0).toUpperCase() + c.league.slice(1) : null;
    return `Score ${c.target}+${leagueName ? ` in ${leagueName} League` : ' in any match'}`;
  }
  if (c.type === 'accuracy') return `Get ${c.target}%+ accuracy in any match`;
  if (c.type === 'streak')   return `Achieve a ${c.target}-streak in one match`;
  return '';
}

export default function DailyChallenges() {
  const { language, dailyChallenge, dailyChallengesCompleted, weeklyChallenge } = useGame();
  const t = useT(language);
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily');

  const today      = todayString();
  const challenges = getDailyChallenges(today);
  const completed  = dailyChallenge.date === today ? dailyChallenge.completed : [];

  const thisWeek = getWeekString();
  const missions = getWeeklyMissions(thisWeek);
  const wc       = weeklyChallenge?.week === thisWeek ? weeklyChallenge : { week: thisWeek, completedIds: [], progress: {} };
  const weeklyCompletedCount = wc.completedIds.length;

  const formatDate = () =>
    new Date().toLocaleDateString(language, { weekday: 'long', month: 'long', day: 'numeric' });

  function daysLeft(): number {
    const now = new Date();
    const dayOfWeek = now.getDay();
    return dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-10">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="p-1 rounded-lg hover:bg-card active:scale-95 transition-transform">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="text-lg font-bold flex-1">{t('daily_challenges')}</h1>
        <span className="text-xs text-muted-foreground capitalize">{formatDate()}</span>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">

        {/* Tabs */}
        <div className="flex gap-2 bg-card rounded-2xl p-1 border border-border">
          <button onClick={() => setTab('daily')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${tab === 'daily' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <Calendar className="w-3.5 h-3.5" />
            Daily
            {completed.length < challenges.length && (
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                {challenges.length - completed.length}
              </span>
            )}
          </button>
          <button onClick={() => setTab('weekly')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${tab === 'weekly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <Target className="w-3.5 h-3.5" />
            Weekly
            {weeklyCompletedCount < missions.length && (
              <span className="w-4 h-4 rounded-full bg-yellow-500 text-black text-xs flex items-center justify-center font-bold">
                {missions.length - weeklyCompletedCount}
              </span>
            )}
          </button>
        </div>

        {tab === 'daily' ? (
          <>
            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{completed.length}/{challenges.length} completed</span>
                <span>{Math.round((completed.length / challenges.length) * 100)}%</span>
              </div>
              <div className="h-2 bg-card rounded-full overflow-hidden border border-border/50">
                <motion.div
                  className="h-full bg-green-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(completed.length / challenges.length) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>

            <div className="space-y-3">
              {challenges.map((c, i) => {
                const isDone = completed.includes(c.id);
                return (
                  <motion.div key={c.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`rounded-2xl border-2 p-4 transition-all ${isDone ? 'border-green-500/40 bg-green-500/5' : 'border-border bg-card'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${isDone ? 'bg-green-500/20' : 'bg-muted/50'}`}>
                        {isDone ? '✅' : c.icon}
                      </div>
                      <div className="flex-1">
                        <div className={`font-bold text-sm ${isDone ? 'text-green-400' : 'text-foreground'}`}>
                          {isDone ? 'Completed ✓' : `Challenge ${i + 1}`}
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5">{buildDesc(c)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/40">
                      <div className="flex items-center gap-1 text-sm font-bold text-yellow-400">
                        <Coins className="w-3.5 h-3.5" /> +{c.rewardDN} DN$
                      </div>
                      <div className="flex items-center gap-1 text-sm font-bold text-primary">
                        <Zap className="w-3.5 h-3.5" /> +{c.rewardElo} ELO
                      </div>
                      {!isDone && (
                        <Link href="/leagues" className="ms-auto">
                          <Button size="sm" variant="outline" className="text-xs h-7">Play →</Button>
                        </Link>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <div className="text-3xl font-black text-primary tabular-nums">{dailyChallengesCompleted}</div>
              <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Total Daily Completed</div>
            </div>
          </>
        ) : (
          <>
            {/* Weekly progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{weeklyCompletedCount}/{missions.length} completed</span>
                <span>{daysLeft()}d left in week</span>
              </div>
              <div className="h-2 bg-card rounded-full overflow-hidden border border-border/50">
                <motion.div
                  className="h-full bg-yellow-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(weeklyCompletedCount / missions.length) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>

            <div className="space-y-3">
              {missions.map((m, idx) => {
                const done     = isMissionComplete(wc, m);
                const progress = getMissionProgress(wc, m);
                const pct      = Math.min(100, Math.round((progress / m.target) * 100));

                return (
                  <motion.div key={m.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className={`rounded-2xl border p-4 space-y-2.5 ${done ? 'border-green-500/40 bg-green-500/5' : 'border-border bg-card'}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{m.icon}</span>
                      <div className="flex-1">
                        <div className={`text-sm font-bold ${done ? 'text-green-400' : ''}`}>
                          {m.title} {done && '✓'}
                        </div>
                        <div className="text-xs text-muted-foreground">{m.description}</div>
                      </div>
                      <div className="text-right text-xs flex-shrink-0">
                        <div className="text-yellow-400 font-bold">+{m.rewardDN} DN$</div>
                        <div className="text-purple-400">+{m.rewardXp} XP</div>
                      </div>
                    </div>
                    {!done && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{progress} / {m.target}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-yellow-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.06 + 0.2 }}
                          />
                        </div>
                      </div>
                    )}
                    {!done && (
                      <Link href={m.type === 'win_pvp' ? '/pvp' : m.type === 'win_tournament' ? '/tournament' : '/leagues'}>
                        <Button size="sm" variant="outline" className="text-xs h-7 w-full">Play →</Button>
                      </Link>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-border/40 bg-card/40 p-3 text-xs text-muted-foreground space-y-1">
              <p>• Missions reset every Monday at midnight UTC</p>
              <p>• Progress is tracked automatically as you play</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
