import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import danousCurrencyLogo from "@/assets/currency/dns-official-currency.png";

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
                <img
                  src={danousCurrencyLogo}
                  alt="Danous DN$"
                  className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
                  draggable={false}
                />
                <div className="flex-1 text-right" dir="rtl">
                  <div className="text-base font-black text-white">عملة Danous (DN$)</div>
                  <div className="text-xs text-white/50">العملة الرسمية لمنصة SkillLeague</div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all flex-shrink-0"
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>

              {/* Intro text */}
              <div className="px-5 pt-4 pb-2 text-right" dir="rtl">
                <p className="text-sm text-white/70 leading-relaxed">
                  Danous (DN$) هي العملة الرقمية الرسمية في SkillLeague، تُستخدم في المكافآت والإنجازات والمسابقات
                  والميزات المميزة. لكل فئة من DN$ قيمة مقابلة بعملة Pi كما هو موضح أدناه.
                </p>
              </div>

              {/* Official currency chart */}
              <div className="px-5 py-5">
                <img
                  src={danousCurrencyLogo}
                  alt="Danous DN$ Official Currency"
                  className="w-full rounded-2xl"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                  draggable={false}
                />
              </div>

              <div className="px-5 pb-6 pt-1 text-center">
                <p className="text-[11px] text-white/35 leading-relaxed" dir="rtl">
                  الفئة السابعة (البنفسجية) هي الأعلى قيمة في نظام Danous.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
