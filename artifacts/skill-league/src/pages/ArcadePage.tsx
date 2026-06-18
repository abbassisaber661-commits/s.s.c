import { useGame } from '@/contexts/GameContext';
import ArcadeZone from '@/components/ArcadeZone';

export default function ArcadePage() {
  const { authUser, username } = useGame();
  const playerId   = authUser?.uid ?? 'guest';
  const playerName = username ?? authUser?.uid ?? 'Player';

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-6">
      <ArcadeZone playerId={playerId} playerName={playerName} />
    </div>
  );
}
