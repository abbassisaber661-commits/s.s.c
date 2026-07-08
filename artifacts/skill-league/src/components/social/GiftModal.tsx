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
import { PI_GIFT_TIERS, GIFT_ROW_COLORS, formatGiftAmount, type PiGiftTier } from "@/lib/piGiftTiers";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  receiverId: string;
  receiverName: string;
  postId?: string; // passed from SocialPostCard for ledger tracking
  senderAvatarUrl?: string;
  senderName?: string;
  /** Fired the moment a gift payment completes — used by the post card to
   *  play a "landed" celebration on the post itself. */
  onSent?: (tier: PiGiftTier) => void;
}

// ─── Premium gift ring (purple-outlined, gradient by row) ───────────────────

const GiftRing = React.memo(function GiftRing({
  tier, isSending, disabled, onClick,
}: { tier: PiGiftTier; isSending: boolean; disabled: boolean; onClick: () => void }) {
  const colors = GIFT_ROW_COLORS[tier.row];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex flex-col items-center gap-1.5 select-none transition-transform active:scale-90",
        disabled && "opacity-35 grayscale cursor-not-allowed"
      )}
    >
      <div
        className="w-16 h-16 rounded-full p-[3px] shrink-0"
        style={{
          background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
          boxShadow: isSending ? `0 0 0 4px ${colors.glow}` : `0 1px 6px rgba(76,29,149,0.18)`,
        }}
      >
        <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center">
          {isSending ? (
            <Loader2 size={18} className="animate-spin" style={{ color: colors.text }} />
          ) : (
            <>
              <span className="text-[11px] font-black leading-none" style={{ color: colors.text }}>
                {formatGiftAmount(tier.piAmount)}
              </span>
              <span className="text-[9px] font-bold leading-none mt-0.5" style={{ color: colors.text }}>
                π
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  );
});

// ─── Sending flight animation (avatar + amount rising toward the post) ──────

const GIFT_PARTICLES = Array.from({ length: 10 });

function GiftFlight({
  tier, avatarUrl, senderName, onDone,
}: { tier: PiGiftTier; avatarUrl?: string; senderName?: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1450);
    return () => clearTimeout(t);
  }, [onDone]);

  const colors = GIFT_ROW_COLORS[tier.row];

  return (
    <motion.div
      className="fixed left-1/2 z-[70] pointer-events-none flex flex-col items-center"
      style={{ bottom: 150 }}
      initial={{ opacity: 0, y: 0, scale: 0.4, x: "-50%" }}
      animate={{ opacity: [0, 1, 1, 0], y: -280, scale: [0.4, 1.25, 1, 0.9], x: "-50%" }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.35, times: [0, 0.16, 0.78, 1], ease: "easeOut" }}
    >
      {/* glow pulse */}
      <motion.div
        className="absolute -inset-5 rounded-full"
        style={{ background: `radial-gradient(circle, ${colors.glow}, transparent 70%)` }}
        initial={{ scale: 0.6, opacity: 0.9 }}
        animate={{ scale: [0.6, 1.5, 1.1], opacity: [0.95, 0.6, 0] }}
        transition={{ duration: 1.35 }}
      />

      {/* sparkle particles burst */}
      {GIFT_PARTICLES.map((_, i) => {
        const angle = (i / GIFT_PARTICLES.length) * Math.PI * 2;
        const dist = 30 + (i % 3) * 12;
        return (
          <motion.span
            key={i}
            className="absolute text-[12px]"
            style={{ left: "50%", top: "50%" }}
            initial={{ opacity: 1, x: 0, y: 0, scale: 0.5 }}
            animate={{
              opacity: 0,
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              scale: 1.15,
            }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.05 }}
          >
            ✨
          </motion.span>
        );
      })}

      {/* sender avatar */}
      <div
        className="relative w-14 h-14 rounded-full border-[2.5px] border-white overflow-hidden flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
          boxShadow: `0 0 18px ${colors.glow}`,
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} className="w-full h-full object-cover" draggable={false} />
        ) : (
          <span className="text-white text-lg font-black">
            {(senderName || "?").slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>

      {/* amount label */}
      <div
        className="mt-1.5 px-2.5 py-1 rounded-full text-[11px] font-black text-white whitespace-nowrap"
        style={{
          background: `linear-gradient(135deg, ${colors.to} 0%, #3B0764 100%)`,
          boxShadow: "0 3px 12px rgba(59,7,100,0.45)",
        }}
      >
        {formatGiftAmount(tier.piAmount)} π
      </div>
    </motion.div>
  );
}

export default function GiftModal({
  isOpen, onClose, receiverId, receiverName, postId, senderAvatarUrl, senderName, onSent,
}: Props) {
  const senderId = getStoredPlayerId() ?? "";
  const qc = useQueryClient();

  const [sendingTierId, setSendingTierId] = useState<string | null>(null);
  const [sessionTotalPi, setSessionTotalPi] = useState(0);
  const [sessionGiftCount, setSessionGiftCount] = useState(0);
  const [flight, setFlight] = useState<{ tier: PiGiftTier; key: number } | null>(null);
  const [confirmTier, setConfirmTier] = useState<PiGiftTier | null>(null);
  const backendPaymentId = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSendingTierId(null);
      setSessionTotalPi(0);
      setSessionGiftCount(0);
      setConfirmTier(null);
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
    setFlight({ tier, key: Date.now() });
    qc.invalidateQueries({ queryKey: ["wallet", "balance", receiverId] });
    qc.invalidateQueries({ queryKey: ["lb", "top-earners"] });
    qc.invalidateQueries({ queryKey: ["lb", "top-supporters"] });
    toast.success(`تم إرسال ${tier.piAmount} π إلى ${receiverName}`);
    onSent?.(tier);
  }, [qc, receiverId, receiverName, onSent]);

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
                  if (backendPaymentId.current) {
                    api.pi.fail(backendPaymentId.current, "complete_error").catch(() => {});
                  }
                  setSendingTierId(null);
                }
              },
              onCancel: () => {
                if (backendPaymentId.current) {
                  api.pi.fail(backendPaymentId.current, "cancelled").catch(() => {});
                }
                setSendingTierId(null);
              },
              onError: () => {
                toast.error("حدث خطأ أثناء الدفع");
                if (backendPaymentId.current) {
                  api.pi.fail(backendPaymentId.current, "sdk_error").catch(() => {});
                }
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

  const handleRingTap = useCallback(
    (tier: PiGiftTier) => {
      if (!canGift || sendingTierId) return;
      setConfirmTier(tier);
    },
    [canGift, sendingTierId]
  );

  const handleConfirmSend = useCallback(() => {
    if (!confirmTier) return;
    const tier = confirmTier;
    setConfirmTier(null);
    // Must stay inside this synchronous click handler — the Pi Browser
    // requires createPayment() to be triggered directly by the user gesture.
    handleTap(tier);
  }, [confirmTier, handleTap]);

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

              {/* Tier grid — 5 rows x 4 rings, light → deep purple */}
              <div>
                <div className="text-xs font-bold text-[#888] mb-3">اختر قيمة الهدية بعملة Pi</div>
                <div className="grid grid-cols-4 gap-x-2 gap-y-5 place-items-center">
                  {PI_GIFT_TIERS.map((tier) => {
                    const isSending = sendingTierId === tier.id;
                    const disabled = !canGift || (!!sendingTierId && !isSending);
                    return (
                      <GiftRing
                        key={tier.id}
                        tier={tier}
                        isSending={isSending}
                        disabled={disabled}
                        onClick={() => handleRingTap(tier)}
                      />
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

          {/* Sending celebration — avatar + amount rising with sparkles */}
          <AnimatePresence>
            {flight && (
              <GiftFlight
                key={flight.key}
                tier={flight.tier}
                avatarUrl={senderAvatarUrl}
                senderName={senderName}
                onDone={() => setFlight(null)}
              />
            )}
          </AnimatePresence>

          {/* Confirmation card — small, not full-screen. Payment only starts after "Send". */}
          <AnimatePresence>
            {confirmTier && (
              <React.Fragment key="gift-confirm">
                <motion.div
                  key="gift-confirm-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[80] bg-black/40"
                  onClick={() => setConfirmTier(null)}
                />
                <motion.div
                  key="gift-confirm-card"
                  initial={{ opacity: 0, scale: 0.9, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 12 }}
                  transition={{ type: "spring", stiffness: 340, damping: 28 }}
                  className="fixed left-1/2 top-1/2 z-[81] w-[86%] max-w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-5 text-center"
                  style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}
                  dir="rtl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="mx-auto mb-3 w-20 h-20 rounded-full p-[3px] flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${GIFT_ROW_COLORS[confirmTier.row].from} 0%, ${GIFT_ROW_COLORS[confirmTier.row].to} 100%)`,
                      boxShadow: `0 0 0 4px ${GIFT_ROW_COLORS[confirmTier.row].glow}`,
                    }}
                  >
                    <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center">
                      <span
                        className="text-lg font-black leading-none"
                        style={{ color: GIFT_ROW_COLORS[confirmTier.row].text }}
                      >
                        {formatGiftAmount(confirmTier.piAmount)}
                      </span>
                      <span
                        className="text-[11px] font-bold leading-none mt-0.5"
                        style={{ color: GIFT_ROW_COLORS[confirmTier.row].text }}
                      >
                        π
                      </span>
                    </div>
                  </div>

                  <p className="text-sm font-bold text-[#111] mb-1">
                    إرسال {formatGiftAmount(confirmTier.piAmount)}π إلى {receiverName}؟
                  </p>
                  <p className="text-[11px] text-[#999] mb-5">
                    سيتم الدفع من محفظة Pi الخاصة بك عبر شبكة Pi Network
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmTier(null)}
                      className="flex-1 py-3 rounded-2xl text-sm font-bold text-[#666] bg-[#F2F2F4] active:scale-[0.97] transition-all"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleConfirmSend}
                      className="flex-1 py-3 rounded-2xl text-sm font-black text-white active:scale-[0.97] transition-all"
                      style={{
                        background: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
                        boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
                      }}
                    >
                      إرسال
                    </button>
                  </div>
                </motion.div>
              </React.Fragment>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
