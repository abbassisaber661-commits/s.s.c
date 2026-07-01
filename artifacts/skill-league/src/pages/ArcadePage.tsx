import { ArrowLeft } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import ArcadeZone from '@/components/ArcadeZone';

export default function ArcadePage() {
  const { authUser, username } = useGame();
  const playerId   = authUser?.uid ?? 'guest';
  const playerName = username ?? authUser?.uid ?? 'Player';

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="sticky top-0 z-20 bg-gray-950/95 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors active:scale-90"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-white/70" />
        </button>
        <h1 className="text-lg font-black text-white flex-1">🕹️ Arcade</h1>
      </div>
      <div className="px-4 py-6">
        <ArcadeZone playerId={playerId} playerName={playerName} />
      </div>
    </div>
  );
}
