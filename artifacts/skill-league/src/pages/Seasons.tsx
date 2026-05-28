import { useGame } from "@/contexts/GameContext";
import { Link } from "wouter";
import { ArrowLeft, Trophy, Clock, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import {
  getCurrentSeason, getDaysLeftInSeason, getSeasonProgress,
  getSeasonTier, getNextSeasonTier, SEASON_TIERS, buildMockSeasonLeaderboard,
} from "@/lib/seasons";

export default function Seasons() {
  const { elo, username, seasonHistory, currentSeasonNumber } = useGame();

  const season   = getCurrentSeason();
  const daysLeft = getDaysLeftInSeason();
  const pct      = getSeasonProgress();
  const tier     = getSeasonTier(elo);
  const nextTier = getNextSeasonTier(elo);
  const eloToNext = nextTier ? nextTier.minElo - elo : 0;
  const eloPct    = nextTier
    ? Math.min(100, Math.round(((elo - tier.minElo) / (nextTier.minElo - tier.minElo)) * 100))
    : 100;

  const leaderboard = buildMockSeasonLeaderboard(elo, username);

  return (
    <div className="min-h-screen bg-background text-foreground pb-10">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="p-1 rounded-lg hover:bg-card active:scale-95 transition-transform">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="text-lg font-bold flex-1">Seasons</h1>
        <span className="text-sm text-muted-foreground">S{season.number}</span>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">

        {/* Current Season Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Current Season</div>
              <div className="text-xl font-black mt-0.5" style={{ color: season.color }}>{season.name}</div>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="font-semibold">{daysLeft}d left</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{season.startDate}</span>
              <span>{pct}% done</span>
              <span>{season.endDate}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: season.color }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        </motion.div>

        {/* My Season Rank */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border bg-card p-4 space-y-3"
        >
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Your Rank</div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{tier.icon}</span>
              <div>
                <div className="text-xl font-black" style={{ color: tier.color }}>{tier.rank}</div>
                <div className="text-xs text-muted-foreground">{tier.description}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black tabular-nums" style={{ color: tier.color }}>{elo}</div>
              <div className="text-xs text-muted-foreground">ELO</div>
            </div>
          </div>

          {nextTier && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span style={{ color: tier.color }}>{tier.rank}</span>
                <span className="text-muted-foreground">{eloToNext} ELO to {nextTier.rank}</span>
                <span style={{ color: nextTier.color }}>{nextTier.rank}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: tier.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${eloPct}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* End-of-season reward */}
          <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 border border-border/60">
            <div className="text-xs text-muted-foreground">Season-end reward</div>
            <div className="flex items-center gap-3 text-sm font-bold">
              <span className="text-yellow-400">+{tier.endRewardCoins} 🪙</span>
              <span className="text-purple-400">+{tier.endRewardXp} XP</span>
            </div>
          </div>
        </motion.div>

        {/* All Tiers */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-4 space-y-2"
        >
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Season Tiers</div>
          {[...SEASON_TIERS].reverse().map(t => (
            <div key={t.rank} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${t.rank === tier.rank ? 'bg-card border border-border/80' : 'bg-muted/20'}`}>
              <span className="text-xl w-7 text-center">{t.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-bold" style={{ color: t.color }}>{t.rank}</div>
                <div className="text-xs text-muted-foreground">{t.minElo}+ ELO</div>
              </div>
              <div className="text-right text-xs">
                <div className="text-yellow-400 font-semibold">{t.endRewardCoins} 🪙</div>
                <div className="text-purple-400">{t.endRewardXp} XP</div>
              </div>
              {t.rank === tier.rank && (
                <span className="text-xs text-primary font-bold ml-1">YOU</span>
              )}
            </div>
          ))}
        </motion.div>

        {/* Season Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl border border-border bg-card p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Season Leaderboard</div>
          </div>
          {leaderboard.map((entry, i) => {
            const entryTier = getSeasonTier(entry.elo);
            return (
              <div key={entry.name}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 ${entry.isPlayer ? 'bg-primary/10 border border-primary/30' : 'bg-muted/20'}`}
              >
                <span className="text-sm font-black w-5 text-center text-muted-foreground">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </span>
                <div className="text-base">{entryTier.icon}</div>
                <div className="flex-1">
                  <div className={`text-sm font-bold ${entry.isPlayer ? 'text-primary' : ''}`}>{entry.name}</div>
                </div>
                <div className="text-sm font-black tabular-nums" style={{ color: entryTier.color }}>{entry.elo}</div>
              </div>
            );
          })}
        </motion.div>

        {/* Season History */}
        {seasonHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-2xl border border-border bg-card p-4 space-y-3"
          >
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Past Seasons</div>
            {seasonHistory.map(rec => (
              <div key={rec.seasonNumber} className="flex items-center gap-3 rounded-xl bg-muted/20 px-3 py-2">
                <span className="text-lg">{rec.rankColor ? '🏅' : '🎖️'}</span>
                <div className="flex-1">
                  <div className="text-sm font-bold">{rec.seasonName}</div>
                  <div className="text-xs text-muted-foreground">{rec.finalElo} ELO · {rec.rank}</div>
                </div>
                <div className="text-right text-xs">
                  <div className="text-yellow-400">+{rec.coinsEarned} 🪙</div>
                  <div className="text-purple-400">+{rec.xpEarned} XP</div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
