import { useGame } from "@/contexts/GameContext";
import { Link } from "wouter";
import { ArrowLeft, Clock, TrendingUp, TrendingDown, Minus, Star, Trophy, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  getCurrentSeason, getDaysLeftInSeason, getSeasonProgress,
  getSeasonTier, getNextSeasonTier, SEASON_TIERS, buildMockSeasonLeaderboard,
} from "@/lib/seasons";

// ── Particles ──────────────────────────────────────────────────────────────────

const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: (i * 137.5) % 100,
  y: (i * 97.3) % 100,
  size: 1.5 + (i % 3),
  dur: 4 + (i % 4),
  delay: (i * 0.3) % 3,
}));

// ── Zone label helper ──────────────────────────────────────────────────────────

function getZoneInfo(rank: number, total: number) {
  if (total <= 1) return null;
  const promoCutoff = Math.ceil(total * 0.3);
  const releCutoff  = Math.floor(total * 0.8);
  if (rank <= promoCutoff) return { type: "promo",  icon: "🚀", label: "منطقة الترقي",    color: "#34d399", border: "rgba(52,211,153,0.3)",  bg: "rgba(52,211,153,0.08)"  };
  if (rank > releCutoff)  return { type: "rele",   icon: "⚠️", label: "منطقة الإنحدار", color: "#f87171", border: "rgba(248,113,113,0.3)", bg: "rgba(248,113,113,0.08)" };
  return                          { type: "mid",    icon: "📊", label: "المنطقة الوسطى", color: "#94a3b8", border: "rgba(148,163,184,0.2)", bg: "rgba(148,163,184,0.06)" };
}

// ── Season progress bar ────────────────────────────────────────────────────────

function SeasonBar({ pct, color }: { pct: number; color: string }) {
  const promoX  = 70;  // 30% from right = top 30% promoted
  const releX   = 20;  // bottom 20% relegated

  return (
    <div className="relative w-full">
      {/* Zone labels */}
      <div className="flex justify-between text-[9px] font-bold uppercase tracking-wide mb-1.5">
        <span style={{ color: "#f87171" }}>إنحدار</span>
        <span style={{ color: "#94a3b8" }}>منطقة وسطى</span>
        <span style={{ color: "#34d399" }}>ترقي</span>
      </div>

      {/* Bar */}
      <div className="h-3 w-full rounded-full overflow-hidden relative"
        style={{ background: "rgba(255,255,255,0.06)" }}>
        {/* Relegation zone */}
        <div className="absolute left-0 top-0 bottom-0 rounded-l-full"
          style={{ width: `${releX}%`, background: "rgba(248,113,113,0.25)" }} />
        {/* Promotion zone */}
        <div className="absolute right-0 top-0 bottom-0 rounded-r-full"
          style={{ width: `${100 - promoX}%`, background: "rgba(52,211,153,0.25)" }} />
        {/* Progress */}
        <motion.div
          className="absolute left-0 top-0 bottom-0 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)`, boxShadow: `0 0 8px ${color}60` }}
        />
      </div>

      {/* Divider lines */}
      <div className="absolute top-1.5 h-3 w-px" style={{ left: `${releX}%`, background: "rgba(248,113,113,0.5)" }} />
      <div className="absolute top-1.5 h-3 w-px" style={{ left: `${promoX}%`, background: "rgba(52,211,153,0.5)" }} />
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function Seasons() {
  const { elo, username, seasonHistory, currentSeasonNumber } = useGame();
  const [activeTab, setActiveTab] = useState<"overview" | "leaderboard" | "history">("overview");

  const season   = getCurrentSeason();
  const daysLeft = getDaysLeftInSeason();
  const pct      = getSeasonProgress();
  const tier     = getSeasonTier(elo);
  const nextTier = getNextSeasonTier(elo);
  const eloToNext = nextTier ? nextTier.minElo - elo : 0;
  const eloPct    = nextTier
    ? Math.min(100, Math.round(((elo - tier.minElo) / (nextTier.minElo - tier.minElo)) * 100))
    : 100;

  const leaderboard = buildMockSeasonLeaderboard(elo, username);
  const myLbIdx     = leaderboard.findIndex(e => e.isPlayer);
  const myLbRank    = myLbIdx >= 0 ? myLbIdx + 1 : null;
  const zoneInfo    = myLbRank ? getZoneInfo(myLbRank, leaderboard.length) : null;

  return (
    <div
      className="min-h-screen pb-10 text-white"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #0a0520 0%, #07010f 60%, #000 100%)" }}
    >
      {/* Ambient particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {PARTICLES.map((p) => (
          <motion.div key={p.id} className="absolute rounded-full"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: season.color }}
            animate={{ y: [0, -24, 0], opacity: [0.08, 0.3, 0.08] }}
            transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(7,1,15,0.88)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <motion.button whileTap={{ scale: 0.9 }}
          onClick={() => window.history.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </motion.button>
        <div className="flex-1">
          <h1 className="text-lg font-black"
            style={{ background: `linear-gradient(135deg, #fff, ${season.color})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            الموسم التنافسي
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-white/30">Season {season.number}</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
          style={{ background: `${season.color}15`, border: `1px solid ${season.color}30` }}>
          <Clock className="w-3.5 h-3.5" style={{ color: season.color }} />
          <span className="text-sm font-black" style={{ color: season.color }}>{daysLeft} يوم</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {([
            { id: "overview",     label: "📊 نظرة عامة" },
            { id: "leaderboard", label: "🏆 الترتيب" },
            { id: "history",     label: "📜 تاريخي" },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="flex-1 py-2 rounded-xl text-xs font-black transition-all"
              style={activeTab === t.id
                ? { background: season.color, color: "#fff" }
                : { color: "rgba(255,255,255,0.4)" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-2 space-y-4">
        <AnimatePresence mode="wait">

          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

              {/* Season status card */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl overflow-hidden"
                style={{ border: `1px solid ${season.color}30`, background: `linear-gradient(140deg, ${season.color}18 0%, rgba(0,0,0,0.5) 100%)` }}>
                <div className="h-1" style={{ background: `linear-gradient(90deg, ${season.color}, transparent)` }} />
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">الموسم الحالي</div>
                      <div className="text-2xl font-black" style={{ color: season.color }}>{season.name}</div>
                      <div className="text-xs text-white/40 mt-0.5">
                        {season.startDate} — {season.endDate}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-white tabular-nums">S{season.number}</div>
                      <div className="text-xs text-white/40">{pct}% اكتمل</div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-white/30">
                      <span>البداية</span>
                      <span className="font-bold" style={{ color: season.color }}>{pct}%</span>
                      <span>النهاية</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <motion.div className="h-full rounded-full"
                        style={{ background: season.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* My rank card */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="rounded-2xl overflow-hidden"
                style={{ border: `1px solid ${tier.color}30`, background: "rgba(255,255,255,0.03)" }}>
                <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${tier.color}, transparent)` }} />
                <div className="p-4 space-y-4">
                  <div className="text-[10px] text-white/40 uppercase tracking-widest">ترتيبك الحالي</div>

                  {/* Tier + ELO */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="text-5xl"
                      >
                        {tier.icon}
                      </motion.div>
                      <div>
                        <div className="text-xl font-black" style={{ color: tier.color }}>{tier.rank}</div>
                        <div className="text-xs text-white/40">{tier.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black tabular-nums" style={{ color: tier.color }}>{elo}</div>
                      <div className="text-xs text-white/40">ELO</div>
                    </div>
                  </div>

                  {/* ELO progress to next tier */}
                  {nextTier && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold" style={{ color: tier.color }}>{tier.rank}</span>
                        <span className="text-white/30">{eloToNext} ELO للوصول إلى {nextTier.rank}</span>
                        <span className="font-bold" style={{ color: nextTier.color }}>{nextTier.rank}</span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <motion.div className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${tier.color}, ${nextTier.color})`, boxShadow: `0 0 8px ${tier.color}60` }}
                          initial={{ width: 0 }}
                          animate={{ width: `${eloPct}%` }}
                          transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Zone indicator */}
                  {myLbRank && zoneInfo && (
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                      style={{ background: zoneInfo.bg, border: `1px solid ${zoneInfo.border}` }}>
                      <span className="text-lg">{zoneInfo.icon}</span>
                      <div>
                        <div className="text-xs font-black" style={{ color: zoneInfo.color }}>{zoneInfo.label}</div>
                        <div className="text-[10px] text-white/30">
                          المركز {myLbRank} من {leaderboard.length} ·
                          {zoneInfo.type === "promo"
                            ? " ستُرقى للموسم القادم!"
                            : zoneInfo.type === "rele"
                              ? " انتبه لترتيبك!"
                              : ` ${myLbRank - Math.ceil(leaderboard.length * 0.3)} مراكز للترقي`}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Season reward */}
                  <div className="flex items-center justify-between rounded-xl px-3 py-2.5"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <Star className="w-3.5 h-3.5" />
                      مكافأة نهاية الموسم
                    </div>
                    <div className="flex items-center gap-3 text-sm font-black">
                      <span className="text-yellow-400">+{tier.endRewardCoins} 🪙</span>
                      <span className="text-purple-400">+{tier.endRewardXp} XP</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* All tiers + zones */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
                <div className="px-4 pt-4 pb-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">مستويات الموسم</div>

                  {/* Zone bar */}
                  {myLbRank && (
                    <div className="mb-4">
                      <SeasonBar pct={(1 - (myLbRank - 1) / Math.max(leaderboard.length - 1, 1)) * 100} color={tier.color} />
                    </div>
                  )}

                  <div className="space-y-2">
                    {[...SEASON_TIERS].reverse().map(t => (
                      <div key={t.rank}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
                        style={{
                          background: t.rank === tier.rank
                            ? `${t.color}15`
                            : "rgba(255,255,255,0.02)",
                          border: `1px solid ${t.rank === tier.rank ? t.color + "40" : "rgba(255,255,255,0.05)"}`,
                        }}>
                        <span className="text-2xl w-8 text-center">{t.icon}</span>
                        <div className="flex-1">
                          <div className="text-sm font-bold" style={{ color: t.color }}>{t.rank}</div>
                          <div className="text-xs text-white/30">{t.minElo}+ ELO</div>
                        </div>
                        <div className="text-right text-xs">
                          <div className="text-yellow-400 font-bold">{t.endRewardCoins} 🪙</div>
                          <div className="text-purple-400">{t.endRewardXp} XP</div>
                        </div>
                        {t.rank === tier.rank && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                            style={{ background: `${t.color}20`, color: t.color }}>أنت</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-4 pb-4" />
              </motion.div>
            </motion.div>
          )}

          {/* ── LEADERBOARD TAB ── */}
          {activeTab === "leaderboard" && (
            <motion.div key="leaderboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">

              {/* My position pill */}
              {myLbRank && zoneInfo && (
                <div className="flex items-center justify-between px-4 py-3 rounded-2xl"
                  style={{ background: zoneInfo.bg, border: `1px solid ${zoneInfo.border}` }}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{zoneInfo.icon}</span>
                    <div>
                      <div className="text-xs font-black" style={{ color: zoneInfo.color }}>مركزك: #{myLbRank}</div>
                      <div className="text-[10px] text-white/30">{zoneInfo.label}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black tabular-nums" style={{ color: tier.color }}>{elo} ELO</div>
                    <div className="text-[10px] text-white/30">{tier.icon} {tier.rank}</div>
                  </div>
                </div>
              )}

              {/* Leaderboard rows */}
              <div className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>

                {/* Header */}
                <div className="px-4 py-2.5 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/25"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-8 text-center">#</div>
                  <div className="flex-1">اللاعب</div>
                  <div className="w-12 text-center">ELO</div>
                  <div className="w-6" />
                </div>

                {leaderboard.map((entry, i) => {
                  const entryTier = getSeasonTier(entry.elo);
                  const rank      = i + 1;
                  const promoLine = Math.ceil(leaderboard.length * 0.3);
                  const releLine  = Math.floor(leaderboard.length * 0.8);
                  const inPromo   = rank <= promoLine;
                  const inRele    = rank > releLine;
                  const medal     = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

                  return (
                    <motion.div key={entry.name}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i, 20) * 0.03 }}
                      className="flex items-center gap-3 px-4 py-3"
                      style={{
                        background: entry.isPlayer ? "rgba(99,102,241,0.12)" : rank <= 3 ? "rgba(255,255,255,0.02)" : "transparent",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        borderLeft: entry.isPlayer ? `3px solid rgba(99,102,241,0.6)` : "none",
                      }}>
                      {/* Rank */}
                      <div className="w-8 text-center shrink-0">
                        {medal
                          ? <span className="text-base">{medal}</span>
                          : <span className="text-sm font-black tabular-nums" style={{ color: inPromo ? "#34d399" : inRele ? "#f87171" : "rgba(255,255,255,0.25)" }}>
                              {rank}
                            </span>
                        }
                      </div>

                      {/* Tier icon */}
                      <span className="text-base shrink-0">{entryTier.icon}</span>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-bold truncate ${entry.isPlayer ? "text-indigo-300" : "text-white/85"}`}>
                          {entry.name} {entry.isPlayer && "(أنت)"}
                        </div>
                        <div className="text-[10px] text-white/30">{entryTier.rank}</div>
                      </div>

                      {/* ELO */}
                      <div className="w-12 text-right">
                        <div className="text-sm font-black tabular-nums" style={{ color: entryTier.color }}>{entry.elo}</div>
                      </div>

                      {/* Zone arrow */}
                      <div className="w-6 text-center">
                        {inPromo && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
                        {inRele  && <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                        {!inPromo && !inRele && <Minus className="w-3 h-3 text-white/15" />}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex gap-4 text-xs text-white/30 px-1">
                <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-400" /> ترقي (أفضل 30٪)</span>
                <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3 text-red-400" /> إنحدار (أسوأ 20٪)</span>
              </div>
            </motion.div>
          )}

          {/* ── HISTORY TAB ── */}
          {activeTab === "history" && (
            <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {seasonHistory.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <div className="text-5xl">🏆</div>
                  <div className="text-white/40 text-sm">لا يوجد سجل مواسم سابقة بعد</div>
                  <div className="text-white/20 text-xs">أكمل موسمك الأول لتظهر النتائج هنا</div>
                </div>
              ) : (
                seasonHistory.map((rec, i) => (
                  <motion.div key={rec.seasonNumber}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className="rounded-2xl overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="px-4 py-3 flex items-center gap-3">
                      <span className="text-2xl">{rec.rankColor ? '🏅' : '🎖️'}</span>
                      <div className="flex-1">
                        <div className="font-bold text-white">{rec.seasonName}</div>
                        <div className="text-xs text-white/40">{rec.finalElo} ELO · {rec.rank}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-purple-400">+{rec.xpEarned} XP</div>
                        <div className="text-xs text-purple-400">+{rec.xpEarned} XP</div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
