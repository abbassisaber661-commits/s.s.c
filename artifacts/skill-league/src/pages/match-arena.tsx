// ─────────────────────────────────────────────
// 🎮 SkillLeague Match Arena (UI)
// ─────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useEsportMatch } from '@/hooks/use-esport-match';

import type { PlayerProfile } from '@/lib/player-profile-system';

// ─────────────────────────────────────────────
// 🎯 PAGE
// ─────────────────────────────────────────────

export default function MatchArena() {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);

  const {
    session,
    startMatch,
    answer,
    finishMatch,
    isFinished,
  } = useEsportMatch();

  // ─────────────────────────────
  // 🚀 START AUTO MATCH
  // ─────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('player');

    if (!stored) return;

    const parsed: PlayerProfile = JSON.parse(stored);
    setPlayer(parsed);

    startMatch(parsed, 10);
  }, []);

  // ─────────────────────────────
  // 🎯 HANDLE ANSWER
  // ─────────────────────────────
  const handleAnswer = (index: number) => {
    if (isFinished) return;
    answer(index);
  };

  // ─────────────────────────────
  // 🏁 FINISH
  // ─────────────────────────────
  const result = isFinished ? finishMatch() : null;

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        Loading match...
      </div>
    );
  }

  const q = session.questions[session.currentIndex];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      
      {/* HEADER */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">🎮 SkillLeague Arena</h1>
        <p className="text-sm text-gray-400">
          Score: {session.score} / {session.questions.length}
        </p>
      </div>

      {/* QUESTION */}
      {!isFinished && q && (
        <div className="w-full max-w-xl">
          <h2 className="text-lg mb-4 text-center">{q.prompt}</h2>

          <div className="grid grid-cols-1 gap-3">
            {q.options.map((opt: any, i: number) => (
              <button
                key={opt.id}
                onClick={() => handleAnswer(i)}
                className="bg-gray-800 hover:bg-gray-700 p-3 rounded-xl transition"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* RESULT */}
      {isFinished && result && (
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold">🏁 Match Finished</h2>

          <p>Score: {result.score} / {result.total}</p>
          <p>Percent: {result.percent}%</p>
          <p>Rank: {result.rank}</p>

          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-blue-600 rounded-xl"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}