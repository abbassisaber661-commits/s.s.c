import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";

const CHANNELS = [
  { id: "ssc",       name: "S.S.C Main",    emoji: "📺" },
  { id: "gaming",    name: "Gaming Live",   emoji: "🎮" },
  { id: "news",      name: "News Channel",  emoji: "📡" },
];

const TICKER_TEXT = "Coming soon  •  Stay tuned for live content  •  Coming soon  •  Stay tuned for live content  •  ";

export default function Community() {
  const { isGuest } = useGame();
  const topPad = isGuest ? 88 : 52;

  const [activeChannel, setActiveChannel] = useState(CHANNELS[0]);
  const tickerRef = useRef<HTMLDivElement>(null);

  /* Continuous ticker animation via CSS */
  return (
    <div
      className="min-h-screen w-full overflow-y-auto pb-28"
      style={{
        background: "#0a0a0f",
        paddingTop: topPad + 8,
      }}
    >
      {/* ── Channel picker row ── */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        {CHANNELS.map(ch => (
          <button
            key={ch.id}
            onClick={() => setActiveChannel(ch)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition-all"
            style={{
              background:
                activeChannel.id === ch.id
                  ? "rgba(124,58,237,0.85)"
                  : "rgba(255,255,255,0.07)",
              border:
                activeChannel.id === ch.id
                  ? "1px solid rgba(124,58,237,0.6)"
                  : "1px solid rgba(255,255,255,0.1)",
              color:
                activeChannel.id === ch.id
                  ? "#fff"
                  : "rgba(255,255,255,0.5)",
            }}
          >
            <span>{ch.emoji}</span>
            <span>{ch.name}</span>
          </button>
        ))}
      </div>

      {/* ── Main channel card ── */}
      <div className="px-4">
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {/* Channel name — top-left overlay */}
          <div
            className="absolute top-0 left-0 z-10 flex items-center gap-2 px-3 py-2"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,0,0,0.75) 0%, transparent 100%)",
            }}
          >
            <span className="text-base leading-none">{activeChannel.emoji}</span>
            <span
              className="text-xs font-black tracking-wide"
              style={{ color: "#e9d5ff" }}
            >
              {activeChannel.name}
            </span>
            {/* Live dot */}
            <span className="flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"
              />
              <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest">
                Live
              </span>
            </span>
          </div>

          {/* ── Video area ── */}
          <div
            className="w-full flex flex-col items-center justify-center"
            style={{
              aspectRatio: "16/9",
              background:
                "radial-gradient(ellipse at 50% 40%, #1a0533 0%, #0a0118 60%, #000 100%)",
            }}
          >
            {/* TV screen graphic */}
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-3"
            >
              <span style={{ fontSize: 52, lineHeight: 1 }}>📺</span>
              <span
                className="text-sm font-bold"
                style={{ color: "rgba(167,139,250,0.6)" }}
              >
                Broadcast starts soon
              </span>
            </motion.div>
          </div>

          {/* ── News ticker bar — bottom of video ── */}
          <div
            className="flex items-center overflow-hidden"
            style={{
              background: "rgba(124,58,237,0.88)",
              height: 28,
            }}
          >
            {/* "LIVE" label */}
            <div
              className="flex-shrink-0 px-3 h-full flex items-center text-[10px] font-black tracking-widest text-white"
              style={{ background: "rgba(0,0,0,0.3)", borderRight: "1px solid rgba(255,255,255,0.2)" }}
            >
              TICKER
            </div>

            {/* Scrolling text */}
            <div className="flex-1 overflow-hidden relative">
              <motion.div
                ref={tickerRef}
                className="flex whitespace-nowrap text-[11px] font-semibold text-white"
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                style={{ willChange: "transform" }}
              >
                <span className="pr-8">{TICKER_TEXT}</span>
                <span className="pr-8">{TICKER_TEXT}</span>
              </motion.div>
            </div>
          </div>
        </div>

        {/* ── Info below video ── */}
        <div className="mt-4 space-y-3">
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <span style={{ fontSize: 24 }}>🚧</span>
            <div>
              <p className="text-xs font-black text-red-400">
                Coming soon
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                You can create an educational channel in any field you want with long videos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
