/**
 * LeagueSelectPage.tsx
 * ─────────────────────
 * League selection with real backend data:
 *  • Real gem balance shown in header
 *  • Real participant counts per league
 *  • Real join via POST /league-system/leagues/:id/join
 *  • One-league-per-season enforced by backend
 */
import { useState, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, X, ChevronRight, CheckCircle, Info, Loader2, Zap, Bell } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leagueApi, type LeagueId, type Season } from "@/lib/league-api";
import { getStoredPlayerId } from "@/lib/apiClient";
import { useGame } from "@/contexts/GameContext";
import division3Shield from "@/assets/leagues/division-3-shield.png";
import division2Shield from "@/assets/leagues/division-2-shield.png";
import professionalShield from "@/assets/leagues/professional-shield.png";
import championsShield from "@/assets/leagues/champions-shield.png";

// ── Backend ID mapping ─────────────────────────────────────────────────────────
const BACKEND_ID: Record<string, LeagueId> = {
  "division-iii": "coins",
  "division-ii":  "pro",
  "professional": "elite",
  "champions":    "champion",
};

// ── Static league display data ──────────────────────────────────────────────────
const LEAGUES = [
  {
    id: "division-iii",
    name: "Division III",
    displayTitle: "DIVISION 3",
    shortLabel: "DIV III",
    shield: division3Shield,
    color: "#2dd4bf",
    colorRgb: "45,212,191",
    badgeLabel: "مفتوح للجميع",
    buttonLabel: "PLAY",
    diamondCost: 0,
    cardFrom: "rgba(45,212,191,0.22)",
    cardTo: "rgba(6,20,22,0.97)",
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
    displayTitle: "DIVISION 2",
    shortLabel: "DIV II",
    shield: division2Shield,
    color: "#5b8def",
    colorRgb: "91,141,239",
    badgeLabel: "LP 100+",
    buttonLabel: "SUBSCRIBE",
    diamondCost: 0,
    cardFrom: "rgba(30,58,138,0.35)",
    cardTo: "rgba(6,10,26,0.97)",
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
      "تأهل للترقية إلى Pro League",
    ],
    afterJoin: "سيتم تسجيلك في الموسم الحالي لـ Division II وتبدأ مبارياتك.",
  },
  {
    id: "professional",
    name: "Professional League",
    displayTitle: "PROFESSIONAL LEAGUE",
    shortLabel: "PRO",
    shield: professionalShield,
    color: "#a855f7",
    colorRgb: "168,85,247",
    badgeLabel: "LP 300+",
    buttonLabel: "SUBSCRIBE",
    diamondCost: 2,
    cardFrom: "rgba(107,33,168,0.4)",
    cardTo: "rgba(15,4,26,0.97)",
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
    displayTitle: "CHAMPIONS LEAGUE",
    shortLabel: "CHAMPION",
    shield: championsShield,
    color: "#f0a020",
    colorRgb: "240,160,32",
    badgeLabel: "LP 500+",
    buttonLabel: "SUBSCRIBE",
    diamondCost: 4,
    cardFrom: "rgba(146,64,14,0.4)",
    cardTo: "rgba(26,12,4,0.97)",
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
  gems,
  participantCount,
  onClose,
  onConfirm,
}: {
  league: League;
  gems: number;
  participantCount: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [step, setStep]     = useState<"info" | "confirm" | "done" | "error">("info");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const canAfford = gems >= league.entryCost;

  const handleConfirm = async () => {
    setJoining(true);
    try {
      await onConfirm();
      setStep("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ، حاول مجدداً.";
      setErrMsg(msg);
      setStep("error");
    } finally {
      setJoining(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)" }}
        onClick={step !== "done" ? onClose : undefined}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      />

      <motion.div
        className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-3xl overflow-hidden"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        style={{
          background: `linear-gradient(160deg, rgba(${league.colorRgb},0.16) 0%, rgba(10,5,25,0.97) 45%)`,
          border: `1.5px solid rgba(${league.colorRgb},0.35)`,
          boxShadow: `0 0 60px rgba(${league.colorRgb},0.25), 0 20px 60px rgba(0,0,0,0.8)`,
        }}
      >
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, transparent, ${league.color}, transparent)` }} />

        <div className="p-6">
          {step !== "done" && (
            <button
              onClick={onClose}
              className="absolute top-4 left-4 w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <X className="w-4 h-4 text-white/50" />
            </button>
          )}

          {/* ── INFO step ── */}
          {step === "info" && (
            <div>
              <div className="flex items-center gap-4 mb-5 mt-2">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ background: `rgba(${league.colorRgb},0.15)`, border: `2px solid rgba(${league.colorRgb},0.35)` }}
                >
                  <img src={league.shield} alt={league.displayTitle} className="w-full h-full object-cover" draggable={false} />
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: `rgba(${league.colorRgb},0.65)` }}>
                    الاشتراك في
                  </div>
                  <div className="text-2xl font-black text-white">{league.name}</div>
                  <div className="text-[10px] font-bold mt-0.5" style={{ color: `rgba(${league.colorRgb},0.7)` }}>
                    {league.diffLabel} · {league.eloLabel}
                    {participantCount > 0 && ` · ${participantCount} لاعب`}
                  </div>
                </div>
              </div>

              <div className="mb-5">
                <div className="text-[10px] font-black uppercase tracking-widest mb-2.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                  ماذا يشمل هذا الدوري؟
                </div>
                <div className="space-y-2">
                  {league.perks.map((perk, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: league.color }} />
                      <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="rounded-2xl p-4 mb-5 flex items-center justify-between"
                style={{ background: `rgba(${league.colorRgb},0.08)`, border: `1px solid rgba(${league.colorRgb},0.22)` }}
              >
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                    تكلفة الدخول
                  </div>
                  <div className="text-2xl font-black" style={{ color: league.color }}>
                    {league.entryLabel}
                    {league.free && <span className="text-sm font-bold text-green-400 mr-2">مجاني تماماً</span>}
                  </div>
                </div>
                {!league.free && (
                  <div className="text-right">
                    <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>رصيدك الحالي</div>
                    <div className="text-lg font-black" style={{ color: gems >= league.entryCost ? "#4ade80" : "#f87171" }}>
                      {gems} 💎
                    </div>
                  </div>
                )}
              </div>

              {!league.free && !canAfford && (
                <div
                  className="rounded-xl p-3 mb-4 flex items-start gap-2"
                  style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}
                >
                  <span className="text-base shrink-0">⚠️</span>
                  <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                    رصيدك الحالي {gems} 💎 غير كافٍ. تحتاج إلى {league.entryCost} 💎.
                    العب مباريات للحصول على جواهر في نهاية الموسم.
                  </p>
                </div>
              )}

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

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setStep("confirm")}
                disabled={!league.free && !canAfford}
                className="w-full py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 disabled:opacity-40"
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

          {/* ── CONFIRM step ── */}
          {step === "confirm" && (
            <div>
              <div className="text-center mb-6 mt-2">
                <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-4 flex justify-center">
                  <img src={league.shield} alt={league.displayTitle} className="w-20 h-20 rounded-2xl object-cover" draggable={false} />
                </motion.div>
                <div className="text-xl font-black text-white mb-2">هل تريد إكمال الاشتراك؟</div>
                <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                  ستنضم إلى{" "}
                  <span style={{ color: league.color }} className="font-black">{league.name}</span>{" "}
                  {league.free ? "مجاناً" : `بتكلفة ${league.entryLabel}`}
                </p>
              </div>

              {!league.free && (
                <div
                  className="rounded-2xl p-3 mb-5 flex items-center justify-center gap-2"
                  style={{ background: `rgba(${league.colorRgb},0.1)`, border: `1px solid rgba(${league.colorRgb},0.25)` }}
                >
                  <span className="text-2xl">💎</span>
                  <span className="text-base font-black" style={{ color: league.color }}>{league.entryLabel}</span>
                  <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>ستُخصم من رصيدك</span>
                </div>
              )}

              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  className="flex-1 py-4 rounded-2xl font-black text-sm"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
                >
                  ✗ إلغاء
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleConfirm}
                  disabled={joining}
                  className="flex-[2] py-4 rounded-2xl font-black text-base text-white relative overflow-hidden flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{
                    background: `linear-gradient(135deg, rgba(${league.colorRgb},0.9), rgba(${league.colorRgb},0.6))`,
                    border: `1.5px solid rgba(${league.colorRgb},0.6)`,
                    boxShadow: `0 0 30px rgba(${league.colorRgb},0.35)`,
                  }}
                >
                  {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : "✓ نعم، أشترك"}
                </motion.button>
              </div>
            </div>
          )}

          {/* ── DONE step ── */}
          {step === "done" && (
            <div className="text-center py-4">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="mb-4 flex justify-center"
              >
                <img src={league.shield} alt={league.displayTitle} className="w-24 h-24 rounded-2xl object-cover" draggable={false} />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="text-2xl font-black text-white mb-2">تم الاشتراك! 🎉</div>
                <p className="text-[13px] mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
                  أنت الآن مسجّل في{" "}
                  <span style={{ color: league.color }} className="font-black">{league.name}</span>. اضغط PLAY للبدء.
                </p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  className="w-full py-4 rounded-2xl font-black text-base text-white"
                  style={{
                    background: `linear-gradient(135deg, rgba(${league.colorRgb},0.9), rgba(${league.colorRgb},0.6))`,
                    border: `1.5px solid rgba(${league.colorRgb},0.6)`,
                  }}
                >
                  ← العودة للاعب
                </motion.button>
              </motion.div>
            </div>
          )}

          {/* ── ERROR step ── */}
          {step === "error" && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">⚠️</div>
              <div className="text-xl font-black text-white mb-2">تعذّر الاشتراك</div>
              <p className="text-[13px] mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
                {errMsg ?? "حدث خطأ أثناء الانضمام. حاول مجدداً."}
              </p>
              <div className="flex gap-3">
                <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
                  className="flex-1 py-3 rounded-2xl font-black text-sm"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                  إغلاق
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setStep("confirm"); setErrMsg(null); }}
                  className="flex-[2] py-3 rounded-2xl font-black text-sm text-white"
                  style={{ background: "rgba(167,139,250,0.2)", border: "1px solid rgba(167,139,250,0.4)" }}>
                  إعادة المحاولة
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── League Card ────────────────────────────────────────────────────────────────

function LeagueCard({
  league,
  index,
  isJoined,
  playerCount,
  onSubscribe,
}: {
  league: League;
  index: number;
  isJoined: boolean;
  playerCount: number | null;
  onSubscribe: () => void;
}) {
  const [, go] = useLocation();
  const isOpen = league.free || isJoined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 + index * 0.09, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(120deg, ${league.cardFrom} 0%, ${league.cardTo} 65%)`,
        border: `1.5px solid rgba(${league.colorRgb},${isOpen ? "0.55" : "0.35"})`,
        boxShadow: isOpen
          ? `0 0 0 1px rgba(${league.colorRgb},0.25), 0 0 26px rgba(${league.colorRgb},0.35), 0 8px 24px rgba(0,0,0,0.6)`
          : `0 0 18px rgba(${league.colorRgb},0.18), 0 8px 24px rgba(0,0,0,0.6)`,
      }}
    >
      {/* Diagonal chevron pattern (right side) */}
      <div
        className="absolute inset-y-0 right-0 w-2/5 pointer-events-none opacity-25"
        style={{
          backgroundImage: `repeating-linear-gradient(115deg, rgba(${league.colorRgb},0.35) 0px, rgba(${league.colorRgb},0.35) 10px, transparent 10px, transparent 34px)`,
          maskImage: "linear-gradient(to left, black, transparent)",
          WebkitMaskImage: "linear-gradient(to left, black, transparent)",
        }}
      />

      {/* Info button — top right */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={onSubscribe}
        className="absolute top-1/2 -translate-y-1/2 right-4 w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10"
        style={{ background: "rgba(0,0,0,0.28)", border: `1px solid rgba(${league.colorRgb},0.4)` }}
        title="League details"
      >
        <Info className="w-[14px] h-[14px]" style={{ color: `rgba(${league.colorRgb},0.9)` }} />
      </motion.button>

      <div className="relative flex items-center gap-3.5 pl-16 pr-4 py-4">
        {/* Shield emblem */}
        <img
          src={league.shield}
          alt={league.displayTitle}
          className="w-[76px] h-[76px] rounded-xl object-cover shrink-0 select-none"
          draggable={false}
          style={{ boxShadow: `0 0 16px rgba(${league.colorRgb},0.4)` }}
        />

        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="text-[19px] font-black leading-tight tracking-tight text-white truncate">
            {league.displayTitle}
          </div>

          {/* Requirement / status label */}
          <div className="flex items-center gap-1 mt-1">
            <Zap className="w-3 h-3 shrink-0" style={{ color: league.color }} />
            <span className="text-[12px] font-bold" style={{ color: league.color }}>
              {league.badgeLabel}
            </span>
            {playerCount !== null && playerCount > 0 && (
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}> · {playerCount} لاعب</span>
            )}
          </div>

          {/* Action row */}
          <div className="flex items-center gap-2 mt-2.5">
            {isOpen ? (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => go("/match-arena")}
                className="relative overflow-hidden rounded-lg px-6 py-1.5 flex items-center justify-center"
                style={{
                  background: `linear-gradient(130deg, rgba(${league.colorRgb},0.95) 0%, rgba(${league.colorRgb},0.65) 100%)`,
                  border: `1.5px solid rgba(${league.colorRgb},0.7)`,
                  boxShadow: `0 0 14px rgba(${league.colorRgb},0.4)`,
                }}
              >
                <span className="relative text-[12px] font-black uppercase tracking-wider text-white select-none">
                  {league.buttonLabel}
                </span>
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={onSubscribe}
                className="rounded-lg px-5 py-1.5 flex items-center justify-center"
                style={{
                  background: `linear-gradient(130deg, rgba(${league.colorRgb},0.9) 0%, rgba(${league.colorRgb},0.55) 100%)`,
                  border: `1.5px solid rgba(${league.colorRgb},0.65)`,
                  boxShadow: `0 0 14px rgba(${league.colorRgb},0.3)`,
                }}
              >
                <span className="text-[12px] font-black uppercase tracking-wider text-white select-none">
                  {league.buttonLabel}
                </span>
              </motion.button>
            )}

            {league.diamondCost > 0 && !isJoined && (
              <div
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg shrink-0"
                style={{ background: "rgba(0,0,0,0.3)", border: `1px solid rgba(${league.colorRgb},0.35)` }}
              >
                <span className="text-xs">💎</span>
                <span className="text-[12px] font-black" style={{ color: league.color }}>{league.diamondCost}</span>
              </div>
            )}

            {isJoined && (
              <div className="px-2.5 py-1 rounded-lg" style={{ background: `rgba(${league.colorRgb},0.15)`, border: `1px solid rgba(${league.colorRgb},0.35)` }}>
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: league.color }}>✓ JOINED</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function LeagueSelectPage() {
  const { username } = useGame();
  const playerId     = getStoredPlayerId();
  const qc           = useQueryClient();

  const [modalLeague, setModalLeague] = useState<League | null>(null);

  // ── Gem balance ──────────────────────────────────────────────────────────────
  const { data: gemData } = useQuery({
    queryKey: ["gems", playerId],
    queryFn:  () => leagueApi.getPlayerGems(playerId!),
    enabled:  !!playerId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const gems = gemData?.gems ?? 0;

  // ── Active league (one-per-season) ───────────────────────────────────────────
  const { data: activeLeague, refetch: refetchActive } = useQuery({
    queryKey: ["activeLeague", playerId],
    queryFn:  () => leagueApi.getPlayerActiveLeague(playerId!),
    enabled:  !!playerId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // ── Season data per league (for player counts) ───────────────────────────────
  const leagueIds = LEAGUES.map(l => BACKEND_ID[l.id] as LeagueId);
  const seasonQueries = leagueIds.map(lid => ({
    queryKey: ["season", lid],
    queryFn:  () => leagueApi.getSeason(lid).catch(() => null as Season | null),
    staleTime: 60_000,
    refetchInterval: 120_000,
  }));

  const seasons = [
    useQuery(seasonQueries[0]),
    useQuery(seasonQueries[1]),
    useQuery(seasonQueries[2]),
    useQuery(seasonQueries[3]),
  ];

  // ── Join mutation ────────────────────────────────────────────────────────────
  const joinLeague = useCallback(async (leagueId: string) => {
    const backendId = BACKEND_ID[leagueId] as LeagueId;
    if (!playerId) throw new Error("لم يتم التحقق من هويتك. أعد تشغيل التطبيق.");
    await leagueApi.joinLeague(backendId, playerId, username || "Player");
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["activeLeague", playerId] }),
      qc.invalidateQueries({ queryKey: ["gems", playerId] }),
      qc.invalidateQueries({ queryKey: ["season", backendId] }),
    ]);
  }, [playerId, username, qc]);

  const isJoined = (leagueId: string) => {
    if (!activeLeague) return false;
    const backendId = BACKEND_ID[leagueId];
    return activeLeague.leagueId === backendId;
  };

  const getPlayerCount = (index: number): number | null => {
    const s = seasons[index]?.data;
    if (!s) return null;
    return s.participantCount ?? null;
  };

  return (
    <div
      className="min-h-screen w-full overflow-y-auto pb-28"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #0f002e 0%, #07010f 55%, #000 100%)" }}
    >
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
        <div className="flex-1">
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

        {/* Bell icon */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <Bell className="w-4 h-4 text-white/70" />
        </div>
      </div>

      {/* Info pill banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="px-4 mb-4 relative z-10"
      >
        <div
          className="rounded-2xl px-4 py-2.5 text-center"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.55)" }}>
            <span style={{ color: "#2dd4bf" }} className="font-black">Division 3</span> مفتوح مجاناً للجميع، باقي
            الدوريات تتطلب اشتراكاً بـ{" "}
            <span style={{ color: "#a78bfa" }} className="font-black">💎 جواهر</span>
            <span style={{ color: "rgba(255,255,255,0.35)" }}> · رصيدك </span>
            <span style={{ color: gems > 0 ? "#a78bfa" : "#f87171" }} className="font-black">{gems} 💎</span>
            {activeLeague && (
              <span style={{ color: "#fbbf24" }} className="font-black">
                {" "}· أنت مسجّل حالياً في الدوري هذا الموسم.
              </span>
            )}
          </p>
        </div>
      </motion.div>

      {/* League cards */}
      <div className="px-4 space-y-4 relative z-10">
        {LEAGUES.map((league, i) => (
          <LeagueCard
            key={league.id}
            league={league}
            index={i}
            isJoined={isJoined(league.id)}
            playerCount={getPlayerCount(i)}
            onSubscribe={() => setModalLeague(league)}
          />
        ))}
      </div>

      {/* Subscribe Modal */}
      <AnimatePresence>
        {modalLeague && (
          <SubscribeModal
            league={modalLeague}
            gems={gems}
            participantCount={getPlayerCount(LEAGUES.findIndex(l => l.id === modalLeague.id)) ?? 0}
            onClose={() => { setModalLeague(null); refetchActive(); }}
            onConfirm={() => joinLeague(modalLeague.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
