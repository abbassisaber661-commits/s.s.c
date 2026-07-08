import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { DANOUS_CURRENCY_DEFINITION_AR, DANOUS_EARN_SOURCES } from "@/lib/danousCoins";
import DNCurrencyIcon from "@/components/ui/DNCurrencyIcon";

export default function DanousInfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[91] sm:inset-0 sm:flex sm:items-center sm:justify-center"
          >
            <div
              className="mx-auto w-full sm:max-w-lg max-h-[88vh] sm:max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
              style={{ background: "#0F1225", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {/* Header */}
              <div
                className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4"
                style={{ background: "linear-gradient(135deg,#191D3A,#0F1225)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                <DNCurrencyIcon size="sm" />
                <div className="flex-1 text-right" dir="rtl">
                  <div className="text-base font-black text-white">نقاط Danous (DN$)</div>
                  <div className="text-xs text-white/50">نظام تقدّم داخلي — بدون قيمة نقدية</div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all flex-shrink-0"
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>

              {/* Banknote hero */}
              <div className="px-5 pt-4">
                <DNCurrencyIcon size="hero" className="shadow-lg" />
              </div>

              {/* Intro text */}
              <div className="px-5 pt-4 pb-2 text-right" dir="rtl">
                <p className="text-sm text-white/70 leading-relaxed">
                  {DANOUS_CURRENCY_DEFINITION_AR}
                </p>
              </div>

              {/* Earn sources list */}
              <div className="px-5 py-5">
                <div className="text-xs font-bold text-white/40 mb-3 text-right" dir="rtl">
                  كيف تكسب DN$؟
                </div>
                <div className="space-y-2">
                  {DANOUS_EARN_SOURCES.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                      dir="rtl"
                    >
                      <span className="text-xl">{s.icon}</span>
                      <span className="text-sm font-semibold text-white/80">{s.labelAr}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-5 pb-6 pt-1 text-center">
                <p className="text-[11px] text-white/35 leading-relaxed" dir="rtl">
                  DN$ لا يمكن إرسالها لمستخدمين آخرين ولا تحويلها إلى Pi. الهدايا الحقيقية تُرسل بعملة Pi فقط.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
