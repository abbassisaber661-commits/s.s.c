/**
 * GuestPaywall — premium subscription gate shown to guest users on the Profile page.
 *
 * Shows a TikTok/Instagram-style glassmorphism modal with:
 *  - 💎 hero icon with pulsing glow
 *  - Arabic headline & subtitle (RTL)
 *  - [اشتراك] → navigate to /subscription (NO payment here)
 *  - [إخفاء]  → temporarily dismiss; re-appears on next interaction
 */
import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

interface GuestPaywallProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function GuestPaywall({ visible, onDismiss }: GuestPaywallProps) {
  const [, navigate] = useLocation();

  const handleSubscribe = useCallback(() => {
    navigate("/subscription");
  }, [navigate]);

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* ── Backdrop ─────────────────────────────────────────────── */}
          <motion.div
            key="paywall-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[200]"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
            onClick={onDismiss}
          />

          {/* ── Modal card ───────────────────────────────────────────── */}
          <motion.div
            key="paywall-card"
            initial={{ opacity: 0, scale: 0.82, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="fixed z-[201] left-4 right-4"
            style={{ bottom: 90 }}          /* sits above BottomNav */
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative rounded-3xl overflow-hidden px-6 py-8 flex flex-col items-center text-center"
              style={{
                background:
                  "linear-gradient(160deg, rgba(15,10,40,0.97) 0%, rgba(30,20,70,0.96) 100%)",
                border: "1.5px solid rgba(139,92,246,0.4)",
                boxShadow:
                  "0 0 60px rgba(124,58,237,0.35), 0 0 120px rgba(79,70,229,0.15), 0 20px 60px rgba(0,0,0,0.7)",
                backdropFilter: "blur(24px)",
              }}
            >
              {/* Inner glow ring */}
              <div
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at top, rgba(124,58,237,0.18) 0%, transparent 65%)",
                }}
              />

              {/* Shimmer sweep */}
              <motion.div
                className="absolute inset-0 pointer-events-none rounded-3xl"
                style={{
                  background:
                    "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.04) 50%, transparent 70%)",
                }}
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
              />

              {/* ── Diamond icon ── */}
              <motion.div
                animate={{
                  filter: [
                    "drop-shadow(0 0 14px rgba(139,92,246,0.8))",
                    "drop-shadow(0 0 28px rgba(167,139,250,1))",
                    "drop-shadow(0 0 14px rgba(139,92,246,0.8))",
                  ],
                }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 mb-5"
              >
                <motion.div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center text-5xl shadow-2xl"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 60%, #6d28d9 100%)",
                    boxShadow: "0 0 40px rgba(124,58,237,0.7), 0 8px 32px rgba(79,70,229,0.5)",
                  }}
                  animate={{ rotate: [0, 3, -3, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  💎
                </motion.div>
              </motion.div>

              {/* ── Title ── */}
              <h2
                className="relative z-10 text-white font-black leading-tight mb-3"
                dir="rtl"
                style={{ fontSize: 26 }}
              >
                اشترك بباي تجريبي
              </h2>

              {/* ── Subtitle ── */}
              <p
                className="relative z-10 text-white/60 font-medium leading-relaxed mb-6"
                dir="rtl"
                style={{ fontSize: 15, maxWidth: 260 }}
              >
                مرة واحدة فقط وتمتع بكل الميزات
              </p>

              {/* ── Feature pills ── */}
              <div className="relative z-10 flex flex-wrap justify-center gap-2 mb-7" dir="rtl">
                {["🏆 الدوريات", "💬 التواصل", "💰 المحفظة", "🎁 الهدايا"].map((item) => (
                  <span
                    key={item}
                    className="px-3 py-1 rounded-full text-xs font-semibold text-purple-300"
                    style={{
                      background: "rgba(139,92,246,0.15)",
                      border: "1px solid rgba(139,92,246,0.3)",
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>

              {/* ── Buttons ── */}
              <div className="relative z-10 flex gap-3 w-full" dir="rtl">
                {/* Subscribe CTA */}
                <motion.button
                  onClick={handleSubscribe}
                  className="flex-1 h-13 rounded-2xl flex items-center justify-center gap-2 font-black text-white relative overflow-hidden"
                  style={{
                    height: 52,
                    background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #6d28d9 100%)",
                    boxShadow: "0 0 30px rgba(124,58,237,0.6), 0 4px 16px rgba(79,70,229,0.4)",
                    fontSize: 16,
                  }}
                  whileTap={{ scale: 0.96 }}
                >
                  {/* Button shimmer */}
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                    }}
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.2 }}
                  />
                  <span className="relative">π</span>
                  <span className="relative">اشتراك</span>
                </motion.button>

                {/* Dismiss */}
                <motion.button
                  onClick={onDismiss}
                  className="px-5 h-13 rounded-2xl font-bold text-white/60 hover:text-white/90 transition-colors"
                  style={{
                    height: 52,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    fontSize: 15,
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  إخفاء
                </motion.button>
              </div>

              {/* Fine print */}
              <p className="relative z-10 mt-4 text-white/25 text-[11px]" dir="rtl">
                باي تجريبي — ليس عملة حقيقية
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
