import { useGame } from "@/contexts/GameContext";
import { useT } from "@/lib/i18n";
import { Link } from "wouter";
import { ArrowLeft, Coins, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDailyChallenges, DailyChallenge, todayString } from "@/lib/challenges";
import { LEAGUES } from "@/lib/game-engine";

function challengeDesc(c: DailyChallenge, t: (k: any) => string): string {
  const leagueName = c.league ? (LEAGUES as any)[c.league]?.themeColor ? c.league.charAt(0).toUpperCase() + c.league.slice(1) : c.league : null;
  if (c.type === 'score')    return `Score ${c.type === 'score' ? c.target : ''}+${leagueName ? ` in ${leagueName}` : ''}`;
  if (c.type === 'accuracy') return `Get ${c.target}%+ accuracy in any match`;
  if (c.type === 'streak')   return `Achieve a ${c.target}-streak in one match`;
  return '';
}

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
  const { language, dailyChallenge, dailyChallengesCompleted } = useGame();
  const t = useT(language);

  const today      = todayString();
  const challenges = getDailyChallenges(today);
  const completed  = dailyChallenge.date === today ? dailyChallenge.completed : [];

  const formatDate = () => {
    return new Date().toLocaleDateString(language, { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-background p-5 flex flex-col max-w-md mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{t('daily_challenges')}</h1>
          <p className="text-xs text-muted-foreground capitalize">{formatDate()}</p>
        </div>
        <div className="text-center">
          <div className="text-lg font-black text-green-400 tabular-nums">{completed.length}/{challenges.length}</div>
          <div className="text-xs text-muted-foreground">{t('today')}</div>
        </div>
      </div>

      {/* Completion bar */}
      <div className="mb-6 mt-3">
        <div className="h-2 bg-card rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all duration-700"
            style={{ width: `${(completed.length / challenges.length) * 100}%` }} />
        </div>
      </div>

      {/* Challenge cards */}
      <div className="space-y-4 mb-8">
        {challenges.map((c, i) => {
          const isDone = completed.includes(c.id);
          return (
            <div key={c.id}
              className="rounded-2xl border-2 p-5 transition-all"
              style={{
                borderColor: isDone ? '#2EE87A60' : 'hsl(var(--border))',
                backgroundColor: isDone ? '#2EE87A08' : 'hsl(var(--card))',
              }}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${isDone ? 'bg-green-500/20' : 'bg-card border border-border'}`}>
                  {isDone ? '✅' : c.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-sm mb-1 ${isDone ? 'text-green-400' : ''}`}>
                    {isDone ? `${t('completed')} ✓` : `${t('pending')} ${i + 1}`}
                  </div>
                  <div className="text-base font-semibold">{buildDesc(c)}</div>
                </div>
              </div>

              {/* Reward */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50">
                <div className="flex items-center gap-1.5 text-sm font-bold text-yellow-400">
                  <Coins className="w-4 h-4" />
                  +{c.rewardCoins}
                </div>
                <div className="flex items-center gap-1.5 text-sm font-bold text-primary">
                  <Zap className="w-4 h-4" />
                  +{c.rewardElo} ELO
                </div>
                {!isDone && (
                  <Link href="/leagues" className="ms-auto">
                    <Button size="sm" variant="outline" className="text-xs h-8">
                      {t('play')} →
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total completed */}
      <div className="bg-card border border-border rounded-2xl p-4 text-center">
        <div className="text-3xl font-black text-primary tabular-nums">{dailyChallengesCompleted}</div>
        <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Total Challenges Completed</div>
      </div>
    </div>
  );
}
