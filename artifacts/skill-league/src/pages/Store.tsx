import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link } from "wouter";
import { ArrowLeft, ShoppingBag, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { STORE_ITEMS, formatPiPrice, isOwned, type StoreItem } from "@/lib/store";

const TYPE_LABELS: Record<string, string> = {
  all: 'All',
  coins: '💰 Coins',
  xp_boost: '⚡ Boosts',
  cosmetic: '👑 Cosmetics',
  entry_pass: '🌟 Passes',
};

export default function Store() {
  const { coins, ownedItems, xpBoostUntil, purchaseItem } = useGame();
  const [filter, setFilter]     = useState<string>('all');
  const [buying, setBuying]     = useState<string | null>(null);
  const [toast, setToast]       = useState<string | null>(null);

  const filters = ['all', 'coins', 'xp_boost', 'cosmetic', 'entry_pass'];
  const displayed = filter === 'all' ? STORE_ITEMS : STORE_ITEMS.filter(i => i.type === filter);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleBuy(item: StoreItem) {
    if (buying) return;
    setBuying(item.id);
    try {
      const ok = await purchaseItem(item);
      if (ok) showToast(`✅ ${item.name} purchased!`);
      else    showToast('❌ Purchase cancelled');
    } catch {
      showToast('❌ Payment error — try again');
    } finally {
      setBuying(null);
    }
  }

  const boostActive = xpBoostUntil !== null && xpBoostUntil > Date.now();
  const boostMins   = boostActive ? Math.ceil((xpBoostUntil! - Date.now()) / 60_000) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground pb-10">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="p-1 rounded-lg hover:bg-card active:scale-95 transition-transform">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="text-lg font-bold flex-1 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-primary" /> Store
        </h1>
        <div className="flex items-center gap-1.5 text-sm font-bold text-yellow-400">
          {coins} 🪙
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">

        {/* Pi Network Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/30 bg-primary/10 p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-xl">π</div>
          <div className="flex-1">
            <div className="text-sm font-bold">Powered by Pi Network</div>
            <div className="text-xs text-muted-foreground">All purchases use Pi — fast, secure, decentralized</div>
          </div>
        </motion.div>

        {/* Active Boost Banner */}
        {boostActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-3 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-bold text-yellow-400">XP Boost active</span>
            <span className="text-xs text-muted-foreground ml-auto">{boostMins}m remaining</span>
          </motion.div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
              {TYPE_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="space-y-3">
          {displayed.map((item, idx) => {
            const owned    = isOwned(item.id, ownedItems);
            const isBuying = buying === item.id;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`rounded-2xl border bg-card p-4 flex items-center gap-4 ${owned ? 'border-green-500/30 bg-green-500/5' : 'border-border'}`}
              >
                <div className="text-4xl w-12 text-center flex-shrink-0">{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold">{item.name}</span>
                    {item.badge && (
                      <span className="text-xs bg-primary/20 text-primary rounded px-1.5 py-0.5 font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  {item.coinValue && (
                    <p className="text-xs text-yellow-400 font-semibold mt-1">+{item.coinValue} coins</p>
                  )}
                  {item.xpBoostHours && (
                    <p className="text-xs text-purple-400 font-semibold mt-1">×2 XP for {item.xpBoostHours}h</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {owned && item.oneTimePurchase ? (
                    <div className="flex items-center gap-1 text-xs text-green-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Owned
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleBuy(item)}
                      disabled={isBuying}
                      className="text-xs font-bold min-w-[68px]"
                    >
                      {isBuying ? '…' : formatPiPrice(item.piPrice)}
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Earn Coins Free */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border bg-card p-4 space-y-2"
        >
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Earn Coins Free</div>
          {[
            { icon: '🎮', text: 'Win any match', reward: '+coins' },
            { icon: '⚔️', text: 'Win a PvP battle', reward: '+arena stake ×2' },
            { icon: '📅', text: 'Complete daily challenges', reward: '+25–40 coins/day' },
            { icon: '📋', text: 'Complete weekly missions', reward: '+75–200 coins/week' },
            { icon: '🏆', text: 'Win a tournament', reward: '+500–1000 coins' },
          ].map(row => (
            <div key={row.text} className="flex items-center gap-3 text-sm">
              <span className="w-6 text-center">{row.icon}</span>
              <span className="flex-1 text-muted-foreground">{row.text}</span>
              <span className="text-yellow-400 font-semibold text-xs">{row.reward}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-border rounded-2xl px-5 py-3 text-sm font-semibold shadow-xl z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
