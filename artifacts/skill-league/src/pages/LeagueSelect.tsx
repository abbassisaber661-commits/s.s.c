import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { useT } from "@/lib/i18n";
import { Link, useLocation } from "wouter";
import { LEAGUES, LeagueId, LEAGUE_ORDER } from "@/lib/game-engine";
import { isUnlocked, meetsScoreRequirement, canAffordCoinUnlock, canAffordEntry } from "@/lib/progression";
import { ArrowLeft, Lock, Shield, Trophy, Star, Crown, Coins, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

function DifficultyDots({ level, color }: { level: number; color: string }) {
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="w-2 h-2 rounded-full transition-colors"
          style={{ backgroundColor: i <= level ? color : `${color}30` }}
        />
      ))}
    </div>
  );
}

function LeagueIcon({ id, color }: { id: LeagueId; color: string }) {
  const cls = "w-8 h-8";
  if (id === 'training') return <Shield className={cls} style={{ color }} />;
  if (id === 'bronze')   return <Trophy className={cls} style={{ color }} />;
  if (id === 'silver')   return <Star   className={cls} style={{ color }} />;
  return                        <Crown  className={cls} style={{ color }} />;
}

export default function LeagueSelect() {
  const ctx = useGame();
  const { language, coins, highScores, unlockedLeagues, unlockLeagueWithCoins } = ctx;
  const [, setLocation] = useLocation();
  const t = useT(language);
  const [unlocking, setUnlocking] = useState<string | null>(null);

  const handlePlay = (id: LeagueId) => {
    const data = ctx as any;
    if (!canAffordEntry(id, data)) return;
    setLocation(`/game/${id}`);
  };

  const handleUnlock = (id: LeagueId, e: React.MouseEvent) => {
    e.stopPropagation();
    setUnlocking(id);
    const ok = unlockLeagueWithCoins(id);
    if (!ok) setUnlocking(null);
    setTimeout(() => setUnlocking(null), 600);
  };

  return (
    <div className="min-h-screen bg-background p-5 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex-1">{t('select_league')}</h1>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-card rounded-xl border border-border text-sm font-semibold">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="tabular-nums">{coins}</span>
        </div>
      </div>

      <div className="space-y-4">
        {LEAGUE_ORDER.map((id) => {
          const cfg      = LEAGUES[id];
          const unlocked = isUnlocked(id, ctx as any);
          const scoreOk  = meetsScoreRequirement(id, ctx as any);
          const coinOk   = canAffordCoinUnlock(id, ctx as any);
          const canEnter = unlocked && canAffordEntry(id, ctx as any);

          return (
            <div
              key={id}
              onClick={() => unlocked && canEnter && handlePlay(id)}
              className={`relative rounded-2xl border-2 overflow-hidden transition-all
                ${unlocked && canEnter ? 'cursor-pointer active:scale-[0.98]' : 'opacity-80'}
              `}
              style={{
                borderColor: `${cfg.themeColor}${unlocked ? '60' : '25'}`,
                backgroundColor: `${cfg.themeColor}08`,
              }}
            >
              {/* Main card content */}
              <div className="p-5">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${cfg.themeColor}20` }}
                  >
                    <LeagueIcon id={id} color={cfg.themeColor} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg leading-tight" style={{ color: cfg.themeColor }}>
                      {t(`league_${id}` as any)}
                    </div>
                    <DifficultyDots level={cfg.difficulty} color={cfg.themeColor} />
                  </div>

                  {/* Best score */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-muted-foreground uppercase">{t('best')}</div>
                    <div className="font-mono font-bold text-lg tabular-nums">{highScores[id] ?? 0}</div>
                  </div>
                </div>

                {/* Footer: entry + reward */}
                <div className="flex justify-between items-center mt-4 pt-3 border-t text-sm" style={{ borderColor: `${cfg.themeColor}20` }}>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    {cfg.entryCost === 0 ? (
                      <span className="text-green-400 font-medium">{t('free')}</span>
                    ) : (
                      <>
                        <Coins className="w-3.5 h-3.5 text-yellow-400" />
                        <span>{cfg.entryCost} {t('coin_label')}</span>
                        {!canEnter && unlocked && (
                          <span className="text-red-400 text-xs">({t('insufficient_funds')})</span>
                        )}
                      </>
                    )}
                  </div>
                  {cfg.rewardBase > 0 && (
                    <div className="flex items-center gap-1 text-green-400 font-medium">
                      <span>+{cfg.rewardBase}+</span>
                      <Coins className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>

              {/* LOCKED overlay */}
              {!unlocked && (
                <div className="absolute inset-0 bg-background/88 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 p-5 z-10">
                  <Lock className="w-6 h-6 text-muted-foreground" />

                  {/* Score requirement */}
                  {cfg.prevLeague && (
                    <div className="text-center text-sm text-muted-foreground">
                      <span className="font-bold text-foreground/80">{t('score_to_unlock')} {cfg.unlockScore}+</span>
                      {' '}{t('in_league')}{' '}
                      <span className="font-bold" style={{ color: LEAGUES[cfg.prevLeague].themeColor }}>
                        {t(`league_${cfg.prevLeague}` as any)}
                      </span>
                    </div>
                  )}

                  {/* Coin unlock alternative */}
                  {cfg.unlockCoinsCost > 0 && (
                    <div className="text-center space-y-2">
                      <div className="text-xs text-muted-foreground">{t('or_label')}</div>
                      <button
                        onClick={(e) => handleUnlock(id, e)}
                        disabled={!coinOk || unlocking === id}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-40 transition-all active:scale-95"
                        style={{
                          backgroundColor: `${cfg.themeColor}25`,
                          color: cfg.themeColor,
                          border: `1px solid ${cfg.themeColor}50`,
                        }}
                      >
                        <Coins className="w-4 h-4" />
                        {unlocking === id ? '✓' : `${t('unlock_for')} ${cfg.unlockCoinsCost}`}
                      </button>
                      {!coinOk && (
                        <div className="text-xs text-muted-foreground">{t('insufficient_funds')}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
