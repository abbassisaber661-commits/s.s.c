import { useState } from "react";
import { seasonManager } from "@/lib/seasons";

// ─────────────────────────────────────────────
// 🎮 Seasons UI Component
// ─────────────────────────────────────────────

export function SeasonsPanel() {
  const [leaderboard, setLeaderboard] = useState(
    seasonManager.getLeaderboard()
  );

  const refresh = () => {
    setLeaderboard([...seasonManager.getLeaderboard()]);
  };

  return (
    <div>
      <h2>🏆 Season Leaderboard</h2>

      <button onClick={refresh}>🔄 Refresh</button>

      <ul>
        {leaderboard.map((p, i) => (
          <li key={p.playerId}>
            #{i + 1} - {p.playerId} | {p.points} pts | {p.wins}W / {p.losses}L
          </li>
        ))}
      </ul>
    </div>
  );
}