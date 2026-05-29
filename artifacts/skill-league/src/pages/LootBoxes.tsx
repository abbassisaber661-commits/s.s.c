import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link } from "wouter";
import { ChevronLeft, Package, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { playTap, playCoin } from "@/lib/sounds";
import { isRTL } from "@/lib/i18n";
import {
  LOOT_BOXES, openLootBox, markBoxOpened, markDailyBoxOpened, canOpenDailyBox,
  RARITY_COLORS, RARITY_LABELS, type LootBox, type LootItem,
} from "@/lib/loot-boxes";

export default function LootBoxes() {
  const { language, coins, spendCoins, addCoins } = useGame();
  const rtl = isRTL(language);

  const [opening, setOpening] = useState<string | null>(null);
  const [result, setResult] = useState<LootItem | null>(null);
  const [resultBox, setResultBox] = useState<LootBox | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [dailyAvailable, setDailyAvailable] = useState(canOpenDailyBox());

  const rarityLabels = RARITY_LABELS[language === 'ar' ? 'ar' : 'en'];

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleOpen(box: LootBox) {
    if (opening) return;
    if (box.costType === 'coins' && !spendCoins(box.cost)) {
      showToast(language === 'ar' ? '❌ عملات غير كافية' : '❌ Not enough coins', false);
      return;
    }
    if (box.id === 'free_daily') {
      if (!dailyAvailable) { showToast(language === 'ar' ? '❌ الصندوق اليومي مفتوح بالفعل' : '❌ Daily box already opened', false); return; }
      markDailyBoxOpened();
      setDailyAvailable(false);
    }

    playTap();
    setOpening(box.id);
    await new Promise(r => setTimeout(r, 1200));

    const item = openLootBox(box);
    markBoxOpened(box.id);

    if (item.type === 'coins' && item.value) {
      addCoins(item.value);
    }

    setResult(item);
    setResultBox(box);
    setOpening(null);
    playCoin();
  }

  function closeResult() {
    setResult(null);
    setResultBox(null);
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="min-h-screen bg-background text-foreground pb-24">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/60 px-4 py-3 flex items-center gap-3">
        <Link href="/"><button className="p-2 rounded-xl hover:bg-card active:scale-95 transition-all" onClick={playTap}><ChevronLeft className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} /></button></Link>
        <h1 className="text-lg font-black flex-1">📦 {language === 'ar' ? 'الصناديق' : 'Loot Boxes'}</h1>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/15 border border-yellow-500/30 rounded-xl text-sm font-black text-yellow-400">
          {coins} 🪙
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Header banner */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-purple-500/10 p-4 text-center">
          <div className="text-3xl mb-1">✨</div>
          <div className="font-black">{language === 'ar' ? 'فتح الصناديق' : 'Open Loot Boxes'}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {language === 'ar' ? 'احصل على عملات، XP، إطارات، وعناصر نادرة!' : 'Win coins, XP, frames, and rare items!'}
          </div>
        </motion.div>

        {/* Rarity legend */}
        <div className="flex gap-2 flex-wrap">
          {Object.entries(RARITY_COLORS).map(([r, c]) => (
            <div key={r} className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border"
              style={{ borderColor: c + '40', color: c, background: c + '15' }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
              {rarityLabels[r as keyof typeof rarityLabels]}
            </div>
          ))}
        </div>

        {/* Box cards */}
        {LOOT_BOXES.map((box, idx) => {
          const isOpening = opening === box.id;
          const isDailyLocked = box.id === 'free_daily' && !dailyAvailable;
          const canOpen = !isOpening && !isDailyLocked;

          return (
            <motion.div key={box.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.07 }}
              className="rounded-2xl border bg-card overflow-hidden"
              style={{ borderColor: box.color + '40' }}>
              {/* Top gradient */}
              <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${box.color}, ${box.color}88)` }} />

              <div className="p-4">
                <div className="flex items-start gap-4">
                  <motion.div
                    animate={isOpening ? { rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 1.2, repeat: isOpening ? Infinity : 0 }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                    style={{ background: box.glowColor, boxShadow: isOpening ? `0 0 24px ${box.color}60` : 'none' }}>
                    {isOpening ? '✨' : box.icon}
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm">{language === 'ar' ? box.nameAr : box.name}</span>
                      {box.type === 'vip' && <Sparkles className="w-3 h-3 text-yellow-400" />}
                      {box.type === 'free' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 font-bold">FREE</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {language === 'ar' ? box.descriptionAr : box.description}
                    </p>
                    {isDailyLocked && (
                      <p className="text-[10px] text-orange-400 font-bold mt-1">
                        🕐 {language === 'ar' ? 'تعود غداً' : 'Come back tomorrow'}
                      </p>
                    )}

                    {/* Possible items preview */}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {[...new Set(box.items.map(i => i.rarity))].map(r => (
                        <div key={r} className="w-2 h-2 rounded-full" style={{ background: RARITY_COLORS[r as keyof typeof RARITY_COLORS] }} title={rarityLabels[r as keyof typeof rarityLabels]} />
                      ))}
                      <span className="text-[10px] text-muted-foreground">{language === 'ar' ? 'أنواع متاحة' : 'possible rarities'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm font-black" style={{ color: box.color }}>
                    {box.costType === 'free' ? (language === 'ar' ? '🆓 مجاني' : '🆓 Free') : `${box.cost} 🪙`}
                  </div>
                  <Button onClick={() => handleOpen(box)} disabled={!canOpen || (box.costType === 'coins' && coins < box.cost)}
                    className="font-bold text-sm"
                    style={canOpen ? { background: box.color, color: '#fff' } : {}}>
                    {isOpening ? (language === 'ar' ? '✨ فتح...' : '✨ Opening...') :
                     isDailyLocked ? (language === 'ar' ? '🔒 مقفل' : '🔒 Locked') :
                     (language === 'ar' ? 'فتح' : 'Open')}
                  </Button>
                </div>
              </div>

              {/* Items list */}
              <div className="px-4 pb-4">
                <p className="text-[10px] text-muted-foreground mb-2">{language === 'ar' ? 'محتويات ممكنة:' : 'Possible items:'}</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {box.items.slice(0, 6).map(item => (
                    <div key={item.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-background/50 border"
                      style={{ borderColor: RARITY_COLORS[item.rarity] + '30' }}>
                      <span className="text-sm">{item.icon}</span>
                      <div className="min-w-0">
                        <div className="text-[9px] font-bold truncate" style={{ color: RARITY_COLORS[item.rarity] }}>
                          {rarityLabels[item.rarity]}
                        </div>
                        <div className="text-[9px] text-muted-foreground truncate">{language === 'ar' ? item.nameAr : item.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Result Modal */}
      <AnimatePresence>
        {result && resultBox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-full max-w-sm rounded-3xl border bg-card p-8 text-center space-y-5"
              style={{ borderColor: RARITY_COLORS[result.rarity] + '60', boxShadow: `0 0 40px ${RARITY_COLORS[result.rarity]}30` }}>
              
              {/* Sparkles */}
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute top-4 right-4 text-2xl opacity-50">✨</motion.div>

              <div className="text-xs font-bold" style={{ color: RARITY_COLORS[result.rarity] }}>
                {rarityLabels[result.rarity].toUpperCase()} {language === 'ar' ? 'مكافأة!' : 'REWARD!'}
              </div>

              <motion.div animate={{ scale: [1, 1.1, 1], y: [0, -5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="text-7xl">{result.icon}</motion.div>

              <div>
                <div className="text-xl font-black">{language === 'ar' ? result.nameAr : result.name}</div>
                {result.value && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {result.type === 'coins' ? `+${result.value} 🪙` : `+${result.value} XP`}
                    {result.type === 'coins' && <span className="text-green-400 font-bold ml-1">→ {language === 'ar' ? 'أُضيفت للمحفظة' : 'Added to wallet'}</span>}
                  </div>
                )}
                {result.type === 'frame' && (
                  <div className="text-sm text-purple-400 font-bold mt-1">
                    🖼️ {language === 'ar' ? 'إطار جديد مفتوح!' : 'New frame unlocked!'}
                  </div>
                )}
              </div>

              <div className="h-px bg-border" />

              <div className="px-4 py-2 rounded-xl text-xs font-bold"
                style={{ background: RARITY_COLORS[result.rarity] + '15', color: RARITY_COLORS[result.rarity] }}>
                {resultBox.icon} {language === 'ar' ? resultBox.nameAr : resultBox.name}
              </div>

              <Button onClick={closeResult} className="w-full font-bold" style={{ background: RARITY_COLORS[result.rarity] }}>
                {language === 'ar' ? '🎉 رائع!' : '🎉 Awesome!'}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
