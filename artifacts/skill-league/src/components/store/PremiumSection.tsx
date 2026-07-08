/**
 * PremiumSection.tsx  →  Boutique / Premium (locked placeholder)
 * ───────────────────────────────────────────────────────────
 * Foundation-only placeholder. No purchase logic, no Pi/payment calls.
 * Future levels (Premium Level 1 / 2 / 3) will be implemented separately.
 */

import { Lock } from "lucide-react";
import { motion } from "framer-motion";

const LEVELS = [1, 2, 3];

export default function PremiumSection({ language }: { language?: string }) {
  const ar = language === "ar";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent p-4 space-y-3"
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-yellow-500/10 flex-shrink-0">
          <Lock className="w-5 h-5 text-yellow-500/70" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black">{ar ? "بريميوم" : "Premium"}</div>
          <div className="text-[11px] text-muted-foreground">
            {ar ? "قريباً" : "Coming Soon"}
          </div>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-500/80 flex-shrink-0">
          🔒 {ar ? "مقفل" : "Locked"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {LEVELS.map(lvl => (
          <div
            key={lvl}
            className="rounded-xl border border-border/60 bg-background/40 p-2.5 flex flex-col items-center gap-1 opacity-60"
          >
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-bold text-muted-foreground text-center leading-tight">
              {ar ? `المستوى ${lvl}` : `Level ${lvl}`}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {ar
          ? "ستتوفر ميزات بريميوم قريباً بثلاثة مستويات حصرية."
          : "Exclusive Premium tiers are coming soon."}
      </p>
    </motion.div>
  );
}
