import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link } from "wouter";
import { ChevronLeft, CheckCircle2, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { STORE_ITEMS, formatPiPrice, isOwned, type StoreItem } from "@/lib/store";
import { playTap, playCoin } from "@/lib/sounds";

const FILTERS: { id: string; label: string; icon: string }[] = [
  { id: 'all',        label: 'الكل',      icon: '🛍️' },
  { id: 'coins',      label: 'عملات',     icon: '🪙' },
  { id: 'xp_boost',  label: 'تعزيز',     icon: '⚡' },
  { id: 'cosmetic',  label: 'مظهر',      icon: '👑' },
  { id: 'entry_pass',label: 'تصاريح',    icon: '🌟' },
];

const TYPE_COLOR: Record<string, string> = {
  coins: '#fbbf24', xp_boost: '#a78bfa', cosmetic: '#f472b6', entry_pass: '#34d399',
};

const FREE_WAYS = [
  { icon: '🎮', text: 'فز في أي مباراة',          reward: '+عملات' },
  { icon: '⚔️', text: 'انتصر في مباراة PvP',       reward: '+عملات مضاعفة' },
  { icon: '📅', text: 'أتمم التحديات اليومية',      reward: '+25–40 عملة/يوم' },
  { icon: '📋', text: 'أنجز مهام الأسبوع',          reward: '+75–200 عملة/أسبوع' },
  { icon: '🏆', text: 'فز في بطولة',                reward: '+500–1000 عملة' },
  { icon: '🔥', text: 'حافظ على سلسلة يومية',       reward: '+مكافأة يومية' },
];

export default function Store() {
  const { coins, ownedItems, xpBoostUntil, purchaseItem } = useGame();
  const [filter, setFilter] = useState<string>('all');
  const [buying, setBuying] = useState<string | null>(null);
  const [toast, setToast]   = useState<{ msg: string; ok: boolean } | null>(null);

  const displayed = filter === 'all' ? STORE_ITEMS : STORE_ITEMS.filter(i => i.type === filter);
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
      if (ok) { playCoin(); showToast(`✅ تم شراء ${item.name}!`, true); }
      else       showToast('❌ تم إلغاء الشراء', false);
    } catch {
      showToast('❌ خطأ في الدفع — حاول مجدداً', false);
    } finally {
      setBuying(null);
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/60 px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="p-2 rounded-xl hover:bg-card active:scale-95 transition-all" onClick={playTap}>
            <ChevronLeft className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="text-lg font-black flex-1 flex items-center gap-2">
          🛍️ المتجر
        </h1>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/15 border border-yellow-500/30 rounded-xl text-sm font-black text-yellow-400">
          {coins} 🪙
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">

        {/* Pi Network Banner */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/30 bg-primary/10 p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center text-2xl font-black">π</div>
          <div className="flex-1">
            <div className="text-sm font-bold">مدعوم من Pi Network</div>
            <div className="text-xs text-muted-foreground">كل المشتريات باستخدام Pi — سريع وآمن</div>
          </div>
        </motion.div>

        {/* Active Boost Banner */}
        <AnimatePresence>
          {boostActive && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl border border-purple-500/40 bg-purple-500/10 p-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-bold text-purple-400">تعزيز XP نشط</span>
              <span className="text-xs text-muted-foreground mr-auto">{boostMins} دقيقة متبقية</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => { setFilter(f.id); playTap(); }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                filter === f.id
                  ? 'bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.4)]'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}>
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="space-y-3">
          {displayed.map((item, idx) => {
            const owned    = isOwned(item.id, ownedItems);
            const isBuying = buying === item.id;
            const typeColor = TYPE_COLOR[item.type] ?? '#60a5fa';
            return (
              <motion.div key={item.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`rounded-2xl border bg-card p-4 flex items-center gap-4 ${
                  owned ? 'border-green-500/30 bg-green-500/5' : 'border-border'
                }`}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ background: typeColor + '20' }}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold">{item.name}</span>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: typeColor + '25', color: typeColor }}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.description}</p>
                  {item.coinValue && (
                    <p className="text-xs text-yellow-400 font-bold mt-1">+{item.coinValue} عملة</p>
                  )}
                  {item.xpBoostHours && (
                    <p className="text-xs font-bold mt-1" style={{ color: typeColor }}>
                      <Zap className="w-3 h-3 inline ml-0.5" />×2 XP لـ {item.xpBoostHours} ساعة
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {owned && item.oneTimePurchase ? (
                    <div className="flex items-center gap-1 text-xs text-green-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>مملوك</span>
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
          })}
        </div>

        {/* Free ways section */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="text-sm font-bold text-muted-foreground">🆓 اكسب عملات مجاناً</div>
          {FREE_WAYS.map(row => (
            <div key={row.text} className="flex items-center gap-3 text-sm">
              <span className="w-7 text-center text-lg">{row.icon}</span>
              <span className="flex-1 text-muted-foreground text-xs">{row.text}</span>
              <span className="text-yellow-400 font-bold text-xs flex-shrink-0">{row.reward}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 48 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-bold shadow-xl z-50 border ${
              toast.ok
                ? 'bg-green-500/15 border-green-500/40 text-green-400'
                : 'bg-red-500/15 border-red-500/40 text-red-400'
            }`}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
