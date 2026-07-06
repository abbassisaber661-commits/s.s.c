/**
 * ArcadeZone.tsx
 * ──────────────
 * Arcade games panel — lists available games, handles play flow,
 * shows XP/coin rewards. Does NOT affect league rankings.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gameLayerApi, type ArcadeGame, type ArcadeResult } from '@/lib/game-layer-api';

// ── Mini game simulation animations ───────────────────────────────────────

const GAME_STEPS: Record<string, string[]> = {
  memory_speed: ['🃏 Shuffling tiles…', '🔍 Memorize the pattern!', '⚡ Matching…', '✅ Done!'],
  logic_puzzle: ['🔮 Loading puzzle…', '🤔 Analysing sequence…', '💡 Cracking it…', '✅ Solved!'],
  word_sprint:  ['💬 Ready…', '🚀 Sprint started!', '📝 Building words…', '✅ Time up!'],
};

interface PlayAnimProps {
  gameId:    string;
  onDone:    () => void;
}

function PlayAnim({ gameId, onDone }: PlayAnimProps) {
  const steps = GAME_STEPS[gameId] ?? ['⚡ Playing…', '✅ Done!'];
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= steps.length - 1) {
      const t = setTimeout(onDone, 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep(s => s + 1), 700);
    return () => clearTimeout(t);
  }, [step, steps.length, onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-[#0d0f1a]/95 z-10"
    >
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm font-medium text-white/70"
      >
        {steps[step]}
      </motion.div>
      <div className="mt-3 flex gap-1">
        {steps.map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full transition-colors"
            style={{ backgroundColor: i <= step ? '#6366f1' : 'rgba(255,255,255,0.15)' }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ── Result flash ───────────────────────────────────────────────────────────

function ResultFlash({ result }: { result: ArcadeResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-emerald-900/90 backdrop-blur border border-emerald-500/40 z-20"
    >
      <div className="text-3xl mb-2">{result.game.icon}</div>
      <div className="font-bold text-emerald-300 text-base">+{result.xpGained} XP</div>
      <div className="text-yellow-300 text-sm">+{result.xpGained} XP</div>
      {result.levelledUp && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mt-2 px-2 py-0.5 bg-indigo-500/80 rounded-full text-xs font-bold text-white"
        >
          🎉 Level Up!
        </motion.div>
      )}
      {result.newBadges.length > 0 && (
        <div className="mt-1 text-xs text-yellow-200">
          New badge: {result.newBadges[0]}!
        </div>
      )}
    </motion.div>
  );
}

// ── Game card ──────────────────────────────────────────────────────────────

function GameCard({
  game,
  onPlay,
  disabled,
}: {
  game:     ArcadeGame;
  onPlay:   (g: ArcadeGame) => void;
  disabled: boolean;
}) {
  return (
    <div className="relative rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center gap-4 overflow-hidden">
      <div className="text-3xl flex-shrink-0">{game.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white text-sm">{game.name}</div>
        <div className="text-xs text-white/40 mb-1">{game.desc}</div>
        <div className="flex gap-2 text-xs">
          <span className="text-indigo-400 font-bold">+{game.xp} XP</span>
          <span className="text-yellow-400">+{game.xp} XP</span>
        </div>
      </div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onPlay(game)}
        disabled={disabled}
        className="px-4 py-2 rounded-xl font-bold text-sm text-white bg-indigo-500 hover:bg-indigo-400 transition-colors disabled:opacity-40 flex-shrink-0"
      >
        Play
      </motion.button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  playerId:       string;
  playerName:     string;
  onProgressUpdate?: () => void;
}

export default function ArcadeZone({ playerId, playerName, onProgressUpdate }: Props) {
  const [games,      setGames]      = useState<ArcadeGame[]>([]);
  const [playing,    setPlaying]    = useState<string | null>(null);
  const [animating,  setAnimating]  = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ArcadeResult | null>(null);
  const [resultGame, setResultGame] = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    gameLayerApi.getArcadeGames()
      .then(setGames)
      .catch(() => setError('Could not load arcade games'))
      .finally(() => setLoading(false));
  }, []);

  async function handlePlay(game: ArcadeGame) {
    setPlaying(game.id);
    setAnimating(game.id);
    setError(null);
    setLastResult(null);
    setResultGame(null);
  }

  async function handleAnimDone() {
    const gameId = animating!;
    setAnimating(null);
    try {
      const result = await gameLayerApi.playArcade(playerId, playerName, gameId);
      setLastResult(result);
      setResultGame(gameId);
      onProgressUpdate?.();
      setTimeout(() => {
        setLastResult(null);
        setResultGame(null);
        setPlaying(null);
      }, 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Play failed');
      setPlaying(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {games.map(game => (
        <div key={game.id} className="relative">
          <GameCard
            game={game}
            onPlay={handlePlay}
            disabled={!!playing}
          />

          <AnimatePresence>
            {animating === game.id && (
              <PlayAnim gameId={game.id} onDone={handleAnimDone} />
            )}
            {resultGame === game.id && lastResult && (
              <ResultFlash result={lastResult} />
            )}
          </AnimatePresence>
        </div>
      ))}

      <div className="text-xs text-white/30 text-center pt-1">
        Arcade games give XP + coins but don't affect league standings.
      </div>
    </div>
  );
}
