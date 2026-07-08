// src/components/social/GiftSupportBar.tsx
// Premium horizontal row of top Pi supporters for a post.
// Read-only display — never touches Pi auth/payment/subscription logic.
import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Avatar from "@/components/Avatar";
import { cn } from "@/lib/utils";
import { formatGiftAmount } from "@/lib/piGiftTiers";

export interface GiftSupporter {
  senderId: string;
  username: string;
  totalAmount: number;
  giftCount: number;
}

interface GiftSupportBarProps {
  supporters: GiftSupporter[];
  rtl?: boolean;
  onSupporterClick?: (senderId: string) => void;
}

/** Rank-based glow ring — 1st place strongest, tapering off for the rest. */
const RANK_RING: { boxShadow: string; border: string }[] = [
  { boxShadow: "0 0 0 2px #fff, 0 0 14px 4px rgba(124,58,237,0.85)", border: "2px solid #C4B5FD" },
  { boxShadow: "0 0 0 2px #fff, 0 0 10px 3px rgba(124,58,237,0.6)", border: "2px solid #DDD6FE" },
  { boxShadow: "0 0 0 2px #fff, 0 0 7px 2px rgba(124,58,237,0.45)", border: "1.5px solid #EDE9FE" },
];
const DEFAULT_RING = { boxShadow: "0 0 0 2px #fff, 0 0 4px 1px rgba(124,58,237,0.3)", border: "1px solid rgba(124,58,237,0.3)" };

const GiftSupportBar = memo(({ supporters, rtl = false, onSupporterClick }: GiftSupportBarProps) => {
  if (!supporters || supporters.length === 0) return null;

  const label = rtl ? "أبرز الداعمين" : "Top Supporters";

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="px-3.5 pt-2 pb-1">
      <div className={cn("text-[10px] font-semibold text-[#8B5CF6] mb-1.5 tracking-wide", rtl ? "text-right" : "text-left")}>
        {label}
      </div>
      <div
        className="flex items-start gap-3 overflow-x-auto pb-1 -mx-0.5 px-0.5"
        style={{ scrollbarWidth: "none" }}
      >
        <AnimatePresence initial={false}>
          {supporters.map((s, idx) => {
            const ring = RANK_RING[idx] ?? DEFAULT_RING;
            return (
              <motion.button
                key={s.senderId}
                layout
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ type: "spring", stiffness: 350, damping: 26 }}
                onClick={() => onSupporterClick?.(s.senderId)}
                className="flex flex-col items-center gap-1 shrink-0 w-14 focus:outline-none"
              >
                <div
                  className="rounded-full"
                  style={{ boxShadow: ring.boxShadow, border: ring.border }}
                >
                  <Avatar username={s.username} size="sm" />
                </div>
                <span className="text-[10px] font-bold text-[#7C3AED] leading-none whitespace-nowrap">
                  {formatGiftAmount(s.totalAmount)}π
                </span>
                <span className="text-[9px] text-[#999999] leading-none max-w-[52px] truncate">
                  {s.username}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
});

GiftSupportBar.displayName = "GiftSupportBar";

export default GiftSupportBar;
