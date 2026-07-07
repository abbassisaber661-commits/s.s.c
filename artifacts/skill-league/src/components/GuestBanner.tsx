/**
 * GuestBanner.tsx
 *
 * Two modes:
 *
 *  1. Global sticky top bar (no props)
 *     Rendered once inside AppShell when the user is a guest.
 *     Fixed at the very top of the screen; notifies the user and offers
 *     a one-tap upgrade path back to the subscription page.
 *
 *  2. Inline per-page notice (message prop provided)
 *     Rendered inside a specific page to explain why a feature is locked.
 *     Not fixed — flows within the page layout.
 */

import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useLocation } from "wouter";

interface Props {
  /** When provided: renders as a non-fixed, inline info card inside a page. */
  message?: string;
}

export default function GuestBanner({ message }: Props) {
  const { isGuest, logout } = useGame();
  const [, navigate]        = useLocation();

  // Neither mode renders if user is not a guest
  if (!isGuest) return null;

  const handleUpgrade = () => {
    logout();            // clear guest auth → AppRoot re-evaluates → SubscriptionPage
    navigate("/");
  };

  /* ── Inline per-page notice ── */
  if (message) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 my-3 rounded-2xl px-4 py-3 flex items-start gap-3"
        style={{
          background: "rgba(99,102,241,0.1)",
          border: "1px solid rgba(99,102,241,0.25)",
        }}
      >
        <span className="text-xl mt-0.5 flex-shrink-0">🔒</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "#a5b4fc" }}>
            {message}
          </p>
          <button
            onClick={handleUpgrade}
            className="mt-2 text-xs font-black px-3 py-1.5 rounded-xl active:scale-95 transition-all"
            style={{
              background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
              color: "white",
            }}
          >
            ⭐ الترقية للاشتراك
          </button>
        </div>
      </motion.div>
    );
  }

  /* ── Global sticky top bar ── */
  return (
    <motion.div
      initial={{ opacity: 0, y: -36 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-[9000] flex items-center justify-between px-3 py-1.5"
      style={{
        background: "linear-gradient(90deg,#1e1b4b 0%,#312e81 50%,#1e1b4b 100%)",
        borderBottom: "1px solid rgba(167,139,250,0.25)",
        minHeight: 36,
      }}
    >
      {/* Label */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-base leading-none">👤</span>
        <span
          className="text-xs font-semibold truncate"
          style={{ color: "rgba(196,181,253,0.9)" }}
        >
          أنت تستخدم وضع الضيف
        </span>
      </div>

      {/* Upgrade CTA */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={handleUpgrade}
        className="flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black transition-all"
        style={{
          background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
          color: "white",
          boxShadow: "0 0 12px rgba(124,58,237,0.5)",
          letterSpacing: "0.02em",
        }}
      >
        ⭐ الترقية للاشتراك
      </motion.button>
    </motion.div>
  );
}
