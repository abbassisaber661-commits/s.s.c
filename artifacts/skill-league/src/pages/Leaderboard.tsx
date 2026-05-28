import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { useT } from "@/lib/i18n";
import { Link } from "wouter";
import { ArrowLeft, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LEAGUES, LeagueId, LEAGUE_ORDER } from "@/lib/game-engine";

export default function Leaderboard() {
  const { language, leaderboard, username } = useGame();
  const t = useT(language);
  const [selected, setSelected] = useState<LeagueId>('training');

  const cfg     = LEAGUES[selected];
  const entries = (leaderboard[selected] ?? []).slice().sort((a, b) => b.score - a.score);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(language, { month: 'short', day: 'numeric' });
    } catch { return '—'; }
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
        <h1 className="text-2xl font-bold flex-1">{t('leaderboard')}</h1>
      </div>

      {/* League tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {LEAGUE_ORDER.map(id => {
          const c = LEAGUES[id];
          const isActive = id === selected;
          return (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
              style={{
                backgroundColor: isActive ? `${c.themeColor}30` : 'transparent',
                color: isActive ? c.themeColor : 'hsl(var(--muted-foreground))',
                border: `1px solid ${isActive ? c.themeColor + '60' : 'hsl(var(--border))'}`,
              }}
            >
              {t(`league_${id}` as any)}
            </button>
          );
        })}
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <Trophy className="w-16 h-16 opacity-20" />
          <p className="text-center">{t('no_scores_yet')}</p>
          <Link href="/leagues">
            <Button variant="outline">{t('play')}</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Column headers */}
          <div className="grid grid-cols-[2rem_1fr_auto_auto_auto] gap-3 px-4 text-xs text-muted-foreground uppercase">
            <span>{t('rank')}</span>
            <span>{username}</span>
            <span>{t('score')}</span>
            <span>{t('streak')}</span>
            <span></span>
          </div>

          {entries.map((entry, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
            return (
              <div
                key={i}
                className="grid grid-cols-[2rem_1fr_auto_auto_auto] gap-3 items-center px-4 py-4 rounded-2xl border"
                style={{
                  backgroundColor: i === 0 ? `${cfg.themeColor}12` : 'hsl(var(--card))',
                  borderColor:     i === 0 ? `${cfg.themeColor}40` : 'hsl(var(--border))',
                }}
              >
                <div className="font-bold text-sm w-8 text-center" style={{ color: i === 0 ? cfg.themeColor : undefined }}>
                  {medal ?? `${i + 1}`}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{username}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(entry.date)}</div>
                </div>
                <div className="text-right">
                  <div className="font-black tabular-nums" style={{ color: cfg.themeColor }}>{entry.score}</div>
                  <div className="text-xs text-muted-foreground">{entry.accuracy}%</div>
                </div>
                <div className="text-right">
                  <div className="font-bold tabular-nums text-orange-400">×{entry.streak}</div>
                  <div className="text-xs text-muted-foreground">{entry.correct} ✓</div>
                </div>
                <div />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
