import { useState, useEffect } from "react";
import { useGame } from "@/contexts/GameContext";
import { useT } from "@/lib/i18n";
import { Link } from "wouter";
import { ArrowLeft, Coins, Zap, Swords, Trophy, Copy, CheckCircle2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentLeague } from "@/lib/progression";
import { LEAGUES, LeagueId } from "@/lib/game-engine";
import { computeTitle, eloTier } from "@/lib/elo";
import { ACHIEVEMENT_DEFS } from "@/lib/achievements";
import { getDailyChallenges, todayString } from "@/lib/challenges";
import { getLevelTitle, xpProgressInLevel, TROPHIES } from "@/lib/xp";
import XPBar from "@/components/XPBar";
import { motion, AnimatePresence } from "framer-motion";
import { getReferral, buildShareText, buildResultShareText, REFERRAL_REWARD_PER_FRIEND, claimReferralReward } from "@/lib/referral";
import { generateAiHints, type AiHint } from "@/lib/ai-hints";
import { AVATAR_THEMES, getThemeById, getAvailableFrames, type AvatarTheme } from "@/lib/customization";
import { getVerificationStatus } from "@/lib/verified";

function SkillBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-bold tabular-nums" style={{ color }}>{value}</span>
      </div>
      <div className="h-2 bg-card rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full transition-all duration-700"
          initial={{ width: 0 }} animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ backgroundColor: color }} />
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
    xp, level, pvpWins, pvpLosses, pvpWinStreak, bestPvpStreak,
    tournamentWins, trophies, totalCoinsEarned, totalCoinsSpent,
    fame, verificationLevel, piLockTierId, piLockExpiry,
    dailyChallengesCompleted, xpBoostUntil,
    avatarThemeId, setAvatarTheme, addCoins,
    authUser, isGuest,
  } = ctx;
  const t = useT(language);

  const [editing, setEditing]       = useState(false);
  const [nameInput, setNameInput]   = useState(username);
  const [tab, setTab]               = useState<'stats' | 'trophies' | 'ai' | 'referral'>('stats');
  const [copied, setCopied]         = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [referralData, setReferralData] = useState(() => getReferral(username));
  const [hints, setHints]           = useState<AiHint[]>([]);
  const [claimMsg, setClaimMsg]     = useState<string | null>(null);

  const currentTheme = getThemeById(avatarThemeId ?? 'blue');
  const piLocked = !!(piLockTierId && piLockExpiry && piLockExpiry > Date.now());
  const availableFrames = getAvailableFrames(level, piLocked);
  const verif = getVerificationStatus((verificationLevel ?? 0) as 0 | 1 | 2);

  useEffect(() => {
    setHints(generateAiHints({
      level, elo, matchesPlayed, matchesWon, pvpWins, pvpLosses, pvpWinStreak,
      bestStreak, skillSpeed, skillAccuracy, skillMemory, coins, tournamentWins,
      dailyChallengesCompleted: dailyChallengesCompleted ?? 0,
      xpBoostUntil: xpBoostUntil ?? null,
    }));
  }, [level, elo, matchesPlayed, pvpWins, pvpLosses, skillSpeed, skillAccuracy]);

  const currentLeague = getCurrentLeague(ctx as any);
  const leagueCfg     = LEAGUES[currentLeague as LeagueId];
  const title         = computeTitle(elo, matchesPlayed, skillMemory, skillSpeed);
  const tier          = eloTier(elo);
  const bestScore     = Math.max(0, ...Object.values(highScores));
  const initials      = username.slice(0, 2).toUpperCase();
  const { title: levelTitle, color: levelColor } = getLevelTitle(level);

  const recentAchieves = [...achievements]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)
    .map(a => ACHIEVEMENT_DEFS.find(d => d.id === a.id))
    .filter(Boolean);

  const today          = todayString();
  const challenges     = getDailyChallenges(today);
  const completedToday = dailyChallenge.date === today ? dailyChallenge.completed : [];
  const pendingCount   = challenges.length - completedToday.length;
  const earnedTrophyIds = trophies.map(t => t.id);

  const saveUsername = () => {
    if (nameInput.trim()) updateUsername(nameInput.trim());
    setEditing(false);
  };

  function copyCode() {
    navigator.clipboard.writeText(referralData.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareResult() {
    const text = buildResultShareText(username, Math.max(0, ...Object.values(highScores)), Math.round(skillAccuracy), bestStreak);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    });
  }

  function handleClaimReferral() {
    const { data, coinsReward } = claimReferralReward(referralData);
    setReferralData(data);
    if (coinsReward > 0) {
      addCoins(coinsReward);
      setClaimMsg(`+${coinsReward} coins claimed!`);
      setTimeout(() => setClaimMsg(null), 3000);
    }
  }

  const TABS = [
    { id: 'stats',    label: '📊 Stats' },
    { id: 'trophies', label: `🏆 (${earnedTrophyIds.length})` },
    { id: 'ai',       label: '🤖 AI Tips', badge: hints.filter(h => h.priority === 'high').length },
    { id: 'referral', label: '🔗 Invite' },
  ] as const;

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col max-w-md mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-5">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="w-6 h-6" /></Button>
        </Link>
        <h1 className="text-2xl font-bold flex-1">{t('profile')}</h1>
        <button onClick={shareResult}
          className="flex items-center gap-1.5 text-xs text-primary font-semibold border border-primary/30 rounded-xl px-3 py-1.5 hover:bg-primary/10 active:scale-95 transition-all">
          {copiedShare ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
          {copiedShare ? 'Copied!' : 'Share'}
        </button>
      </div>

      {/* Avatar + Theme selector */}
      <div className="flex flex-col items-center gap-3 mb-5">
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-2xl font-black transition-all"
            style={{ backgroundColor: currentTheme.bg, color: currentTheme.text, boxShadow: `0 0 32px ${currentTheme.glow}` }}>
            {initials}
          </div>
          <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full text-xs font-black"
            style={{ backgroundColor: levelColor, color: '#000' }}>{level}</div>
          {verif.badge && (
            <div className="absolute -top-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center text-sm font-black"
              style={{ backgroundColor: verif.color + '30', color: verif.color }}>{verif.badge}</div>
          )}
        </div>

        {/* Theme color picker */}
        <div className="flex items-center gap-1.5">
          {AVATAR_THEMES.map(theme => (
            <button key={theme.id} onClick={() => setAvatarTheme(theme.id)}
              className={`w-6 h-6 rounded-full border-2 transition-all active:scale-90 ${avatarThemeId === theme.id ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
              style={{ backgroundColor: theme.text }} />
          ))}
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
        <div className="text-sm font-bold" style={{ color: levelColor }}>{levelTitle}</div>
        <div className="text-xs text-muted-foreground">{title}</div>

        {/* Auth badge */}
        {authUser && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: authUser.authMode === 'google' ? 'rgba(66,133,244,0.15)' : authUser.authMode === 'pi' ? 'rgba(124,58,237,0.15)' : 'rgba(107,114,128,0.15)',
              border: `1px solid ${authUser.authMode === 'google' ? 'rgba(66,133,244,0.4)' : authUser.authMode === 'pi' ? 'rgba(124,58,237,0.4)' : 'rgba(107,114,128,0.4)'}`,
              color: authUser.authMode === 'google' ? '#4285F4' : authUser.authMode === 'pi' ? '#a78bfa' : '#9ca3af',
            }}>
            {authUser.authMode === 'google' && <><span>🔵</span><span>Google Account</span></>}
            {authUser.authMode === 'pi' && <><span>π</span><span>Pi Network</span></>}
            {authUser.authMode === 'guest' && <><span>👤</span><span>وضع الضيف</span></>}
          </div>
        )}

        {/* Verification */}
        {verif.badge && (
          <div className="flex items-center gap-1 text-sm font-bold" style={{ color: verif.color }}>
            <span>{verif.badge}</span>
            <span>{verif.label}</span>
          </div>
        )}
      </div>

      {/* XP Bar */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <XPBar xp={xp} level={level} />
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-card border border-border rounded-xl p-1 mb-4 overflow-x-auto">
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id as any)}
            className="relative flex-1 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all min-w-[60px]"
            style={{ background: tab === tb.id ? 'hsl(var(--primary))' : 'transparent', color: tab === tb.id ? 'white' : 'hsl(var(--muted-foreground))' }}>
            {tb.label}
            {(tb as any).badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                {(tb as any).badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Stats ─────────────────────────────────────────────── */}
      {tab === 'stats' && (
        <>
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

          <div className="bg-card border border-border rounded-2xl p-5 mb-4">
            <div className="text-xs text-muted-foreground uppercase mb-3 flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5" /> PvP Stats
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center"><div className="text-2xl font-black text-green-400">{pvpWins}</div><div className="text-xs text-muted-foreground">Wins</div></div>
              <div className="text-center"><div className="text-2xl font-black text-red-400">{pvpLosses}</div><div className="text-xs text-muted-foreground">Losses</div></div>
              <div className="text-center"><div className="text-2xl font-black text-orange-400">{bestPvpStreak}</div><div className="text-xs text-muted-foreground">Best Streak</div></div>
            </div>
            {pvpWins + pvpLosses > 0 && (
              <div className="mt-3 h-1.5 rounded-full bg-background overflow-hidden">
                <div className="h-full bg-green-400 rounded-full"
                  style={{ width: `${Math.round((pvpWins / (pvpWins + pvpLosses)) * 100)}%` }} />
              </div>
            )}
            {tournamentWins > 0 && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-muted-foreground">Tournament wins: <span className="font-bold text-yellow-400">{tournamentWins}</span></span>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 mb-4">
            <div className="text-xs text-muted-foreground uppercase mb-4">{t('skills')}</div>
            <div className="space-y-4">
              <SkillBar label={t('skill_speed')}    value={skillSpeed}    color="#3AB4FF" />
              <SkillBar label={t('skill_accuracy')} value={skillAccuracy} color="#2EE87A" />
              <SkillBar label={t('skill_memory')}   value={skillMemory}   color="#B44FFF" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Coins className="w-3 h-3 text-yellow-400" />{t('total_coins')}
              </div>
              <div className="text-3xl font-black text-yellow-400 tabular-nums">{coins}</div>
              <div className="text-xs text-muted-foreground mt-1">+{totalCoinsEarned} earned</div>
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
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-2xl border border-yellow-500/30">{a.icon}</div>
                    <span className="text-xs text-muted-foreground text-center leading-tight w-12 truncate">{a.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Trophies ────────────────────────────────────────────── */}
      {tab === 'trophies' && (
        <div className="space-y-2">
          {TROPHIES.map(tr => {
            const earned = earnedTrophyIds.includes(tr.id);
            return (
              <motion.div key={tr.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="bg-card border rounded-2xl p-4 flex items-center gap-3 transition-all"
                style={{ borderColor: earned ? 'rgba(255,215,0,0.4)' : 'hsl(var(--border))', opacity: earned ? 1 : 0.5 }}>
                <div className="text-3xl">{tr.icon}</div>
                <div className="flex-1">
                  <div className="font-bold text-sm" style={{ color: earned ? '#FFD700' : undefined }}>{tr.name}</div>
                  <div className="text-xs text-muted-foreground">{tr.desc}</div>
                </div>
                {earned ? <div className="text-xs text-green-400 font-bold">✓ Earned</div> : <div className="text-xs text-muted-foreground">🔒</div>}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── AI Tips ─────────────────────────────────────────────── */}
      {tab === 'ai' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3 text-xs text-primary">
            🤖 Personalized tips based on your real performance data
          </div>
          {hints.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p>Play more matches to unlock AI tips!</p>
            </div>
          )}
          {hints.map((hint, idx) => (
            <motion.div key={hint.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={`rounded-2xl border bg-card p-4 space-y-2 ${hint.priority === 'high' ? 'border-red-500/30 bg-red-500/5' : hint.priority === 'medium' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{hint.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-bold">{hint.title}</div>
                  {hint.priority === 'high' && <span className="text-[10px] text-red-400 font-bold">HIGH PRIORITY</span>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{hint.body}</p>
              {hint.actionLabel && hint.actionUrl && (
                <Link href={hint.actionUrl}>
                  <Button size="sm" variant="outline" className="text-xs h-7">{hint.actionLabel} →</Button>
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Referral ─────────────────────────────────────────────── */}
      {tab === 'referral' && (
        <div className="space-y-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="text-sm font-bold">Your Referral Code</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted/40 border border-border rounded-xl px-4 py-3 text-xl font-black text-center tracking-widest">
                {referralData.code}
              </div>
              <button onClick={copyCode}
                className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary active:scale-95 transition-transform">
                {copied ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/30 p-3 text-center">
                <div className="text-2xl font-black text-primary">{referralData.joinedCount}</div>
                <div className="text-xs text-muted-foreground">Friends joined</div>
              </div>
              <div className="rounded-xl bg-muted/30 p-3 text-center">
                <div className="text-2xl font-black text-yellow-400">{(referralData.joinedCount - referralData.rewardedCount) * REFERRAL_REWARD_PER_FRIEND}</div>
                <div className="text-xs text-muted-foreground">Coins to claim</div>
              </div>
            </div>
            {referralData.joinedCount > referralData.rewardedCount ? (
              <Button className="w-full" onClick={handleClaimReferral}>
                🎁 Claim {(referralData.joinedCount - referralData.rewardedCount) * REFERRAL_REWARD_PER_FRIEND} Coins
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground text-center">Invite friends to earn {REFERRAL_REWARD_PER_FRIEND} coins per friend</p>
            )}
            {claimMsg && <p className="text-xs text-green-400 text-center font-bold">{claimMsg}</p>}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="text-sm font-bold">Share Your Result</div>
            <p className="text-xs text-muted-foreground">Copy your match result card and share it on social media or Pi community groups.</p>
            <button onClick={shareResult}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/15 border border-primary/30 text-primary font-semibold text-sm hover:bg-primary/20 active:scale-95 transition-all">
              {copiedShare ? <CheckCircle2 className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copiedShare ? 'Copied to clipboard!' : 'Copy Result Card'}
            </button>
            <div className="rounded-xl bg-muted/30 p-3 font-mono text-xs text-muted-foreground whitespace-pre-line">
              {buildResultShareText(username, bestScore, Math.round(skillAccuracy), bestStreak)}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <div className="text-sm font-bold">How it works</div>
            {[
              { icon: '1️⃣', text: 'Share your code with friends' },
              { icon: '2️⃣', text: 'Friend enters code when they join' },
              { icon: '3️⃣', text: `You earn ${REFERRAL_REWARD_PER_FRIEND} coins per friend` },
              { icon: '4️⃣', text: 'No limit on referrals' },
            ].map(s => (
              <div key={s.icon} className="flex items-center gap-3 text-sm">
                <span className="text-lg">{s.icon}</span>
                <span className="text-muted-foreground">{s.text}</span>
              </div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Daily Challenges shortcut */}
      <Link href="/daily-challenges" className="mt-4 block">
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between hover:bg-card/80 active:scale-[0.99] transition-all cursor-pointer">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <div className="font-semibold text-sm">{t('daily_challenges')}</div>
              <div className="text-xs text-muted-foreground">{completedToday.length}/{challenges.length} {t('completed')}</div>
            </div>
          </div>
          {pendingCount > 0 && (
            <span className="w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">{pendingCount}</span>
          )}
        </div>
      </Link>
    </div>
  );
}
