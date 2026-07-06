import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link } from "wouter";
import { ChevronLeft, CheckCircle2, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { STORE_ITEMS, formatPiPrice, isOwned, type StoreItem } from "@/lib/store";
import { playTap, playCoin } from "@/lib/sounds";
import { useT, isRTL } from "@/lib/i18n";

const TYPE_COLOR: Record<string, string> = {
  coins: '#fbbf24', xp_boost: '#a78bfa', cosmetic: '#f472b6', entry_pass: '#34d399',
};

function SectionHeader({ icon, label, sublabel }: { icon: string; label: string; sublabel?: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      <span className="text-base">{icon}</span>
      <span className="text-sm font-black">{label}</span>
      {sublabel && <span className="text-xs text-muted-foreground ml-auto">{sublabel}</span>}
    </div>
  );
}

export default function Store() {
  const { dnBalance, ownedItems, xpBoostUntil, purchaseItem, language } = useGame();
  const t = useT(language);
  const rtl = isRTL(language);

  const [buying, setBuying] = useState<string | null>(null);
  const [toast, setToast]   = useState<{ msg: string; ok: boolean } | null>(null);

  const boostActive = xpBoostUntil !== null && xpBoostUntil > Date.now();
  const boostMins   = boostActive ? Math.ceil((xpBoostUntil! - Date.now()) / 60_000) : 0;

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleBuy(item: StoreItem) {
    if (buying) return;
    playTap();
    setBuying(item.id);
    try {
      const ok = await purchaseItem(item);
      if (ok) { playCoin(); showToast(`✅ ${item.name}`, true); }
      else       showToast('❌', false);
    } catch {
      showToast('❌', false);
    } finally {
      setBuying(null);
    }
  }

  function ItemCard({ item, idx }: { item: StoreItem; idx: number }) {
    const owned     = isOwned(item.id, ownedItems);
    const isBuying  = buying === item.id;
    const typeColor = TYPE_COLOR[item.type] ?? '#60a5fa';
    return (
      <motion.div key={item.id}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.04 }}
        className={`rounded-2xl border bg-card p-4 flex items-center gap-4 ${
          owned ? 'border-green-500/30 bg-green-500/5' : 'border-border'
        }`}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: typeColor + '20' }}>
          {item.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold">{item.name}</span>
            {item.badge && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: typeColor + '25', color: typeColor }}>{item.badge}</span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{item.description}</p>
          {item.coinValue && (
            <p className="text-xs text-yellow-400 font-bold mt-1">+{item.coinValue} {t('coin_label')}</p>
          )}
          {item.xpBoostHours && (
            <p className="text-xs font-bold mt-1" style={{ color: typeColor }}>
              <Zap className="w-3 h-3 inline mr-0.5" />{item.xpBoostHours}h duration
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          {owned && item.oneTimePurchase ? (
            <div className="flex items-center gap-1 text-xs text-green-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('store_owned')}</span>
            </div>
          ) : (
            <Button size="sm" onClick={() => handleBuy(item)} disabled={isBuying}
              className="text-xs font-bold min-w-[72px] h-9">
              {isBuying ? '⌛' : `π ${formatPiPrice(item.piPrice)}`}
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  const dnItems      = STORE_ITEMS.filter(i => i.type === 'coins'); // legacy: 'coins' type = DN$ bundles
  const boostItems   = STORE_ITEMS.filter(i => i.type === 'xp_boost');
  const cosmeticItems = STORE_ITEMS.filter(i => i.type === 'cosmetic');
  const passItems    = STORE_ITEMS.filter(i => i.type === 'entry_pass');

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="min-h-screen bg-background text-foreground pb-24">

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/60 px-4 py-3 flex items-center gap-3">
        <button className="p-2 rounded-xl hover:bg-card active:scale-95 transition-all" onClick={() => { playTap(); window.history.back(); }}>
          <ChevronLeft className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} />
        </button>
        <h1 className="text-lg font-black flex-1">🛍️ {t('nav_store')}</h1>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/15 border border-yellow-500/30 rounded-xl text-sm font-black text-yellow-400">
          {dnBalance ?? 0} DN$
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-6">

        {/* Pi Banner */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/30 bg-primary/10 p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center text-2xl font-black flex-shrink-0">π</div>
          <div className={rtl ? 'text-right flex-1' : 'flex-1'}>
            <div className="text-sm font-bold">{t('store_pi_powered')}</div>
            <div className="text-xs text-muted-foreground">{t('store_pi_desc')}</div>
          </div>
        </motion.div>

        {/* Boost active banner */}
        <AnimatePresence>
          {boostActive && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl border border-purple-500/40 bg-purple-500/10 p-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-bold text-purple-400">{t('boost_active_label')}</span>
              <span className="text-xs text-muted-foreground mr-auto">{boostMins} {t('boost_mins_remaining')}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 1. COINS PACKAGES ── */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <SectionHeader icon="🪙" label="DN$ Bundles" sublabel="Earn DN$ to use in-game" />
          <div className="space-y-3">
            {dnItems.map((item, idx) => <ItemCard key={item.id} item={item} idx={idx} />)}
          </div>
        </motion.section>

        {/* ── 2. BOOSTS ── */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <SectionHeader icon="⚡" label="Boosts" sublabel="Double your XP" />
          <div className="space-y-3">
            {boostItems.map((item, idx) => <ItemCard key={item.id} item={item} idx={idx} />)}
          </div>
        </motion.section>

        {/* ── 3. COSMETICS ── */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <SectionHeader icon="🎨" label="Cosmetics" sublabel="Stand out" />
          <div className="space-y-3">
            {cosmeticItems.map((item, idx) => <ItemCard key={item.id} item={item} idx={idx} />)}
          </div>
        </motion.section>

        {/* ── 4. PASSES & REWARDS ── */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <SectionHeader icon="🎁" label="Passes & Rewards" sublabel="Exclusive access" />
          <div className="space-y-3">
            {passItems.map((item, idx) => <ItemCard key={item.id} item={item} idx={idx} />)}

            {/* Daily rewards shortcut */}
            <Link href="/daily-rewards">
              <div className="rounded-2xl border border-green-500/30 bg-green-500/06 p-4 flex items-center gap-4 active:scale-[0.98] transition-transform cursor-pointer">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 bg-green-500/15">
                  🎁
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">Daily Login Reward</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Claim your free daily reward</div>
                </div>
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-green-500/20 text-green-400 shrink-0">
                  Claim →
                </span>
              </div>
            </Link>
          </div>
        </motion.section>

        {/* ── Free ways ── */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="text-sm font-bold text-muted-foreground">🆓 {t('store_free_ways_title')}</div>
            {[
              { icon: '🎮', text: t('play'),             reward: `+${t('coins')}` },
              { icon: '⚔️', text: t('pvp_quick'),        reward: `+${t('coins')} x2` },
              { icon: '📅', text: t('daily_challenges'), reward: '+25–40 🪙' },
              { icon: '📋', text: t('completed'),        reward: '+75–200 🪙' },
              { icon: '🏆', text: t('leaderboard'),      reward: '+500–1000 🪙' },
              { icon: '🔥', text: t('streak'),           reward: `+${t('reward_label')}` },
            ].map(row => (
              <div key={row.text} className="flex items-center gap-3">
                <span className="w-7 text-center text-lg flex-shrink-0">{row.icon}</span>
                <span className="flex-1 text-muted-foreground text-xs">{row.text}</span>
                <span className="text-yellow-400 font-bold text-xs flex-shrink-0">{row.reward}</span>
              </div>
            ))}
          </div>
        </motion.section>

      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 48 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-bold shadow-xl z-50 border ${
              toast.ok ? 'bg-green-500/15 border-green-500/40 text-green-400'
                       : 'bg-red-500/15 border-red-500/40 text-red-400'
            }`}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
