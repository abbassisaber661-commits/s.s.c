import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { playTap } from '@/lib/sounds';
import {
  loadLeagueStats, getLeaderboard, getTier, getLpInTier, getTierRange,
  getPlayerGlobalRank, LEAGUE_DEFS, TIER_ORDER, type LeagueTier, type LeagueStats, type LeaderboardRow,
} from '@/lib/league-progression';

type HubTab = 'overview' | 'leaderboard' | 'stats';

function TierBadge({ tier, size = 'md' }: { tier: LeagueTier; size?: 'sm' | 'md' | 'lg' }) {
  const def = LEAGUE_DEFS[tier];
  const sz  = size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-base px-4 py-1.5' : 'text-xs px-3 py-1';
  return (
    <span className={`font-black rounded-full ${sz}`}
      style={{ background: def.color + '20', color: def.color, border: `1px solid ${def.color}40` }}>
      {def.emoji} {def.name}
    </span>
  );
}

function LpBar({ lp, tier, animate: doAnimate = false }: { lp: number; tier: LeagueTier; animate?: boolean }) {
  const def      = LEAGUE_DEFS[tier];
  const inTier   = getLpInTier(lp);
  const range    = getTierRange(tier);
  const pct      = tier === 'champion' ? Math.min(100, inTier) : Math.min(100, (inTier / range) * 100);

  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-bold" style={{ color: def.color }}>{def.emoji} {def.name}</span>
        <span className="text-white/50 font-bold">
          {inTier}{tier !== 'champion' ? ` / ${range}` : '+'} LP
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
        <motion.div className="h-full rounded-full"
          initial={doAnimate ? { width: 0 } : false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: doAnimate ? 1.2 : 0, ease: 'easeOut', delay: doAnimate ? 0.3 : 0 }}
          style={{ background: `linear-gradient(90deg, ${def.color}, ${def.color}cc)`,
            boxShadow: `0 0 8px ${def.color}60` }} />
      </div>
    </div>
  );
}

export default function LeagueHub() {
  const [, setLocation]  = useLocation();
  const { authUser }     = useGame();
  const playerName       = authUser?.username ?? 'You';

  const [stats,    setStats]    = useState<LeagueStats>(() => loadLeagueStats());
  const [tab,      setTab]      = useState<HubTab>('overview');
  const [lbFilter, setLbFilter] = useState<LeagueTier | 'all'>('all');

  useEffect(() => { setStats(loadLeagueStats()); }, []);

  const currentTier  = getTier(stats.lp);
  const globalRank   = getPlayerGlobalRank(playerName, stats);
  const leaderboard  = getLeaderboard(playerName, stats);
  const winRate      = stats.matchesPlayed > 0
    ? Math.round((stats.wins / stats.matchesPlayed) * 100) : 0;

  const filteredLb: LeaderboardRow[] = lbFilter === 'all'
    ? leaderboard
    : leaderboard.filter(r => r.tier === lbFilter);

  const playerLbRank = filteredLb.findIndex(r => r.isPlayer) + 1;

  const def = LEAGUE_DEFS[currentTier];

  const bg: React.CSSProperties = {
    minHeight: '100dvh',
    background: 'linear-gradient(160deg,#07071A 0%,#0F0B2A 50%,#07071A 100%)',
    color: '#fff',
  };

  return (
    <div style={bg} className="pb-24">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 backdrop-blur-xl border-b border-white/8 px-4 py-3 flex items-center gap-3"
        style={{ background: 'rgba(7,7,26,0.92)' }}>
        <Link href="/leagues">
          <button className="p-2 rounded-xl hover:bg-white/10 transition-colors" onClick={playTap}>
            <span className="text-lg">←</span>
          </button>
        </Link>
        <div className="flex-1">
          <div className="font-black text-base">League Hub</div>
          <div className="text-[11px] text-white/40">Season 1</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-center px-3 py-1 rounded-xl" style={{ background: def.color + '18' }}>
            <div className="text-xs font-black tabular-nums" style={{ color: def.color }}>{stats.lp} LP</div>
            <div className="text-[9px] text-white/40">Global #{globalRank}</div>
          </div>
        </div>
      </div>

      {/* ── Player Card ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-4 rounded-2xl border overflow-hidden"
        style={{ borderColor: def.color + '40', background: def.bgGradient }}>
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${def.color}, ${def.color}40)` }} />
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: def.color + '20' }}>
              {def.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-base truncate">{playerName}</div>
              <TierBadge tier={currentTier} size="sm" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-black tabular-nums" style={{ color: def.color }}>
                #{globalRank}
              </div>
              <div className="text-[10px] text-white/40">Global rank</div>
            </div>
          </div>
          <LpBar lp={stats.lp} tier={currentTier} animate />
          {currentTier !== 'champion' && (
            <div className="text-[11px] text-white/40 text-center">
              {LEAGUE_DEFS[TIER_ORDER[TIER_ORDER.indexOf(currentTier) + 1]].minLp - stats.lp} LP to{' '}
              <span style={{ color: LEAGUE_DEFS[TIER_ORDER[TIER_ORDER.indexOf(currentTier) + 1]].color }}>
                {LEAGUE_DEFS[TIER_ORDER[TIER_ORDER.indexOf(currentTier) + 1]].name}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 mx-4 mt-4 bg-white/5 rounded-2xl p-1">
        {([['overview','Overview'],['leaderboard','Rankings'],['stats','My Stats']] as [HubTab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => { playTap(); setTab(t); }}
            className="flex-1 py-2 rounded-xl text-xs font-black transition-all"
            style={tab === t ? { background: def.color, color: '#fff' } : { color: '#ffffff60' }}>
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ══ OVERVIEW TAB ══ */}
        {tab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} className="px-4 mt-4 space-y-3">

            {/* Quick-play button */}
            <motion.button whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.01 }}
              onClick={() => { playTap(); setLocation('/match-arena'); }}
              className="w-full py-4 rounded-2xl font-black text-base relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${def.color}, ${def.color}88)`,
                boxShadow: `0 0 30px ${def.color}40` }}>
              <motion.div animate={{ x: ['0%','100%'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                style={{ left: '-33%' }} />
              ⚔️ Play Match → {def.emoji} {def.name}
            </motion.button>

            {/* 4 League cards */}
            {TIER_ORDER.map((tier, idx) => {
              const d          = LEAGUE_DEFS[tier];
              const isActive   = tier === currentTier;
              const isUnlocked = stats.lp >= d.minLp;
              const lpNeeded   = d.minLp - stats.lp;

              return (
                <motion.div key={tier}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className="rounded-2xl border overflow-hidden"
                  style={{
                    borderColor: isActive ? d.color + '60' : isUnlocked ? d.color + '30' : '#ffffff10',
                    background: isActive ? d.bgGradient : 'rgba(255,255,255,0.03)',
                  }}>
                  {isActive && (
                    <div className="h-0.5" style={{ background: `linear-gradient(90deg,${d.color},${d.color}30)` }} />
                  )}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: isUnlocked ? d.color + '20' : '#ffffff08' }}>
                        {isUnlocked ? d.emoji : '🔒'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-black text-sm" style={{ color: isUnlocked ? d.color : '#ffffff40' }}>
                            {d.name}
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                              style={{ background: d.color + '25', color: d.color }}>ACTIVE</span>
                          )}
                          {!isUnlocked && (
                            <span className="text-[9px] text-white/30 font-bold">{lpNeeded} LP to unlock</span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/50 mb-2 leading-snug">{d.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {d.perks.map((perk, i) => (
                            <span key={i} className="text-[9px] px-2 py-0.5 rounded-full font-medium"
                              style={{ background: isUnlocked ? d.color + '15' : '#ffffff08',
                                color: isUnlocked ? d.color + 'cc' : '#ffffff30' }}>
                              {perk}
                            </span>
                          ))}
                        </div>
                      </div>
                      {isActive && (
                        <div className="text-right shrink-0">
                          <div className="text-sm font-black tabular-nums" style={{ color: d.color }}>
                            {getLpInTier(stats.lp)}
                          </div>
                          <div className="text-[9px] text-white/40">/ {getTierRange(tier)} LP</div>
                        </div>
                      )}
                    </div>
                    {isActive && tier !== 'champion' && (
                      <div className="mt-3">
                        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{ width: `${Math.min(100,(getLpInTier(stats.lp)/getTierRange(tier))*100)}%`,
                              background: d.color, transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Weekly info */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-white/50 uppercase tracking-widest">This Week</span>
                <span className="text-[10px] text-white/30">Resets Monday</span>
              </div>
              <div className="flex gap-4">
                <div className="text-center flex-1">
                  <div className="text-xl font-black" style={{ color: '#FFD93D' }}>+{stats.weeklyLp}</div>
                  <div className="text-[10px] text-white/40">LP gained</div>
                </div>
                <div className="w-px bg-white/10" />
                <div className="text-center flex-1">
                  <div className="text-xl font-black text-white">{stats.matchesPlayed}</div>
                  <div className="text-[10px] text-white/40">Matches</div>
                </div>
                <div className="w-px bg-white/10" />
                <div className="text-center flex-1">
                  <div className="text-xl font-black text-green-400">{winRate}%</div>
                  <div className="text-[10px] text-white/40">Win rate</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══ LEADERBOARD TAB ══ */}
        {tab === 'leaderboard' && (
          <motion.div key="leaderboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} className="px-4 mt-4 space-y-3">

            {/* Filter chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {(['all', ...TIER_ORDER] as (LeagueTier | 'all')[]).map(f => {
                const isActive = f === lbFilter;
                const d = f === 'all' ? null : LEAGUE_DEFS[f];
                return (
                  <button key={f} onClick={() => { playTap(); setLbFilter(f); }}
                    className="shrink-0 text-xs font-black px-3 py-1.5 rounded-full transition-all"
                    style={isActive
                      ? { background: d?.color ?? '#fff', color: '#000' }
                      : { background: '#ffffff10', color: '#ffffff60' }}>
                    {d ? `${d.emoji} ${d.name}` : '🌐 All'}
                  </button>
                );
              })}
            </div>

            {/* Player position banner */}
            {playerLbRank > 0 && (
              <div className="text-xs text-white/40 text-center">
                You are <span className="font-black text-white">#{playerLbRank}</span> in{' '}
                {lbFilter === 'all' ? 'global ranking' : LEAGUE_DEFS[lbFilter].name}
              </div>
            )}

            {/* Rows */}
            <div className="space-y-1.5">
              {filteredLb.map((row, i) => {
                const d = LEAGUE_DEFS[row.tier];
                const wr = row.matches > 0 ? Math.round((row.wins / row.matches) * 100) : 0;
                return (
                  <motion.div key={row.id}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i, 15) * 0.03 }}
                    className="flex items-center gap-3 rounded-xl px-3 py-3"
                    style={row.isPlayer
                      ? { background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)' }
                      : { background: 'rgba(255,255,255,0.04)' }}>
                    <span className="text-sm font-black w-6 text-center shrink-0"
                      style={{ color: i === 0 ? '#FFD93D' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#ffffff30' }}>
                      {i === 0 ? '👑' : `${i + 1}`}
                    </span>
                    <span className="text-xl shrink-0">{row.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold truncate ${row.isPlayer ? 'text-blue-300' : 'text-white/90'}`}>
                        {row.name} {row.isPlayer && '(You)'}
                      </div>
                      <div className="text-[10px] text-white/40">
                        {row.matches} matches · {wr}% win rate
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-black tabular-nums" style={{ color: d.color }}>{row.lp}</div>
                      <div className="text-[9px] text-white/40">{d.emoji} LP</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ══ MY STATS TAB ══ */}
        {tab === 'stats' && (
          <motion.div key="stats" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} className="px-4 mt-4 space-y-4">

            {/* Stat grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '⚡', label: 'Total LP', value: stats.lp.toString(), color: def.color },
                { icon: '🏆', label: 'Global Rank', value: `#${globalRank}`, color: '#FFD93D' },
                { icon: '🎯', label: 'Matches', value: stats.matchesPlayed.toString(), color: '#3AB4FF' },
                { icon: '✅', label: 'Win Rate', value: `${winRate}%`, color: '#2EE87A' },
                { icon: '🔥', label: 'Best Streak', value: stats.bestStreak.toString(), color: '#FF8C42' },
                { icon: '📈', label: 'Best Score', value: stats.bestScore.toLocaleString(), color: '#B44FFF' },
                { icon: '🥇', label: '1st Places', value: stats.wins.toString(), color: '#FFD93D' },
                { icon: '🥉', label: 'Top 3', value: stats.topThree.toString(), color: '#CD7F32' },
              ].map(s => (
                <div key={s.label} className="bg-white/5 rounded-2xl p-4 text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] text-white/40 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* League history */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-4 space-y-3">
              <p className="text-xs font-black text-white/50 uppercase tracking-widest">League Progress</p>
              {TIER_ORDER.map(tier => {
                const d          = LEAGUE_DEFS[tier];
                const isActive   = tier === getTier(stats.lp);
                const isComplete = TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf(getTier(stats.lp));
                const hasReached = stats.lp >= d.minLp;
                return (
                  <div key={tier} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      style={{
                        background: isActive ? d.color : isComplete ? d.color + '40' : '#ffffff10',
                        color: hasReached ? '#fff' : '#ffffff30',
                      }}>
                      {isComplete ? '✓' : isActive ? d.emoji : '○'}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold" style={{ color: hasReached ? d.color : '#ffffff30' }}>
                        {d.name}
                      </div>
                      {isActive && (
                        <div className="text-[10px] text-white/40">
                          {getLpInTier(stats.lp)} / {getTierRange(tier)} LP in tier
                        </div>
                      )}
                    </div>
                    {isActive && <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                      style={{ background: d.color + '20', color: d.color }}>CURRENT</span>}
                    {isComplete && <span className="text-[10px] text-green-400 font-bold">✓ Done</span>}
                    {!hasReached && <span className="text-[10px] text-white/30">🔒 {d.minLp - stats.lp} LP</span>}
                  </div>
                );
              })}
            </div>

            {/* Play button */}
            <button onClick={() => { playTap(); setLocation('/match-arena'); }}
              className="w-full py-4 rounded-2xl font-black"
              style={{ background: `linear-gradient(135deg,${def.color},${def.color}88)`,
                boxShadow: `0 0 24px ${def.color}40` }}>
              ⚔️ Play to earn LP
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
