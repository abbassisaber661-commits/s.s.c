import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import DanousInfoModal from "./DanousInfoModal";
import DNCurrencyIcon from "@/components/ui/DNCurrencyIcon";

export default function DanousWalletSection() {
  const [infoOpen, setInfoOpen] = useState(false);
  const playerId = getStoredPlayerId() ?? "";

  const balanceQuery = useQuery({
    queryKey: ["wallet", "balance", playerId],
    queryFn: () => api.wallet.getBalance(playerId),
    enabled: !!playerId,
    staleTime: 30_000,
  });

  const balance = balanceQuery.data?.dnBalance ?? 0;
  const isLoading = balanceQuery.isLoading;

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 55%, #0f3460 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Banknote strip */}
        <div className="px-4 pt-3">
          <DNCurrencyIcon size="hero" className="shadow-md" />
        </div>

        {/* Balance row */}
        <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-2">
          <button
            onClick={() => setInfoOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0 active:scale-95 transition-all"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <Info className="w-3.5 h-3.5 text-white/70" />
            <span className="text-[11px] font-bold text-white/70">عن DN$</span>
          </button>

          <div className="flex items-center gap-2" dir="ltr">
            {isLoading ? (
              <div className="h-8 w-24 rounded-xl bg-white/10 animate-pulse" />
            ) : (
              <>
                <span className="text-3xl font-black text-white tabular-nums">
                  {balance.toLocaleString("en-US")}
                </span>
                <span className="text-base font-black text-yellow-300">DN$</span>
              </>
            )}
          </div>
        </div>
      </div>

      <DanousInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  );
}
