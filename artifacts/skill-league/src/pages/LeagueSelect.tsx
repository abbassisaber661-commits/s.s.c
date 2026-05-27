import { useGame } from "@/contexts/GameContext";
import { useT } from "@/lib/i18n";
import { Link, useLocation } from "wouter";
import { LEAGUES, LeagueType } from "@/lib/game-engine";
import { ArrowLeft, Lock, Trophy, Zap, Shield, Crown, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LeagueSelect() {
  const { user, language, trainingCoins, entryTokens, highScores } = useGame();
  const [, setLocation] = useLocation();
  const t = useT(language);

  const handlePlay = (league: LeagueType, config: typeof LEAGUES[LeagueType]) => {
    if (config.entryCostType === 'coins'  && trainingCoins < config.entryCost) return;
    if (config.entryCostType === 'tokens' && entryTokens   < config.entryCost) return;
    setLocation(`/game/${league}`);
  };

  const getIcon = (l: string) => {
    if (l === 'training') return <Shield className="w-8 h-8 text-blue-400" />;
    if (l === 'easy')     return <Zap    className="w-8 h-8 text-yellow-400" />;
    if (l === 'ranked')   return <Trophy className="w-8 h-8 text-purple-400" />;
    if (l === 'elite')    return <Crown  className="w-8 h-8 text-red-400" />;
  };

  return (
    <div className="min-h-screen bg-background p-5 flex flex-col max-w-md mx-auto relative">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{t('select_league')}</h1>
        </div>
        <div className="flex gap-3 text-sm font-medium">
          <div className="flex items-center gap-1"><Coins  className="w-4 h-4 text-yellow-400" /> {trainingCoins}</div>
          <div className="flex items-center gap-1"><Trophy className="w-4 h-4 text-purple-400" /> {entryTokens}</div>
        </div>
      </div>

      <div className="space-y-4">
        {(Object.keys(LEAGUES) as LeagueType[]).map((league) => {
          const config = LEAGUES[league];
          const isLocked  = !user && (league === 'ranked' || league === 'elite');
          const canAfford =
            config.entryCostType === 'none' ||
            (config.entryCostType === 'coins'  && trainingCoins >= config.entryCost) ||
            (config.entryCostType === 'tokens' && entryTokens   >= config.entryCost);

          return (
            <div
              key={league}
              onClick={() => !isLocked && canAfford && handlePlay(league, config)}
              className={`relative overflow-hidden rounded-2xl border-2 p-5 transition-all ${
                isLocked || !canAfford
                  ? 'opacity-60 border-border bg-card/50'
                  : 'border-border bg-card cursor-pointer hover:border-primary/50 active:scale-[0.98]'
              }`}
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-16 h-16 rounded-xl bg-background border flex items-center justify-center shadow-inner">
                  {getIcon(league)}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold capitalize">{t(`league_${league}` as any)}</h3>
                  <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                    {config.entryCostType === 'none' ? (
                      <span className="text-green-400 font-medium">{t('free')}</span>
                    ) : (
                      <span className="flex items-center gap-1">
                        {t('entry')} {config.entryCost}
                        {config.entryCostType === 'coins'
                          ? <Coins  className="w-3 h-3 text-yellow-400" />
                          : <Trophy className="w-3 h-3 text-purple-400" />}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground uppercase">{t('best')}</div>
                  <div className="font-mono font-bold text-lg tabular-nums">{highScores[league] || 0}</div>
                </div>
              </div>

              {isLocked && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center">
                  <div className="flex items-center gap-2 font-medium">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                    <span>{t('sign_in_pi')}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
