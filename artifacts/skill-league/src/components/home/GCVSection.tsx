/**
 * GCVSection.tsx  →  Home page / GCV internal community consensus price
 * ───────────────────────────────────────────────────────────────────
 * GCV is an internal S.S.C community consensus system — NOT the official
 * Pi price, NOT a fixed/imposed value, and fully separate from Pi payments,
 * subscriptions and wallet transactions. Users vote (one vote each,
 * changeable) for the value they'd like the community to informally use
 * for in-app interactions. This component only stores/aggregates votes.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, X, Check, Loader2 } from "lucide-react";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import { playTap } from "@/lib/sounds";

interface GcvOption {
  value: string;
  votes: number;
  percent: number;
}

function formatValue(raw: string): string {
  // "314159" -> "314,159"   "1314" -> "1,314"   "0314" -> "0,314"
  if (raw.length <= 3) return raw;
  const head = raw.slice(0, raw.length - 3);
  const tail = raw.slice(raw.length - 3);
  return `${head},${tail}`;
}

export default function GCVSection({ language }: { language?: string }) {
  const ar = language === "ar";
  const playerId = getStoredPlayerId();

  const [options, setOptions] = useState<GcvOption[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [consensusValue, setConsensusValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const fetchResults = useCallback(async () => {
    try {
      const data = await api.gcv.results(playerId ?? undefined);
      setOptions(data.options);
      setTotalVotes(data.totalVotes);
      setMyVote(data.myVote);
      setConsensusValue(data.consensusValue);
    } catch {
      // silent — keep last known state
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, 30_000);
    return () => clearInterval(interval);
  }, [fetchResults]);

  const handleVote = async (value: string) => {
    if (!playerId || voting || myVote === value) return;
    playTap();
    setVoting(value);
    try {
      await api.gcv.vote(playerId, value);
      await fetchResults();
    } catch {
      // silent
    } finally {
      setVoting(null);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-yellow-500/25 bg-gradient-to-br from-yellow-500/5 to-transparent p-4 space-y-3"
      >
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black tracking-wide text-yellow-400">GCV</span>
              <button
                onClick={() => { playTap(); setShowInfo(true); }}
                className="text-muted-foreground/70 hover:text-yellow-400 transition-colors"
                aria-label="info"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {ar ? "سعر الإجماع داخل التطبيق" : "In-App Consensus Price"}
            </p>
          </div>
          {consensusValue && (
            <div className="text-right flex-shrink-0">
              <p className="text-[9px] text-muted-foreground">{ar ? "الإجماع الحالي" : "Current Consensus"}</p>
              <p className="text-sm font-black text-yellow-400">{formatValue(consensusValue)}</p>
            </div>
          )}
        </div>

        {/* Disclaimer strip */}
        <p className="text-[10px] leading-snug text-muted-foreground/80 bg-white/5 rounded-lg px-2.5 py-1.5">
          {ar
            ? "قيمة إجماع مجتمعي داخلي فقط، وليست سعر Pi الرسمي."
            : "An internal community consensus value only — not the official Pi price."}
        </p>

        {/* Options */}
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-yellow-400/70" />
          </div>
        ) : (
          <div className="space-y-2">
            {options.map((opt) => {
              const isMine = myVote === opt.value;
              const isVoting = voting === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleVote(opt.value)}
                  disabled={!playerId || voting !== null}
                  className={`relative w-full overflow-hidden rounded-xl border p-2.5 text-left transition-all active:scale-[0.98] ${
                    isMine ? "border-yellow-400/60" : "border-border/60"
                  }`}
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-yellow-500/10"
                    style={{ width: `${opt.percent}%` }}
                  />
                  <div className="relative flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums flex-shrink-0">
                      {formatValue(opt.value)}
                    </span>
                    <span className="flex-1" />
                    <span className="text-xs font-black text-yellow-400 flex-shrink-0">
                      {opt.percent}%
                    </span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      ({opt.votes} {ar ? "صوت" : "votes"})
                    </span>
                    {isVoting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400 flex-shrink-0" />
                    ) : isMine ? (
                      <Check className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center">
          {totalVotes} {ar ? "إجمالي الأصوات" : "total votes"}
          {!playerId && (ar ? " · سجّل الدخول للتصويت" : " · Log in to vote")}
        </p>
      </motion.div>

      {/* Info popup */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6"
            onClick={() => setShowInfo(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-yellow-500/30 bg-[#120a1f] p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-black text-yellow-400">GCV</span>
                <button onClick={() => setShowInfo(false)} className="text-muted-foreground hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm leading-relaxed text-white/90" dir={ar ? "rtl" : "ltr"}>
                {ar
                  ? "اختر القيمة التي ترغب التعامل بها داخل التطبيق. هذه قيمة إجماع يحددها رواد ومستخدمو التطبيق عن طريق التصويت فقط. ليست سعر Pi الرسمي ولا تمثل سعر السوق. لا يتم اعتماد أي قيمة داخل التطبيق إلا بعد موافقة المجتمع."
                  : "Choose the value you'd like to interact with inside the app. This is a consensus value determined solely by the app's community through voting. It is not the official Pi price and does not represent the market price. No value is adopted inside the app unless the community agrees on it."}
              </p>
              <button
                onClick={() => setShowInfo(false)}
                className="w-full py-2.5 rounded-xl bg-yellow-500 text-black text-sm font-black active:scale-95 transition-transform"
              >
                {ar ? "فهمت" : "Got it"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
