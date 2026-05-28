import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link, useLocation } from "wouter";
import { LEAGUES, LeagueId, LEAGUE_ORDER } from "@/lib/game-engine";
import { isUnlocked, meetsScoreRequirement, canAffordCoinUnlock, canAffordEntry } from "@/lib/progression";
import { Lock, Coins, Zap, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { playTap } from "@/lib/sounds";

const LEAGUE_META: Record<string, { ar: string; desc: string; emoji: string }> = {
  training: { ar: 'تدريب',  desc: 'ابدأ رحلتك — مجاني وبلا شروط',           emoji: '🎯' },
  bronze:   { ar: 'برونز',  desc: 'أول اختبار حقيقي للمهارة',               emoji: '🥉' },
  silver:   { ar: 'فضة',    desc: 'مستوى متوسط — لمن تجاوز البرونز',         emoji: '🥈' },
  elite:    { ar: 'نخبة',   desc: 'فقط لأفضل اللاعبين — تحدٍ حقيقي',       emoji: '👑' },
};

const DIFF_LABELS = ['', 'سهل', 'متوسط', 'صعب', 'صعب جداً'];

function DifficultyDots({ level, color }: { level: number; color: string }) {
  return (
    <div className="flex gap-1.5 items-center">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="w-2.5 h-2.5 rounded-full transition-colors"
          style={{ backgroundColor: i <= level ? color : `${color}25` }} />
      ))}
      <span className="text-xs text-muted-foreground mr-1">{DIFF_LABELS[level]}</span>
    </div>
  );
}

export default function LeagueSelect() {
  const ctx = useGame();
  const { coins, highScores, unlockedLeagues, unlockLeagueWithCoins } = ctx;
  const [, setLocation] = useLocation();
  const [unlocking, setUnlocking] = useState<string | null>(null);

  const handlePlay = (id: LeagueId) => {
    const data = ctx as any;
    if (!canAffordEntry(id, data)) return;
    playTap();
    setLocation(`/game/${id}`);
  };

  const handleUnlock = (id: LeagueId, e: React.MouseEvent) => {
    e.stopPropagation();
    playTap();
    setUnlocking(id);
    const ok = unlockLeagueWithCoins(id);
    if (!ok) setUnlocking(null);
    setTimeout(() => setUnlocking(null), 800);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/60 px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="p-2 rounded-xl hover:bg-card active:scale-95 transition-all" onClick={playTap}>
            <ChevronLeft className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="text-lg font-black flex-1">اختر الدوري</h1>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/15 border border-yellow-500/30 rounded-xl text-sm font-black text-yellow-400">
          {coins} 🪙
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-3">
        {/* Info banner */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/25 bg-primary/8 p-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Zap className="w-4 h-4 text-primary flex-shrink-0" />
          <span>اختر الدوري المناسب لمستواك وابدأ اللعب</span>
        </motion.div>

        {LEAGUE_ORDER.map((id, idx) => {
          const cfg      = LEAGUES[id];
          const meta     = LEAGUE_META[id] ?? { ar: id, desc: '', emoji: '🎮' };
          const unlocked = isUnlocked(id, ctx as any);
          const coinOk   = canAffordCoinUnlock(id, ctx as any);
          const canEnter = unlocked && canAffordEntry(id, ctx as any);
          const best     = highScores[id] ?? 0;

          return (
            <motion.div key={id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              onClick={() => unlocked && canEnter && handlePlay(id)}
              className={`relative rounded-2xl border-2 overflow-hidden transition-all ${
                unlocked && canEnter ? 'cursor-pointer active:scale-[0.98]' : 'opacity-75'
              }`}
              style={{
                borderColor: `${cfg.themeColor}${unlocked ? '55' : '20'}`,
                background: `linear-gradient(135deg, ${cfg.themeColor}0A, transparent)`,
              }}>
              {/* Card body */}
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Emoji icon */}
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                    style={{ background: cfg.themeColor + '20' }}>
                    {meta.emoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-xl" style={{ color: cfg.themeColor }}>{meta.ar}</span>
                      {unlocked && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                          style={{ background: cfg.themeColor + '20', color: cfg.themeColor }}>
                          مفتوح ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 leading-snug">{meta.desc}</p>
                    <DifficultyDots level={cfg.difficulty} color={cfg.themeColor} />
                  </div>

                  {/* Best score */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-[10px] text-muted-foreground uppercase mb-0.5">أفضل</div>
                    <div className="font-mono font-black text-xl tabular-nums"
                      style={{ color: best > 0 ? cfg.themeColor : 'hsl(var(--muted-foreground))' }}>
                      {best}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center mt-4 pt-3 border-t text-sm"
                  style={{ borderColor: cfg.themeColor + '20' }}>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    {cfg.entryCost === 0 ? (
                      <span className="text-green-400 font-bold text-xs">مجاني 🆓</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs">
                        <Coins className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="text-yellow-400 font-bold">{cfg.entryCost}</span>
                        <span className="text-muted-foreground">رسوم دخول</span>
                        {!canEnter && unlocked && (
                          <span className="text-red-400">(رصيد غير كافٍ)</span>
                        )}
                      </span>
                    )}
                  </div>
                  {cfg.rewardBase > 0 && (
                    <div className="flex items-center gap-1 text-green-400 font-bold text-xs">
                      <span>مكافأة +{cfg.rewardBase}</span>
                      <span>🪙</span>
                    </div>
                  )}
                </div>
              </div>

              {/* LOCKED overlay */}
              <AnimatePresence>
                {!unlocked && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-background/85 backdrop-blur-[3px] flex flex-col items-center justify-center gap-3 p-5 z-10">
                    <div className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center">
                      <Lock className="w-6 h-6 text-muted-foreground" />
                    </div>

                    {cfg.prevLeague && (
                      <div className="text-center text-xs text-muted-foreground max-w-[200px]">
                        <span>احصل على </span>
                        <span className="font-black text-foreground">{cfg.unlockScore}+ نقطة</span>
                        <span> في دوري </span>
                        <span className="font-bold" style={{ color: LEAGUES[cfg.prevLeague].themeColor }}>
                          {LEAGUE_META[cfg.prevLeague]?.ar ?? cfg.prevLeague}
                        </span>
                      </div>
                    )}

                    {cfg.unlockCoinsCost > 0 && (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-xs text-muted-foreground">أو</span>
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={(e) => handleUnlock(id, e)}
                          disabled={!coinOk || unlocking === id}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-all border"
                          style={{
                            backgroundColor: `${cfg.themeColor}20`,
                            color: cfg.themeColor,
                            borderColor: `${cfg.themeColor}50`,
                          }}>
                          {unlocking === id ? (
                            <span>✓ مفتوح!</span>
                          ) : (
                            <>
                              <Coins className="w-4 h-4" />
                              <span>افتح بـ {cfg.unlockCoinsCost} عملة</span>
                            </>
                          )}
                        </motion.button>
                        {!coinOk && (
                          <div className="text-xs text-muted-foreground">رصيد غير كافٍ</div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {/* PvP Quick Access */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Link href="/pvp" className="block">
            <button onClick={playTap}
              className="w-full rounded-2xl border-2 border-red-500/40 bg-red-500/8 p-4 flex items-center gap-4 active:scale-[0.98] transition-all hover:bg-red-500/12">
              <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center text-3xl flex-shrink-0">⚔️</div>
              <div className="flex-1 text-right">
                <div className="font-black text-lg text-red-400">مباراة PvP</div>
                <div className="text-xs text-muted-foreground">العب ضد لاعبين حقيقيين أو بوت ذكي</div>
              </div>
              <div className="text-red-400/60 text-2xl">‹</div>
            </button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
