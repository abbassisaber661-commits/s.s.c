// src/components/social/GiftModal.tsx
import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet2, CheckCircle2 } from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { DANOUS_COINS, type DanousCoinTier } from "@/lib/danousCoins";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  receiverId: string;
  receiverName: string;
  postId?: string; // passed from SocialPostCard for ledger tracking
}

const RING_DURATION_MS = 2200;
const RING_RADIUS = 38;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface ComboState {
  count: number;
  cycle: number;
}

export default function GiftModal({ isOpen, onClose, receiverId, receiverName, postId }: Props) {
  const senderId = getStoredPlayerId() ?? "";
  const qc = useQueryClient();

  const [combos, setCombos] = useState<Record<string, ComboState>>({});
  const [optimisticDelta, setOptimisticDelta] = useState(0);
  const [sessionTotalDn, setSessionTotalDn] = useState(0);
  const [sessionCoinCount, setSessionCoinCount] = useState(0);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (isOpen) {
      setCombos({});
      setOptimisticDelta(0);
      setSessionTotalDn(0);
      setSessionCoinCount(0);
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  const balanceQuery = useQuery({
    queryKey: ["wallet", "balance", senderId],
    queryFn: () => api.wallet.getBalance(senderId),
    enabled: !!senderId && isOpen,
    staleTime: 10_000,
  });

  const senderBalance = Math.max(0, (balanceQuery.data?.dnBalance ?? 0) - optimisticDelta);
  const canGift = !!senderId && senderId !== receiverId;

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleTap = useCallback(
    (coin: DanousCoinTier) => {
      if (!canGift) return;
      if (senderBalance < coin.dnAmount) {
        toast.error("رصيدك من DN$ غير كافٍ لإرسال هذه العملة");
        return;
      }

      // optimistic balance + session totals
      setOptimisticDelta((d) => d + coin.dnAmount);
      setSessionTotalDn((t) => t + coin.dnAmount);
      setSessionCoinCount((c) => c + 1);

      // combo ring restart
      setCombos((prev) => {
        const existing = prev[coin.id];
        return {
          ...prev,
          [coin.id]: { count: (existing?.count ?? 0) + 1, cycle: (existing?.cycle ?? 0) + 1 },
        };
      });

      if (timers.current[coin.id]) clearTimeout(timers.current[coin.id]);
      timers.current[coin.id] = setTimeout(() => {
        setCombos((prev) => {
          const next = { ...prev };
          delete next[coin.id];
          return next;
        });
        delete timers.current[coin.id];
      }, RING_DURATION_MS);

      // fire-and-forget real send
      api.wallet
        .sendGift(senderId, receiverId, coin.dnAmount, undefined, postId, coin.id)
        .then(() => {
          qc.invalidateQueries({ queryKey: ["wallet", "balance", senderId] });
          qc.invalidateQueries({ queryKey: ["wallet", "transactions", senderId] });
          qc.invalidateQueries({ queryKey: ["wallet", "balance", receiverId] });
        })
        .catch((err: any) => {
          // revert optimistic state on failure
          setOptimisticDelta((d) => Math.max(0, d - coin.dnAmount));
          setSessionTotalDn((t) => Math.max(0, t - coin.dnAmount));
          setSessionCoinCount((c) => Math.max(0, c - 1));
          const msg = err?.message ?? "";
          if (msg.includes("insufficient")) {
            toast.error("رصيدك غير كافٍ لإرسال هذه الهدية");
          } else {
            toast.error("فشل إرسال العملة — حاول مرة أخرى");
          }
        });
    },
    [canGift, senderBalance, senderId, receiverId, postId, qc]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="gift-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            key="gift-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl overflow-hidden"
            style={{ maxHeight: "92dvh" }}
            dir="rtl"
          >
            {/* drag handle */}
            <div className="w-10 h-1.5 rounded-full bg-[#DEDEDE] mx-auto mt-3 mb-1" />

            <div className="px-5 pb-6 pt-2 space-y-4 overflow-y-auto" style={{ maxHeight: "88dvh" }}>
              {/* Header */}
              <div className="flex items-center justify-between">
                <button onClick={handleClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                  <X size={18} className="text-gray-500" />
                </button>
                <h2 className="text-base font-black text-[#111]">أرسل عملة Danous</h2>
                <div className="w-9" />
              </div>

              {/* Receiver */}
              <div className="flex items-center gap-3 p-3 bg-[#F5F5F7] rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center text-lg shadow-md">
                  🎁
                </div>
                <div>
                  <div className="text-xs text-[#888]">إرسال عملة Danous إلى</div>
                  <div className="font-bold text-[#111]">{receiverName}</div>
                </div>
              </div>

              {/* Sender balance */}
              <div className="flex items-center gap-2 text-sm">
                <Wallet2 size={15} className="text-[#7c3aed]" />
                <span className="text-[#555]">رصيدك:</span>
                {balanceQuery.isLoading ? (
                  <span className="text-[#888] animate-pulse">جار التحميل...</span>
                ) : (
                  <span className="font-black text-[#7c3aed]">{senderBalance.toLocaleString("ar-SA")} DN$</span>
                )}
              </div>

              {!canGift && (
                <p className="text-xs text-center text-[#888] py-2">لا يمكنك إرسال هدية لنفسك</p>
              )}

              {/* Coin grid */}
              <div>
                <div className="text-xs font-bold text-[#888] mb-3">اختر عملة Danous لإرسالها — اضغط عدة مرات لزيادة الكمية</div>
                <div className="grid grid-cols-4 gap-x-2 gap-y-5 place-items-center">
                  {DANOUS_COINS.map((coin) => {
                    const combo = combos[coin.id];
                    const affordable = senderBalance >= coin.dnAmount && canGift;
                    return (
                      <button
                        key={coin.id}
                        onClick={() => handleTap(coin)}
                        disabled={!affordable}
                        className={cn(
                          "relative flex flex-col items-center gap-1.5 select-none transition-transform active:scale-90",
                          !affordable && "opacity-35 grayscale cursor-not-allowed"
                        )}
                      >
                        <div className="relative w-16 h-16">
                          {/* progress ring */}
                          {combo && (
                            <svg
                              key={`${coin.id}-${combo.cycle}`}
                              width={88}
                              height={88}
                              viewBox="0 0 88 88"
                              className="absolute -inset-3 -rotate-90 pointer-events-none"
                            >
                              <circle
                                cx={44}
                                cy={44}
                                r={RING_RADIUS}
                                fill="none"
                                stroke={coin.glow}
                                strokeOpacity={0.18}
                                strokeWidth={4}
                              />
                              <motion.circle
                                cx={44}
                                cy={44}
                                r={RING_RADIUS}
                                fill="none"
                                stroke={coin.glow}
                                strokeWidth={4}
                                strokeLinecap="round"
                                strokeDasharray={RING_CIRCUMFERENCE}
                                initial={{ strokeDashoffset: 0 }}
                                animate={{ strokeDashoffset: RING_CIRCUMFERENCE }}
                                transition={{ duration: RING_DURATION_MS / 1000, ease: "linear" }}
                                style={{
                                  filter: `drop-shadow(0 0 4px ${coin.glow})`,
                                }}
                              />
                            </svg>
                          )}

                          <motion.img
                            key={combo ? `pop-${coin.id}-${combo.cycle}` : `still-${coin.id}`}
                            src={coin.image}
                            alt={coin.nameAr}
                            initial={combo ? { scale: 0.82 } : false}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 15 }}
                            className="w-16 h-16 rounded-full object-cover"
                            style={{
                              boxShadow: combo
                                ? `0 0 14px ${coin.glow}99`
                                : "0 1px 4px rgba(0,0,0,0.15)",
                            }}
                          />

                          <AnimatePresence>
                            {combo && combo.count > 0 && (
                              <motion.div
                                key={`badge-${coin.id}-${combo.cycle}`}
                                initial={{ scale: 0, opacity: 0, y: 4 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                                className="absolute -top-1 -left-1 min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                                style={{ background: coin.glow, boxShadow: `0 0 8px ${coin.glow}` }}
                              >
                                ×{combo.count}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <span className="text-[10px] font-bold text-[#666] text-center leading-tight">
                          {coin.tierLabelAr}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Session summary */}
              <AnimatePresence>
                {sessionCoinCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="flex items-center justify-between gap-2 p-3 rounded-2xl"
                    style={{ background: "linear-gradient(135deg,#f5f0ff,#efe6ff)" }}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-[#7c3aed]" />
                      <span className="text-xs font-bold text-[#444]">
                        أرسلت {sessionCoinCount} عملة بقيمة إجمالية
                      </span>
                    </div>
                    <span className="text-sm font-black text-[#7c3aed]">{sessionTotalDn.toLocaleString("ar-SA")} DN$</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Done button */}
              <button
                onClick={handleClose}
                className="w-full py-3.5 rounded-2xl text-sm font-black text-white active:scale-[0.98] transition-all"
                style={{
                  background: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
                  boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
                }}
              >
                {sessionCoinCount > 0 ? "تم" : "إغلاق"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
