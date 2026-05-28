import { useEffect, useState, useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { useT } from "@/lib/i18n";
import { Link } from "wouter";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageSelector from "@/components/LanguageSelector";
import { getDailyChallenges, todayString } from "@/lib/challenges";
import { getWeeklyMissions, getWeekString } from "@/lib/weekly-challenges";
import { getLevelTitle, xpProgressInLevel } from "@/lib/xp";
import { getFameTitle } from "@/lib/fame";
import { getVerificationStatus } from "@/lib/verified";
import { getNotifications, unreadCount } from "@/lib/messages";
import { getActiveLockTier } from "@/lib/pi-lock";
import { motion } from "framer-motion";
import { getJourneyTier, getNextJourneyTier, journeyProgress } from "@/lib/journey";
import { loadStreakData } from "@/lib/login-streak";

export default function Home() {
  const {
    user, login, logout, language, setLanguage,
    coins, elo, matchesPlayed, dailyChallenge,
    xp, level, pvpWins, pvpLosses, fame,
    weeklyChallenge, verificationLevel, piLockTierId, piLockExpiry,
    authUser, isGuest,
  } = useGame();
  const t = useT(language);
  const game = useGame();

  const [unread, setUnread] = useState(0);
  useEffect(() => {
    setUnread(unreadCount(getNotifications()));
  }, []);

  const today         = todayString();
  const challenges    = getDailyChallenges(today);
  const completedToday = dailyChallenge.date === today ? dailyChallenge.completed : [];
  const pendingDaily  = challenges.length - completedToday.length;

  const thisWeek      = getWeekString();
  const weeklyMissions = getWeeklyMissions(thisWeek);
  const wc             = weeklyChallenge?.week === thisWeek ? weeklyChallenge : { week: thisWeek, completedIds: [], progress: {} };
  const pendingWeekly  = weeklyMissions.length - wc.completedIds.length;
  const totalPending   = pendingDaily + pendingWeekly;

  const { pct: xpPct }                         = xpProgressInLevel(xp);
  const { title: levelTitle, color: levelColor } = getLevelTitle(level);
  const fameTitle    = getFameTitle(fame || 0);
  const verif        = getVerificationStatus((verificationLevel ?? 0) as 0 | 1 | 2);
  const activeLock   = getActiveLockTier(piLockTierId ?? null, piLockExpiry ?? null);

  // Journey + Streak
  const journeyTier  = useMemo(() => getJourneyTier(game as any), [elo, level, matchesPlayed]);
  const nextJourney  = useMemo(() => getNextJourneyTier(journeyTier), [journeyTier]);
  const jProgress    = useMemo(() => nextJourney ? journeyProgress(game as any, nextJourney) : null, [game, nextJourney]);
  const streakData   = useMemo(() => loadStreakData(), []);

  const NavBtn = ({ href, icon, label, color, badge }: {
    href: string; icon: string; label: string; color?: string; badge?: number;
  }) => (
    <Link href={href} className="block">
      <button className="relative w-full h-16 rounded-2xl border border-border bg-card flex flex-col items-center justify-center gap-1 hover:bg-card/70 active:scale-95 transition-all"
        style={color ? { borderColor: color + '40', backgroundColor: color + '12' } : {}}>
        <span className="text-2xl leading-none">{icon}</span>
        <span className="text-xs font-bold" style={color ? { color } : { color: 'hsl(var(--muted-foreground))' }}>{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center px-1">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background text-foreground overflow-y-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-2.5 flex justify-between items-center">
        <LanguageSelector current={language} onChange={setLanguage} />
        <div className="flex items-center gap-2">
          <Link href="/wallet">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-sm font-medium hover:bg-card/80 active:scale-95 transition-transform">
              <span className="font-black tabular-nums text-yellow-400">{coins}</span>
              <span className="text-yellow-400">🪙</span>
            </button>
          </Link>
          {/* Auth badge */}
          {authUser && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl border border-border bg-card text-xs font-medium max-w-[90px] overflow-hidden">
              {authUser.authMode === 'google' && <span>🔵</span>}
              {authUser.authMode === 'pi' && <span>π</span>}
              {authUser.authMode === 'guest' && <span>👤</span>}
              <span className="truncate text-muted-foreground">{isGuest ? 'ضيف' : authUser.username}</span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={logout} className="text-xs">خروج</Button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-5">

        {/* Logo + Player identity */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-[0_0_24px_rgba(var(--primary),0.4)] flex items-center justify-center flex-shrink-0">
            <Zap className="w-9 h-9 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-2xl font-black">SkillLeague</h1>
              {verif.badge && (
                <span className="text-sm font-bold" style={{ color: verif.color }}>{verif.badge}</span>
              )}
              {activeLock && (
                <span className="text-sm">{activeLock.icon}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest truncate">{t('tagline')}</p>
          </div>
        </motion.div>

        {/* Level + XP */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tabular-nums" style={{ color: levelColor }}>{level}</span>
              <div>
                <div className="text-sm font-bold leading-none" style={{ color: levelColor }}>{levelTitle}</div>
                <div className="text-xs text-muted-foreground">Level</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {(fame || 0) > 0 && (
                <div className="flex items-center gap-1 text-xs" style={{ color: fameTitle.color }}>
                  <span>{fameTitle.icon}</span>
                  <span className="font-bold tabular-nums">{fame}</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground">{xpPct}% to next</div>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ backgroundColor: levelColor }}
              initial={{ width: 0 }} animate={{ width: `${xpPct}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }} />
          </div>
          <div className="flex items-center gap-4 pt-1">
            <div className="flex flex-col items-center">
              <span className="text-base font-black tabular-nums text-yellow-400">{coins}</span>
              <span className="text-[10px] text-muted-foreground uppercase">Coins</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex flex-col items-center">
              <span className="text-base font-black tabular-nums text-primary">{elo}</span>
              <span className="text-[10px] text-muted-foreground uppercase">ELO</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex flex-col items-center">
              <span className="text-base font-black tabular-nums">{pvpWins}W/{pvpLosses}L</span>
              <span className="text-[10px] text-muted-foreground uppercase">PvP</span>
            </div>
            {activeLock && (
              <>
                <div className="w-px h-6 bg-border" />
                <div className="flex flex-col items-center">
                  <span className="text-base font-black" style={{ color: activeLock.color }}>{activeLock.icon}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">Locked</span>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Journey + Streak banner */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <Link href="/journey" className="block">
            <div className="rounded-2xl border border-border bg-card overflow-hidden active:scale-[0.98] transition-transform"
              style={{ borderColor: journeyTier.color + '50', background: `linear-gradient(135deg, ${journeyTier.glow}, transparent)` }}>
              <div className="flex items-center gap-3 p-3">
                {/* Journey */}
                <div className="text-3xl">{journeyTier.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black" style={{ color: journeyTier.color }}>{journeyTier.ar}</span>
                    {nextJourney && jProgress && (
                      <span className="text-[10px] text-muted-foreground">← {nextJourney.icon} {nextJourney.ar}</span>
                    )}
                    {!nextJourney && <span className="text-[10px] text-yellow-400">🏆 أعلى مرتبة!</span>}
                  </div>
                  {nextJourney && jProgress && (
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${jProgress.overall}%`,
                        background: `linear-gradient(90deg, ${journeyTier.color}, ${nextJourney.color})`,
                      }} />
                    </div>
                  )}
                </div>
                {/* Streak */}
                <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-500/15 rounded-xl border border-orange-500/30">
                  <span className="text-lg">🔥</span>
                  <div className="text-center">
                    <div className="text-base font-black text-orange-400 tabular-nums leading-none">{streakData.currentStreak}</div>
                    <div className="text-[9px] text-muted-foreground leading-none mt-0.5">يوم</div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* PLAY button */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08 }}>
          <Link href="/leagues" className="w-full block">
            <Button size="lg" className="w-full h-14 text-xl font-black shadow-[0_0_24px_rgba(var(--primary),0.35)] active:scale-95">
              🎮 {t('play')}
            </Button>
          </Link>
        </motion.div>

        {/* ── Group 1: Main ─────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">Main</div>
          <div className="grid grid-cols-3 gap-2">
            <NavBtn href="/pvp"        icon="⚔️" label="Ranked"    color="#FF3A5E" />
            <NavBtn href="/tournament" icon="🏆" label="Tournament" color="#FFD700" />
            <NavBtn href="/rooms"      icon="🏟️" label="Rooms" />
            <NavBtn href="/community"  icon="💬" label="Feed"       color="#3AB4FF" />
            <NavBtn href="/messages"   icon="🔔" label="Messages"   color="#FF9B3A" badge={unread} />
            <NavBtn href="/journey"    icon="🗺️" label="رحلتي"     color="#60a5fa" />
          </div>
        </motion.div>

        {/* ── Group 2: Economy ──────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">Economy</div>
          <div className="grid grid-cols-4 gap-2">
            <NavBtn href="/store"     icon="🛒"  label="Store"   color="#2EE87A" />
            <NavBtn href="/wallet"    icon="💎"  label="Wallet"  color="#FFD700" />
            <NavBtn href="/community" icon="🔥"  label="Boost"   color="#FF9B3A" />
            <NavBtn href="/pi-lock"   icon="🔒"  label="Pi Lock" color="#B44FFF" />
          </div>
        </motion.div>

        {/* ── Group 3: Competition ──────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">Competition</div>
          <div className="grid grid-cols-3 gap-2">
            <NavBtn href="/leaderboard"     icon="📊" label="Leaderboard" />
            <NavBtn href="/seasons"         icon="🌀" label="Seasons"     color="#B44FFF" />
            <NavBtn href="/daily-challenges" icon="📅" label="Challenges"  badge={totalPending} />
          </div>
        </motion.div>

        {/* ── Group 4: Extra ────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }}>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">More</div>
          <div className="grid grid-cols-2 gap-2">
            <NavBtn href="/pi-lock"   icon={verif.badge || "✓"} label="Verified" color={verif.color} />
            <NavBtn href="/settings"  icon="⚙️" label="Settings" />
          </div>
        </motion.div>

      </div>
    </div>
  );
}
