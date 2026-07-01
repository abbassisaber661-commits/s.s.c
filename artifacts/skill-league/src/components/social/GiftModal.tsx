// src/components/social/GiftModal.tsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Loader2, CheckCircle2, AlertCircle, Wallet2 } from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

// ─── preset gift amounts ──────────────────────────────────────────────────────
const PRESETS = [5, 10, 25, 50, 100, 250];

// ─── emoji options ────────────────────────────────────────────────────────────
const EMOJIS = ["🎁", "❤️", "🔥", "👏", "💪", "🌟", "💎", "🏆"];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  receiverId: string;
  receiverName: string;
  postId?: string;        // passed from SocialPostCard for ledger tracking
}

type Step = "pick" | "sending" | "success" | "error";

export default function GiftModal({ isOpen, onClose, receiverId, receiverName, postId }: Props) {
  const senderId = getStoredPlayerId() ?? "";
  const qc = useQueryClient();

  const [amount, setAmount] = useState<number | "">(10);
  const [customInput, setCustomInput] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [emoji, setEmoji] = useState("🎁");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<Step>("pick");
  const [errorMsg, setErrorMsg] = useState("");
  const [finalBalance, setFinalBalance] = useState<number | null>(null);

  // reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount(10);
      setCustomInput("");
      setUseCustom(false);
      setEmoji("🎁");
      setMessage("");
      setStep("pick");
      setErrorMsg("");
    }
  }, [isOpen]);

  // fetch sender balance
  const balanceQuery = useQuery({
    queryKey: ["wallet", "balance", senderId],
    queryFn:  () => api.wallet.getBalance(senderId),
    enabled:  !!senderId && isOpen,
    staleTime: 10_000,
  });

  const senderBalance = balanceQuery.data?.dnBalance ?? 0;

  const resolvedAmount = useCustom
    ? (parseInt(customInput, 10) || 0)
    : (typeof amount === "number" ? amount : 0);

  const canSend =
    resolvedAmount > 0 &&
    resolvedAmount <= senderBalance &&
    senderId &&
    senderId !== receiverId;

  async function handleSend() {
    if (!canSend) return;
    setStep("sending");
    try {
      const note = message.trim();
      const res = await api.wallet.sendGift(senderId, receiverId, resolvedAmount, note || undefined, postId, emoji);
      setFinalBalance(res.senderBalance);
      // invalidate wallet caches for both players
      qc.invalidateQueries({ queryKey: ["wallet", "balance", senderId] });
      qc.invalidateQueries({ queryKey: ["wallet", "transactions", senderId] });
      qc.invalidateQueries({ queryKey: ["wallet", "balance", receiverId] });
      setStep("success");
    } catch (err: any) {
      const msg = err?.message ?? "حدث خطأ";
      if (msg.includes("insufficient")) {
        setErrorMsg("رصيدك غير كافٍ لإرسال هذه الهدية");
      } else if (msg.includes("not found")) {
        setErrorMsg("المستخدم غير موجود");
      } else {
        setErrorMsg("فشل الإرسال — حاول مرة أخرى");
      }
      setStep("error");
    }
  }

  function handleClose() {
    if (step === "sending") return;
    onClose();
  }

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

            {/* ── PICK STEP ─────────────────────────────────────────── */}
            {step === "pick" && (
              <div className="px-5 pb-8 pt-2 space-y-5 overflow-y-auto" style={{ maxHeight: "85dvh" }}>

                {/* Header */}
                <div className="flex items-center justify-between">
                  <button onClick={handleClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                    <X size={18} className="text-gray-500" />
                  </button>
                  <h2 className="text-base font-black text-[#111]">أرسل هدية DN</h2>
                  <div className="w-9" />
                </div>

                {/* Receiver */}
                <div className="flex items-center gap-3 p-3 bg-[#F5F5F7] rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD60A] to-[#FF9500] flex items-center justify-center text-xl shadow-md">
                    🎁
                  </div>
                  <div>
                    <div className="text-xs text-[#888]">إرسال هدية إلى</div>
                    <div className="font-bold text-[#111]">{receiverName}</div>
                  </div>
                </div>

                {/* Sender balance */}
                <div className="flex items-center gap-2 text-sm">
                  <Wallet2 size={15} className="text-[#1877F2]" />
                  <span className="text-[#555]">رصيدك:</span>
                  {balanceQuery.isLoading ? (
                    <span className="text-[#888] animate-pulse">جار التحميل...</span>
                  ) : (
                    <span className="font-black text-[#1877F2]">{senderBalance.toLocaleString("ar-SA")} DN</span>
                  )}
                </div>

                {/* Preset amounts */}
                <div>
                  <div className="text-xs font-bold text-[#888] mb-2">اختر المبلغ</div>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESETS.map((p) => (
                      <button
                        key={p}
                        onClick={() => { setAmount(p); setUseCustom(false); }}
                        className={cn(
                          "py-2.5 rounded-2xl text-sm font-black border-2 transition-all active:scale-95",
                          !useCustom && amount === p
                            ? "border-[#FFD60A] bg-[#FFF9E0] text-[#111]"
                            : "border-[#EBEBEB] bg-white text-[#333] hover:border-[#FFD60A]"
                        )}
                      >
                        {p} <span className="text-[10px] font-medium">DN</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom amount */}
                <div>
                  <div className="text-xs font-bold text-[#888] mb-2">أو أدخل مبلغاً مخصصاً</div>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={senderBalance}
                      placeholder="0"
                      value={customInput}
                      onFocus={() => setUseCustom(true)}
                      onChange={(e) => {
                        setCustomInput(e.target.value);
                        setUseCustom(true);
                      }}
                      className={cn(
                        "w-full border-2 rounded-2xl px-4 py-3 text-right text-sm font-bold outline-none transition-colors",
                        useCustom ? "border-[#FFD60A] bg-[#FFF9E0]" : "border-[#EBEBEB] bg-[#F9F9F9]"
                      )}
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-[#999]">DN</span>
                  </div>
                  {useCustom && resolvedAmount > senderBalance && (
                    <p className="text-xs text-red-500 mt-1 font-semibold">المبلغ يتجاوز رصيدك الحالي</p>
                  )}
                </div>

                {/* Emoji */}
                <div>
                  <div className="text-xs font-bold text-[#888] mb-2">رمز الهدية</div>
                  <div className="flex gap-2 flex-wrap">
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        onClick={() => setEmoji(e)}
                        className={cn(
                          "w-10 h-10 rounded-xl text-xl transition-all active:scale-90 border-2",
                          emoji === e
                            ? "border-[#FFD60A] bg-[#FFF9E0] scale-110"
                            : "border-transparent bg-[#F5F5F7] hover:border-[#FFD60A]"
                        )}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <div className="text-xs font-bold text-[#888] mb-2">رسالة (اختياري)</div>
                  <textarea
                    placeholder="أضف رسالة مع هديتك..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 100))}
                    rows={2}
                    className="w-full border-2 border-[#EBEBEB] rounded-2xl px-4 py-3 text-right text-sm outline-none resize-none focus:border-[#FFD60A] transition-colors bg-[#F9F9F9] focus:bg-[#FFF9E0]"
                  />
                  <div className="text-[10px] text-[#bbb] text-left mt-0.5">{message.length}/100</div>
                </div>

                {/* Confirm button */}
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className={cn(
                    "w-full py-4 rounded-2xl text-base font-black transition-all active:scale-[0.98]",
                    canSend
                      ? "text-[#111] shadow-lg active:shadow-md"
                      : "bg-[#F0F0F0] text-[#BBB] cursor-not-allowed"
                  )}
                  style={canSend ? {
                    background: "linear-gradient(135deg, #FFD60A 0%, #FF9500 100%)",
                    boxShadow: "0 4px 16px rgba(255,214,10,0.4)",
                  } : {}}
                >
                  {resolvedAmount > 0
                    ? `أرسل ${resolvedAmount.toLocaleString("ar-SA")} DN ${emoji}`
                    : "اختر مبلغ الهدية"}
                </button>

                {senderId === receiverId && (
                  <p className="text-xs text-center text-[#888]">لا يمكنك إرسال هدية لنفسك</p>
                )}
              </div>
            )}

            {/* ── SENDING STEP ──────────────────────────────────────── */}
            {step === "sending" && (
              <div className="flex flex-col items-center justify-center gap-4 py-20 px-5">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 size={40} className="text-[#FFD60A]" />
                </motion.div>
                <p className="font-bold text-[#555]">جار إرسال الهدية...</p>
              </div>
            )}

            {/* ── SUCCESS STEP ──────────────────────────────────────── */}
            {step === "success" && (
              <div className="flex flex-col items-center justify-center gap-5 py-16 px-5">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                  style={{ background: "linear-gradient(135deg,#FFD60A,#FF9500)", boxShadow: "0 0 32px rgba(255,214,10,0.45)" }}
                >
                  {emoji}
                </motion.div>
                <div className="text-center space-y-1">
                  <p className="text-xl font-black text-[#111]">تم الإرسال! ✅</p>
                  <p className="text-sm text-[#555]">
                    أرسلت <span className="font-black text-[#FF9500]">{resolvedAmount.toLocaleString("ar-SA")} DN</span> إلى {receiverName}
                  </p>
                  {finalBalance !== null && (
                    <p className="text-xs text-[#888]">رصيدك الجديد: <span className="font-bold text-[#1877F2]">{finalBalance.toLocaleString("ar-SA")} DN</span></p>
                  )}
                </div>
                <button
                  onClick={handleClose}
                  className="mt-2 w-full py-3.5 rounded-2xl font-black text-[#111] text-sm"
                  style={{ background: "linear-gradient(135deg,#FFD60A,#FF9500)", boxShadow: "0 4px 16px rgba(255,214,10,0.35)" }}
                >
                  تم
                </button>
              </div>
            )}

            {/* ── ERROR STEP ────────────────────────────────────────── */}
            {step === "error" && (
              <div className="flex flex-col items-center justify-center gap-5 py-16 px-5">
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertCircle size={40} className="text-red-500" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-lg font-black text-[#111]">فشل الإرسال</p>
                  <p className="text-sm text-red-500 font-semibold">{errorMsg}</p>
                </div>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setStep("pick")}
                    className="flex-1 py-3.5 rounded-2xl font-black text-sm"
                    style={{ background: "linear-gradient(135deg,#FFD60A,#FF9500)", boxShadow: "0 4px 16px rgba(255,214,10,0.35)" }}
                  >
                    حاول مجدداً
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 py-3.5 rounded-2xl border-2 border-[#EBEBEB] text-[#555] font-bold text-sm"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
