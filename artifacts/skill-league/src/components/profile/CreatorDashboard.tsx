/**
 * CreatorDashboard — single button that opens a bottom-sheet drawer
 * containing all creator statistics (DN Economy, Gift Stats, Ranking, Activity).
 *
 * Props are identical to before so ProfilePage.tsx needs zero changes.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CreatorStats } from "@/hooks/useCreatorStats";

/* ─── tiny helpers ─────────────────────────────────────────────────────── */
function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

/* ─── Skeleton pulse ───────────────────────────────────────────────────── */
function Skeleton({ className }: { className: string }) {
  return (
    <motion.div
      className={`rounded-xl bg-white/10 ${className}`}
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/* ─── Stat tile (DN values) ────────────────────────────────────────────── */
interface StatTileProps {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  loading?: boolean;
}
function StatTile({ icon, label, value, sub, accent, loading }: StatTileProps) {
  return (
    <div
      className="flex flex-col gap-1.5 rounded-2xl p-3.5 relative overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-base leading-none">{icon}</span>
        <span className="text-white/50 text-xs font-medium leading-tight">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-3/4 mt-1" />
      ) : (
        <p className="text-xl font-black leading-none mt-0.5" style={{ color: accent }}>
          {value}
          <span className="text-xs font-semibold ml-1 opacity-70" style={{ color: accent }}>
            π
          </span>
        </p>
      )}
      {sub && !loading && (
        <p className="text-white/35 text-xs leading-none">{sub}</p>
      )}
    </div>
  );
}

/* ─── Count tile (non-DN) ──────────────────────────────────────────────── */
interface CountTileProps {
  icon: string;
  label: string;
  value: string | number;
  loading?: boolean;
  accent?: string;
}
function CountTile({ icon, label, value, loading, accent = "white" }: CountTileProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl p-3.5"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white/50 text-xs">{label}</p>
        {loading ? (
          <Skeleton className="h-5 w-16 mt-1" />
        ) : (
          <p className="font-bold text-sm" style={{ color: accent }}>
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Badge chip ───────────────────────────────────────────────────────── */
interface BadgeChipProps {
  icon: string;
  label: string;
  gradient: string;
  glow: string;
  delay: number;
}
function BadgeChip({ icon, label, gradient, glow, delay }: BadgeChipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, delay }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${gradient}`}
      style={{ boxShadow: `0 0 14px ${glow}` }}
    >
      <span className="text-sm leading-none">{icon}</span>
      <span className="text-white font-bold text-xs whitespace-nowrap">{label}</span>
    </motion.div>
  );
}

/* ─── Section label ────────────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3 px-1">
      {children}
    </p>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  DRAWER CONTENT — all four stat sections                                */
/* ═══════════════════════════════════════════════════════════════════════ */
interface DrawerContentProps {
  giftStats: CreatorStats["giftStats"];
  walletStats: CreatorStats["walletStats"];
  rank: CreatorStats["rank"];
  badges: CreatorStats["badges"];
  isLoading: boolean;
  postsCount: number;
  joinLabel: string | null;
  engagementLevel: string;
}

function DrawerContent({
  giftStats, walletStats, rank, badges,
  isLoading, postsCount, joinLabel, engagementLevel,
}: DrawerContentProps) {
  const earned  = giftStats?.totalReceivedPi ?? 0;
  const sent    = giftStats?.totalSentPi ?? 0;
  const net     = giftStats?.netBalance ?? 0;
  const balance = walletStats?.dnBalance ?? 0;

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  };
  const item = {
    hidden: { opacity: 0, y: 12 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-5"
    >

      {/* ══ 1. PI ECONOMY (gifts) ═══════════════════════════════════════ */}
      <motion.div variants={item}>
        <SectionLabel>π Pi Economy (Gifts)</SectionLabel>
        <div className="grid grid-cols-3 gap-2.5">
          <StatTile icon="📥" label="Earned" value={fmt(earned)} sub="from gifts"
            accent="#34d399" loading={isLoading} />
          <StatTile icon="📤" label="Sent"   value={fmt(sent)}   sub="to others"
            accent="#f87171" loading={isLoading} />
          <StatTile
            icon="⚖️" label="Net"
            value={(net >= 0 ? "+" : "") + fmt(net)}
            sub="balance"
            accent={net >= 0 ? "#a78bfa" : "#fb923c"}
            loading={isLoading}
          />
        </div>

        {/* DN$ points balance (internal, non-monetary) */}
        <div
          className="mt-2.5 flex items-center justify-between rounded-2xl px-4 py-3"
          style={{
            background: "rgba(52,211,153,0.08)",
            border: "1px solid rgba(52,211,153,0.2)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🏦</span>
            <span className="text-white/60 text-xs font-medium">DN$ Points</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-20" />
          ) : (
            <p className="text-emerald-400 font-black text-lg">
              {fmt(balance)}
              <span className="text-xs font-semibold ml-1 opacity-70">DN$</span>
            </p>
          )}
        </div>
      </motion.div>

      {/* ══ 2. GIFT STATS ══════════════════════════════════════════════ */}
      <motion.div variants={item}>
        <SectionLabel>🎁 Gift Stats</SectionLabel>
        <div className="grid grid-cols-2 gap-2.5">
          <CountTile icon="🎁" label="Gifts Received"
            value={isLoading ? "—" : (giftStats?.totalReceived ?? 0).toLocaleString()}
            loading={isLoading} accent="#a78bfa" />
          <CountTile icon="💝" label="Gifts Sent"
            value={isLoading ? "—" : (giftStats?.totalSent ?? 0).toLocaleString()}
            loading={isLoading} accent="#60a5fa" />
        </div>

        {rank.topSupporterName && (
          <div
            className="mt-2.5 flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.2)",
            }}
          >
            <span className="text-xl">🏆</span>
            <div className="flex-1 min-w-0">
              <p className="text-white/50 text-xs">Top Supporter</p>
              <p className="text-amber-300 font-bold text-sm truncate">
                @{rank.topSupporterName}
              </p>
            </div>
            {rank.topSupporterAmount > 0 && (
              <p className="text-amber-400 font-black text-sm flex-shrink-0">
                {fmt(rank.topSupporterAmount)}
                <span className="text-xs ml-0.5 opacity-70">π</span>
              </p>
            )}
          </div>
        )}
      </motion.div>

      {/* ══ 3. RANKING ═════════════════════════════════════════════════ */}
      <motion.div variants={item}>
        <SectionLabel>🏆 Ranking</SectionLabel>

        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-2.5"
          style={{
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.25)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}
          >
            🌍
          </div>
          <div className="flex-1">
            <p className="text-white/50 text-xs">Global Rank</p>
            {isLoading ? (
              <Skeleton className="h-5 w-20 mt-1" />
            ) : rank.globalRank ? (
              <p className="text-indigo-300 font-black text-base">
                {ordinal(rank.globalRank)}
              </p>
            ) : (
              <p className="text-white/30 text-sm font-semibold">Unranked</p>
            )}
          </div>
          {rank.earnerRank && (
            <div className="text-right flex-shrink-0">
              <p className="text-white/40 text-xs">Pi Earner</p>
              <p className="text-amber-300 font-bold text-sm">#{rank.earnerRank}</p>
            </div>
          )}
        </div>

        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {badges.map((b, i) => (
              <BadgeChip
                key={b.id}
                icon={b.icon}
                label={b.label}
                gradient={b.gradient}
                glow={b.glow}
                delay={i * 0.08}
              />
            ))}
          </div>
        )}
        {badges.length === 0 && !isLoading && (
          <p className="text-white/25 text-xs text-center py-2">
            Earn badges by receiving gifts and creating posts
          </p>
        )}
      </motion.div>

      {/* ══ 4. ACTIVITY INSIGHTS ═══════════════════════════════════════ */}
      <motion.div variants={item}>
        <SectionLabel>📊 Activity Insights</SectionLabel>
        <div className="grid grid-cols-2 gap-2.5">
          <CountTile icon="📝" label="Total Posts" value={postsCount.toLocaleString()} accent="white" />
          <CountTile icon="📈" label="Engagement"  value={engagementLevel}             accent="#c4b5fd" />
          {joinLabel && (
            <CountTile icon="📅" label="Member Since" value={joinLabel} accent="white" />
          )}
          <CountTile
            icon="💫" label="Total Gifts"
            value={isLoading ? "—" : (giftStats?.totalGiftTransactions ?? 0).toLocaleString()}
            loading={isLoading} accent="#fb923c"
          />
        </div>
      </motion.div>

    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT — button + bottom-sheet drawer                          */
/* ═══════════════════════════════════════════════════════════════════════ */
interface CreatorDashboardProps {
  stats: CreatorStats;
  postsCount: number;
  joinedAt?: string | number;
  username: string;
}

export default function CreatorDashboard({
  stats,
  postsCount,
  joinedAt,
  username,
}: CreatorDashboardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { giftStats, walletStats, rank, badges, isLoading } = stats;

  const engagementLevel =
    postsCount >= 20 ? "High 🚀" :
    postsCount >= 8  ? "Medium 📈" :
    postsCount >= 2  ? "Growing 🌱" :
    "New ✨";

  const joinLabel = joinedAt
    ? new Date(joinedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;

  return (
    <>
      {/* ── Single entry-point button ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        className="mx-4 mt-3"
      >
        <motion.button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(79,70,229,0.12) 100%)",
            border: "1px solid rgba(167,139,250,0.3)",
            boxShadow: "0 0 30px rgba(124,58,237,0.1)",
          }}
          whileTap={{ scale: 0.97 }}
        >
          {/* Shimmer sweep */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.04) 50%, transparent 70%)",
            }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
          />

          {/* Icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              boxShadow: "0 0 16px rgba(124,58,237,0.5)",
            }}
          >
            💎
          </div>

          {/* Label */}
          <div className="flex-1 text-left min-w-0">
            <p className="text-white font-black text-sm leading-tight">Creator Dashboard</p>
            <p className="text-white/40 text-xs mt-0.5 truncate">
              @{username} · Stats, rankings & earnings
            </p>
          </div>

          {/* Chevron */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16" height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(167,139,250,0.7)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-shrink-0"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </motion.button>
      </motion.div>

      {/* ── Bottom-sheet drawer ───────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="cd-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 z-[300]"
              style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
              onClick={() => setIsOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              key="cd-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-[301] rounded-t-3xl overflow-hidden"
              style={{
                background:
                  "linear-gradient(160deg, rgba(13,8,35,0.99) 0%, rgba(18,12,48,0.99) 100%)",
                border: "1px solid rgba(167,139,250,0.2)",
                boxShadow: "0 -10px 60px rgba(124,58,237,0.2), 0 -2px 20px rgba(0,0,0,0.5)",
                maxHeight: "85vh",
              }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.2)" }}
                />
              </div>

              {/* Header */}
              <div
                className="flex items-center gap-3 px-5 py-3"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(124,58,237,0.25) 0%, rgba(79,70,229,0.15) 100%)",
                  borderBottom: "1px solid rgba(167,139,250,0.15)",
                }}
              >
                <span className="text-lg">💎</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black text-base leading-tight">
                    Creator Dashboard
                  </p>
                  <p className="text-white/40 text-xs">@{username}</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors active:scale-90"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14" height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Scrollable content */}
              <div className="overflow-y-auto p-5" style={{ maxHeight: "calc(85vh - 90px)" }}>
                <DrawerContent
                  giftStats={giftStats}
                  walletStats={walletStats}
                  rank={rank}
                  badges={badges}
                  isLoading={isLoading}
                  postsCount={postsCount}
                  joinLabel={joinLabel}
                  engagementLevel={engagementLevel}
                />
                {/* Bottom breathing room above phone chrome */}
                <div className="h-6" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
