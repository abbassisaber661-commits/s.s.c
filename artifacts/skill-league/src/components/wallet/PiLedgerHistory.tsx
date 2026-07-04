import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { api, getStoredPlayerId } from "@/lib/apiClient";

type LedgerFilter = "all" | "pending" | "confirmed" | "failed";

const FILTERS: { id: LedgerFilter; label: string }[] = [
  { id: "all",       label: "الكل" },
  { id: "pending",   label: "قيد الانتظار" },
  { id: "confirmed", label: "مؤكدة" },
  { id: "failed",    label: "فشلت" },
];

const STATUS_META: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  pending:   { label: "قيد الانتظار", dot: "#F5A623", bg: "rgba(245,166,35,0.12)",  text: "#B9770E" },
  confirmed: { label: "مؤكدة",        dot: "#1DB954", bg: "rgba(29,185,84,0.12)",   text: "#188A3E" },
  failed:    { label: "فشلت",         dot: "#E53935", bg: "rgba(229,57,53,0.12)",   text: "#C62828" },
};

function shortTxId(id: string | null) {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ar-SA", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function PiLedgerHistory() {
  const [filter, setFilter] = useState<LedgerFilter>("all");
  const playerId = getStoredPlayerId() ?? "";

  const ledgerQuery = useQuery({
    queryKey: ["pi", "ledger", playerId],
    queryFn: () => api.pi.ledger(playerId),
    enabled: !!playerId,
    staleTime: 15_000,
    refetchOnMount: "always",
  });

  const rows = ledgerQuery.data?.data ?? [];

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: "#fff", border: "1px solid #E4E6EB", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2" dir="rtl">
        <span className="text-lg">💰</span>
        <h2 className="text-sm font-black text-gray-900">Transaction History</h2>
        <span className="text-[10px] font-bold text-gray-400 mr-auto">Pi Testnet</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto" dir="rtl">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0"
            style={
              filter === f.id
                ? { background: "#111", color: "#fff" }
                : { background: "#F0F2F5", color: "#65676B" }
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="border-t" style={{ borderColor: "#E4E6EB" }} />

      {/* List */}
      <div className="divide-y divide-[#F0F2F5]">
        {ledgerQuery.isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/3" />
              </div>
              <div className="space-y-1.5 items-end flex flex-col">
                <div className="h-3.5 w-14 bg-gray-100 rounded animate-pulse" />
                <div className="h-2.5 w-10 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-2" dir="rtl">
            <span className="text-4xl">🧾</span>
            <p className="text-sm font-semibold text-gray-500">No transactions yet</p>
            <p className="text-xs text-gray-400">لا توجد معاملات Pi بعد</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((tx, i) => {
              const isReceived = tx.receiverId === playerId;
              const statusMeta = STATUS_META[tx.status] ?? STATUS_META.pending;
              const counterpartName = isReceived ? tx.senderName : (tx.receiverName ?? "—");

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.03 }}
                  className="flex items-center gap-3 px-4 py-3.5"
                  dir="rtl"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: isReceived ? "rgba(29,185,84,0.12)" : "rgba(124,58,237,0.12)" }}
                  >
                    {isReceived
                      ? <ArrowDownLeft className="w-5 h-5" style={{ color: "#1DB954" }} />
                      : <ArrowUpRight className="w-5 h-5" style={{ color: "#7c3aed" }} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900 truncate">
                      {isReceived ? `من ${counterpartName}` : (tx.kind === "gift" ? `إلى ${counterpartName}` : "شراء داخل التطبيق")}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: statusMeta.bg, color: statusMeta.text }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusMeta.dot }} />
                        {statusMeta.label}
                      </span>
                      <span className="text-[10px] text-gray-400">· {shortTxId(tx.txId)}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(tx.createdAt)}</div>
                  </div>

                  <div className="flex flex-col items-end flex-shrink-0">
                    <span
                      className="text-sm font-black tabular-nums"
                      style={{ color: isReceived ? "#1DB954" : "#111" }}
                    >
                      {isReceived ? "+" : "-"}{tx.amountPi} π
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
