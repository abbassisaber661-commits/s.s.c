import { useEffect, useState } from "react";
import { leaderboard } from "@/lib/leaderboard";

export default function LeaderboardPage() {
  const [data, setData] = useState(leaderboard.getTop(50));

  useEffect(() => {
    const interval = setInterval(() => {
      setData(leaderboard.getTop(50));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>🏆 Leaderboard</h1>

      {data.length === 0 ? (
        <p>No players yet — play a match first 🎮</p>
      ) : (
        <table style={{ width: "100%", marginTop: 20 }}>
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Points</th>
              <th>Wins</th>
              <th>Tier</th>
            </tr>
          </thead>

          <tbody>
            {data.map((p, i) => (
              <tr key={p.playerId}>
                <td>#{i + 1}</td>
                <td>{p.username}</td>
                <td>{p.points}</td>
                <td>{p.wins}</td>
                <td>{p.tier}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}