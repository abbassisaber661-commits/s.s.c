import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link } from "wouter";
import { ChevronLeft, Trophy, Star, Zap, Target, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { playTap, playCoin } from "@/lib/sounds";
import { isRTL } from "@/lib/i18n";
import {
  CAREER_TIERS, CAREER_MILESTONES, getCurrentCareerTier, getNextCareerTier,
  getCareerProgress, getClaimedMilestones, claimMilestone,
  type CareerStats,
} from "@/lib/career";

export default function Career() {
  const { language, level, elo, matchesPlayed, pvpWins, tournamentWins, achievements, dnBalance, bestStreak, fame, addDN } = useGame();
  const rtl = isRTL(language);

  const stats: CareerStats = {
    level, elo, matchesPlayed, pvpWins, tournamentWins,
    achievementCount: achievements.length, dn: dnBalance ?? 0, bestStreak, fame: fame ?? 0,
  };

  const currentTier  = getCurrentCareerTier(stats);
  const nextTier     = getNextCareerTier(stats);
  const progressPct  = getCareerProgress(stats, nextTier);
  const [claimed, setClaimed] = useState(getClaimedMilestones());
  const [claimAnim, setClaimAnim] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function handleClaim(milestoneId: string, reward: { dn: number; xp: number }) {
    claimMilestone(milestoneId);
    setClaimed(getClaimedMilestones());
    addDN(reward.dn);
    setClaimAnim(milestoneId);
    setTimeout(() => setClaimAnim(null), 1000);
    playCoin();
    showToast(`🎁 +${reward.dn} DN$ · +${reward.xp} XP`, true);
  }

  const earnedMilestones   = CAREER_MILESTONES.filter(m => m.requirement(stats));
  const unclaimedEarned    = earnedMilestones.filter(m => !claimed.includes(m.id));
  const nextMilestone      = CAREER_MILESTONES.find(m => !m.requirement(stats));

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="min-h-screen bg-background text-foreground pb-24">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/60 px-4 py-3 flex items-center gap-3">
        <button className="p-2 rounded-xl hover:bg-card active:scale-95 transition-all" onClick={() => { playTap(); window.history.back(); }}><ChevronLeft className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} /></button>
        <h1 className="text-lg font-black flex-1">🛣️ {language === 'ar' ? 'مسار المهنة' : 'Career'}</h1>
        {unclaimedEarned.length > 0 && (
          <span className="min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center px-1">
            {unclaimedEarned.length}
          </span>
        )}
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-5">

        {/* Current tier card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border p-5"
          style={{ borderColor: currentTier.color + '50', background: `linear-gradient(135deg, ${currentTier.color}15, ${currentTier.color}05)` }}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: currentTier.color + '25' }}>
              {currentTier.icon}
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">{language === 'ar' ? 'مستواك الحالي' : 'Current Tier'}</div>
              <div className="text-xl font-black" style={{ color: currentTier.color }}>
                {language === 'ar' ? currentTier.nameAr : currentTier.name}
              </div>
              <div className="text-xs text-muted-foreground">{language === 'ar' ? currentTier.descriptionAr : currentTier.description}</div>
            </div>
          </div>

          {nextTier && (
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{language === 'ar' ? 'التقدم نحو' : 'Progress to'} {language === 'ar' ? nextTier.nameAr : nextTier.name}</span>
                <span style={{ color: currentTier.color }}>{progressPct}%</span>
              </div>
              <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full" initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }} transition={{ duration: 1.2, ease: 'easeOut' }}
                  style={{ background: currentTier.color }} />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Lv.{level} / {nextTier.minLevel}</span>
                <span>{elo} / {nextTier.minElo} ELO</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Career Path */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-bold mb-4">{language === 'ar' ? '🛣️ طريق الأسطورة' : '🛣️ Road to Legend'}</p>
          <div className="relative">
            {/* Line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-3">
              {CAREER_TIERS.map((tier, i) => {
                const isActive   = tier.id === currentTier.id;
                const isPast     = CAREER_TIERS.indexOf(currentTier) > i;
                const isFuture   = !isActive && !isPast;
                return (
                  <motion.div key={tier.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`flex items-start gap-4 ${isFuture ? 'opacity-40' : ''}`}>
                    <div className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 border-2 transition-all"
                      style={isActive ? { background: tier.color + '30', borderColor: tier.color, boxShadow: `0 0 16px ${tier.color}40` } :
                             isPast   ? { background: '#22c55e20', borderColor: '#22c55e' } :
                                        { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                      {isPast ? '✅' : tier.icon}
                    </div>
                    <div className="flex-1 pt-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={isActive ? { color: tier.color } : {}}>
                          {language === 'ar' ? tier.nameAr : tier.name}
                        </span>
                        {isActive && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: tier.color + '20', color: tier.color }}>YOU</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Lv.{tier.minLevel}+ · {tier.minElo}+ ELO
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-bold">{language === 'ar' ? '🎯 إنجازات المسيرة' : '🎯 Career Milestones'}</p>
          {CAREER_MILESTONES.map((m, i) => {
            const earned   = m.requirement(stats);
            const isClaimed = claimed.includes(m.id);
            const isAnimating = claimAnim === m.id;
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className={`rounded-xl border p-3 ${
                  isClaimed ? 'border-green-500/20 bg-green-500/5' :
                  earned    ? 'border-primary/30 bg-primary/5' :
                              'border-border opacity-50'
                }`}>
                <div className="flex items-center gap-3">
                  <motion.div animate={isAnimating ? { scale: [1, 1.4, 1], rotate: [0, 20, -20, 0] } : {}}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: earned ? 'hsl(var(--primary)/0.15)' : 'hsl(var(--card))' }}>
                    {m.icon}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold">{language === 'ar' ? m.titleAr : m.title}</div>
                    <div className="text-[10px] text-muted-foreground">{language === 'ar' ? m.descriptionAr : m.description}</div>
                    <div className="text-[10px] text-yellow-400 font-bold mt-0.5">
                      🎁 +{m.reward.dn} DN$ · +{m.reward.xp} XP
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {isClaimed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : earned ? (
                      <Button size="sm" onClick={() => handleClaim(m.id, m.reward)} className="text-xs h-7 px-2 font-bold">
                        {language === 'ar' ? 'احتسب' : 'Claim'}
                      </Button>
                    ) : (
                      <div className="text-[10px] text-muted-foreground text-right">🔒</div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Current perks */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-bold mb-3">{language === 'ar' ? '⚡ مزاياك الحالية' : '⚡ Your Current Perks'}</p>
          {(language === 'ar' ? currentTier.perksAr : currentTier.perks).map((perk, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
              <Star className="w-3.5 h-3.5 flex-shrink-0" style={{ color: currentTier.color }} />
              <span className="text-xs">{perk}</span>
            </div>
          ))}
        </div>

      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 48 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-bold shadow-xl z-50 border bg-green-500/15 border-green-500/40 text-green-400">
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
