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
import { ArrowLeft, X, ChevronRight, CheckCircle, Info } from "lucide-react";

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
//
//  Fixed 3-row layout (eSports style):
//    Row 1 — [ Emblem ]  League Name  +  Status badge (right)
//    Row 2 — LP requirement · difficulty
//    Row 3 — [ PLAY / SUBSCRIBE ]  ·  [ ℹ️ ]
//
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
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 + index * 0.09, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        background: isOpen
          ? `linear-gradient(145deg, rgba(${league.colorRgb},0.13) 0%, rgba(6,2,18,0.95) 60%)`
          : "rgba(255,255,255,0.03)",
        border: isOpen
          ? `1.5px solid rgba(${league.colorRgb},0.35)`
          : "1px solid rgba(255,255,255,0.07)",
        boxShadow: isOpen
          ? `0 0 24px rgba(${league.colorRgb},0.12), 0 6px 24px rgba(0,0,0,0.55)`
          : "0 2px 16px rgba(0,0,0,0.45)",
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: isOpen
            ? `linear-gradient(90deg, transparent 0%, ${league.color} 40%, rgba(${league.colorRgb},0.4) 100%)`
            : `linear-gradient(90deg, transparent 0%, rgba(${league.colorRgb},0.2) 100%)`,
        }}
      />

      <div className="px-5 pt-5 pb-4 flex flex-col gap-3">

        {/* ── ROW 1: Emblem · Name · Badge ── */}
        <div className="flex items-center gap-3">
          {/* Emblem bubble */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 select-none"
            style={{
              background: `rgba(${league.colorRgb},0.12)`,
              border: `1.5px solid rgba(${league.colorRgb},${isOpen ? "0.35" : "0.15"})`,
              opacity: isOpen ? 1 : 0.45,
            }}
          >
            {league.emblem}
          </div>

          {/* Name block */}
          <div className="flex-1 min-w-0">
            <div
              className="text-[17px] font-black leading-tight tracking-tight truncate"
              style={{ color: isOpen ? "#ffffff" : "rgba(255,255,255,0.28)" }}
            >
              {league.name}
            </div>
            <div
              className="text-[10px] font-bold uppercase tracking-wider mt-0.5"
              style={{ color: isOpen ? `rgba(${league.colorRgb},0.7)` : "rgba(255,255,255,0.18)" }}
            >
              {league.diffLabel}
            </div>
          </div>

          {/* Status badge */}
          {league.free ? (
            <div
              className="shrink-0 px-2.5 py-1 rounded-lg"
              style={{
                background: "rgba(74,222,128,0.1)",
                border: "1px solid rgba(74,222,128,0.3)",
              }}
            >
              <span className="text-[9px] font-black uppercase tracking-widest text-green-400">
                FREE ENTRY
              </span>
            </div>
          ) : subscribed ? (
            <div
              className="shrink-0 px-2.5 py-1 rounded-lg"
              style={{
                background: `rgba(${league.colorRgb},0.12)`,
                border: `1px solid rgba(${league.colorRgb},0.3)`,
              }}
            >
              <span
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: league.color }}
              >
                ✓ JOINED
              </span>
            </div>
          ) : (
            <div
              className="shrink-0 px-2.5 py-1 rounded-lg"
              style={{
                background: `rgba(${league.colorRgb},0.07)`,
                border: `1px solid rgba(${league.colorRgb},0.18)`,
              }}
            >
              <span
                className="text-[9px] font-black"
                style={{ color: `rgba(${league.colorRgb},0.7)` }}
              >
                {league.entryLabel}
              </span>
            </div>
          )}
        </div>

        {/* ── Divider ── */}
        <div
          className="h-px w-full"
          style={{ background: `rgba(${league.colorRgb},${isOpen ? "0.12" : "0.05"})` }}
        />

        {/* ── ROW 2: Requirement text ── */}
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-black uppercase tracking-wider"
            style={{ color: isOpen ? `rgba(${league.colorRgb},0.9)` : "rgba(255,255,255,0.2)" }}
          >
            {league.eloLabel}
          </span>
          {!league.free && (
            <>
              <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 10 }}>·</span>
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.28)" }}>
                {league.entryCost > 0 ? `${league.entryLabel} للدخول` : ""}
              </span>
            </>
          )}
          {league.free && (
            <span className="text-[11px]" style={{ color: "rgba(74,222,128,0.6)" }}>
              · مفتوح للجميع
            </span>
          )}
        </div>

        {/* ── ROW 3: Action buttons ── */}
        <div className="flex items-center gap-2">

          {/* Primary CTA — PLAY or SUBSCRIBE */}
          {isOpen ? (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => go("/match-arena")}
              className="relative flex-1 h-9 overflow-hidden rounded-xl flex items-center justify-center gap-1.5"
              style={{
                background: `linear-gradient(130deg, rgba(${league.colorRgb},0.92) 0%, rgba(${league.colorRgb},0.6) 100%)`,
                border: `1.5px solid rgba(${league.colorRgb},0.65)`,
                boxShadow: `0 0 18px rgba(${league.colorRgb},0.3)`,
              }}
            >
              {/* Shimmer */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.16) 50%, transparent 75%)",
                }}
                animate={{ x: ["-140%", "240%"] }}
                transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 5, ease: "easeInOut" }}
              />
              <span className="relative text-[11px] font-black uppercase tracking-[0.22em] text-white select-none">
                ▶ PLAY
              </span>
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onSubscribe}
              className="flex-1 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: `rgba(${league.colorRgb},0.07)`,
                border: `1.5px solid rgba(${league.colorRgb},0.38)`,
              }}
            >
              <span
                className="text-[11px] font-black uppercase tracking-[0.18em] select-none"
                style={{ color: league.color }}
              >
                SUBSCRIBE
              </span>
            </motion.button>
          )}

          {/* ℹ️ Info button — fixed size, always opens modal */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onSubscribe}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: `rgba(${league.colorRgb},0.07)`,
              border: `1px solid rgba(${league.colorRgb},0.2)`,
            }}
            title="تفاصيل الدوري"
          >
            <Info
              className="w-[14px] h-[14px]"
              style={{ color: `rgba(${league.colorRgb},0.65)` }}
            />
          </motion.button>
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
