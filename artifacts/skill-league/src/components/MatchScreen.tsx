import { useEsportMatch } from "@/hooks/use-esport-match";
import type { PlayerProfile } from "@/lib/player-profile-system";
import { useState } from "react";

export function MatchScreen({ player }: { player: PlayerProfile }) {
  const { session, startMatch, answer, finishMatch, isFinished } =
    useEsportMatch();

  const [started, setStarted] = useState(false);

  const handleStart = () => {
    startMatch(player, 10);
    setStarted(true);
  };

  if (!started) {
    return (
      <div>
        <button onClick={handleStart}>🎮 Start Match</button>
      </div>
    );
  }

  if (!session) return null;

  const current = session.questions?.[session.currentIndex];

  return (
    <div>
      <h2>Question {session.currentIndex + 1}</h2>

      <p>{current?.q}</p>

      <div>
        {current?.opts.map((opt: string, i: number) => (
          <button key={i} onClick={() => answer(i)}>
            {opt}
          </button>
        ))}
      </div>

      {isFinished && (
        <button onClick={finishMatch}>🏁 Finish Match</button>
      )}
    </div>
  );
}