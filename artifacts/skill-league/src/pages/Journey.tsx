import { useMemo, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import {
  JOURNEY_TIERS, JourneyTierDef, getJourneyTier, getNextJourneyTier,
  journeyProgress, getSmartMissions, PI_VIP_MISSIONS,
} from '@/lib/journey';
import { loadStreakData, getStreakMilestones } from '@/lib/login-streak';
import { ACHIEVEMENT_DEFS } from '@/lib/achievements';

type Tab = 'journey' | 'streak' | 'missions' | 'stats' | 'pi';

export default function Journey() {
  const game = useGame();
  const [tab, setTab] = useState<Tab>('journey');

  const currentTier = useMemo(() => getJourneyTier(game as any), [game]);
  const nextTier    = useMemo(() => getNextJourneyTier(currentTier), [currentTier]);
  const progress    = useMemo(() => nextTier ? journeyProgress(game as any, nextTier) : null, [game, nextTier]);
  const smartMissions = useMemo(() => getSmartMissions(game as any), [game]);
  const streakData  = useMemo(() => loadStreakData(), []);
  const milestones  = getStreakMilestones();

  const winRate = game.matchesPlayed > 0
    ? Math.round((game.matchesWon / game.matchesPlayed) * 100)
    : 0;
  const pvpTotal = (game.pvpWins || 0) + (game.pvpLosses || 0);
  const pvpWinRate = pvpTotal > 0 ? Math.round(((game.pvpWins || 0) / pvpTotal) * 100) : 0;

  const earnedAchievements = game.achievements || [];
  const totalAchievements  = ACHIEVEMENT_DEFS.length;

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'journey',  label: 'الرحلة',   icon: '🗺️' },
    { id: 'streak',   label: 'السلسلة',  icon: '🔥' },
    { id: 'missions', label: 'مهام',     icon: '🎯' },
    { id: 'stats',    label: 'إحصائيات', icon: '📊' },
    { id: 'pi',       label: 'Pi VIP',   icon: 'π'  },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground overflow-y-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <button className="p-2 rounded-xl hover:bg-card active:scale-95 transition-all" onClick={() => window.history.back()}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-black">رحلة اللاعب</h1>
          <p className="text-xs text-muted-foreground">تتبّع تقدمك وأهدافك</p>
        </div>
        <div className="text-3xl">{currentTier.icon}</div>
      </div>

      {/* Current tier hero */}
      <div className="relative overflow-hidden px-4 py-6"
        style={{ background: `radial-gradient(circle at 60% 40%, ${currentTier.glow}, transparent 70%)` }}>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-2 text-center">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2.5 }}
            className="text-7xl">{currentTier.icon}</motion.div>
          <h2 className="text-3xl font-black" style={{ color: currentTier.color }}>{currentTier.ar}</h2>
          <p className="text-sm text-muted-foreground">مرتبتك الحالية في SkillLeague</p>

          {nextTier && progress && (
            <div className="w-full mt-3 max-w-xs">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>نحو {nextTier.ar} {nextTier.icon}</span>
                <span className="font-bold" style={{ color: nextTier.color }}>{progress.overall}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${currentTier.color}, ${nextTier.color})` }}
                  initial={{ width: 0 }} animate={{ width: `${progress.overall}%` }}
                  transition={{ duration: 1.4, ease: 'easeOut' }} />
              </div>
            </div>
          )}
          {!nextTier && (
            <div className="mt-2 px-4 py-1.5 rounded-full text-sm font-bold"
              style={{ background: currentTier.glow, color: currentTier.color }}>
              🏆 وصلت للقمة!
            </div>
          )}
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-2">
        <div className="flex gap-1 bg-card rounded-2xl p-1 overflow-x-auto no-scrollbar">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-4 mt-2">
        <AnimatePresence mode="wait">
          {/* ── Journey Tab ──────────────────────────────────────── */}
          {tab === 'journey' && (
            <motion.div key="journey" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-3">
              {/* Journey tiers */}
              {JOURNEY_TIERS.map((tier, i) => {
                const reached = JOURNEY_TIERS.indexOf(currentTier) >= i;
                const isCurrent = tier.id === currentTier.id;
                return (
                  <motion.div key={tier.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-2xl border p-4 transition-all ${
                      isCurrent ? 'border-2' : reached ? 'border-border/60' : 'border-border/30 opacity-50'
                    }`}
                    style={isCurrent ? { borderColor: tier.color, background: `${tier.glow}` } : {}}>
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{tier.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-base" style={{ color: reached ? tier.color : undefined }}>{tier.ar}</span>
                          {isCurrent && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: tier.color + '33', color: tier.color }}>مستواك الآن</span>}
                          {reached && !isCurrent && <span className="text-green-400 text-xs">✓ مكتمل</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Lv.{tier.minLevel}+ · {tier.minElo}+ ELO · {tier.minMatches}+ مباراة
                        </div>
                      </div>
                      {tier.rewardDN > 0 && (
                        <div className="text-right">
                          <div className="text-sm font-black text-yellow-400">+{tier.rewardDN} DN$</div>
                          <div className="text-xs text-muted-foreground">+{tier.rewardXp} XP</div>
                        </div>
                      )}
                    </div>
                    {/* Perks */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tier.perks.map(p => (
                        <span key={p} className="text-[10px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground">{p}</span>
                      ))}
                    </div>
                  </motion.div>
                );
              })}

              {/* Next tier requirements */}
              {nextTier && progress && (
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <h3 className="font-bold text-sm text-muted-foreground">متطلبات للوصول إلى {nextTier.ar}</h3>
                  {[
                    { label: 'المستوى', current: game.level, target: nextTier.minLevel, pct: progress.level },
                    { label: 'ELO',     current: game.elo,   target: nextTier.minElo,   pct: progress.elo },
                    { label: 'المباريات', current: game.matchesPlayed, target: nextTier.minMatches, pct: progress.matches },
                  ].map(r => (
                    <div key={r.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{r.label}</span>
                        <span className="font-bold">{r.current} / {r.target}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full"
                          style={{ backgroundColor: nextTier.color }}
                          initial={{ width: 0 }} animate={{ width: `${r.pct}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Streak Tab ──────────────────────────────────────── */}
          {tab === 'streak' && (
            <motion.div key="streak" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-3">
              {/* Current streak */}
              <div className="rounded-2xl border border-orange-500/40 bg-orange-500/10 p-5 text-center space-y-2">
                <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.8 }}
                  className="text-6xl">🔥</motion.div>
                <div className="text-5xl font-black text-orange-400 tabular-nums">{streakData.currentStreak}</div>
                <div className="text-muted-foreground">يوم متتالي</div>
                <div className="flex justify-center gap-6 mt-2 text-sm">
                  <div className="text-center">
                    <div className="font-black text-yellow-400">{streakData.longestStreak}</div>
                    <div className="text-xs text-muted-foreground">أطول سلسلة</div>
                  </div>
                  <div className="text-center">
                    <div className="font-black text-primary">{streakData.totalLoginDays}</div>
                    <div className="text-xs text-muted-foreground">إجمالي الأيام</div>
                  </div>
                </div>
              </div>

              {/* Milestones */}
              <h3 className="font-bold text-sm px-1">محطات السلسلة</h3>
              <div className="space-y-2">
                {milestones.map(m => {
                  const reached = streakData.currentStreak >= m.days;
                  const isCurrent = !reached && (
                    milestones.find(x => x.days > streakData.currentStreak)?.days === m.days
                  );
                  return (
                    <motion.div key={m.days}
                      className={`rounded-xl border p-3 flex items-center gap-3 ${
                        reached ? 'border-orange-500/60 bg-orange-500/10' :
                        isCurrent ? 'border-border bg-card' : 'border-border/30 opacity-50 bg-card/40'
                      }`}>
                      <div className="text-2xl">{reached ? '✅' : isCurrent ? '🔥' : '⬜'}</div>
                      <div className="flex-1">
                        <div className="font-bold text-sm">{m.label}</div>
                        <div className="text-xs text-muted-foreground">{m.days} أيام متتالية</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-yellow-400">+{m.dn ?? 0} DN$</div>
                        <div className="text-xs text-muted-foreground">+{m.xp} XP</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="rounded-xl bg-card border border-border p-4 text-center text-sm text-muted-foreground">
                💡 سجّل دخولك يومياً لتكسب DN$ ومكافآت متزايدة
              </div>
            </motion.div>
          )}

          {/* ── Smart Missions Tab ──────────────────────────────── */}
          {tab === 'missions' && (
            <motion.div key="missions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-3">
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-center">
                🧠 مهام مقترحة بناءً على أدائك الحالي
              </div>

              {smartMissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">لا توجد مهام مقترحة حالياً</div>
              ) : (
                smartMissions.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className={`rounded-2xl border p-4 bg-card flex gap-3 items-start ${
                      m.priority === 'high' ? 'border-red-500/40' :
                      m.priority === 'medium' ? 'border-yellow-500/30' : 'border-border/40'
                    }`}>
                    <div className="text-3xl mt-0.5">{m.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{m.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          m.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                          m.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {m.priority === 'high' ? 'عاجل' : m.priority === 'medium' ? 'مهم' : 'عادي'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                      <div className="mt-1.5 text-xs text-primary font-medium">🎁 {m.reward}</div>
                    </div>
                  </motion.div>
                ))
              )}

              {/* Quick links */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Link href="/daily-challenges">
                  <button className="w-full rounded-xl border border-border bg-card p-3 text-center hover:bg-card/70 active:scale-95 transition-all">
                    <div className="text-2xl">📅</div>
                    <div className="text-xs font-bold mt-1">تحديات يومية</div>
                  </button>
                </Link>
                <Link href="/pvp">
                  <button className="w-full rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center hover:bg-red-500/20 active:scale-95 transition-all">
                    <div className="text-2xl">⚔️</div>
                    <div className="text-xs font-bold mt-1 text-red-400">PvP الآن</div>
                  </button>
                </Link>
              </div>
            </motion.div>
          )}

          {/* ── Stats Tab ──────────────────────────────────────── */}
          {tab === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-3">
              {/* Overview grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'المستوى',        value: game.level,           color: '#60a5fa', icon: '⬆️' },
                  { label: 'ELO',             value: game.elo,             color: '#a78bfa', icon: '📈' },
                  { label: 'المباريات',       value: game.matchesPlayed,   color: '#34d399', icon: '🎮' },
                  { label: 'الانتصارات',      value: game.matchesWon,      color: '#fbbf24', icon: '🏆' },
                  { label: 'نسبة الفوز %',    value: `${winRate}%`,        color: '#f472b6', icon: '📊' },
                  { label: 'PvP فوز',         value: game.pvpWins || 0,    color: '#fb923c', icon: '⚔️' },
                  { label: 'نسبة PvP %',      value: `${pvpWinRate}%`,     color: '#f87171', icon: '🗡️' },
                  { label: 'بطولات فوز',      value: game.tournamentWins || 0, color: '#FFD700', icon: '🏅' },
                  { label: 'الشهرة',          value: game.fame || 0,       color: '#c084fc', icon: '🌟' },
                  { label: 'الإنجازات',        value: `${earnedAchievements.length}/${totalAchievements}`, color: '#4ade80', icon: '🎖️' },
                  { label: 'الدقة',           value: `${game.skillAccuracy}%`, color: '#38bdf8', icon: '🎯' },
                  { label: 'السرعة',          value: `${game.skillSpeed}%`, color: '#a3e635', icon: '⚡' },
                ].map(stat => (
                  <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="rounded-xl border border-border bg-card p-3 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{stat.icon}</span>
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                    </div>
                    <div className="text-xl font-black tabular-nums" style={{ color: stat.color }}>
                      {stat.value}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Skill bars */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <h3 className="font-bold text-sm">مهارات اللاعب</h3>
                {[
                  { label: 'الدقة',   value: game.skillAccuracy, color: '#38bdf8' },
                  { label: 'السرعة',  value: game.skillSpeed,    color: '#a3e635' },
                  { label: 'الذاكرة', value: game.skillMemory,   color: '#c084fc' },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="font-bold" style={{ color: s.color }}>{s.value}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ backgroundColor: s.color }}
                        initial={{ width: 0 }} animate={{ width: `${s.value}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut' }} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Pi VIP Tab ──────────────────────────────────────── */}
          {tab === 'pi' && (
            <motion.div key="pi" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-3">
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3 text-center text-sm">
                <span className="text-xl">π</span>
                <p className="mt-1 text-muted-foreground">استخدم Pi Network للوصول إلى مزايا حصرية</p>
              </div>

              {/* Tier badge */}
              <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
                <div className="text-3xl">{currentTier.icon}</div>
                <div>
                  <div className="font-bold text-sm">{currentTier.ar}</div>
                  <div className="text-xs text-muted-foreground">مرتبتك الحالية</div>
                </div>
              </div>

              {PI_VIP_MISSIONS.map((m, i) => {
                const tierOrder: Record<string, number> = {
                  beginner: 0, competitor: 1, pro: 2, elite: 3, legend: 4,
                };
                const currentOrder = tierOrder[currentTier.id];
                const requiredOrder = tierOrder[m.minTier];
                const locked = currentOrder < requiredOrder;

                return (
                  <motion.div key={m.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className={`rounded-2xl border p-4 ${
                      locked ? 'border-border/30 opacity-60 bg-card/40' : 'border-violet-500/40 bg-violet-500/8 bg-card'
                    }`}>
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{m.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{m.title}</span>
                          {locked && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                              🔒 يتطلب {JOURNEY_TIERS.find(t => t.id === m.minTier)?.ar}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                        <div className="flex items-center gap-3 mt-2">
                          {m.rewardDN > 0 && <span className="text-xs font-bold text-yellow-400">+{m.rewardDN} DN$</span>}
                          {m.rewardXp > 0 && <span className="text-xs font-bold text-primary">+{m.rewardXp} XP</span>}
                          {m.rewardBadge && <span className="text-xs font-bold text-violet-400">شارة {m.rewardBadge}</span>}
                        </div>
                      </div>
                      <button
                        disabled={locked}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                          locked
                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                            : 'bg-violet-600 text-white hover:bg-violet-500'
                        }`}>
                        <span className="font-black">{m.piCost}π</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}

              <div className="rounded-xl bg-card border border-border p-4 text-center">
                <Link href="/pi-lock">
                  <button className="flex items-center justify-center gap-2 text-sm text-primary font-bold w-full">
                    <span>🔒 Pi Lock — قفل Pi للمزيد</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
