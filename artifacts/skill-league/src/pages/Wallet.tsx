import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCcw } from "lucide-react";
import { api, getStoredPlayerId } from "@/lib/apiClient";
import PiLedgerHistory from "@/components/wallet/PiLedgerHistory";
import DNCurrencyIcon from "@/components/ui/DNCurrencyIcon";

type TxFilter = "all" | "income" | "spending";

// ── Transaction type → display metadata ──────────────────────────────────────
// All types the backend produces today + future-ready types.

const TX_META: Record<string, { icon: string; labelAr: string; labelEn: string }> = {
  // ── Daily Tasks ────────────────────────────────────────────────────────
  daily_login:       { icon: "🌅", labelAr: "تسجيل الدخول اليومي",     labelEn: "Daily Login Reward"       },
  daily_match:       { icon: "⚽", labelAr: "إكمال مباراة",            labelEn: "Match Completed Reward"   },
  daily_content:     { icon: "📝", labelAr: "إنشاء محتوى",             labelEn: "Content Creation Reward"  },
  daily_social:      { icon: "💬", labelAr: "تفاعل اجتماعي",           labelEn: "Social Interaction Reward"},
  daily_interaction: { icon: "⭐", labelAr: "منشئ مشهور",              labelEn: "Popular Creator Reward"   },
  // ── Gameplay ───────────────────────────────────────────────────────────
  match_reward:      { icon: "🎮", labelAr: "مكافأة مباراة",           labelEn: "Match Reward"             },
  match_win:         { icon: "🏅", labelAr: "مكافأة الفوز",            labelEn: "Win Reward"               },
  game_reward:       { icon: "🎮", labelAr: "مكافأة لعبة",             labelEn: "Game Reward"              },
  // ── League & Season ────────────────────────────────────────────────────
  season_end:        { icon: "🌀", labelAr: "نهاية الموسم",            labelEn: "Season Reward"            },
  season_reward:     { icon: "🌀", labelAr: "مكافأة الموسم",           labelEn: "Season Reward"            },
  league_reward:     { icon: "🏆", labelAr: "مكافأة الدوري",           labelEn: "League Reward"            },
  promotion:         { icon: "📈", labelAr: "ترقية في الدوري",         labelEn: "League Promotion"         },
  // ── Tournament & Events ────────────────────────────────────────────────
  tournament_reward: { icon: "🥇", labelAr: "مكافأة بطولة",           labelEn: "Tournament Reward"        },
  event_reward:      { icon: "🎉", labelAr: "مكافأة حدث",             labelEn: "Event Reward"             },
  // ── Achievements & Streaks ─────────────────────────────────────────────
  achievement:       { icon: "🏅", labelAr: "إنجاز",                   labelEn: "Achievement"              },
  streak:            { icon: "🔥", labelAr: "سلسلة انتصارات",          labelEn: "Streak Reward"            },
  level_up:          { icon: "⬆️", labelAr: "ترقية المستوى",           labelEn: "Level Up Reward"          },
  // ── Boutique / Spending ────────────────────────────────────────────────
  purchase:          { icon: "🛒", labelAr: "شراء من البوتيك",         labelEn: "Boutique Purchase"        },
  boutique_purchase: { icon: "🛒", labelAr: "شراء من البوتيك",         labelEn: "Boutique Purchase"        },
  refund:            { icon: "↩️", labelAr: "استرداد",                 labelEn: "Refund"                   },
  // ── Admin / System ─────────────────────────────────────────────────────
  reward:            { icon: "🎁", labelAr: "مكافأة",                   labelEn: "Reward"                   },
  admin_grant:       { icon: "⚙️", labelAr: "منحة إدارية",             labelEn: "Admin Grant"              },
  gift:              { icon: "🎁", labelAr: "هدية",                     labelEn: "Gift"                     },
};

function txMeta(type: string) {
  return TX_META[type] ?? { icon: "💰", labelAr: type, labelEn: type };
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
    queryFn:  () => api.wallet.getTransactions(playerId, filter, 1, 50),
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
    <div className="min-h-screen pb-28 bg-background text-foreground">

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/60 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/profile")}
          className="p-2 rounded-xl hover:bg-card active:scale-90 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <DNCurrencyIcon size="xs" />
        <h1 className="text-base font-black flex-1">محفظة DN$</h1>
        <button
          onClick={refetchAll}
          className="p-2 rounded-xl hover:bg-card active:scale-90 transition-all"
        >
          <RefreshCcw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">

        {/* ── Balance Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 55%, #0f3460 100%)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Banknote hero */}
          <div className="px-5 pt-5">
            <DNCurrencyIcon size="hero" className="shadow-lg" />
          </div>

          {/* Balance row */}
          <div className="px-6 pt-4 pb-3">
            <div className="text-[10px] font-bold tracking-widest text-white/50 uppercase mb-2">
              رصيدك الحالي
            </div>
            {isLoading ? (
              <div className="h-14 w-36 rounded-2xl bg-white/10 animate-pulse" />
            ) : (
              <div className="flex items-end gap-3">
                <span className="text-5xl font-black text-white tabular-nums leading-none">
                  {balance.toLocaleString("en-US")}
                </span>
                <span className="text-2xl font-black text-yellow-300 mb-1">DN$</span>
              </div>
            )}
            <div className="mt-1.5 text-[11px] text-white/40 font-medium">
              Danous · نقاط تقدّم داخلية (غير قابلة للتحويل)
            </div>
          </div>

          {/* Income / Spending sub-row */}
          <div className="flex border-t border-white/10">
            <div className="flex-1 flex items-center gap-2 px-5 py-3">
              <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0" />
              <div>
                <div className="text-[10px] text-white/40">إجمالي الدخل</div>
                <div className="text-sm font-black text-green-400 tabular-nums">
                  {isLoading ? "—" : `+${income.toLocaleString("en-US")} DN$`}
                </div>
              </div>
            </div>
            <div className="w-px bg-white/10" />
            <div className="flex-1 flex items-center gap-2 px-5 py-3">
              <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0" />
              <div>
                <div className="text-[10px] text-white/40">إجمالي الإنفاق</div>
                <div className="text-sm font-black text-red-400 tabular-nums">
                  {isLoading ? "—" : `-${spending.toLocaleString("en-US")} DN$`}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Transaction History ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl overflow-hidden border border-border bg-card"
        >
          {/* Filter tabs */}
          <div className="flex border-b border-border">
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
                  ? { color: "hsl(var(--primary))", borderBottom: "2px solid hsl(var(--primary))" }
                  : { color: "hsl(var(--muted-foreground))", borderBottom: "2px solid transparent" }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="divide-y divide-border/50">
            {txQuery.isLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-xl bg-muted animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-2.5 bg-muted rounded animate-pulse w-1/2" />
                  </div>
                  <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                </div>
              ))
            ) : txs.length === 0 ? (
              <div className="flex flex-col items-center py-14 gap-3" dir="rtl">
                <DNCurrencyIcon size="md" className="opacity-40" />
                <p className="text-sm font-semibold text-muted-foreground">لا توجد معاملات بعد</p>
                <p className="text-xs text-muted-foreground/60">أكمل المهام اليومية لكسب نقاط DN$</p>
              </div>
            ) : (
              <AnimatePresence>
                {txs.map((tx, i) => {
                  const meta     = txMeta(tx.type);
                  const isPlus   = tx.amount > 0;
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.025 }}
                      className="flex items-center gap-3 px-4 py-3"
                      dir="rtl"
                    >
                      {/* Icon bubble */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background: isPlus ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)" }}
                      >
                        {meta.icon}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-foreground truncate">
                          {meta.labelAr}
                        </div>
                        {tx.description && (
                          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {tx.description}
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {formatDate(tx.createdAt)}
                        </div>
                      </div>

                      {/* Amount + mini banknote */}
                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        <div
                          className="text-sm font-black tabular-nums"
                          style={{ color: isPlus ? "#22c55e" : "#ef4444" }}
                        >
                          {isPlus ? "+" : ""}{tx.amount.toLocaleString("en-US")}
                        </div>
                        <DNCurrencyIcon size="xs" />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </motion.div>

        {/* ── Pi Ledger Transaction History ── */}
        <PiLedgerHistory />

        {/* ── Info footer ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl px-5 py-4 border border-border bg-card space-y-3"
          dir="rtl"
        >
          <div className="flex items-center gap-2.5">
            <DNCurrencyIcon size="sm" />
            <div className="text-sm font-bold">ما هي نقاط Danous (DN$)؟</div>
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            DN$ نظام نقاط داخلي للتقدّم فقط — تُكتسب من اللعب والمهام اليومية والإنجازات.
            ليس لها أي قيمة نقدية ولا يمكن إرسالها لمستخدمين آخرين أو تحويلها إلى Pi.
            الهدايا الحقيقية تُرسل بعملة Pi فقط.
          </div>
          {/* Quick earn guide */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {[
              { icon: "🌅", label: "تسجيل يومي", dn: "+1" },
              { icon: "⚽", label: "العب مباراة",  dn: "+1" },
              { icon: "📝", label: "أنشئ محتوى",  dn: "+1" },
              { icon: "💬", label: "تفاعل اجتماعي", dn: "+3" },
              { icon: "⭐", label: "كن مشهوراً",   dn: "+2" },
              { icon: "🌀", label: "نهاية الموسم", dn: "+5+" },
            ].map((row) => (
              <div key={row.label}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/40">
                <span className="text-sm">{row.icon}</span>
                <span className="text-[11px] text-muted-foreground flex-1 truncate">{row.label}</span>
                <span className="text-[11px] font-black text-yellow-400">{row.dn}</span>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
