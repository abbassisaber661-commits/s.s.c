import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link, useLocation } from "wouter";
import { LEAGUES, LeagueId, LEAGUE_ORDER } from "@/lib/game-engine";
import { isUnlocked, meetsScoreRequirement, canAffordCoinUnlock, canAffordEntry } from "@/lib/progression";
import { Lock, Coins, Zap, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { playTap } from "@/lib/sounds";
import { useT, isRTL } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";

const LEAGUE_NAME_KEYS: Record<string, TranslationKey> = {
  training: 'league_training', bronze: 'league_bronze', silver: 'league_silver', elite: 'league_elite',
};
const LEAGUE_DESC_KEYS: Record<string, TranslationKey> = {
  training: 'league_training_desc', bronze: 'league_bronze_desc',
  silver: 'league_silver_desc', elite: 'league_elite_desc',
};
const LEAGUE_EMOJI: Record<string, string> = {
  training: '🎯', bronze: '🥉', silver: '🥈', elite: '👑',
};
const DIFF_KEYS: Record<number, TranslationKey> = {
  1: 'difficulty_easy', 2: 'difficulty_medium', 3: 'difficulty_hard', 4: 'difficulty_very_hard',
};

function DifficultyDots({ level, color, label }: { level: number; color: string; label: string }) {
  return (
    <div className="flex gap-1.5 items-center">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="w-2.5 h-2.5 rounded-full transition-colors"
          style={{ backgroundColor: i <= level ? color : `${color}25` }} />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{label}</span>
    </div>
  );
}

export default function LeagueSelect() {
  const ctx = useGame();
  const { coins, highScores, unlockedLeagues, unlockLeagueWithCoins, language } = ctx;
  const [, setLocation] = useLocation();
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const t = useT(language);
  const rtl = isRTL(language);

  const handlePlay = (id: LeagueId) => {
    if (!canAffordEntry(id, ctx as any)) return;
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
    <div dir={rtl ? 'rtl' : 'ltr'} className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/60 px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="p-2 rounded-xl hover:bg-card active:scale-95 transition-all" onClick={playTap}>
            <ChevronLeft className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} />
          </button>
        </Link>
        <h1 className="text-lg font-black flex-1">{t('select_league')}</h1>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/15 border border-yellow-500/30 rounded-xl text-sm font-black text-yellow-400">
          {coins} 🪙
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-3">
        {/* Info banner */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/25 bg-primary/8 p-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Zap className="w-4 h-4 text-primary flex-shrink-0" />
          <span>{t('league_select_info')}</span>
        </motion.div>

        {/* Match Arena entry card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
          onClick={() => { playTap(); setLocation('/match-arena'); }}
          className="relative rounded-2xl border-2 overflow-hidden cursor-pointer active:scale-[0.98] transition-all"
          style={{ borderColor: '#B44FFF55', background: 'linear-gradient(135deg,#B44FFF0A,transparent)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(90deg,#B44FFF08,#3AB4FF08)' }} />
          <div className="p-4 flex items-center gap-4 relative">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: '#B44FFF20' }}>⚔️</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-black text-base" style={{ color: '#B44FFF' }}>Match Arena</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background: '#B44FFF20', color: '#B44FFF' }}>NEW</span>
              </div>
              <p className="text-xs text-muted-foreground leading-snug">5 challenge types · Speed bonus · Streak combos</p>
              <div className="flex gap-1 mt-2">
                {['Color', 'Shape', 'Pattern', 'Category', 'Pair'].map(tag => (
                  <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-md font-bold text-white/50"
                    style={{ background: '#ffffff08' }}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="text-white/30 text-lg">›</div>
          </div>
        </motion.div>

        {/* League Hub entry card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          onClick={() => { playTap(); setLocation('/league-hub'); }}
          className="relative rounded-2xl border-2 overflow-hidden cursor-pointer active:scale-[0.98] transition-all"
          style={{ borderColor: '#FFD93D50', background: 'linear-gradient(135deg,#FFD93D08,transparent)' }}>
          <div className="p-4 flex items-center gap-4 relative">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: '#FFD93D18' }}>🏆</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-black text-base" style={{ color: '#FFD93D' }}>League Hub</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background: '#FFD93D18', color: '#FFD93D' }}>NEW</span>
              </div>
              <p className="text-xs text-muted-foreground leading-snug">LP ranking · Promotions · Global leaderboard</p>
              <div className="flex gap-1 mt-2">
                {['Training', 'Coin', 'Pro', 'Champion'].map(tag => (
                  <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-md font-bold text-white/50"
                    style={{ background: '#ffffff08' }}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="text-white/30 text-lg">›</div>
          </div>
        </motion.div>

        {LEAGUE_ORDER.map((id, idx) => {
          const cfg      = LEAGUES[id];
          const unlocked = isUnlocked(id, ctx as any);
          const coinOk   = canAffordCoinUnlock(id, ctx as any);
          const canEnter = unlocked && canAffordEntry(id, ctx as any);
          const best     = highScores[id] ?? 0;
          const nameKey  = LEAGUE_NAME_KEYS[id] ?? 'league_training';
          const descKey  = LEAGUE_DESC_KEYS[id] ?? 'league_training_desc';
          const diffKey  = DIFF_KEYS[cfg.difficulty] ?? 'difficulty_medium';

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
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                    style={{ background: cfg.themeColor + '20' }}>
                    {LEAGUE_EMOJI[id] ?? '🎮'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-xl" style={{ color: cfg.themeColor }}>{t(nameKey)}</span>
                      {unlocked && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                          style={{ background: cfg.themeColor + '20', color: cfg.themeColor }}>
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 leading-snug">{t(descKey)}</p>
                    <DifficultyDots level={cfg.difficulty} color={cfg.themeColor} label={t(diffKey)} />
                  </div>
                  <div className={`flex-shrink-0 ${rtl ? 'text-left' : 'text-right'}`}>
                    <div className="text-[10px] text-muted-foreground uppercase mb-0.5">{t('best')}</div>
                    <div className="font-mono font-black text-xl tabular-nums"
                      style={{ color: best > 0 ? cfg.themeColor : 'hsl(var(--muted-foreground))' }}>
                      {best}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4 pt-3 border-t text-sm"
                  style={{ borderColor: cfg.themeColor + '20' }}>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    {cfg.entryCost === 0 ? (
                      <span className="text-green-400 font-bold text-xs">{t('free_entry_label')}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs">
                        <Coins className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="text-yellow-400 font-bold">{cfg.entryCost}</span>
                        <span className="text-muted-foreground">{t('entry_fee_suffix')}</span>
                        {!canEnter && unlocked && (
                          <span className="text-red-400">({t('insufficient_balance')})</span>
                        )}
                      </span>
                    )}
                  </div>
                  {cfg.rewardBase > 0 && (
                    <div className="flex items-center gap-1 text-green-400 font-bold text-xs">
                      <span>+{cfg.rewardBase} 🪙</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Locked overlay */}
              <AnimatePresence>
                {!unlocked && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-background/85 backdrop-blur-[3px] flex flex-col items-center justify-center gap-3 p-5 z-10">
                    <div className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center">
                      <Lock className="w-6 h-6 text-muted-foreground" />
                    </div>
                    {cfg.prevLeague && (
                      <div className="text-center text-xs text-muted-foreground max-w-[220px]">
                        {t('score_to_unlock')} <span className="font-black text-foreground">{cfg.unlockScore}+</span>{' '}
                        {t('in_league')}{' '}
                        <span className="font-bold" style={{ color: LEAGUES[cfg.prevLeague].themeColor }}>
                          {t(LEAGUE_NAME_KEYS[cfg.prevLeague] ?? 'league_training')}
                        </span>
                      </div>
                    )}
                    {cfg.unlockCoinsCost > 0 && (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-xs text-muted-foreground">{t('or_label')}</span>
                        <motion.button whileTap={{ scale: 0.92 }}
                          onClick={(e) => handleUnlock(id, e)}
                          disabled={!coinOk || unlocking === id}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-all border"
                          style={{ backgroundColor: `${cfg.themeColor}20`, color: cfg.themeColor, borderColor: `${cfg.themeColor}50` }}>
                          {unlocking === id ? '✓' : <><Coins className="w-4 h-4" /><span>{t('unlock_for')} {cfg.unlockCoinsCost} {t('coin_label')}</span></>}
                        </motion.button>
                        {!coinOk && <div className="text-xs text-muted-foreground">{t('insufficient_balance')}</div>}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {/* PvP */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Link href="/pvp" className="block">
            <button onClick={playTap}
              className="w-full rounded-2xl border-2 border-red-500/40 bg-red-500/8 p-4 flex items-center gap-4 active:scale-[0.98] transition-all hover:bg-red-500/12">
              <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center text-3xl flex-shrink-0">⚔️</div>
              <div className={`flex-1 ${rtl ? 'text-right' : 'text-left'}`}>
                <div className="font-black text-lg text-red-400">{t('pvp_quick')}</div>
                <div className="text-xs text-muted-foreground">{t('pvp_quick_desc')}</div>
              </div>
              <div className="text-red-400/60 text-2xl">{rtl ? '›' : '‹'}</div>
            </button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
