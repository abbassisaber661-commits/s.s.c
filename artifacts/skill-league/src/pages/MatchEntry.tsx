import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

const LEAGUE_META: Record<string, { name: string; color: string; icon: string }> = {
  training: { name: "Training League", color: "#22d3ee", icon: "🥉" },
  bronze:   { name: "Coin League",     color: "#f59e0b", icon: "🥈" },
  gold:     { name: "Pro League",      color: "#f43f5e", icon: "🥇" },
};

type Phase = "found" | "starting" | "go";

export default function MatchEntry() {
  const [, go]            = useLocation();
  const [, params]        = useRoute<{ league: string }>("/match-entry/:league");
  const league            = params?.league ?? "bronze";
  const meta              = LEAGUE_META[league] ?? LEAGUE_META.bronze;
  const [phase, setPhase] = useState<Phase>("found");
  const [dots,  setDots]  = useState("");

  // dot animation
  useEffect(() => {
    const iv = setInterval(() =>
      setDots((d) => (d.length >= 3 ? "" : d + ".")), 350);
    return () => clearInterval(iv);
  }, []);

  // transition sequence
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("starting"), 1200);
    const t2 = setTimeout(() => setPhase("go"),       2400);
    const t3 = setTimeout(() => go(`/game/${league}`), 2900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at 50% 50%, ${meta.color}18 0%, #000 70%)`,
      }}
    >
      {/* Radial pulse rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border pointer-events-none"
          style={{ borderColor: `${meta.color}30` }}
          initial={{ width: 80, height: 80, opacity: 0.8 }}
          animate={{ width: 600, height: 600, opacity: 0 }}
          transition={{ duration: 2.5, delay: i * 0.6, repeat: Infinity, ease: "easeOut" }}
        />
      ))}

      <div className="flex flex-col items-center gap-6 z-10 text-center px-8">
        {/* League icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
          style={{
            background: `${meta.color}20`,
            border: `2px solid ${meta.color}60`,
            boxShadow: `0 0 40px ${meta.color}50`,
          }}
        >
          {meta.icon}
        </motion.div>

        {/* League name */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm font-bold tracking-widest uppercase"
          style={{ color: `${meta.color}cc` }}
        >
          {meta.name}
        </motion.p>

        {/* Main status */}
        <AnimatePresence mode="wait">
          {phase === "found" && (
            <motion.h1
              key="found"
              initial={{ opacity: 0, scale: 0.75, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, y: -20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl font-black tracking-widest uppercase"
              style={{
                background: `linear-gradient(135deg, #fff, ${meta.color})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: `drop-shadow(0 0 20px ${meta.color}80)`,
              }}
            >
              MATCH FOUND
            </motion.h1>
          )}

          {phase === "starting" && (
            <motion.h1
              key="starting"
              initial={{ opacity: 0, scale: 0.75, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="text-3xl font-black tracking-widest uppercase"
              style={{ color: "rgba(255,255,255,0.9)" }}
            >
              MATCH STARTING{dots}
            </motion.h1>
          )}

          {phase === "go" && (
            <motion.h1
              key="go"
              initial={{ opacity: 0, scale: 2 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-6xl font-black"
              style={{
                background: `linear-gradient(135deg, #fff, ${meta.color})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: `drop-shadow(0 0 30px ${meta.color})`,
              }}
            >
              GO!
            </motion.h1>
          )}
        </AnimatePresence>

        {/* Progress dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex gap-2"
        >
          {["found", "starting", "go"].map((p, i) => (
            <motion.div
              key={p}
              className="rounded-full"
              animate={{
                width:   phase === p ? 24 : 8,
                height:  8,
                opacity: phase === p ? 1 : 0.3,
                backgroundColor: phase === p ? meta.color : "rgba(255,255,255,0.3)",
              }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
