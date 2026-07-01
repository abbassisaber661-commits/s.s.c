import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";

interface Plan {
  id: "premium3" | "premium1" | "guest";
  icon: string;
  name: string;
  price: string | null;
  priceLabel: string;
  badge?: string;
  badgeColor?: string;
  featured: boolean;
  features: string[];
  gradient: string;
  glow: string;
  border: string;
  btnLabel: string;
  btnStyle: React.CSSProperties;
}

const PLANS: Plan[] = [
  {
    id: "premium3",
    icon: "💎",
    name: "Premium",
    price: "3",
    priceLabel: "PI TEST",
    badge: "⭐ RECOMMENDED",
    badgeColor: "from-amber-400 to-yellow-500",
    featured: true,
    features: [
      "Full access to all features",
      "Competitive league participation",
      "DN Wallet & Creator earnings",
      "Exclusive premium badges",
      "Priority matchmaking",
      "All social features unlocked",
      "Marketplace & Jobs access",
      "Monthly reward drops",
    ],
    gradient: "from-violet-600 via-purple-600 to-indigo-700",
    glow: "rgba(139,92,246,0.5)",
    border: "rgba(167,139,250,0.5)",
    btnLabel: "Get Premium — 3 PI TEST",
    btnStyle: {
      background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
      boxShadow: "0 0 30px rgba(124,58,237,0.6)",
      color: "white",
    },
  },
  {
    id: "premium1",
    icon: "💰",
    name: "Standard",
    price: "1",
    priceLabel: "PI TEST",
    featured: false,
    features: [
      "Core platform access",
      "League participation",
      "DN Wallet activated",
      "Social features",
      "Marketplace access",
    ],
    gradient: "from-blue-600 to-indigo-700",
    glow: "rgba(99,102,241,0.4)",
    border: "rgba(99,102,241,0.4)",
    btnLabel: "Get Standard — 1 PI TEST",
    btnStyle: {
      background: "linear-gradient(135deg, #2563eb, #4f46e5)",
      boxShadow: "0 0 20px rgba(99,102,241,0.5)",
      color: "white",
    },
  },
  {
    id: "guest",
    icon: "👀",
    name: "Guest",
    price: null,
    priceLabel: "Free",
    featured: false,
    features: [
      "Browse platform only",
      "View leaderboards",
      "Watch matches",
      "Limited access",
    ],
    gradient: "from-gray-600 to-gray-700",
    glow: "rgba(107,114,128,0.3)",
    border: "rgba(107,114,128,0.3)",
    btnLabel: "Continue as Guest",
    btnStyle: {
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.2)",
      color: "rgba(255,255,255,0.7)",
    },
  },
];

interface Props {
  onBack: () => void;
}

export default function SubscriptionPage({ onBack }: Props) {
  const { loginWithPiNetwork, loginAsGuest } = useGame();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSelect = async (plan: Plan) => {
    if (loading) return;
    setError("");

    if (plan.id === "guest") {
      loginAsGuest();
      return;
    }

    setLoading(plan.id);
    try {
      await loginWithPiNetwork();
      try {
        localStorage.setItem("sl_subscription", JSON.stringify({ plan: plan.id, ts: Date.now() }));
      } catch {}
    } catch {
      setError("Pi Network authentication failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0a0818 0%, #130d2e 35%, #0d1a3a 70%, #0a0818 100%)" }}
    >
      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-5%] right-[-10%] w-[55vw] h-[55vw] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)" }} />
        <div className="absolute bottom-[0%] left-[-10%] w-[50vw] h-[50vw] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)" }} />

        {[...Array(14)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: ["#a78bfa", "#60a5fa", "#fbbf24"][i % 3],
              opacity: 0.25,
            }}
            animate={{ y: [0, -20, 0], opacity: [0.1, 0.4, 0.1] }}
            transition={{ duration: 4 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 4 }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-5 pt-5 pb-2">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onBack}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          <span className="text-white text-base">←</span>
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-white font-black text-xl leading-tight">Choose Your Plan</h2>
          <p className="text-white/40 text-xs">Payments powered by Pi Network</p>
        </motion.div>
      </div>

      {/* PI TEST notice */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mx-5 mt-3 rounded-2xl px-4 py-3 flex items-center gap-2.5 relative z-10"
        style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)" }}
      >
        <span className="text-lg">⚠️</span>
        <p className="text-amber-300 text-xs leading-relaxed">
          <span className="font-bold">PI TEST</span> is used for all payments. This is NOT real Pi cryptocurrency — it is test currency only.
        </p>
      </motion.div>

      {/* Plan cards */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 flex flex-col gap-4 relative z-10">
        {PLANS.map((plan, idx) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15 + idx * 0.12 }}
            className="relative rounded-3xl overflow-hidden"
            style={{
              background: plan.featured
                ? "linear-gradient(160deg, rgba(124,58,237,0.15) 0%, rgba(79,70,229,0.1) 100%)"
                : "rgba(255,255,255,0.04)",
              border: `1.5px solid ${plan.border}`,
              boxShadow: plan.featured ? `0 0 40px ${plan.glow}, 0 0 80px rgba(124,58,237,0.08)` : "none",
            }}
          >
            {/* Recommended badge */}
            {plan.badge && (
              <div
                className={`absolute top-0 left-0 right-0 flex justify-center py-2 bg-gradient-to-r ${plan.badgeColor} text-black font-black text-xs tracking-wider`}
              >
                {plan.badge}
              </div>
            )}

            <div className={`p-5 ${plan.badge ? "pt-9" : ""}`}>
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 bg-gradient-to-br ${plan.gradient} shadow-lg`}
                    style={{ boxShadow: `0 6px 20px ${plan.glow}` }}
                  >
                    {plan.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base leading-tight">{plan.name}</h3>
                    {plan.price ? (
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-white font-black text-xl leading-none">{plan.price}</span>
                        <span
                          className="text-xs font-black tracking-wide px-1.5 py-0.5 rounded-lg"
                          style={{ background: "rgba(245,158,11,0.2)", color: "#fbbf24" }}
                        >
                          {plan.priceLabel}
                        </span>
                      </div>
                    ) : (
                      <span className="text-white/50 text-sm font-semibold">{plan.priceLabel}</span>
                    )}
                  </div>
                </div>

                {plan.featured && (
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                    className="text-2xl flex-shrink-0"
                  >
                    ✨
                  </motion.div>
                )}
              </div>

              {/* Divider */}
              <div className="my-4 h-px" style={{ background: `linear-gradient(90deg, transparent, ${plan.border}, transparent)` }} />

              {/* Features */}
              <ul className="flex flex-col gap-2">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2.5">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-xs"
                      style={{
                        background: plan.id === "guest" ? "rgba(107,114,128,0.3)" : `linear-gradient(135deg, ${plan.glow.replace("0.4", "0.9").replace("0.5", "0.9")}, ${plan.glow})`,
                      }}
                    >
                      <span style={{ fontSize: 8, color: "white" }}>✓</span>
                    </div>
                    <span className="text-white/70 text-sm">{f}</span>
                  </li>
                ))}
              </ul>

              {plan.id === "guest" && (
                <p className="text-white/35 text-xs mt-3 leading-relaxed">
                  Guest access is temporary. You'll see this screen every time you reopen the app.
                </p>
              )}

              {/* CTA button */}
              <motion.button
                onClick={() => handleSelect(plan)}
                disabled={loading !== null}
                className="w-full h-13 mt-5 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-95 disabled:opacity-60"
                style={{ ...plan.btnStyle, height: 52 }}
                whileTap={{ scale: 0.96 }}
              >
                <AnimatePresence mode="wait">
                  {loading === plan.id ? (
                    <motion.div
                      key="spinner"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 rounded-full border-2"
                        style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }}
                      />
                      <span>Connecting to Pi…</span>
                    </motion.div>
                  ) : (
                    <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {plan.id !== "guest" && <span className="mr-1">π</span>}
                      {plan.btnLabel}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </motion.div>
        ))}

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="rounded-2xl px-4 py-3 text-center"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-white/25 text-xs text-center px-4 leading-relaxed"
        >
          Paid plans create a permanent account. Your progress, wallet, and subscription are saved forever. Guest mode is temporary and resets on every session.
        </motion.p>
      </div>
    </div>
  );
}
