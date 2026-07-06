/**
 * PlayerProgress.tsx
 * ──────────────────
 * XP bar, level badge, win streak, badges grid.
 * Standalone component — drop anywhere in the app.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gameLayerApi, type PlayerProfile, type XpProgress, type BadgeDef } from '@/lib/game-layer-api';

// ── XP Bar ─────────────────────────────────────────────────────────────────

function XpBar({ progress, level }: { progress: XpProgress; level: number }) {
  const pct = Math.min(100, Math.round((progress.current / progress.needed) * 100));
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5 text-xs">
        <span className="text-white/60">
          Level <span className="text-white font-bold">{level}</span>
        </span>
        <span className="text-white/40">
          {progress.current.toLocaleString()} / {progress.needed.toLocaleString()} XP
        </span>
        <span className="text-white/60">
          Level <span className="text-white font-bold">{level + 1}</span>
        </span>
      </div>
      <div className="h-3 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #6366f1 0%, #a78bfa 60%, #c4b5fd 100%)',
            boxShadow: '0 0 10px rgba(99,102,241,0.5)',
          }}
        />
      </div>
      <div className="text-center text-xs text-white/30 mt-1">{pct}%</div>
    </div>
  );
}

// ── Streak Flame ───────────────────────────────────────────────────────────

function StreakBadge({ streak, best }: { streak: number; best: number }) {
  const color =
    streak >= 10 ? '#ef4444' :
    streak >= 5  ? '#f59e0b' :
    streak >= 3  ? '#f97316' : '#6366f1';
  const glow =
    streak >= 10 ? '0 0 20px rgba(239,68,68,0.6)' :
    streak >= 5  ? '0 0 16px rgba(245,158,11,0.5)' :
    streak >= 3  ? '0 0 14px rgba(249,115,22,0.4)' : 'none';

  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div
        animate={streak >= 3 ? { scale: [1, 1.08, 1] } : {}}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
        className="text-3xl"
        style={{ filter: streak >= 3 ? `drop-shadow(${glow})` : 'none' }}
      >
        {streak >= 10 ? '⚡' : streak >= 5 ? '🔥' : streak >= 3 ? '🌟' : '💫'}
      </motion.div>
      <div className="font-black text-xl" style={{ color }}>
        {streak}
      </div>
      <div className="text-xs text-white/40">streak</div>
      {best > 0 && (
        <div className="text-xs text-white/30">best: {best}</div>
      )}
    </div>
  );
}

// ── Badge Grid ─────────────────────────────────────────────────────────────

function BadgeGrid({
  earned,
  defs,
}: {
  earned: string[];
  defs:   BadgeDef[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {defs.map(def => {
        const has = earned.includes(def.id);
        return (
          <div
            key={def.id}
            title={`${def.name}: ${def.desc}`}
            className={`flex flex-col items-center gap-0.5 p-2 rounded-xl text-center transition-all ${
              has
                ? 'bg-white/10 border border-white/20'
                : 'bg-white/3 border border-white/5 opacity-30 grayscale'
            }`}
            style={{ minWidth: 56 }}
          >
            <span className="text-xl">{def.icon}</span>
            <span className="text-xs text-white/60 leading-tight" style={{ fontSize: 10 }}>
              {def.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  playerId:   string;
  playerName: string;
  compact?:   boolean;
}

export default function PlayerProgress({ playerId, playerName, compact = false }: Props) {
  const [profile,  setProfile]  = useState<PlayerProfile | null>(null);
  const [progress, setProgress] = useState<XpProgress | null>(null);
  const [defs,     setDefs]     = useState<BadgeDef[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [levelUp,  setLevelUp]  = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await gameLayerApi.getProfile(playerId);
      if (data) {
        const wasLevel = profile?.level ?? 0;
        setProfile(data.profile);
        setProgress(data.progress);
        setDefs(data.badgeDefs);
        if (wasLevel > 0 && data.profile.level > wasLevel) setLevelUp(true);
      }
    } catch { /* server may not have profile yet */ }
    finally { setLoading(false); }
  }, [playerId, profile?.level]);

  useEffect(() => { load(); }, [playerId]);

  useEffect(() => {
    if (levelUp) {
      const t = setTimeout(() => setLevelUp(false), 3000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [levelUp]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/3 mb-3" />
        <div className="h-3 bg-white/10 rounded w-full mb-2" />
        <div className="h-3 bg-white/10 rounded w-2/3" />
      </div>
    );
  }

  if (!profile || !progress) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center text-white/30 text-sm">
        Play a match to start tracking your progression!
      </div>
    );
  }

  if (compact) {
    const pct = Math.min(100, Math.round((progress.current / progress.needed) * 100));
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10">
        <div className="text-2xl font-black text-indigo-400">Lv.{profile.level}</div>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-white/50 mb-1">
            <span>{profile.xp.toLocaleString()} XP</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-400"
              style={{ width: `${pct}%`, transition: 'width 0.6s ease-out' }}
            />
          </div>
        </div>
        {profile.streak >= 3 && (
          <div className="flex items-center gap-1 text-sm font-bold text-orange-400">
            🔥{profile.streak}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
      {/* Level-up banner */}
      <AnimatePresence>
        {levelUp && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-4 py-2 text-center text-sm font-bold"
            style={{ background: 'linear-gradient(90deg, #6366f1, #a78bfa)' }}
          >
            🎉 Level Up! You are now Level {profile.level}!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header row */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-4">
        {/* Level badge */}
        <div
          className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 font-black"
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)',
            boxShadow: '0 0 20px rgba(99,102,241,0.4)',
          }}
        >
          <div className="text-xs text-white/70 leading-none">Lv</div>
          <div className="text-2xl text-white leading-none">{profile.level}</div>
        </div>

        {/* Stats */}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white truncate">{profile.playerName}</div>
          <div className="text-xs text-white/50 mt-0.5">
            {profile.totalWins}W · {profile.totalDraws}D · {profile.totalLosses}L
          </div>
          <div className="text-xs text-indigo-300 mt-0.5">
            {profile.xp.toLocaleString()} XP total
          </div>
        </div>

        {/* Streak */}
        <StreakBadge streak={profile.streak} best={profile.bestStreak} />
      </div>

      {/* XP bar */}
      <div className="px-4 pb-4">
        <XpBar progress={progress} level={profile.level} />
      </div>

      {/* DN$ & arcade */}
      <div className="border-t border-white/5 px-4 py-3 flex gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <span>🪙</span>
          <span className="text-white font-bold">{profile.arcadeCoins.toLocaleString()}</span>
          <span className="text-white/40 text-xs">arcade DN$</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>🎮</span>
          <span className="text-white font-bold">{profile.arcadePlays}</span>
          <span className="text-white/40 text-xs">arcade plays</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span>📅</span>
          <span className="text-white font-bold">{profile.dailyClaimCount}</span>
          <span className="text-white/40 text-xs">daily streak</span>
        </div>
      </div>

      {/* Badges */}
      {defs.length > 0 && (
        <div className="border-t border-white/5 px-4 py-3">
          <div className="text-xs text-white/40 mb-2 font-medium">
            Badges · {profile.badges.length}/{defs.length} earned
          </div>
          <BadgeGrid earned={profile.badges} defs={defs} />
        </div>
      )}
    </div>
  );
}
