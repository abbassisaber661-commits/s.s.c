/**
 * SplashScreen.tsx
 *
 * First screen shown on every app launch.
 * Displays the logo large and centered for ~2.4 s, then calls onDone().
 * No buttons, no content — pure brand identity.
 */

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/Logo";

interface Props {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      key="splash"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: "easeInOut" }}
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        background: "linear-gradient(160deg, #0f0c29 0%, #1a1040 40%, #0d0d1f 100%)",
        zIndex: 9999,
      }}
    >
      {/* Ambient glow behind logo */}
      <motion.div
        className="absolute"
        style={{
          width: 340,
          height: 340,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(124,58,237,0.35) 0%, rgba(99,102,241,0.12) 55%, transparent 75%)",
          filter: "blur(40px)",
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Logo */}
      <motion.div
        initial={{ scale: 0.72, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 18, delay: 0.12 }}
        className="relative flex items-center justify-center"
        style={{ width: 260, height: 260 }}
      >
        {/* Pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-[3rem]"
          style={{ border: "2px solid rgba(167,139,250,0.4)" }}
          animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.04, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />

        <div
          className="rounded-[3rem] overflow-hidden"
          style={{
            width: 240,
            height: 240,
            boxShadow:
              "0 0 60px rgba(124,58,237,0.55), 0 0 120px rgba(99,102,241,0.2)",
          }}
        >
          <Logo size={240} rounded="rounded-[3rem]" />
        </div>
      </motion.div>

      {/* App name */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38, duration: 0.5 }}
        className="mt-7 flex flex-col items-center gap-1"
      >
        <span
          className="font-black tracking-tight leading-none"
          style={{
            fontSize: 34,
            background: "linear-gradient(135deg, #e9d5ff, #a78bfa, #818cf8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 14px rgba(167,139,250,0.55))",
          }}
        >
          S.S.C
        </span>
        <span
          className="font-semibold text-white/45"
          style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}
        >
          SkillLeague Social Channel
        </span>
      </motion.div>

      {/* Bottom loading dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="absolute bottom-14 flex gap-1.5"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "rgba(167,139,250,0.6)" }}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
              delay: i * 0.22,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
