// src/components/social/GiftModal.tsx
// Gifts are real payments made in Pi (via Pi Network Testnet now, Mainnet
// later). DN$ points are never used here — DN$ is a non-transferable,
// non-monetary internal gamification system with no link to Pi.
import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { PI_GIFT_TIERS, type PiGiftTier } from "@/lib/piGiftTiers";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  receiverId: string;
  receiverName: string;
  postId?: string; // passed from SocialPostCard for ledger tracking
}

export default function GiftModal({ isOpen, onClose, receiverId, receiverName, postId }: Props) {
  const senderId = getStoredPlayerId() ?? "";
  const qc = useQueryClient();

  const [sendingTierId, setSendingTierId] = useState<string | null>(null);
  const [sessionTotalPi, setSessionTotalPi] = useState(0);
  const [sessionGiftCount, setSessionGiftCount] = useState(0);
  const backendPaymentId = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSendingTierId(null);
      setSessionTotalPi(0);
      setSessionGiftCount(0);
      backendPaymentId.current = null;
    }
  }, [isOpen]);

  const canGift = !!senderId && senderId !== receiverId;

  const handleClose = useCallback(() => {
    if (sendingTierId) return;
    onClose();
  }, [onClose, sendingTierId]);

  const finishSend = useCallback((tier: PiGiftTier) => {
    setSessionTotalPi((t) => t + tier.piAmount);
    setSessionGiftCount((c) => c + 1);
    setSendingTierId(null);
    qc.invalidateQueries({ queryKey: ["wallet", "balance", receiverId] });
    qc.invalidateQueries({ queryKey: ["lb", "top-earners"] });
    qc.invalidateQueries({ queryKey: ["lb", "top-supporters"] });
    toast.success(`تم إرسال ${tier.piAmount} π إلى ${receiverName}`);
  }, [qc, receiverId, receiverName]);

  const handleTap = useCallback(
    (tier: PiGiftTier) => {
      if (!canGift || sendingTierId) return;

      const PiSDK = (window as any).Pi;
      const memo = `SkillLeague Gift — ${tier.piAmount} π to ${receiverName}`;
      const metadata = { kind: "gift", receiverId, postId, emoji: tier.id, message: "" };

      setSendingTierId(tier.id);

      if (PiSDK) {
        // Pi.createPayment() MUST be called synchronously in the user-gesture
        // handler — no await before this line or the Pi Browser will block the wallet.
        try {
          PiSDK.createPayment(
            { amount: tier.piAmount, memo, metadata },
            {
              onReadyForServerApproval: async (piPaymentId: string) => {
                try {
                  const { paymentId } = await api.pi.create({
                    playerId: senderId,
                    amount: tier.piAmount,
                    memo,
                    metadata,
                  });
                  backendPaymentId.current = paymentId;
                  await api.pi.approve(paymentId, piPaymentId).catch(() => {});
                } catch {
                  toast.error("فشل إرسال الهدية — حاول مرة أخرى");
                  setSendingTierId(null);
                }
              },
              onReadyForServerCompletion: async (_piPaymentId: string, piTxId: string) => {
                try {
                  if (!backendPaymentId.current) {
                    toast.error("فشل إتمام الهدية");
                    setSendingTierId(null);
                    return;
                  }
                  await api.pi.complete(backendPaymentId.current, piTxId);
                  finishSend(tier);
                } catch {
                  toast.error("فشل إتمام الهدية");
                  setSendingTierId(null);
                }
              },
              onCancel: () => setSendingTierId(null),
              onError: () => {
                toast.error("حدث خطأ أثناء الدفع");
                setSendingTierId(null);
              },
            },
          );
        } catch {
          toast.error("تعذّر بدء الدفع");
          setSendingTierId(null);
        }
      } else {
        // No Pi SDK available (dev/preview outside Pi Browser) — inform the user.
        toast.error("افتح التطبيق داخل متصفح Pi Network لإرسال الهدايا");
        setSendingTierId(null);
      }
    },
    [canGift, sendingTierId, receiverId, receiverName, postId, senderId, finishSend]
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
                <h2 className="text-base font-black text-[#111]">أرسل هدية Pi</h2>
                <div className="w-9" />
              </div>

              {/* Receiver */}
              <div className="flex items-center gap-3 p-3 bg-[#F5F5F7] rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center text-lg shadow-md">
                  🎁
                </div>
                <div>
                  <div className="text-xs text-[#888]">إرسال هدية Pi حقيقية إلى</div>
                  <div className="font-bold text-[#111]">{receiverName}</div>
                </div>
              </div>

              {!canGift && (
                <p className="text-xs text-center text-[#888] py-2">لا يمكنك إرسال هدية لنفسك</p>
              )}

              {/* Tier grid */}
              <div>
                <div className="text-xs font-bold text-[#888] mb-3">اختر قيمة الهدية بعملة Pi</div>
                <div className="grid grid-cols-4 gap-x-2 gap-y-5 place-items-center">
                  {PI_GIFT_TIERS.map((tier) => {
                    const isSending = sendingTierId === tier.id;
                    const disabled = !canGift || (!!sendingTierId && !isSending);
                    return (
                      <button
                        key={tier.id}
                        onClick={() => handleTap(tier)}
                        disabled={disabled}
                        className={cn(
                          "relative flex flex-col items-center gap-1.5 select-none transition-transform active:scale-90",
                          disabled && "opacity-35 grayscale cursor-not-allowed"
                        )}
                      >
                        <div className="relative w-16 h-16">
                          <img
                            src={tier.image}
                            alt={tier.nameAr}
                            className="w-16 h-16 rounded-full object-cover"
                            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
                            draggable={false}
                          />
                          {isSending && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
                              <Loader2 size={20} className="text-white animate-spin" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-[#666] text-center leading-tight">
                          {tier.tierLabelAr}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Session summary */}
              <AnimatePresence>
                {sessionGiftCount > 0 && (
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
                        أرسلت {sessionGiftCount} هدية بقيمة إجمالية
                      </span>
                    </div>
                    <span className="text-sm font-black text-[#7c3aed]">{sessionTotalPi} π</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Done button */}
              <button
                onClick={handleClose}
                disabled={!!sendingTierId}
                className="w-full py-3.5 rounded-2xl text-sm font-black text-white active:scale-[0.98] transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
                  boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
                }}
              >
                {sessionGiftCount > 0 ? "تم" : "إغلاق"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
