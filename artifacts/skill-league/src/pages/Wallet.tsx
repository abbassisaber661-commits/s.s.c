import { useEffect, useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link } from "wouter";
import { ArrowLeft, TrendingUp, TrendingDown, Coins } from "lucide-react";
import { motion } from "framer-motion";
import {
  getTransactions, getWalletStats, getTxIcon, getTxColor, DAILY_EARN_LIMIT,
  type Transaction,
} from "@/lib/wallet";
import { getActiveLockTier } from "@/lib/pi-lock";

export default function Wallet() {
  const { coins, totalCoinsEarned, totalCoinsSpent,
    piLockTierId, piLockExpiry } = useGame();
  const [txs, setTxs] = useState<Transaction[]>([]);

  useEffect(() => { setTxs(getTransactions()); }, []);

  const { totalEarned, totalSpent, todayEarned } = getWalletStats(txs);
  const activeLock = getActiveLockTier(piLockTierId ?? null, piLockExpiry ?? null);
  const dailyPct   = Math.min(100, Math.round((todayEarned / DAILY_EARN_LIMIT) * 100));
  const coinBonus  = activeLock?.coinBonus ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground pb-10">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button className="p-1 rounded-lg hover:bg-card active:scale-95 transition-transform" onClick={() => window.history.back()}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Coins className="w-5 h-5 text-yellow-400" />
        <h1 className="text-lg font-bold flex-1">Coins Wallet</h1>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 p-5 space-y-2"
        >
          <div className="text-xs text-yellow-400/80 uppercase tracking-wider">Current Balance</div>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-black tabular-nums text-yellow-400">{coins}</span>
            <span className="text-xl text-yellow-400/60 mb-1">🪙</span>
          </div>
          {coinBonus > 0 && (
            <div className="text-xs text-yellow-300 font-semibold">
              +{coinBonus}% bonus active (Pi Lock)
            </div>
          )}
          <div className="flex gap-4 pt-2">
            <Link href="/store" className="flex-1">
              <button className="w-full py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-xs font-bold text-yellow-400 hover:bg-yellow-500/30 active:scale-95 transition-all">
                🛒 Buy Coins
              </button>
            </Link>
            <Link href="/leagues" className="flex-1">
              <button className="w-full py-2 rounded-xl bg-green-500/20 border border-green-500/30 text-xs font-bold text-green-400 hover:bg-green-500/30 active:scale-95 transition-all">
                🎮 Earn More
              </button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-2"
        >
          {[
            { label: 'Total Earned', value: totalEarned || totalCoinsEarned, icon: '↑', color: 'text-green-400' },
            { label: 'Total Spent',  value: totalSpent  || totalCoinsSpent,  icon: '↓', color: 'text-red-400' },
            { label: 'Today',        value: todayEarned,  icon: '📅', color: 'text-primary' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-3 text-center">
              <div className={`text-lg font-black tabular-nums ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Daily earn limit */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="rounded-2xl border border-border bg-card p-4 space-y-2"
        >
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Daily earn limit</span>
            <span className="font-semibold">{todayEarned} / {DAILY_EARN_LIMIT} 🪙</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${dailyPct >= 100 ? 'bg-red-500' : 'bg-green-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${dailyPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {dailyPct >= 100
              ? '⚠️ Daily limit reached — come back tomorrow'
              : `${DAILY_EARN_LIMIT - todayEarned} coins remaining today`}
          </p>
        </motion.div>

        {/* Earn methods */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-4 space-y-2"
        >
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">How to Earn</div>
          {[
            { icon: '🎮', label: 'Win a match',          reward: '+10–60 🪙' },
            { icon: '⚔️', label: 'Win PvP battle',       reward: '+66–330 🪙' },
            { icon: '🏆', label: 'Win a tournament',     reward: '+500–1000 🪙' },
            { icon: '📅', label: 'Daily challenges',     reward: '+25–40 🪙/day' },
            { icon: '📋', label: 'Weekly missions',      reward: '+75–200 🪙/week' },
            { icon: '🏅', label: 'Unlock a trophy',      reward: '+50 🪙 each' },
            { icon: '🌀', label: 'Season-end reward',    reward: '+50–2000 🪙' },
            { icon: '💬', label: 'Community (limited)',  reward: '+1–5 fame only' },
          ].map(r => (
            <div key={r.label} className="flex items-center gap-3">
              <span className="text-base w-6 text-center">{r.icon}</span>
              <span className="flex-1 text-sm text-muted-foreground">{r.label}</span>
              <span className="text-xs font-bold text-yellow-400">{r.reward}</span>
            </div>
          ))}
        </motion.div>

        {/* Transaction history */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="rounded-2xl border border-border bg-card p-4 space-y-3"
        >
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Recent Transactions</div>
          {txs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No transactions yet — start playing!
            </p>
          ) : (
            txs.slice(0, 20).map((tx, i) => (
              <motion.div key={tx.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center text-sm flex-shrink-0">
                  {getTxIcon(tx.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{tx.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(tx.timestamp).toLocaleDateString()}
                  </div>
                </div>
                <div className={`text-sm font-black tabular-nums flex-shrink-0`}
                  style={{ color: getTxColor(tx.amount) }}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount} 🪙
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
}
