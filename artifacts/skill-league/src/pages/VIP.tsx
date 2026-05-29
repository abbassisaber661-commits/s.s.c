import { useState, useEffect } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link } from "wouter";
import { ChevronLeft, Crown, Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { playTap, playCoin } from "@/lib/sounds";
import { isRTL } from "@/lib/i18n";
import { VIP_TIERS, getVIPData, getActiveVIPTier, activateVIP, type VIPTier } from "@/lib/vip";

export default function VIP() {
  const { language } = useGame();
  const rtl = isRTL(language);

  const [activeTier, setActiveTier]   = useState(getActiveVIPTier());
  const [vipData, setVipData]         = useState(getVIPData());
  const [buying, setBuying]           = useState<string | null>(null);
  const [selected, setSelected]       = useState<VIPTier>(VIP_TIERS[2]);
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleBuy(tier: VIPTier) {
    if (buying) return;
    playTap();
    setBuying(tier.id);
    await new Promise(r => setTimeout(r, 800));
    try {
      const Pi = (window as any).Pi;
      if (Pi) {
        Pi.createPayment({
          amount: tier.piCost,
          memo: `SkillLeague VIP — ${tier.name}`,
          metadata: { tierId: tier.id },
        }, {
          onReadyForServerApproval: () => {},
          onReadyForServerCompletion: () => { finishBuy(tier); },
          onCancel: () => setBuying(null),
          onError:  () => setBuying(null),
        });
      } else {
        finishBuy(tier);
      }
    } catch {
      finishBuy(tier);
    }
  }

  function finishBuy(tier: VIPTier) {
    activateVIP(tier.id);
    setActiveTier(getActiveVIPTier());
    setVipData(getVIPData());
    setBuying(null);
    playCoin();
    showToast(`👑 ${tier.name} ${language === 'ar' ? 'مُفعَّل!' : 'activated!'}`, true);
  }

  const expiry = vipData.expiresAt;
  const daysLeft = expiry ? Math.max(0, Math.ceil((expiry - Date.now()) / 86400000)) : 0;

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="min-h-screen bg-background text-foreground pb-24">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/60 px-4 py-3 flex items-center gap-3">
        <Link href="/"><button className="p-2 rounded-xl hover:bg-card active:scale-95 transition-all" onClick={playTap}><ChevronLeft className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} /></button></Link>
        <h1 className="text-lg font-black flex-1">👑 VIP</h1>
        {activeTier && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
            style={{ background: activeTier.glowColor, color: activeTier.color, border: `1px solid ${activeTier.color}40` }}>
            {activeTier.badge} {language === 'ar' ? activeTier.nameAr : activeTier.name}
          </div>
        )}
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">

        {/* Active VIP status */}
        {activeTier && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border p-4"
            style={{ borderColor: activeTier.color + '50', background: `linear-gradient(135deg, ${activeTier.color}15, ${activeTier.color}05)` }}>
            <div className="flex items-center gap-3">
              <div className="text-4xl">{activeTier.badge}</div>
              <div>
                <div className="font-black text-sm" style={{ color: activeTier.color }}>
                  {language === 'ar' ? activeTier.nameAr : activeTier.name} {language === 'ar' ? 'نشط' : 'Active'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {language === 'ar' ? `${daysLeft} يوم متبقٍ` : `${daysLeft} days remaining`}
                </div>
              </div>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                className="ml-auto text-2xl opacity-60">✨</motion.div>
            </div>
          </motion.div>
        )}

        {/* Hero banner */}
        {!activeTier && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-600/5 p-6 text-center">
            <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
            <div className="text-xl font-black">{language === 'ar' ? 'عضوية VIP' : 'VIP Membership'}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {language === 'ar' ? 'امتيازات حصرية. تجربة فريدة من نوعها.' : 'Exclusive benefits. Unparalleled experience.'}
            </div>
          </motion.div>
        )}

        {/* Tier selector */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {VIP_TIERS.map(tier => (
            <button key={tier.id} onClick={() => { setSelected(tier); playTap(); }}
              className="flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border transition-all active:scale-95"
              style={selected.id === tier.id ? {
                borderColor: tier.color, background: tier.color + '15', color: tier.color,
              } : { borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
              <span className="text-2xl">{tier.icon}</span>
              <span className="text-[10px] font-bold whitespace-nowrap">{language === 'ar' ? tier.nameAr : tier.name}</span>
              <span className="text-[9px] font-black" style={{ color: selected.id === tier.id ? tier.color : '#fbbf24' }}>
                π {tier.piCost}
              </span>
              {activeTier?.id === tier.id && (
                <span className="text-[8px] text-green-400 font-bold">{language === 'ar' ? 'نشط' : 'Active'}</span>
              )}
            </button>
          ))}
        </div>

        {/* Selected tier details */}
        <motion.div key={selected.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-card overflow-hidden"
          style={{ borderColor: selected.color + '40' }}>
          <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${selected.color}, ${selected.color}40)` }} />
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: selected.glowColor }}>
                {selected.icon}
              </div>
              <div>
                <div className="font-black text-base" style={{ color: selected.color }}>
                  {language === 'ar' ? selected.nameAr : selected.name}
                </div>
                <div className="text-xs text-muted-foreground">{selected.durationDays} {language === 'ar' ? 'يوم' : 'days'}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-lg font-black" style={{ color: selected.color }}>π {selected.piCost}</div>
                <div className="text-[10px] text-muted-foreground">Pi Network</div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl text-center" style={{ background: selected.color + '10' }}>
                <div className="text-lg font-black" style={{ color: selected.color }}>+{selected.coinBonus}%</div>
                <div className="text-[10px] text-muted-foreground">{language === 'ar' ? 'مكافأة عملات' : 'Coin Bonus'}</div>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: selected.color + '10' }}>
                <div className="text-lg font-black" style={{ color: selected.color }}>+{selected.xpBonus}%</div>
                <div className="text-[10px] text-muted-foreground">{language === 'ar' ? 'تعزيز XP' : 'XP Boost'}</div>
              </div>
            </div>

            {/* Perks */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground">{language === 'ar' ? 'المزايا:' : 'Perks:'}</p>
              {(language === 'ar' ? selected.perksAr : selected.perks).map((perk, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: selected.color }} />
                  <span className="text-xs">{perk}</span>
                </div>
              ))}
            </div>

            {activeTier?.id === selected.id ? (
              <div className="w-full py-3 rounded-xl text-center text-sm font-bold"
                style={{ background: selected.color + '15', color: selected.color }}>
                ✅ {language === 'ar' ? 'نشط' : 'Currently Active'} · {daysLeft} {language === 'ar' ? 'يوم متبقٍ' : 'days left'}
              </div>
            ) : (
              <Button onClick={() => handleBuy(selected)} disabled={buying === selected.id}
                className="w-full font-bold py-3" style={{ background: selected.color, color: '#fff' }}>
                {buying === selected.id ? '⌛' : `${language === 'ar' ? 'فعّل' : 'Activate'} ${language === 'ar' ? selected.nameAr : selected.name} — π ${selected.piCost}`}
              </Button>
            )}
          </div>
        </motion.div>

        {/* All tiers comparison */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold text-muted-foreground mb-3">{language === 'ar' ? '📊 مقارنة الفئات' : '📊 Tier Comparison'}</p>
          <div className="space-y-2">
            {VIP_TIERS.map(tier => (
              <div key={tier.id} className="flex items-center gap-3 py-1">
                <span className="text-lg">{tier.icon}</span>
                <span className="text-xs font-bold flex-1">{language === 'ar' ? tier.nameAr : tier.name}</span>
                <span className="text-xs text-yellow-400 font-bold">+{tier.coinBonus}%🪙</span>
                <span className="text-xs text-purple-400 font-bold">+{tier.xpBonus}%XP</span>
                <span className="text-xs font-black" style={{ color: tier.color }}>π{tier.piCost}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 48 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-bold shadow-xl z-50 border ${
              toast.ok ? 'bg-green-500/15 border-green-500/40 text-green-400' : 'bg-red-500/15 border-red-500/40 text-red-400'
            }`}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
