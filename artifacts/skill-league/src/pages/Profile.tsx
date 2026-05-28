import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { useT } from "@/lib/i18n";
import { Link } from "wouter";
import { ArrowLeft, Trophy, Coins, Zap, Shield, Star, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentLeague } from "@/lib/progression";
import { LEAGUES, LeagueId } from "@/lib/game-engine";

function LeagueBadge({ id }: { id: LeagueId }) {
  const cfg = LEAGUES[id];
  const icons: Record<LeagueId, React.ReactNode> = {
    training: <Shield className="w-5 h-5" />,
    bronze:   <Trophy className="w-5 h-5" />,
    silver:   <Star   className="w-5 h-5" />,
    elite:    <Crown  className="w-5 h-5" />,
  };
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold"
      style={{ backgroundColor: `${cfg.themeColor}20`, color: cfg.themeColor, border: `1px solid ${cfg.themeColor}40` }}>
      {icons[id]}
      <span>{id.charAt(0).toUpperCase() + id.slice(1)}</span>
    </div>
  );
}

export default function Profile() {
  const ctx = useGame();
  const {
    language, username, coins, highScores,
    matchesPlayed, matchesWon, bestStreak,
    updateUsername,
  } = ctx;
  const t = useT(language);

  const [editing, setEditing]   = useState(false);
  const [nameInput, setNameInput] = useState(username);

  const currentLeague = getCurrentLeague(ctx as any);
  const bestScore     = Math.max(0, ...Object.values(highScores));

  const saveUsername = () => {
    if (nameInput.trim()) updateUsername(nameInput.trim());
    setEditing(false);
  };

  const initials = username.slice(0, 2).toUpperCase();
  const leagueCfg = LEAGUES[currentLeague];

  return (
    <div className="min-h-screen bg-background p-5 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex-1">{t('profile')}</h1>
        <Link href="/leaderboard">
          <Button variant="outline" size="sm">🏆 {t('leaderboard')}</Button>
        </Link>
      </div>

      {/* Avatar + username */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center text-3xl font-black"
          style={{ backgroundColor: `${leagueCfg.themeColor}25`, color: leagueCfg.themeColor,
            boxShadow: `0 0 40px ${leagueCfg.themeColor}33` }}
        >
          {initials}
        </div>

        {editing ? (
          <div className="flex items-center gap-2 w-full max-w-xs">
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveUsername(); if (e.key === 'Escape') setEditing(false); }}
              maxLength={20}
              className="flex-1 bg-card border border-border rounded-xl px-4 py-2 text-lg font-bold text-center outline-none focus:border-primary"
            />
            <Button size="sm" onClick={saveUsername}>{t('save_btn')}</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>{t('cancel_btn')}</Button>
          </div>
        ) : (
          <button onClick={() => { setNameInput(username); setEditing(true); }}
            className="group flex flex-col items-center gap-1">
            <span className="text-2xl font-black">{username}</span>
            <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
              {t('tap_to_edit')}
            </span>
          </button>
        )}

        <LeagueBadge id={currentLeague} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase">
            <Coins className="w-3.5 h-3.5 text-yellow-400" /> {t('total_coins')}
          </div>
          <div className="text-3xl font-black text-yellow-400 tabular-nums">{coins}</div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-1">
          <div className="text-xs text-muted-foreground uppercase">{t('best_score')}</div>
          <div className="text-3xl font-black text-primary tabular-nums">{bestScore}</div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-1">
          <div className="text-xs text-muted-foreground uppercase">{t('matches_played')}</div>
          <div className="text-3xl font-black tabular-nums">{matchesPlayed}</div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-1">
          <div className="text-xs text-muted-foreground uppercase">{t('matches_completed')}</div>
          <div className="text-3xl font-black text-green-400 tabular-nums">{matchesWon}</div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-2 col-span-2">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase">
            <Zap className="w-3.5 h-3.5 text-orange-400" /> {t('best_streak')}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-black text-orange-400 tabular-nums">{bestStreak}</div>
            {bestStreak >= 5 && <span className="text-2xl">🔥</span>}
          </div>
        </div>
      </div>

      {/* Per-league best scores */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">{t('best_score')}</div>
        <div className="space-y-3">
          {(['training','bronze','silver','elite'] as LeagueId[]).map(id => {
            const cfg = LEAGUES[id];
            const hs  = highScores[id] ?? 0;
            return (
              <div key={id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.themeColor }} />
                  <span className="text-sm font-medium">{t(`league_${id}` as any)}</span>
                </div>
                <span className="font-mono font-bold tabular-nums" style={{ color: hs > 0 ? cfg.themeColor : undefined }}>
                  {hs}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
