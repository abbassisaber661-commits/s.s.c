import { useGame } from "@/contexts/GameContext";
import { useT } from "@/lib/i18n";
import { Link } from "wouter";
import { Coins, TrendingUp, TrendingDown } from "lucide-react";
import { LEAGUES, LeagueId } from "@/lib/game-engine";
import { getDailyChallenges, todayString } from "@/lib/challenges";

export default function Results() {
  const {
    language,
    lastScore, lastAccuracy, lastCoinsEarned,
    lastStreak, lastCorrect, lastUnlockedLeague,
    lastEloChange, lastNewAchievements, lastChallengesCompleted,
    elo,
  } = useGame();
  const t = useT(language);

  const unlockedCfg    = lastUnlockedLeague ? LEAGUES[lastUnlockedLeague as LeagueId] : null;
  const today          = todayString();
  const todayChallenges = getDailyChallenges(today);
  const completedNames  = lastChallengesCompleted.map(id => todayChallenges.find(c => c.id === id)).filter(Boolean);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center overflow-y-auto">

      {/* League Unlock Banner */}
      {unlockedCfg && (
        <div className="w-full max-w-sm mb-5 rounded-2xl p-4 flex items-center gap-3 border animate-in fade-in zoom-in-95 duration-500"
          style={{ backgroundColor: `${unlockedCfg.themeColor}15`, borderColor: `${unlockedCfg.themeColor}50` }}>
          <span className="text-2xl">🔓</span>
          <div className="text-left">
            <div className="font-bold text-sm" style={{ color: unlockedCfg.themeColor }}>{t('league_unlocked')}</div>
            <div className="text-xs text-muted-foreground">{t(`league_${lastUnlockedLeague}` as any)}</div>
          </div>
        </div>
      )}

      {/* New Achievements */}
      {lastNewAchievements.length > 0 && (
        <div className="w-full max-w-sm mb-5 space-y-2">
          {lastNewAchievements.map(a => (
            <div key={a.id} className="rounded-2xl p-3 flex items-center gap-3 border border-yellow-500/30 bg-yellow-500/10 animate-in fade-in zoom-in-95 duration-500">
              <span className="text-2xl">{a.icon}</span>
              <div className="text-left flex-1">
                <div className="font-bold text-sm text-yellow-400">{t('new_achievement')}</div>
                <div className="text-xs text-muted-foreground">{a.name}</div>
              </div>
              {a.rewardCoins > 0 && (
                <div className="flex items-center gap-1 text-yellow-400 font-bold text-sm">
                  +{a.rewardCoins} <Coins className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Daily Challenge Completions */}
      {completedNames.length > 0 && (
        <div className="w-full max-w-sm mb-5 space-y-2">
          {completedNames.map(c => c && (
            <div key={c.id} className="rounded-2xl p-3 flex items-center gap-3 border border-green-500/30 bg-green-500/10">
              <span className="text-2xl">{c.icon}</span>
              <div className="text-left flex-1">
                <div className="font-bold text-sm text-green-400">{t('daily_challenges')} ✓</div>
                <div className="text-xs text-muted-foreground">+{c.rewardCoins} coins · +{c.rewardElo} ELO</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 space-y-1">
        <div className="text-xs text-muted-foreground uppercase tracking-widest">{t('round_complete')}</div>
        <h1 className="text-4xl font-black">{t('results_title')}</h1>
      </div>

      {/* Score hero */}
      <div className="mb-6">
        <div className="text-8xl font-black tabular-nums"
          style={{ color: 'hsl(var(--primary))', textShadow: '0 0 40px hsl(var(--primary)/0.5)' }}>
          {lastScore}
        </div>
        <div className="text-sm text-muted-foreground uppercase tracking-widest mt-1">{t('points')}</div>
      </div>

      {/* ELO change */}
      {lastEloChange !== 0 && (
        <div className={`flex items-center gap-2 rounded-xl px-5 py-2.5 mb-6 border font-bold text-lg ${
          lastEloChange > 0
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {lastEloChange > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          <span>{lastEloChange > 0 ? '+' : ''}{lastEloChange} ELO</span>
          <span className="text-sm opacity-70">→ {elo}</span>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-6">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-2xl font-black text-green-400 tabular-nums">{lastAccuracy}%</div>
          <div className="text-xs text-muted-foreground uppercase mt-1">{t('accuracy')}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-2xl font-black text-yellow-400 tabular-nums">{lastCorrect}</div>
          <div className="text-xs text-muted-foreground uppercase mt-1">{t('correct_label')}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-2xl font-black text-orange-400 tabular-nums">{lastStreak}</div>
          <div className="text-xs text-muted-foreground uppercase mt-1">{t('best_streak')}</div>
        </div>
      </div>

      {/* Coins earned */}
      {lastCoinsEarned > 0 && (
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-6 py-3 mb-6">
          <Coins className="w-5 h-5 text-yellow-400" />
          <span className="text-xl font-bold text-yellow-400 tabular-nums">+{lastCoinsEarned}</span>
          <span className="text-sm text-muted-foreground">{t('coin_label')}</span>
        </div>
      )}

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3">
        <Link href="/leagues" className="block">
          <button className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-lg active:scale-95 transition-transform">
            {t('play_again')}
          </button>
        </Link>
        <Link href="/" className="block">
          <button className="w-full h-12 rounded-2xl border border-border text-muted-foreground font-medium active:scale-95 transition-transform">
            {t('home')}
          </button>
        </Link>
      </div>
    </div>
  );
}
