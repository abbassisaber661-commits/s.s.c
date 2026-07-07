import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link } from "wouter";
import { ArrowLeft, Lock, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  PI_LOCK_TIERS, getActiveLockTier, getLockTimeLeft, formatPi,
  type PiLockTier,
} from "@/lib/pi-lock";

export default function PiLock() {
  const { piLockTierId, piLockExpiry, piTotalLocked, activatePiLock } = useGame();
  const [locking, setLocking] = useState<string | null>(null);
  const [toast, setToast]     = useState<string | null>(null);

  const activeTier = getActiveLockTier(piLockTierId ?? null, piLockExpiry ?? null);
  const timeLeft   = getLockTimeLeft(piLockExpiry ?? null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function handleLock(tier: PiLockTier) {
    if (locking) return;
    setLocking(tier.id);
    try {
      const ok = await activatePiLock(tier);
      if (ok) showToast(`✅ ${tier.name} activated for ${tier.durationDays} days!`);
      else    showToast('❌ Payment cancelled');
    } catch {
      showToast('❌ Payment error — try again');
    } finally {
      setLocking(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-10">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button className="p-1 rounded-lg hover:bg-card active:scale-95 transition-transform" onClick={() => window.history.back()}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Lock className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold flex-1">Pi Lock System</h1>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">

        {/* Explainer */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/30 bg-primary/10 p-4 space-y-2"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-primary">
            <span className="text-xl">π</span> What is Pi Lock?
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Lock Pi to unlock premium in-game features — verified badge, DN$ bonuses, XP boosts,
            and VIP tournament access. Your Pi supports S.S.C development.
            All benefits are in-game only — no withdrawals.
          </p>
        </motion.div>

        {/* Active lock status */}
        {activeTier && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-green-500/40 bg-green-500/10 p-4 space-y-2"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-green-400" />
              <span className="text-sm font-bold text-green-400">Active Lock: {activeTier.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{timeLeft}</span>
              <span className="font-semibold text-green-400">
                {activeTier.icon} +{activeTier.coinBonus}% DN$
                {activeTier.xpBonus > 0 && ` · +${activeTier.xpBonus}% XP`}
              </span>
            </div>
          </motion.div>
        )}

        {/* Total locked stat */}
        {(piTotalLocked || 0) > 0 && (
          <div className="rounded-2xl border border-border bg-card px-4 py-3 flex items-center gap-3">
            <span className="text-2xl font-black text-primary">π {(piTotalLocked || 0).toFixed(1)}</span>
            <div className="text-xs text-muted-foreground">Total Pi contributed to S.S.C</div>
          </div>
        )}

        {/* Lock tiers */}
        {PI_LOCK_TIERS.map((tier, idx) => {
          const isActive  = activeTier?.id === tier.id;
          const isLocking = locking === tier.id;

          return (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07 }}
              className={`rounded-2xl border p-4 space-y-3 ${isActive ? 'border-green-500/40 bg-green-500/5' : 'border-border bg-card'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{tier.icon}</span>
                  <div>
                    <div className="text-sm font-black" style={{ color: tier.color }}>{tier.name}</div>
                    <div className="text-xs text-muted-foreground">{tier.durationDays} days</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black" style={{ color: tier.color }}>{formatPi(tier.piAmount)}</div>
                  {isActive && (
                    <div className="flex items-center gap-1 text-xs text-green-400 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                {tier.benefits.map(b => (
                  <div key={b} className="text-xs text-muted-foreground">{b}</div>
                ))}
              </div>

              <Button
                className="w-full"
                style={isActive ? {} : { backgroundColor: tier.color + '20', color: tier.color, borderColor: tier.color + '40' }}
                variant={isActive ? 'outline' : 'outline'}
                disabled={isLocking || isActive}
                onClick={() => handleLock(tier)}
              >
                {isLocking ? 'Processing…' : isActive ? `✓ Active — ${timeLeft}` : `Lock ${formatPi(tier.piAmount)}`}
              </Button>
            </motion.div>
          );
        })}

        {/* Disclaimer */}
        <div className="rounded-2xl border border-border/40 bg-card/30 p-4 space-y-1 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground/60">Important Notes</p>
          <p>• Pi Lock is a one-time payment — not a deposit or investment</p>
          <p>• Benefits are in-game only (Boost / Tournaments / Visibility)</p>
          <p>• No withdrawals, no real-world value</p>
          <p>• Powered by Pi Network's decentralized payment system</p>
        </div>
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
