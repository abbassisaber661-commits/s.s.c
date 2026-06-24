/**
 * LeagueSelectPage.tsx
 * ─────────────────────
 * Unified league selection:
 *   • Division III — always open (Entry League), PLAY → /match-arena
 *   • Division II / Professional / Champions — locked behind subscription
 *     (subscribe button shows full info modal → 2-step confirmation)
 */
import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, X, ChevronRight, CheckCircle } from "lucide-react";

// ── Storage key ────────────────────────────────────────────────────────────────
const SUBS_KEY = "sl_subscribed_leagues_v1";

function loadSubscribed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SUBS_KEY) ?? "[]")); }
  catch { return new Set(); }
}
function saveSubscribed(set: Set<string>) {
  localStorage.setItem(SUBS_KEY, JSON.stringify([...set]));
}

// ── League data ────────────────────────────────────────────────────────────────
const LEAGUES = [
  {
    id: "division-iii",
    name: "Division III",
    shortLabel: "DIV III",
    emblem: "🥉",
    color: "#cd7f32",
    colorRgb: "205,127,50",
    desc: "الدوري التنافسي الأول. أسئلة متحدية، منافسون حقيقيون، ولا مجال للتهاون.",
    diffLabel: "تنافسي",
    eloLabel: "مفتوح للجميع",
    entryCost: 0,
    entryLabel: "مجاني",
    free: true,
    perks: [
      "نظام LP تصاعدي — اجمع نقاط وارتقِ",
      "19 منافس بوت في كل مباراة",
      "أسئلة متعددة الأنواع والتخصصات",
      "مكافآت عملة لكل انتصار",
    ],
    afterJoin: "ستدخل مباشرة إلى ساحة Division III وتبدأ اكتساب نقاط LP.",
  },
  {
    id: "division-ii",
    name: "Division II",
    shortLabel: "DIV II",
    emblem: "🥈",
    color: "#94a3b8",
    colorRgb: "148,163,184",
    desc: "المستوى المتوسط. أسئلة أصعب، منافسة أعمق، مكافآت أكبر.",
    diffLabel: "متقدم",
    eloLabel: "LP 100+",
    entryCost: 1,
    entryLabel: "1 💎",
    free: false,
    perks: [
      "أسئلة بمستوى أعلى من Division III",
      "19 منافس بوت متقدم في كل مباراة",
      "مكافآت عملة معززة لكل انتصار",
      "تأهل للترفيع إلى Pro League",
    ],
    afterJoin: "سيتم تسجيلك في الموسم الحالي لـ Division II وتبدأ مبارياتك.",
  },
  {
    id: "professional",
    name: "Professional League",
    shortLabel: "PRO",
    emblem: "🥇",
    color: "#ffd700",
    colorRgb: "255,215,0",
    desc: "منافسة عالية المخاطر. فقط من اجتاز Division II يستطيع الصمود هنا.",
    diffLabel: "محترف",
    eloLabel: "LP 300+",
    entryCost: 2,
    entryLabel: "2 💎",
    free: false,
    perks: [
      "أسئلة من مستوى PRO — صعوبة عالية",
      "7 منافسين نخبة في كل مباراة",
      "شارة PRO الحصرية على ملفك الشخصي",
      "وصول لبطولات المحترفين",
    ],
    afterJoin: "ستحصل على شارة PRO وتبدأ مبارياتك في الموسم الحالي.",
  },
  {
    id: "champions",
    name: "Champions League",
    shortLabel: "CHAMPION",
    emblem: "👑",
    color: "#a78bfa",
    colorRgb: "167,139,250",
    desc: "قمة SkillLeague. الأفضل عالمياً فقط. لا رحمة، لا تسهيلات.",
    diffLabel: "نخبة",
    eloLabel: "LP 500+",
    entryCost: 4,
    entryLabel: "4 💎",
    free: false,
    perks: [
      "أصعب أسئلة في المنصة — مستوى CHAMPION",
      "7 منافسين من أفضل اللاعبين",
      "تاج 👑 CHAMPION على ملفك الشخصي",
      "أعلى مكافآت ممكنة + جوائز الموسم",
    ],
    afterJoin: "ستنضم لقائمة أفضل اللاعبين وتبدأ مبارياتك الأسطورية.",
  },
] as const;

type League = (typeof LEAGUES)[number];

// ── Particles ──────────────────────────────────────────────────────────────────
const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  id: i, x: (i * 137.5) % 100, y: (i * 97.3) % 100,
  size: 1.5 + (i % 4),
  color: i % 3 === 0 ? "#a78bfa" : i % 3 === 1 ? "#60a5fa" : "#f472b6",
  dur: 4 + (i % 4), delay: (i * 0.35) % 3.5,
}));

// ── Subscribe Modal ────────────────────────────────────────────────────────────
function SubscribeModal({
  league,
  onClose,
  onConfirm,
}: {
  league: League;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [step, setStep] = useState<"info" | "confirm" | "done">("info");

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)" }}
        onClick={step !== "done" ? onClose : undefined}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      />

      {/* Sheet */}
      <motion.div
        className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-3xl overflow-hidden"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        style={{
          background: `linear-gradient(160deg,
            rgba(${league.colorRgb},0.16) 0%,
            rgba(10,5,25,0.97) 45%)`,
          border: `1.5px solid rgba(${league.colorRgb},0.35)`,
          boxShadow: `0 0 60px rgba(${league.colorRgb},0.25), 0 20px 60px rgba(0,0,0,0.8)`,
        }}
      >
        {/* Color top bar */}
        <div
          className="h-1 w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${league.color}, transparent)` }}
        />

        <div className="p-6">
          {/* Close button */}
          {step !== "done" && (
            <button
              onClick={onClose}
              className="absolute top-4 left-4 w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <X className="w-4 h-4 text-white/50" />
            </button>
          )}

          {/* ── Step: INFO ── */}
          {step === "info" && (
            <div>
              {/* Header */}
              <div className="flex items-center gap-4 mb-5 mt-2">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                  style={{
                    background: `rgba(${league.colorRgb},0.15)`,
                    border: `2px solid rgba(${league.colorRgb},0.35)`,
                  }}
                >
                  {league.emblem}
                </div>
                <div>
                  <div
                    className="text-[9px] font-black uppercase tracking-widest mb-0.5"
                    style={{ color: `rgba(${league.colorRgb},0.65)` }}
                  >
                    الاشتراك في
                  </div>
                  <div className="text-2xl font-black text-white">{league.name}</div>
                  <div
                    className="text-[10px] font-bold mt-0.5"
                    style={{ color: `rgba(${league.colorRgb},0.7)` }}
                  >
                    {league.diffLabel} · {league.eloLabel}
                  </div>
                </div>
              </div>

              {/* Perks */}
              <div className="mb-5">
                <div
                  className="text-[10px] font-black uppercase tracking-widest mb-2.5"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  ماذا يشمل هذا الدوري؟
                </div>
                <div className="space-y-2">
                  {league.perks.map((perk, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle
                        className="w-4 h-4 shrink-0 mt-0.5"
                        style={{ color: league.color }}
                      />
                      <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>
                        {perk}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Entry cost */}
              <div
                className="rounded-2xl p-4 mb-5 flex items-center justify-between"
                style={{
                  background: `rgba(${league.colorRgb},0.08)`,
                  border: `1px solid rgba(${league.colorRgb},0.22)`,
                }}
              >
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest mb-0.5"
                    style={{ color: "rgba(255,255,255,0.3)" }}>
                    تكلفة الدخول
                  </div>
                  <div className="text-2xl font-black" style={{ color: league.color }}>
                    {league.entryLabel}
                    {league.free && <span className="text-sm font-bold text-green-400 mr-2">مجاني تماماً</span>}
                  </div>
                </div>
                <div
                  className="px-3 py-1.5 rounded-xl text-[11px] font-black"
                  style={{
                    background: `rgba(${league.colorRgb},0.15)`,
                    border: `1px solid rgba(${league.colorRgb},0.3)`,
                    color: league.color,
                  }}
                >
                  {league.eloLabel}
                </div>
              </div>

              {/* After join note */}
              <div
                className="rounded-xl p-3 mb-5 flex items-start gap-2"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span className="text-base shrink-0">📋</span>
                <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <span className="font-black text-white/70">بعد الاشتراك: </span>
                  {league.afterJoin}
                </p>
              </div>

              {/* CTA */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setStep("confirm")}
                className="w-full py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2"
                style={{
                  background: `linear-gradient(135deg, rgba(${league.colorRgb},0.9), rgba(${league.colorRgb},0.6))`,
                  border: `1.5px solid rgba(${league.colorRgb},0.6)`,
                  boxShadow: `0 0 30px rgba(${league.colorRgb},0.3)`,
                }}
              >
                المتابعة إلى التأكيد
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}

          {/* ── Step: CONFIRM ── */}
          {step === "confirm" && (
            <div>
              <div className="text-center mb-6 mt-2">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-5xl mb-4"
                >
                  {league.emblem}
                </motion.div>
                <div className="text-xl font-black text-white mb-2">
                  هل تريد إكمال الاشتراك؟
                </div>
                <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                  ستنضم إلى{" "}
                  <span style={{ color: league.color }} className="font-black">
                    {league.name}
                  </span>{" "}
                  {league.free ? "مجاناً" : `بتكلفة ${league.entryLabel}`}
                </p>
              </div>

              {/* Cost reminder */}
              {!league.free && (
                <div
                  className="rounded-2xl p-3 mb-5 flex items-center justify-center gap-2"
                  style={{
                    background: `rgba(${league.colorRgb},0.1)`,
                    border: `1px solid rgba(${league.colorRgb},0.25)`,
                  }}
                >
                  <span className="text-2xl">{league.entryCost > 0 ? "💎" : "✅"}</span>
                  <span className="text-base font-black" style={{ color: league.color }}>
                    {league.entryLabel}
                  </span>
                  <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                    ستُخصم من رصيدك
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  className="flex-1 py-4 rounded-2xl font-black text-sm"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  ✗ إلغاء
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { onConfirm(); setStep("done"); }}
                  className="flex-[2] py-4 rounded-2xl font-black text-base text-white relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, rgba(${league.colorRgb},0.9), rgba(${league.colorRgb},0.6))`,
                    border: `1.5px solid rgba(${league.colorRgb},0.6)`,
                    boxShadow: `0 0 30px rgba(${league.colorRgb},0.35)`,
                  }}
                >
                  ✓ نعم، أشترك
                </motion.button>
              </div>
            </div>
          )}

          {/* ── Step: DONE ── */}
          {step === "done" && (
            <div className="text-center py-4">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="text-6xl mb-4"
              >
                {league.emblem}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="text-2xl font-black text-white mb-2">تم الاشتراك! 🎉</div>
                <p className="text-[13px] mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
                  أنت الآن مسجّل في{" "}
                  <span style={{ color: league.color }} className="font-black">
                    {league.name}
                  </span>
                  . اضغط PLAY للبدء.
                </p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  className="w-full py-4 rounded-2xl font-black text-base text-white"
                  style={{
                    background: `linear-gradient(135deg, rgba(${league.colorRgb},0.9), rgba(${league.colorRgb},0.6))`,
                    border: `1.5px solid rgba(${league.colorRgb},0.6)`,
                    boxShadow: `0 0 30px rgba(${league.colorRgb},0.3)`,
                  }}
                >
                  ← العودة للاعب
                </motion.button>
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── LeagueCard ─────────────────────────────────────────────────────────────────
function LeagueCard({
  league,
  index,
  subscribed,
  onSubscribe,
}: {
  league: League;
  index: number;
  subscribed: boolean;
  onSubscribe: () => void;
}) {
  const [, go] = useLocation();
  const isOpen = league.free || subscribed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full rounded-3xl overflow-hidden"
      style={{
        background: isOpen
          ? `linear-gradient(140deg,
              rgba(${league.colorRgb},0.2) 0%,
              rgba(${league.colorRgb},0.07) 40%,
              rgba(0,0,0,0.7) 100%)`
          : `linear-gradient(140deg,
              rgba(${league.colorRgb},0.08) 0%,
              rgba(0,0,0,0.8) 100%)`,
        border: isOpen
          ? `1.5px solid rgba(${league.colorRgb},0.35)`
          : `1px solid rgba(${league.colorRgb},0.15)`,
        boxShadow: isOpen
          ? `0 0 28px rgba(${league.colorRgb},0.15), 0 8px 32px rgba(0,0,0,0.55)`
          : `0 4px 20px rgba(0,0,0,0.5)`,
      }}
    >
      {/* Top color bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{
          background: isOpen
            ? `linear-gradient(90deg, transparent, ${league.color}, rgba(${league.colorRgb},0.4))`
            : `linear-gradient(90deg, transparent, rgba(${league.colorRgb},0.25), transparent)`,
        }}
      />

      {/* Pulsing glow for free (Division III) */}
      {league.free && (
        <motion.div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 20% 0%, rgba(${league.colorRgb},0.08) 0%, transparent 65%)`,
          }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <div className="p-5 pt-6">
        {/* Header row */}
        <div className="flex items-start gap-4 mb-3">
          {/* Emblem */}
          <motion.div
            className="shrink-0 w-[62px] h-[62px] rounded-2xl flex items-center justify-center text-[2.2rem]"
            style={{
              background: isOpen ? `rgba(${league.colorRgb},0.15)` : "rgba(255,255,255,0.03)",
              border: isOpen
                ? `2px solid rgba(${league.colorRgb},0.3)`
                : "1px solid rgba(255,255,255,0.08)",
              opacity: isOpen ? 1 : 0.55,
            }}
            animate={league.free ? {
              boxShadow: [
                `0 0 0px rgba(${league.colorRgb},0)`,
                `0 0 22px rgba(${league.colorRgb},0.55)`,
                `0 0 0px rgba(${league.colorRgb},0)`,
              ],
            } : {}}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            {league.emblem}
          </motion.div>

          {/* Title block */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2 mb-0.5">
              <div
                className="text-[9px] font-black uppercase tracking-[0.22em]"
                style={{ color: isOpen ? `rgba(${league.colorRgb},0.7)` : "rgba(255,255,255,0.2)" }}
              >
                {league.shortLabel}
              </div>
              {league.free && (
                <span
                  className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(74,222,128,0.12)",
                    border: "1px solid rgba(74,222,128,0.3)",
                    color: "#4ade80",
                  }}
                >
                  ENTRY FREE
                </span>
              )}
              {subscribed && !league.free && (
                <span
                  className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{
                    background: `rgba(${league.colorRgb},0.12)`,
                    border: `1px solid rgba(${league.colorRgb},0.3)`,
                    color: league.color,
                  }}
                >
                  ✓ مشترك
                </span>
              )}
            </div>

            <div
              className="text-xl font-black leading-tight mb-1.5"
              style={{ color: isOpen ? "#fff" : "rgba(255,255,255,0.4)" }}
            >
              {league.name}
            </div>

            <div className="flex items-center gap-2">
              <div
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold"
                style={{
                  background: isOpen ? `rgba(${league.colorRgb},0.1)` : "rgba(255,255,255,0.04)",
                  border: isOpen
                    ? `1px solid rgba(${league.colorRgb},0.25)`
                    : "1px solid rgba(255,255,255,0.06)",
                  color: isOpen ? league.color : "rgba(255,255,255,0.2)",
                }}
              >
                ⚡ {league.eloLabel}
              </div>
              <div
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                {league.diffLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <p
          className="text-[12px] leading-relaxed mb-4"
          style={{ color: isOpen ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.22)" }}
        >
          {league.desc}
        </p>

        {/* Entry cost badge (for locked) */}
        {!isOpen && (
          <div
            className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl"
            style={{
              background: `rgba(${league.colorRgb},0.07)`,
              border: `1px solid rgba(${league.colorRgb},0.18)`,
            }}
          >
            <span className="text-base">💎</span>
            <span className="text-[12px] font-black" style={{ color: league.color }}>
              {league.entryLabel}
            </span>
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              تكلفة الاشتراك
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          {isOpen ? (
            /* PLAY button — open league */
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => go("/match-arena")}
              className="relative flex-1 overflow-hidden py-4 rounded-2xl flex items-center justify-center gap-2"
              style={{
                background: `linear-gradient(135deg, rgba(${league.colorRgb},0.9) 0%, rgba(${league.colorRgb},0.6) 100%)`,
                border: `1.5px solid rgba(${league.colorRgb},0.65)`,
                boxShadow: `0 0 30px rgba(${league.colorRgb},0.4), 0 4px 16px rgba(0,0,0,0.4)`,
              }}
            >
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.18) 50%, transparent 75%)",
                }}
                animate={{ x: ["-120%", "220%"] }}
                transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 3.5, ease: "easeInOut" }}
              />
              <span className="relative text-[14px] font-black uppercase tracking-[0.18em] text-white select-none">
                ▶ PLAY
              </span>
            </motion.button>
          ) : (
            /* SUBSCRIBE button — locked league */
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onSubscribe}
              className="relative flex-1 overflow-hidden py-4 rounded-2xl flex items-center justify-center gap-2"
              style={{
                background: `linear-gradient(135deg, rgba(${league.colorRgb},0.2) 0%, rgba(${league.colorRgb},0.08) 100%)`,
                border: `1.5px solid rgba(${league.colorRgb},0.4)`,
              }}
            >
              <span className="relative text-[13px] font-black text-white/80 select-none">
                🔓 اشترك — {league.entryLabel}
              </span>
            </motion.button>
          )}

          {/* DETAILS mini button */}
          <Link href={`/league/${league.id}`}>
            <motion.div
              whileTap={{ scale: 0.96 }}
              className="py-4 px-4 rounded-2xl flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              <span className="text-[11px] font-black uppercase tracking-wider select-none"
                style={{ color: "rgba(255,255,255,0.4)" }}>
                ⋯
              </span>
            </motion.div>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function LeagueSelectPage() {
  const [subscribed, setSubscribed] = useState<Set<string>>(new Set());
  const [modalLeague, setModalLeague] = useState<League | null>(null);

  useEffect(() => { setSubscribed(loadSubscribed()); }, []);

  const handleConfirmSubscribe = (id: string) => {
    setSubscribed(prev => {
      const next = new Set(prev);
      next.add(id);
      saveSubscribed(next);
      return next;
    });
  };

  return (
    <div
      className="min-h-screen w-full overflow-y-auto pb-28"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #0f002e 0%, #07010f 55%, #000 100%)" }}
    >
      {/* Particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: p.color }}
            animate={{ y: [0, -28, 0], opacity: [0.1, 0.45, 0.1] }}
            transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Header */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-5 pt-5 pb-4"
        style={{ background: "rgba(7,1,15,0.88)", backdropFilter: "blur(20px)" }}
      >
        <Link href="/">
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </motion.button>
        </Link>
        <div>
          <h1
            className="text-xl font-black tracking-tight"
            style={{
              background: "linear-gradient(135deg, #e9d5ff, #a78bfa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            اختر الدوري
          </h1>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
            Select League · SkillLeague
          </p>
        </div>
      </div>

      {/* Subtitle */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="px-5 mb-5 relative z-10"
      >
        <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.32)" }}>
          <span style={{ color: "#4ade80" }} className="font-black">Division III</span> مفتوح مجاناً للجميع.
          باقي الدوريات تتطلب اشتراكاً بـ <span style={{ color: "#a78bfa" }} className="font-black">💎 جواهر</span>.
        </p>
      </motion.div>

      {/* League cards */}
      <div className="px-4 space-y-4 relative z-10">
        {LEAGUES.map((league, i) => (
          <LeagueCard
            key={league.id}
            league={league}
            index={i}
            subscribed={subscribed.has(league.id)}
            onSubscribe={() => setModalLeague(league)}
          />
        ))}
      </div>

      {/* Subscribe Modal */}
      <AnimatePresence>
        {modalLeague && (
          <SubscribeModal
            league={modalLeague}
            onClose={() => setModalLeague(null)}
            onConfirm={() => handleConfirmSubscribe(modalLeague.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
