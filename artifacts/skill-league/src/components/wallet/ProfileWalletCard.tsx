/**
 * ProfileWalletCard — shown on ProfilePage (owner only).
 * Two-column layout: DN$ Balance | Pi Balance, each with an ⓘ info popover.
 * Transaction History button navigates to /wallet.
 */
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info, Receipt, X } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import danousCurrencyLogo from "@/assets/currency/dns-official-currency.png";

const DN_INFO =
  "DN$ is the internal currency of the application. It has no real-world monetary value. It is a utility currency used to unlock features, access services, and participate in many activities across the platform.";

const PI_INFO =
  "Pi is the official primary currency supported by the application. It is used for transactions, gifts, premium features, and other supported services. Users can earn Pi through gifts and other supported activities.";

/** Small popover panel rendered below the info button */
function InfoPopover({ text, onClose }: { text: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.93, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: -4 }}
        transition={{ duration: 0.15 }}
        className="absolute top-8 left-0 right-0 z-30 rounded-2xl p-3.5 shadow-2xl"
        style={{
          background: "linear-gradient(135deg,#1A1A2E,#0F1225)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={10} />
        </button>
        <p className="text-white/75 text-[11px] leading-relaxed pr-5">{text}</p>
      </motion.div>
    </AnimatePresence>
  );
}

/** Loading pulse skeleton */
function BalanceSkeleton() {
  return <div className="h-7 w-20 bg-[#F0F0F0] rounded-lg animate-pulse mt-0.5" />;
}

export default function ProfileWalletCard() {
  const [, navigate] = useLocation();
  const [dnInfoOpen, setDnInfoOpen] = useState(false);
  const [piInfoOpen, setPiInfoOpen] = useState(false);
  const playerId = getStoredPlayerId() ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["wallet", "balance", playerId],
    queryFn: () => api.wallet.getBalance(playerId),
    enabled: !!playerId,
    staleTime: 30_000,
  });

  const dnBalance = data?.dnBalance ?? 0;
  const piBalance = data?.availablePi ?? 0;

  const toggleDnInfo = () => {
    setDnInfoOpen((v) => !v);
    setPiInfoOpen(false);
  };
  const togglePiInfo = () => {
    setPiInfoOpen((v) => !v);
    setDnInfoOpen(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-visible">
      {/* Two-column balance row */}
      <div className="grid grid-cols-2 divide-x divide-[#F0F0F0]">
        {/* ── DN$ Balance ── */}
        <div className="relative p-4">
          {/* Label row */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <img
                src={danousCurrencyLogo}
                alt="DN$"
                className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                draggable={false}
              />
              <span className="text-[10px] font-bold text-[#888888] uppercase tracking-wider">
                DN$ Balance
              </span>
            </div>
            <button
              onClick={toggleDnInfo}
              aria-label="About DN$"
              className="w-6 h-6 rounded-full flex items-center justify-center text-[#AAAAAA] hover:text-[#555555] hover:bg-[#F5F5F7] transition-colors"
            >
              <Info size={13} />
            </button>
          </div>

          {dnInfoOpen && <InfoPopover text={DN_INFO} onClose={() => setDnInfoOpen(false)} />}

          {/* Balance value */}
          {isLoading ? (
            <BalanceSkeleton />
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[#111111] tabular-nums leading-none">
                {dnBalance.toLocaleString("en-US")}
              </span>
              <span className="text-xs font-bold text-[#8B5CF6]">DN$</span>
            </div>
          )}
        </div>

        {/* ── Pi Balance ── */}
        <div className="relative p-4">
          {/* Label row */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-[#7B3FF2] leading-none">π</span>
              <span className="text-[10px] font-bold text-[#888888] uppercase tracking-wider">
                Pi Balance
              </span>
            </div>
            <button
              onClick={togglePiInfo}
              aria-label="About Pi"
              className="w-6 h-6 rounded-full flex items-center justify-center text-[#AAAAAA] hover:text-[#555555] hover:bg-[#F5F5F7] transition-colors"
            >
              <Info size={13} />
            </button>
          </div>

          {piInfoOpen && <InfoPopover text={PI_INFO} onClose={() => setPiInfoOpen(false)} />}

          {/* Balance value */}
          {isLoading ? (
            <BalanceSkeleton />
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[#111111] tabular-nums leading-none">
                {piBalance.toLocaleString("en-US", { maximumFractionDigits: 4 })}
              </span>
              <span className="text-xs font-bold text-[#7B3FF2]">π</span>
            </div>
          )}
        </div>
      </div>

      {/* Transaction History button */}
      <div className="border-t border-[#F0F0F0]">
        <button
          onClick={() => navigate("/wallet")}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-[#555555] hover:text-[#111111] hover:bg-[#F5F5F7] active:bg-[#EEEEEE] transition-colors"
        >
          <Receipt size={14} />
          Transaction History
        </button>
      </div>
    </div>
  );
}
