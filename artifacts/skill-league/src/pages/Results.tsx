import { useGame } from "@/contexts/GameContext";
import { Link } from "wouter";

export default function Results() {
  const { lastScore, lastAccuracy, lastCoinsEarned, lastTokensEarned, lastStreak, lastCorrect } = useGame();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">

      {/* Title */}
      <div className="mb-8 space-y-1">
        <div className="text-xs text-muted-foreground uppercase tracking-widest">Round Complete</div>
        <h1 className="text-4xl font-black">Results</h1>
      </div>

      {/* Score hero */}
      <div className="mb-8">
        <div className="text-8xl font-black tabular-nums text-primary" style={{ textShadow: '0 0 40px hsl(var(--primary) / 0.5)' }}>
          {lastScore}
        </div>
        <div className="text-sm text-muted-foreground uppercase tracking-widest mt-1">points</div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-sm mb-10">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-2xl font-black text-green-400">{lastAccuracy}%</div>
          <div className="text-xs text-muted-foreground uppercase mt-1">Accuracy</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-2xl font-black text-yellow-400">{lastCorrect}</div>
          <div className="text-xs text-muted-foreground uppercase mt-1">Correct</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-2xl font-black text-orange-400">{lastStreak}</div>
          <div className="text-xs text-muted-foreground uppercase mt-1">Best Streak</div>
        </div>
      </div>

      {/* Earnings */}
      {(lastCoinsEarned > 0 || lastTokensEarned > 0) && (
        <div className="flex gap-4 mb-10">
          {lastCoinsEarned > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-5 py-3 text-center">
              <div className="text-xl font-bold text-yellow-400">+{lastCoinsEarned}</div>
              <div className="text-xs text-muted-foreground uppercase">Coins</div>
            </div>
          )}
          {lastTokensEarned > 0 && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl px-5 py-3 text-center">
              <div className="text-xl font-bold text-purple-400">+{lastTokensEarned}</div>
              <div className="text-xs text-muted-foreground uppercase">Tokens</div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3">
        <Link href="/leagues" className="block">
          <button className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-lg active:scale-95 transition-transform">
            Play Again
          </button>
        </Link>
        <Link href="/" className="block">
          <button className="w-full h-12 rounded-2xl border border-border text-muted-foreground font-medium active:scale-95 transition-transform">
            Home
          </button>
        </Link>
      </div>
    </div>
  );
}
