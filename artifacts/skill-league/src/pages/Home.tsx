import { useGame } from "@/contexts/GameContext";
import { useT } from "@/lib/i18n";
import { Link } from "wouter";
import { Zap, Info, User, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageSelector from "@/components/LanguageSelector";
import { getDailyChallenges, todayString } from "@/lib/challenges";
import { computeTitle } from "@/lib/elo";
import { getLevelTitle, xpProgressInLevel } from "@/lib/xp";
import { motion } from "framer-motion";

export default function Home() {
  const { user, login, logout, language, setLanguage, coins, elo,
    skillSpeed, skillAccuracy, skillMemory, matchesPlayed, dailyChallenge,
    xp, level, pvpWins, pvpLosses } = useGame();
  const t = useT(language);

  const today         = todayString();
  const challenges    = getDailyChallenges(today);
  const completedToday = dailyChallenge.date === today ? dailyChallenge.completed : [];
  const pendingCount  = challenges.length - completedToday.length;
  const title         = computeTitle(elo, matchesPlayed, skillMemory, skillSpeed);
  const { pct: xpPct } = xpProgressInLevel(xp);
  const { title: levelTitle, color: levelColor } = getLevelTitle(level);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Top bar */}
      <div className="w-full max-w-md flex justify-between items-center absolute top-0 pt-5 px-5 z-10">
        <LanguageSelector current={language} onChange={setLanguage} />
        <div className="flex items-center gap-2">
          <Link href="/profile">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-sm font-medium hover:bg-card/80 active:scale-95 transition-transform">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold tabular-nums">{coins}</span>
              <Coins className="w-3.5 h-3.5 text-yellow-400" />
            </button>
          </Link>
          {user ? (
            <Button variant="outline" size="sm" onClick={logout}>{t('logout')}</Button>
          ) : (
            <Button onClick={login} variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/10">
              {t('sign_in_pi')}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md z-10 space-y-8">

        {/* Logo */}
        <div className="text-center space-y-3 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-accent shadow-[0_0_40px_rgba(var(--primary),0.5)] mb-2">
            <Zap className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-black tracking-tight">{t('app_name')}</h1>
          <p className="text-sm text-muted-foreground uppercase tracking-widest">{t('tagline')}</p>
        </div>

        {/* Level + XP bar */}
        <div className="w-full animate-in fade-in zoom-in-95 duration-700 delay-100">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tabular-nums" style={{ color: levelColor }}>{level}</span>
              <div>
                <div className="text-sm font-bold leading-none" style={{ color: levelColor }}>{levelTitle}</div>
                <div className="text-xs text-muted-foreground leading-none mt-0.5">Level</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">{xpPct}% to next</div>
          </div>
          <div className="h-2 bg-card rounded-full overflow-hidden border border-border/50">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: levelColor }}
              initial={{ width: 0 }}
              animate={{ width: `${xpPct}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
            />
          </div>
        </div>

        {/* ELO + coins row */}
        <div className="flex items-center gap-6 animate-in fade-in zoom-in-95 duration-700 delay-150">
          <div className="flex flex-col items-center gap-1">
            <div className="text-3xl font-black tabular-nums text-yellow-400">{coins}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">{t('coins')}</div>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="flex flex-col items-center gap-1">
            <div className="text-3xl font-black tabular-nums text-primary">{elo}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">ELO</div>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="flex flex-col items-center gap-1">
            <div className="text-sm font-bold text-center leading-tight">{pvpWins}W / {pvpLosses}L</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">PvP</div>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full space-y-3 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <Link href="/leagues" className="w-full block">
            <Button size="lg" className="w-full h-16 text-xl font-bold shadow-[0_0_20px_rgba(var(--primary),0.3)] active:scale-95">
              {t('play')}
            </Button>
          </Link>

          {/* PvP Row */}
          <div className="grid grid-cols-3 gap-2">
            <Link href="/pvp" className="block col-span-1">
              <button className="w-full h-14 rounded-xl border border-red-500/30 bg-red-500/10 text-sm font-bold flex flex-col items-center justify-center gap-0.5 hover:bg-red-500/20 active:scale-95 transition-all">
                <span className="text-lg">⚔️</span>
                <span className="text-red-400 text-xs">PvP</span>
              </button>
            </Link>
            <Link href="/rooms" className="block col-span-1">
              <button className="w-full h-14 rounded-xl border border-border bg-card text-sm font-bold flex flex-col items-center justify-center gap-0.5 hover:bg-card/80 active:scale-95 transition-all">
                <span className="text-lg">🏟️</span>
                <span className="text-xs text-muted-foreground">Rooms</span>
              </button>
            </Link>
            <Link href="/tournament" className="block col-span-1">
              <button className="w-full h-14 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-sm font-bold flex flex-col items-center justify-center gap-0.5 hover:bg-yellow-500/20 active:scale-95 transition-all">
                <span className="text-lg">🏆</span>
                <span className="text-yellow-400 text-xs">Cup</span>
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/daily-challenges" className="block">
              <button className="relative w-full h-12 rounded-xl border border-border bg-card text-sm font-semibold flex items-center justify-center gap-2 hover:bg-card/80 active:scale-95 transition-transform">
                📅 {t('daily_challenges')}
                {pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </button>
            </Link>
            <Link href="/achievements" className="block">
              <button className="w-full h-12 rounded-xl border border-border bg-card text-sm font-semibold flex items-center justify-center gap-2 hover:bg-card/80 active:scale-95 transition-transform">
                🏅 {t('achievements')}
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/rules" className="block">
              <Button variant="outline" size="lg" className="w-full h-12 font-semibold gap-2">
                <Info className="w-4 h-4" /> {t('rules')}
              </Button>
            </Link>
            <Link href="/leaderboard" className="block">
              <Button variant="outline" size="lg" className="w-full h-12 font-semibold gap-2">
                🏆 {t('leaderboard')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
