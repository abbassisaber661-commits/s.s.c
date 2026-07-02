import { useState, useEffect } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link } from "wouter";
import { ChevronLeft, Crown, Check, Zap, Loader2, Pi, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { playTap, playCoin } from "@/lib/sounds";
import { isRTL } from "@/lib/i18n";
import { VIP_TIERS, getVIPData, getActiveVIPTier, activateVIP, type VIPTier } from "@/lib/vip";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import { trackFeatureUse } from "@/lib/sessionTracker";

export default function VIP() {
  const { language, authUser } = useGame();
  const rtl = isRTL(language);

  const [activeTier, setActiveTier]   = useState(getActiveVIPTier());
  const [vipData, setVipData]         = useState(getVIPData());
  const [buying, setBuying]           = useState<string | null>(null);
  const [selected, setSelected]       = useState<VIPTier>(VIP_TIERS[2]);
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);
  const [testMode, setTestMode]       = useState(false);

  const playerId = authUser?.uid ?? getStoredPlayerId() ?? 'unknown';

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleBuy(tier: VIPTier) {
    if (buying) return;
    playTap();
    setBuying(tier.id);
    trackFeatureUse(playerId, 'vip_buy_attempt', { tier: tier.id, price: tier.piCost });

    const PiSDK = (window as any).Pi;

    console.debug('[VIP] handleBuy called', { tier: tier.id, hasPiSDK: !!PiSDK, testMode });

    if (PiSDK && !testMode) {
      // Pi.createPayment() MUST be called synchronously in the user-gesture
      // handler — no await before this line or Pi Browser will block the wallet.
      let backendPaymentId: string | null = null;

      console.debug('[VIP] Calling Pi.createPayment() synchronously…');

      try {
        PiSDK.createPayment(
          {
            amount:   tier.piCost,
            memo:     `SkillLeague VIP — ${tier.name}`,
            metadata: { tierId: tier.id, productId: `vip_${tier.id}` },
          },
          {
            onReadyForServerApproval: async (piPaymentId: string) => {
              console.debug('[VIP] onReadyForServerApproval', piPaymentId);
              try {
                const { paymentId } = await api.pi.create({
                  playerId,
                  amount:   tier.piCost,
                  memo:     `SkillLeague VIP — ${tier.name}`,
                  metadata: { tierId: tier.id, productId: `vip_${tier.id}` },
                });
                backendPaymentId = paymentId;
                console.debug('[VIP] Backend payment created', paymentId, '— approving…');
                await api.pi.approve(paymentId, piPaymentId).catch((e: unknown) => {
                  console.warn('[VIP] approve failed (non-fatal)', e);
                });
                console.debug('[VIP] Payment approved');
              } catch (e) {
                console.error('[VIP] onReadyForServerApproval error', e);
              }
            },

            onReadyForServerCompletion: async (piPaymentId: string, piTxId: string) => {
              console.debug('[VIP] onReadyForServerCompletion', piPaymentId, piTxId);
              try {
                if (!backendPaymentId) {
                  console.error('[VIP] backendPaymentId missing — cannot complete');
                  showToast(language === 'ar' ? '⚠️ خطأ في إتمام الدفع' : '⚠️ Payment completion failed', false);
                  setBuying(null);
                  return;
                }
                await api.pi.complete(backendPaymentId, piTxId);
                console.debug('[VIP] Payment completed — activating VIP');
                finishBuy(tier);
              } catch (e) {
                console.error('[VIP] onReadyForServerCompletion error', e);
                showToast(language === 'ar' ? '⚠️ خطأ في إتمام الدفع' : '⚠️ Payment completion failed', false);
                setBuying(null);
              }
            },

            onCancel: (piPaymentId: string) => {
              console.debug('[VIP] Payment cancelled by user', piPaymentId);
              setBuying(null);
            },

            onError: (error: unknown, payment: unknown) => {
              console.error('[VIP] Pi payment error', error, payment);
              showToast(language === 'ar' ? '⚠️ خطأ في الدفع' : '⚠️ Payment error', false);
              setBuying(null);
            },
          },
        );
        console.debug('[VIP] Pi.createPayment() call returned — waiting for callbacks…');
      } catch (e) {
        console.error('[VIP] Pi.createPayment() threw synchronously', e);
        showToast(language === 'ar' ? '⚠️ حدث خطأ. حاول مجددًا' : '⚠️ Error. Please try again.', false);
        setBuying(null);
      }
    } else {
      // Test mode / no Pi SDK — approve and complete immediately
      console.debug('[VIP] Test mode — simulating payment flow');
      try {
        const { paymentId } = await api.pi.create({
          playerId,
          amount:   tier.piCost,
          memo:     `SkillLeague VIP — ${tier.name}`,
          metadata: { tierId: tier.id, productId: `vip_${tier.id}` },
        });
        await api.pi.approve(paymentId, `test_pi_${Date.now()}`);
        await new Promise(r => setTimeout(r, 800));
        await api.pi.complete(paymentId, `test_tx_${Date.now()}`);
        finishBuy(tier);
      } catch (e) {
        console.error('[VIP] Test mode payment error', e);
        showToast(language === 'ar' ? '⚠️ حدث خطأ. حاول مجددًا' : '⚠️ Error. Please try again.', false);
        setBuying(null);
      }
    }
  }

  function finishBuy(tier: VIPTier) {
    activateVIP(tier.id);
    setActiveTier(getActiveVIPTier());
    setVipData(getVIPData());
    setBuying(null);
    playCoin();
    trackFeatureUse(playerId, 'vip_activated', { tier: tier.id });
    showToast(`👑 ${language === 'ar' ? tier.nameAr : tier.name} ${language === 'ar' ? 'مُفعَّل!' : 'activated!'}`, true);
  }

  const expiry   = vipData.expiresAt;
  const daysLeft = expiry ? Math.max(0, Math.ceil((expiry - Date.now()) / 86400000)) : 0;
  const hasPiSDK = !!(window as any).Pi;

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="min-h-screen bg-background text-foreground pb-24">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/60 px-4 py-3 flex items-center gap-3">
        <button className="p-2 rounded-xl hover:bg-card active:scale-95 transition-all" onClick={() => { playTap(); window.history.back(); }}><ChevronLeft className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} /></button>
        <h1 className="text-lg font-black flex-1">👑 VIP</h1>
        <div className="flex items-center gap-2">
          {!hasPiSDK && (
            <button onClick={() => setTestMode(t => !t)}
              className={`text-[10px] px-2 py-1 rounded-lg border font-bold transition-colors ${testMode ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-muted border-border text-muted-foreground'}`}>
              {testMode ? '🧪 Test' : 'Test'}
            </button>
          )}
          {activeTier && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
              style={{ background: activeTier.glowColor, color: activeTier.color, border: `1px solid ${activeTier.color}40` }}>
              {activeTier.badge} {language === 'ar' ? activeTier.nameAr : activeTier.name}
            </div>
          )}
        </div>
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

        {/* Pi payment notice */}
        {!hasPiSDK && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <Shield size={16} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-400">{language === 'ar' ? 'وضع التجربة' : 'Test Mode'}</p>
              <p className="text-[10px] text-muted-foreground">
                {language === 'ar' ? 'تطبيق Pi غير متصل. يمكنك تفعيل VIP تجريبيًا بالضغط على "Test".' : 'Pi app not connected. Enable Test mode to try VIP for free.'}
              </p>
            </div>
          </div>
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
                <div className="text-lg font-black flex items-center gap-1" style={{ color: selected.color }}>
                  <Pi size={14} /> {selected.piCost}
                </div>
                <div className="text-[10px] text-muted-foreground">Pi Network</div>
              </div>
            </div>

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
              <Button onClick={() => handleBuy(selected)} disabled={!!buying}
                className="w-full font-bold py-3 flex items-center justify-center gap-2"
                style={{ background: selected.color, color: '#fff' }}>
                {buying === selected.id
                  ? <><Loader2 size={16} className="animate-spin" /> {language === 'ar' ? 'جاري المعالجة…' : 'Processing…'}</>
                  : <><Zap size={14} /> {language === 'ar' ? 'فعّل' : 'Activate'} {language === 'ar' ? selected.nameAr : selected.name} — π {selected.piCost}{testMode ? ' 🧪' : ''}</>
                }
              </Button>
            )}
          </div>
        </motion.div>

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
