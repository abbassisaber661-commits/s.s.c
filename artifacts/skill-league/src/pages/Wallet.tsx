import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, TrendingUp, TrendingDown, Wallet2, RefreshCcw, Gift } from "lucide-react";
import { api, getStoredPlayerId } from "@/lib/apiClient";

type TxFilter = "all" | "income" | "spending";

const TX_META: Record<string, { icon: string; label: string }> = {
  gift_sent:     { icon: "🎁", label: "هدية أُرسلت" },
  gift_received: { icon: "🎁", label: "هدية مُستلمة" },
  reward:        { icon: "🏆", label: "مكافأة" },
  game_reward:   { icon: "🎮", label: "مكافأة لعبة" },
  purchase:      { icon: "🛒", label: "شراء" },
  refund:        { icon: "💸", label: "استرداد" },
  season_end:    { icon: "🌀", label: "نهاية الموسم" },
};

function txMeta(type: string) {
  return TX_META[type] ?? { icon: "💰", label: type };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ar-SA", { day: "numeric", month: "short", year: "numeric" });
}

export default function Wallet() {
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<TxFilter>("all");
  const playerId = getStoredPlayerId() ?? "";

  const balanceQuery = useQuery({
    queryKey: ["wallet", "balance", playerId],
    queryFn:  () => api.wallet.getBalance(playerId),
    enabled:  !!playerId,
    staleTime: 30_000,
  });

  const txQuery = useQuery({
    queryKey: ["wallet", "transactions", playerId, filter],
    queryFn:  () => api.wallet.getTransactions(playerId, filter, 1, 30),
    enabled:  !!playerId,
    staleTime: 30_000,
  });

  const balance  = balanceQuery.data?.dnBalance    ?? 0;
  const income   = balanceQuery.data?.totalIncome  ?? 0;
  const spending = balanceQuery.data?.totalSpending ?? 0;
  const txs      = txQuery.data?.data ?? [];
  const isLoading = balanceQuery.isLoading;

  function refetchAll() {
    balanceQuery.refetch();
    txQuery.refetch();
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: "#F0F2F5" }}>

      {/* ── Header ── */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: "#fff", borderColor: "#E4E6EB", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
      >
        <button
          onClick={() => navigate("/profile")}
          className="p-2 rounded-xl hover:bg-gray-100 active:scale-90 transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <Wallet2 className="w-5 h-5 text-yellow-500" />
        <h1 className="text-base font-black text-gray-900 flex-1">محفظة Denous</h1>
        <button
          onClick={refetchAll}
          className="p-2 rounded-xl hover:bg-gray-100 active:scale-90 transition-all"
        >
          <RefreshCcw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-4">

        {/* ── Balance Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1877F2 0%, #0a4fa6 60%, #07357a 100%)",
            boxShadow: "0 8px 32px rgba(24,119,242,0.35)",
          }}
        >
          <div className="px-6 pt-6 pb-4">
            <div className="text-xs font-bold tracking-widest text-white/60 uppercase mb-1">رصيدك الحالي</div>
            {isLoading ? (
              <div className="h-14 w-32 rounded-2xl bg-white/10 animate-pulse" />
            ) : (
              <div className="flex items-end gap-3">
                <span className="text-6xl font-black text-white tabular-nums leading-none">{balance.toLocaleString("ar-SA")}</span>
                <span className="text-2xl font-black text-white/70 mb-1">DN$</span>
              </div>
            )}
            <div className="mt-1 text-xs text-white/50 font-medium">Denous · العملة الرسمية</div>
          </div>

          {/* Income / Spending sub-row */}
          <div className="flex border-t border-white/10">
            <div className="flex-1 flex items-center gap-2 px-5 py-3">
              <TrendingUp className="w-4 h-4 text-green-300" />
              <div>
                <div className="text-xs text-white/50">إجمالي الدخل</div>
                <div className="text-sm font-black text-green-300 tabular-nums">
                  {isLoading ? "---" : `+${income.toLocaleString("ar-SA")} DN$`}
                </div>
              </div>
            </div>
            <div className="w-px bg-white/10" />
            <div className="flex-1 flex items-center gap-2 px-5 py-3">
              <TrendingDown className="w-4 h-4 text-red-300" />
              <div>
                <div className="text-xs text-white/50">إجمالي الإنفاق</div>
                <div className="text-sm font-black text-red-300 tabular-nums">
                  {isLoading ? "---" : `-${spending.toLocaleString("ar-SA")} DN$`}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Quick Action: Send Gift ── */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => navigate("/send-gift")}
          className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl active:scale-[0.98] transition-all"
          style={{ background: "#fff", border: "1px solid #E4E6EB", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: "linear-gradient(135deg,#FFB347,#FF6B35)" }}>
            🎁
          </div>
          <div className="flex-1 text-right" dir="rtl">
            <div className="text-sm font-bold text-gray-900">أرسل هدية</div>
            <div className="text-xs text-gray-500">أرسل DN$ لأي مستخدم فوراً</div>
          </div>
          <Gift className="w-4 h-4 text-gray-400" />
        </motion.button>

        {/* ── Transaction History ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: "#fff", border: "1px solid #E4E6EB", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          {/* Filter tabs */}
          <div className="flex border-b" style={{ borderColor: "#E4E6EB" }}>
            {([
              { id: "all",      label: "الكل" },
              { id: "income",   label: "📥 الدخل" },
              { id: "spending", label: "📤 الإنفاق" },
            ] as { id: TxFilter; label: string }[]).map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className="flex-1 py-3 text-xs font-bold transition-all"
                style={filter === t.id
                  ? { color: "#1877F2", borderBottom: "2px solid #1877F2" }
                  : { color: "#65676B", borderBottom: "2px solid transparent" }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="divide-y divide-[#F0F2F5]">
            {txQuery.isLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
                  </div>
                  <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                </div>
              ))
            ) : txs.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2" dir="rtl">
                <span className="text-4xl">💰</span>
                <p className="text-sm font-semibold text-gray-500">لا توجد معاملات بعد</p>
                <p className="text-xs text-gray-400">أرسل هدية أو العب لكسب DN$</p>
              </div>
            ) : (
              <AnimatePresence>
                {txs.map((tx, i) => {
                  const meta = txMeta(tx.type);
                  const isPositive = tx.amount > 0;
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 px-4 py-3"
                      dir="rtl"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background: isPositive ? "#E8F5E9" : "#FEECEC" }}
                      >
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {meta.label}
                        </div>
                        {tx.description && (
                          <div className="text-xs text-gray-500 truncate">{tx.description}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-0.5">{formatDate(tx.createdAt)}</div>
                      </div>
                      <div
                        className="text-sm font-black tabular-nums flex-shrink-0"
                        style={{ color: isPositive ? "#1DB954" : "#E53935" }}
                      >
                        {isPositive ? "+" : ""}{tx.amount.toLocaleString("ar-SA")} DN$
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </motion.div>

        {/* ── Info footer ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl px-5 py-4 text-center space-y-1"
          style={{ background: "#fff", border: "1px solid #E4E6EB" }}
          dir="rtl"
        >
          <div className="text-xs font-bold text-gray-700">💡 ما هو Denous (DN$)؟</div>
          <div className="text-xs text-gray-500 leading-relaxed">
            DN$ هي العملة الرسمية الوحيدة في المنصة.
            تُستخدم لإرسال الهدايا وشراء الامتيازات.
            كل المعاملات محفوظة في الخادم فقط.
          </div>
        </motion.div>

      </div>
    </div>
  );
}
