import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { useT } from "@/lib/i18n";
import { Link } from "wouter";
import { ArrowLeft, Coins, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentLeague } from "@/lib/progression";
import { LEAGUES, LeagueId } from "@/lib/game-engine";
import { computeTitle, eloTier } from "@/lib/elo";
import { ACHIEVEMENT_DEFS } from "@/lib/achievements";
import { getDailyChallenges, todayString } from "@/lib/challenges";

function SkillBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-bold tabular-nums" style={{ color }}>{value}</span>
      </div>
      <div className="h-2 bg-card rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function Profile() {
  const ctx = useGame();
  const {
    language, username, coins, highScores,
    matchesPlayed, matchesWon, bestStreak,
    updateUsername, elo, skillSpeed, skillAccuracy, skillMemory,
    achievements, dailyChallenge,
  } = ctx;
  const t = useT(language);

  const [editing, setEditing]     = useState(false);
  const [nameInput, setNameInput] = useState(username);

  const currentLeague = getCurrentLeague(ctx as any);
  const leagueCfg     = LEAGUES[currentLeague];
  const title         = computeTitle(elo, matchesPlayed, skillMemory, skillSpeed);
  const tier          = eloTier(elo);
  const bestScore     = Math.max(0, ...Object.values(highScores));
  const initials      = username.slice(0, 2).toUpperCase();

  const recentAchieves = [...achievements]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)
    .map(a => ACHIEVEMENT_DEFS.find(d => d.id === a.id))
    .filter(Boolean);

  const today          = todayString();
  const challenges     = getDailyChallenges(today);
  const completedToday = dailyChallenge.date === today ? dailyChallenge.completed : [];
  const pendingCount   = challenges.length - completedToday.length;

  const saveUsername = () => {
    if (nameInput.trim()) updateUsername(nameInput.trim());
    setEditing(false);
  };

  return (
    <div className="min-h-screen bg-background p-5 flex flex-col max-w-md mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex-1">{t('profile')}</h1>
        <Link href="/achievements">
          <Button variant="outline" size="sm">🏅 {t('achievements')}</Button>
        </Link>
      </div>

      {/* Avatar + username + title */}
      <div className="flex flex-col items-center gap-3 mb-6">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-2xl font-black"
          style={{ backgroundColor: `${leagueCfg.themeColor}25`, color: leagueCfg.themeColor,
            boxShadow: `0 0 40px ${leagueCfg.themeColor}33` }}>
          {initials}
        </div>

        {editing ? (
          <div className="flex items-center gap-2 w-full max-w-xs">
            <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveUsername(); if (e.key === 'Escape') setEditing(false); }}
              maxLength={20}
              className="flex-1 bg-card border border-border rounded-xl px-4 py-2 text-lg font-bold text-center outline-none focus:border-primary" />
            <Button size="sm" onClick={saveUsername}>{t('save_btn')}</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>{t('cancel_btn')}</Button>
          </div>
        ) : (
          <button onClick={() => { setNameInput(username); setEditing(true); }}
            className="group flex flex-col items-center gap-1">
            <span className="text-xl font-black">{username}</span>
            <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">{t('tap_to_edit')}</span>
          </button>
        )}

        <div className="text-sm font-bold" style={{ color: leagueCfg.themeColor }}>{title}</div>
      </div>

      {/* ELO Card */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">{t('elo_rating')}</div>
            <div className="text-4xl font-black tabular-nums" style={{ color: tier.color }}>{elo}</div>
          </div>
          <div className="text-right">
            <div className="px-3 py-1 rounded-full text-xs font-bold"
              style={{ backgroundColor: `${tier.color}20`, color: tier.color, border: `1px solid ${tier.color}40` }}>
              {tier.label}
            </div>
            <div className="text-xs text-muted-foreground mt-2">{matchesPlayed} {t('matches_played')}</div>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <div className="text-xs text-muted-foreground uppercase mb-4">{t('skills')}</div>
        <div className="space-y-4">
          <SkillBar label={t('skill_speed')}    value={skillSpeed}    color="#3AB4FF" />
          <SkillBar label={t('skill_accuracy')} value={skillAccuracy} color="#2EE87A" />
          <SkillBar label={t('skill_memory')}   value={skillMemory}   color="#B44FFF" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Coins className="w-3 h-3 text-yellow-400" />{t('total_coins')}
          </div>
          <div className="text-3xl font-black text-yellow-400 tabular-nums">{coins}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-xs text-muted-foreground mb-1">{t('best_score')}</div>
          <div className="text-3xl font-black text-primary tabular-nums">{bestScore}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-xs text-muted-foreground mb-1">{t('matches_played')}</div>
          <div className="text-3xl font-black tabular-nums">{matchesPlayed}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Zap className="w-3 h-3 text-orange-400" />{t('best_streak')}
          </div>
          <div className="text-3xl font-black text-orange-400 tabular-nums">{bestStreak}</div>
        </div>
      </div>

      {/* Recent Achievements */}
      {recentAchieves.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs text-muted-foreground uppercase">{t('achievements')}</div>
            <Link href="/achievements">
              <span className="text-xs text-primary hover:underline">{t('see_all')} ({achievements.length}/{ACHIEVEMENT_DEFS.length})</span>
            </Link>
          </div>
          <div className="flex gap-3">
            {recentAchieves.map(a => a && (
              <div key={a.id} className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-2xl border border-yellow-500/30">
                  {a.icon}
                </div>
                <span className="text-xs text-muted-foreground text-center leading-tight w-12 truncate">{a.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Challenges shortcut */}
      <Link href="/daily-challenges">
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between hover:bg-card/80 active:scale-[0.99] transition-all cursor-pointer">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <div className="font-semibold text-sm">{t('daily_challenges')}</div>
              <div className="text-xs text-muted-foreground">
                {completedToday.length}/{challenges.length} {t('completed')}
              </div>
            </div>
          </div>
          {pendingCount > 0 && (
            <span className="w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}
