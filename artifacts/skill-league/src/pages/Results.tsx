import { useEffect, useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link, useLocation } from "wouter";
import { TrendingUp, TrendingDown, Star, Share2 } from "lucide-react";
import { LEAGUES, LeagueId } from "@/lib/game-engine";
import { getDailyChallenges, todayString } from "@/lib/challenges";
import { xpProgressInLevel, getLevelTitle } from "@/lib/xp";
import { motion, AnimatePresence } from "framer-motion";
import WinAnimation from "@/components/WinAnimation";
import { playWin, playLose, playLevelUp, playAchievement, playCoin } from "@/lib/sounds";
import { addPost, createPost } from "@/lib/community";

const RANK_LABELS = (acc: number, score: number): { icon: string; label: string; color: string } => {
  if (acc >= 90 && score >= 120) return { icon: '👑', label: 'أسطوري',    color: '#FFD700' };
  if (acc >= 80 && score >= 90)  return { icon: '💎', label: 'ممتاز',     color: '#60a5fa' };
  if (acc >= 70 && score >= 60)  return { icon: '⭐', label: 'جيد جداً',  color: '#a78bfa' };
  if (acc >= 60)                 return { icon: '✅', label: 'جيد',        color: '#34d399' };
  return                                { icon: '💪', label: 'استمر',      color: '#f87171' };
};

export default function Results() {
  const {
    language, username, level, fame,
    lastScore, lastAccuracy, lastCoinsEarned,
    lastStreak, lastCorrect, lastUnlockedLeague,
    lastEloChange, lastNewAchievements, lastChallengesCompleted,
    lastXpEarned, lastLevelUp, lastNewTrophies,
    elo, xp,
  } = useGame();
  const [, setLocation] = useLocation();

  const [showWinAnim, setShowWinAnim]   = useState(false);
  const [shared, setShared]             = useState(false);

  const unlockedCfg    = lastUnlockedLeague ? LEAGUES[lastUnlockedLeague as LeagueId] : null;
  const today          = todayString();
  const todayChallenges = getDailyChallenges(today);
  const completedNames  = lastChallengesCompleted.map(id => todayChallenges.find(c => c.id === id)).filter(Boolean);
  const isGoodResult   = lastScore > 0 && lastAccuracy >= 60;
  const rank           = RANK_LABELS(lastAccuracy, lastScore);

  const { pct: xpPct, needed: xpNeeded } = xpProgressInLevel(xp);
  const { color: levelColor } = getLevelTitle(level);

  useEffect(() => {
    if (isGoodResult) {
      const t1 = setTimeout(() => { setShowWinAnim(true); playWin(); }, 350);
      const t2 = setTimeout(() => setShowWinAnim(false), 3000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      playLose();
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (lastLevelUp) setTimeout(() => playLevelUp(), 600);
  }, [lastLevelUp]);

  useEffect(() => {
    if (lastNewAchievements.length > 0) setTimeout(() => playAchievement(), 800);
  }, [lastNewAchievements]);

  useEffect(() => {
    if (lastCoinsEarned > 0) setTimeout(() => playCoin(), 400);
  }, [lastCoinsEarned]);

  function handleShare() {
    const text = `🎮 سجّلت ${lastScore} نقطة في SkillLeague! دقة ${lastAccuracy}% وسلسلة ${lastStreak} ✨`;
    const post = createPost(username, level, fame, text, 'text');
    addPost(post);
    setShared(true);
    setTimeout(() => setShared(false), 2500);
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background flex flex-col items-center p-5 text-center overflow-y-auto relative pb-28">
      <WinAnimation show={showWinAnim && isGoodResult} label={lastLevelUp ? 'ترقية مستوى!' : 'رائع!'} />

      <div className="w-full max-w-sm space-y-3 mb-5 mt-2">
        {/* League Unlock */}
        {unlockedCfg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 flex items-center gap-3 border"
            style={{ backgroundColor: `${unlockedCfg.themeColor}15`, borderColor: `${unlockedCfg.themeColor}50` }}>
            <span className="text-2xl">🔓</span>
            <div className="text-right flex-1">
              <div className="font-bold text-sm" style={{ color: unlockedCfg.themeColor }}>دوري مفتوح!</div>
              <div className="text-xs text-muted-foreground">فتحت دوري {lastUnlockedLeague}</div>
            </div>
          </motion.div>
        )}

        {/* Level Up */}
        {lastLevelUp && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-4 flex items-center gap-3 border border-yellow-500/40 bg-yellow-500/10">
            <span className="text-2xl">⬆️</span>
            <div className="text-right flex-1">
              <div className="font-bold text-sm text-yellow-400">ترقية مستوى! 🎉</div>
              <div className="text-xs text-muted-foreground">المستوى {level} · {getLevelTitle(level).title}</div>
            </div>
          </motion.div>
        )}

        {/* Trophies */}
        {lastNewTrophies.map(tr => (
          <motion.div key={tr.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl p-3 flex items-center gap-3 border border-orange-500/30 bg-orange-500/10">
            <span className="text-2xl">🏆</span>
            <div className="text-right flex-1">
              <div className="font-bold text-sm text-orange-400">جائزة مفتوحة!</div>
              <div className="text-xs text-muted-foreground">{tr.id.replace(/_/g, ' ')}</div>
            </div>
            <div className="text-yellow-400 font-bold text-sm">+50 🪙</div>
          </motion.div>
        ))}

        {/* Achievements */}
        {lastNewAchievements.map(a => (
          <motion.div key={a.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl p-3 flex items-center gap-3 border border-yellow-500/30 bg-yellow-500/10">
            <span className="text-2xl">{a.icon}</span>
            <div className="text-right flex-1">
              <div className="font-bold text-sm text-yellow-400">إنجاز جديد! 🎖️</div>
              <div className="text-xs text-muted-foreground">{a.nameAr}</div>
            </div>
            {a.rewardCoins > 0 && (
              <div className="text-yellow-400 font-bold text-sm">+{a.rewardCoins}🪙</div>
            )}
          </motion.div>
        ))}

        {/* Challenges */}
        {completedNames.map(c => c && (
          <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-3 flex items-center gap-3 border border-green-500/30 bg-green-500/10">
            <span className="text-2xl">{c.icon}</span>
            <div className="text-right flex-1">
              <div className="font-bold text-sm text-green-400">تحدي مكتمل ✓</div>
              <div className="text-xs text-muted-foreground">+{c.rewardCoins} عملة · +{c.rewardElo} ELO</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Rank badge */}
      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
        className="mb-3">
        <div className="text-5xl mb-1">{rank.icon}</div>
        <div className="text-sm font-black uppercase tracking-widest" style={{ color: rank.color }}>{rank.label}</div>
      </motion.div>

      {/* Score hero */}
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.15 }}
        className="mb-5">
        <div className="text-8xl font-black tabular-nums"
          style={{ color: 'hsl(var(--primary))', textShadow: '0 0 50px hsl(var(--primary)/0.5)' }}>
          {lastScore}
        </div>
        <div className="text-sm text-muted-foreground uppercase tracking-widest mt-1">نقطة</div>
      </motion.div>

      {/* ELO change */}
      <AnimatePresence>
        {lastEloChange !== 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 mb-4 border font-bold text-lg ${
              lastEloChange > 0 ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
            {lastEloChange > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            <span>{lastEloChange > 0 ? '+' : ''}{lastEloChange} ELO</span>
            <span className="text-sm opacity-70">← {elo}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* XP bar */}
      {lastXpEarned > 0 && (
        <div className="w-full max-w-sm mb-4">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4" style={{ color: levelColor }} />
              <span className="font-bold" style={{ color: levelColor }}>+{lastXpEarned} XP</span>
            </div>
            <span className="text-muted-foreground text-xs">مستوى {level}</span>
          </div>
          <div className="h-2.5 bg-card rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ backgroundColor: levelColor }}
              initial={{ width: `${Math.max(0, xpPct - Math.round((lastXpEarned / xpNeeded) * 100))}%` }}
              animate={{ width: `${xpPct}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }} />
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-4">
        {[
          { value: `${lastAccuracy}%`, label: 'الدقة',      color: '#34d399' },
          { value: lastCorrect,        label: 'صحيح',       color: '#fbbf24' },
          { value: lastStreak,         label: 'أفضل سلسلة', color: '#fb923c' },
        ].map(stat => (
          <motion.div key={stat.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-4">
            <div className="text-2xl font-black tabular-nums" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-[10px] text-muted-foreground uppercase mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Coins earned */}
      {lastCoinsEarned > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-6 py-3 mb-5">
          <span className="text-yellow-400 text-xl">🪙</span>
          <span className="text-xl font-bold text-yellow-400 tabular-nums">+{lastCoinsEarned}</span>
          <span className="text-sm text-muted-foreground">عملة مكتسبة</span>
        </motion.div>
      )}

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3">
        <Link href="/leagues" className="block">
          <motion.button whileTap={{ scale: 0.96 }}
            className="w-full h-14 rounded-2xl bg-primary text-white font-black text-lg active:scale-95 transition-transform shadow-[0_0_24px_hsl(var(--primary)/0.3)]">
            🎮 العب مجدداً
          </motion.button>
        </Link>
        <div className="grid grid-cols-3 gap-2">
          <Link href="/pvp" className="block">
            <button className="w-full h-12 rounded-2xl border border-red-500/40 bg-red-500/10 text-red-400 font-bold active:scale-95 transition-transform text-sm">
              ⚔️ PvP
            </button>
          </Link>
          <button
            onClick={handleShare}
            className={`w-full h-12 rounded-2xl border font-bold active:scale-95 transition-all text-sm flex items-center justify-center gap-1.5 ${
              shared ? 'border-green-500/40 bg-green-500/10 text-green-400' : 'border-border text-muted-foreground'
            }`}>
            <Share2 className="w-3.5 h-3.5" />
            {shared ? 'تمّ!' : 'شارك'}
          </button>
          <Link href="/" className="block">
            <button className="w-full h-12 rounded-2xl border border-border text-muted-foreground font-bold active:scale-95 transition-transform text-sm">
              🏠 الرئيسية
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
