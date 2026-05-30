import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { getLevelTitle } from "@/lib/xp";

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 5 + 1,
  color: i % 3 === 0 ? "#a78bfa" : i % 3 === 1 ? "#60a5fa" : "#f472b6",
  dur: 3 + Math.random() * 5,
  delay: Math.random() * 4,
}));

export default function HomeScreen() {
  const [, go] = useLocation();
  const { level, coins, authUser, user, isGuest } = useGame();
  const { title: levelTitle, color: levelColor } = getLevelTitle(level);
  const [pressed, setPressed] = useState(false);

  const playerName =
    user?.username || authUser?.username || (isGuest ? "ضيف" : "Player");

  const handlePlay = () => {
    if (pressed) return;
    setPressed(true);
    setTimeout(() => go("/intro"), 350);
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden select-none"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, #1a0533 0%, #0a0118 60%, #000 100%)",
      }}
    >
      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              background: p.color,
              opacity: 0.5,
            }}
            animate={{ y: [0, -40, 0], opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Ambient glow rings */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 500,
          height: 500,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Top-right mini HUD */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="absolute top-5 right-5 flex items-center gap-2"
      >
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#fbbf24",
          }}
        >
          <span>{coins}</span>
          <span>🪙</span>
        </div>
        <div
          className="px-3 py-1.5 rounded-xl text-xs font-bold truncate max-w-[100px]"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          π {playerName}
        </div>
      </motion.div>

      {/* Top-left: dashboard shortcut */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={() => go("/dashboard")}
        className="absolute top-5 left-5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.45)",
        }}
      >
        ☰ Dashboard
      </motion.button>

      {/* Main content */}
      <div className="flex flex-col items-center gap-10 z-10 px-6">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-3"
        >
          <motion.div
            animate={{ boxShadow: ["0 0 30px rgba(124,58,237,0.4)", "0 0 70px rgba(124,58,237,0.7)", "0 0 30px rgba(124,58,237,0.4)"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-28 h-28 rounded-[2.2rem] flex items-center justify-center text-6xl"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
            }}
          >
            🏆
          </motion.div>

          <div className="text-center">
            <motion.h1
              className="text-5xl font-black tracking-tight"
              style={{
                background: "linear-gradient(135deg, #e9d5ff, #a78bfa, #818cf8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "none",
                filter: "drop-shadow(0 0 20px rgba(167,139,250,0.5))",
              }}
            >
              SKILLLEAGUE
            </motion.h1>
            <p
              className="text-xs uppercase tracking-[0.3em] mt-1 font-medium"
              style={{ color: "rgba(167,139,250,0.6)" }}
            >
              Game of Skill & Challenge
            </p>
          </div>
        </motion.div>

        {/* Player badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <span
            className="text-sm font-black tabular-nums"
            style={{ color: levelColor }}
          >
            Lv.{level}
          </span>
          <span
            className="text-xs font-bold"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            {levelTitle}
          </span>
          <div
            className="w-px h-4"
            style={{ background: "rgba(255,255,255,0.15)" }}
          />
          <span
            className="text-xs font-bold"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            {playerName}
          </span>
        </motion.div>

        {/* PLAY button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.button
            onClick={handlePlay}
            whileTap={{ scale: 0.93 }}
            animate={
              pressed
                ? { scale: [1, 1.08, 0], opacity: [1, 1, 0] }
                : {
                    boxShadow: [
                      "0 0 30px rgba(124,58,237,0.5), 0 0 60px rgba(79,70,229,0.2)",
                      "0 0 50px rgba(124,58,237,0.8), 0 0 100px rgba(79,70,229,0.4)",
                      "0 0 30px rgba(124,58,237,0.5), 0 0 60px rgba(79,70,229,0.2)",
                    ],
                  }
            }
            transition={
              pressed
                ? { duration: 0.35 }
                : { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }
            className="relative w-64 h-20 rounded-3xl font-black text-3xl text-white tracking-widest"
            style={{
              background:
                "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4f46e5 100%)",
            }}
          >
            {/* Shine overlay */}
            <div
              className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)",
              }}
            />
            <span className="relative z-10">▶ PLAY</span>
          </motion.button>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-xs text-center"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          One button. Infinite competition.
        </motion.p>
      </div>
    </div>
  );
}
