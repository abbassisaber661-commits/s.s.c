import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link } from "wouter";
import { ChevronLeft, Clock, Trophy, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { playTap } from "@/lib/sounds";
import { isRTL } from "@/lib/i18n";
import { ACTIVE_EVENTS, getTimeRemaining, getTimeRemainingAr, getEventProgress, type GameEvent } from "@/lib/events";

export default function Events() {
  const { language, pvpWins, matchesPlayed, coins } = useGame();
  const rtl = isRTL(language);

  const [selectedEvent, setSelectedEvent] = useState<GameEvent | null>(null);
  const progress = getEventProgress();

  const TYPE_LABELS: Record<string, string> = {
    weekly:   language === 'ar' ? 'أسبوعي' : 'Weekly',
    seasonal: language === 'ar' ? 'موسمي'  : 'Seasonal',
    global:   language === 'ar' ? 'عالمي'  : 'Global',
    special:  language === 'ar' ? 'خاص'    : 'Special',
  };

  const getUserProgress = (event: GameEvent, missionId: string, type: string): number => {
    const stored = progress[event.id]?.[missionId] ?? 0;
    if (type === 'pvp_wins') return Math.max(stored, pvpWins);
    if (type === 'matches')  return Math.max(stored, matchesPlayed);
    if (type === 'coins')    return Math.max(stored, coins);
    return stored;
  };

  if (selectedEvent) {
    const timeLeft = language === 'ar' ? getTimeRemainingAr(selectedEvent.endDate) : getTimeRemaining(selectedEvent.endDate);
    return (
      <div dir={rtl ? 'rtl' : 'ltr'} className="min-h-screen bg-background text-foreground pb-24">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/60 px-4 py-3 flex items-center gap-3">
          <button className="p-2 rounded-xl hover:bg-card active:scale-95 transition-all" onClick={() => { setSelectedEvent(null); playTap(); }}>
            <ChevronLeft className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} />
          </button>
          <h1 className="text-lg font-black flex-1">{language === 'ar' ? selectedEvent.titleAr : selectedEvent.title}</h1>
        </div>

        <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
          {/* Event banner */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border p-5 text-center"
            style={{ borderColor: selectedEvent.color + '50', background: `linear-gradient(135deg, ${selectedEvent.color}15, ${selectedEvent.color}05)` }}>
            <div className="text-5xl mb-2">{selectedEvent.icon}</div>
            <h2 className="text-xl font-black">{language === 'ar' ? selectedEvent.titleAr : selectedEvent.title}</h2>
            <p className="text-xs text-muted-foreground mt-2">{language === 'ar' ? selectedEvent.descriptionAr : selectedEvent.description}</p>
            <div className="flex items-center justify-center gap-2 mt-3 text-sm font-bold" style={{ color: selectedEvent.color }}>
              <Clock className="w-4 h-4" />
              <span>{language === 'ar' ? `ينتهي خلال: ${timeLeft}` : `Ends in: ${timeLeft}`}</span>
            </div>
          </motion.div>

          {/* Missions */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <p className="text-sm font-bold">{language === 'ar' ? '🎯 المهمات' : '🎯 Missions'}</p>
            {selectedEvent.missions.map((m, i) => {
              const userVal = getUserProgress(selectedEvent, m.id, m.type);
              const pct = Math.min(100, (userVal / m.goal) * 100);
              const done = userVal >= m.goal;
              return (
                <motion.div key={m.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  className={`p-3 rounded-xl border ${done ? 'border-green-500/30 bg-green-500/5' : 'border-border'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold">{language === 'ar' ? m.titleAr : m.title}</span>
                    {done ? <span className="text-xs text-green-400 font-bold">✅ {language === 'ar' ? 'مكتملة' : 'Done'}</span> :
                            <span className="text-xs text-muted-foreground">{userVal}/{m.goal}</span>}
                  </div>
                  <div className="h-1.5 bg-background rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      style={{ background: done ? '#22c55e' : selectedEvent.color }} />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                    <span>🎁 {(m.reward.coins ?? 0) > 0 ? `+${m.reward.coins} DNimport { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link } from "wouter";
import { ChevronLeft, Clock, Trophy, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { playTap } from "@/lib/sounds";
import { isRTL } from "@/lib/i18n";
import { ACTIVE_EVENTS, getTimeRemaining, getTimeRemainingAr, getEventProgress, type GameEvent } from "@/lib/events";

export default function Events() {
  const { language, pvpWins, matchesPlayed, coins } = useGame();
  const rtl = isRTL(language);

  const [selectedEvent, setSelectedEvent] = useState<GameEvent | null>(null);
  const progress = getEventProgress();

  const TYPE_LABELS: Record<string, string> = {
    weekly:   language === 'ar' ? 'أسبوعي' : 'Weekly',
    seasonal: language === 'ar' ? 'موسمي'  : 'Seasonal',
    global:   language === 'ar' ? 'عالمي'  : 'Global',
    special:  language === 'ar' ? 'خاص'    : 'Special',
  };

  const getUserProgress = (event: GameEvent, missionId: string, type: string): number => {
    const stored = progress[event.id]?.[missionId] ?? 0;
    if (type === 'pvp_wins') return Math.max(stored, pvpWins);
    if (type === 'matches')  return Math.max(stored, matchesPlayed);
    if (type === 'coins')    return Math.max(stored, coins);
    return stored;
  };

  if (selectedEvent) {
    const timeLeft = language === 'ar' ? getTimeRemainingAr(selectedEvent.endDate) : getTimeRemaining(selectedEvent.endDate);
    return (
      <div dir={rtl ? 'rtl' : 'ltr'} className="min-h-screen bg-background text-foreground pb-24">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/60 px-4 py-3 flex items-center gap-3">
          <button className="p-2 rounded-xl hover:bg-card active:scale-95 transition-all" onClick={() => { setSelectedEvent(null); playTap(); }}>
            <ChevronLeft className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} />
          </button>
          <h1 className="text-lg font-black flex-1">{language === 'ar' ? selectedEvent.titleAr : selectedEvent.title}</h1>
        </div>

        <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
          {/* Event banner */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border p-5 text-center"
            style={{ borderColor: selectedEvent.color + '50', background: `linear-gradient(135deg, ${selectedEvent.color}15, ${selectedEvent.color}05)` }}>
            <div className="text-5xl mb-2">{selectedEvent.icon}</div>
            <h2 className="text-xl font-black">{language === 'ar' ? selectedEvent.titleAr : selectedEvent.title}</h2>
            <p className="text-xs text-muted-foreground mt-2">{language === 'ar' ? selectedEvent.descriptionAr : selectedEvent.description}</p>
            <div className="flex items-center justify-center gap-2 mt-3 text-sm font-bold" style={{ color: selectedEvent.color }}>
              <Clock className="w-4 h-4" />
              <span>{language === 'ar' ? `ينتهي خلال: ${timeLeft}` : `Ends in: ${timeLeft}`}</span>
            </div>
          </motion.div>

          {/* Missions */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <p className="text-sm font-bold">{language === 'ar' ? '🎯 المهمات' : '🎯 Missions'}</p>
            {selectedEvent.missions.map((m, i) => {
              const userVal = getUserProgress(selectedEvent, m.id, m.type);
              const pct = Math.min(100, (userVal / m.goal) * 100);
              const done = userVal >= m.goal;
              return (
                <motion.div key={m.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  className={`p-3 rounded-xl border ${done ? 'border-green-500/30 bg-green-500/5' : 'border-border'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold">{language === 'ar' ? m.titleAr : m.title}</span>
                    {done ? <span className="text-xs text-green-400 font-bold">✅ {language === 'ar' ? 'مكتملة' : 'Done'}</span> :
                            <span className="text-xs text-muted-foreground">{userVal}/{m.goal}</span>}
                  </div>
                  <div className="h-1.5 bg-background rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      style={{ background: done ? '#22c55e' : selectedEvent.color }} />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
 : ''} {m.reward.xp > 0 ? `+${m.reward.xp} XP` : ''}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Rewards */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <p className="text-sm font-bold">{language === 'ar' ? '🏆 جوائز الترتيب' : '🏆 Leaderboard Rewards'}</p>
            {selectedEvent.rewards.map((r, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                <span className="text-xl">{r.icon}</span>
                <div className="flex-1">
                  <div className="text-xs font-bold">{language === 'ar' ? r.rankAr : r.rank}</div>
                  {r.special && <div className="text-[10px] text-purple-400 font-bold">{language === 'ar' ? r.specialAr : r.special}</div>}
                </div>
                <div className="text-right">
                  {(r.coins ?? 0) > 0 && <div className="text-xs font-bold text-yellow-400">+{r.coins} DN$</div>}
                  {r.xp > 0   && <div className="text-[10px] text-purple-400">+{r.xp} XP</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="min-h-screen bg-background text-foreground pb-24">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/60 px-4 py-3 flex items-center gap-3">
        <button className="p-2 rounded-xl hover:bg-card active:scale-95 transition-all" onClick={() => { playTap(); window.history.back(); }}><ChevronLeft className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} /></button>
        <h1 className="text-lg font-black flex-1">🌍 {language === 'ar' ? 'الأحداث العالمية' : 'Global Events'}</h1>
        <span className="text-xs px-2 py-1 rounded-full bg-green-500/15 text-green-400 font-bold">{ACTIVE_EVENTS.length} {language === 'ar' ? 'نشط' : 'Active'}</span>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Live indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/30">
          <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs font-bold text-green-400">
            {language === 'ar' ? 'أحداث حية — تتنافس مع لاعبين من حول العالم' : 'Live Events — Compete with players worldwide'}
          </span>
        </motion.div>

        {ACTIVE_EVENTS.map((event, i) => {
          const timeLeft = language === 'ar' ? getTimeRemainingAr(event.endDate) : getTimeRemaining(event.endDate);
          const userPvp = getUserProgress(event, 'pvp', 'pvp_wins');
          return (
            <motion.div key={event.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              onClick={() => { setSelectedEvent(event); playTap(); }}
              className="rounded-2xl border bg-card cursor-pointer active:scale-[0.98] transition-all overflow-hidden"
              style={{ borderColor: event.color + '40' }}>
              <div className="h-1" style={{ background: `linear-gradient(90deg, ${event.color}, transparent)` }} />
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                    style={{ background: event.color + '20' }}>
                    {event.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm">{language === 'ar' ? event.titleAr : event.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: event.color + '20', color: event.color }}>
                        {TYPE_LABELS[event.type]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {language === 'ar' ? event.descriptionAr : event.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /><span>{timeLeft}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="w-3 h-3" /><span>{event.rewards.length} {language === 'ar' ? 'جوائز' : 'prizes'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top reward preview */}
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: event.color + '12' }}>
                  <span className="text-lg">{event.rewards[0].icon}</span>
                  <span className="text-xs font-bold" style={{ color: event.color }}>
                    {language === 'ar' ? 'الجائزة الأولى:' : '1st Prize:'} {(event.rewards[0].coins ?? 0).toLocaleString()} DN$
                    {event.rewards[0].special && ` + ${language === 'ar' ? event.rewards[0].specialAr : event.rewards[0].special}`}
                  </span>
                  <ChevronLeft className={`w-4 h-4 ml-auto opacity-50 ${rtl ? '' : 'rotate-180'}`} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
