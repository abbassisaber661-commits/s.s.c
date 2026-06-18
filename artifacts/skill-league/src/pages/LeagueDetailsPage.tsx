/**
 * LeagueDetailsPage.tsx
 * ──────────────────────
 * Phase A: Detailed info view for each league.
 * Accessed via /league/:leagueId
 * Placeholder text — real data integration planned for Phase B.
 */
import { useRoute, useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy } from "lucide-react";

// ── League configs ─────────────────────────────────────────────────────────────

const LEAGUE_INFO = {
  "division-iii": {
    name: "Division III",
    shortLabel: "DIV III",
    emblem: "🥉",
    color: "#cd7f32",
    colorRgb: "205,127,50",
    eloRange: "0 – 299 ELO",
    description:
      "Division III هي نقطة البداية لكل لاعب في SkillLeague. هنا ستواجه منافسين حقيقيين وتتعلم أساسيات الأداء تحت الضغط. المنافسة متاحة للجميع بدون قيود.",
    difficulty: "مستوى سهل إلى متوسط. الأسئلة تختبر المعرفة العامة والسرعة في الإجابة. زمن الإجابة كافٍ لكل سؤال.",
    promotion:
      "الوصول إلى 300 نقطة ELO يؤهلك للترقية التلقائية إلى Division II في نهاية الموسم. أفضل 20% من اللاعبين يرتقون.",
    relegation:
      "لا يوجد هبوط من Division III. هذا هو مستوى الانطلاق لجميع اللاعبين الجدد.",
    rewards:
      "الفوز يمنحك نقاط XP وELO. أداء استثنائي يفتح صناديق المكافآت اليومية وعملات SkillLeague.",
  },
  "division-ii": {
    name: "Division II",
    shortLabel: "DIV II",
    emblem: "🥈",
    color: "#94a3b8",
    colorRgb: "148,163,184",
    eloRange: "300 – 599 ELO",
    description:
      "Division II مخصصة للاعبين الذين أثبتوا أنفسهم في المستوى التمهيدي. المنافسة أشد والأسئلة أكثر تعقيداً. هنا يُحدَّد من يستحق الصعود إلى الأعلى.",
    difficulty:
      "مستوى متوسط. تتضمن أسئلة أكثر تخصصاً في الرياضة والثقافة والفلسفة. وقت الإجابة أقصر ويتطلب تركيزاً أعلى.",
    promotion:
      "الوصول إلى 600 نقطة ELO مع الحفاظ على معدل فوز جيد يفتح لك الباب نحو Professional League. الترقية تُحسب في نهاية كل موسم.",
    relegation:
      "الهبوط إلى Division III يحدث إذا انخفض ELO إلى أقل من 300 أو كنت ضمن أسوأ 15% من اللاعبين في الموسم.",
    rewards:
      "مكافآت أعلى من Division III. الفوز يمنح مكافآت عملات مضاعفة وفرصة للحصول على بطاقات مكانة موسمية.",
  },
  "professional": {
    name: "Professional League",
    shortLabel: "PRO",
    emblem: "🥇",
    color: "#ffd700",
    colorRgb: "255,215,0",
    eloRange: "600 – 899 ELO",
    description:
      "Professional League هي حيث يتنافس المحترفون الحقيقيون. المستوى عالٍ والضغط مستمر. كل مباراة تُحسب وكل قرار مهم. فقط الأقوياء يصمدون هنا.",
    difficulty:
      "مستوى صعب. أسئلة معقدة تشمل الخداع البصري وتجميع الأحجيات والمعرفة المتخصصة. الوقت محدود جداً ولا مجال للتردد.",
    promotion:
      "الوصول إلى 900 نقطة ELO مع أداء استثنائي ومتسق خلال الموسم يفتح الطريق نحو Champions League، أعلى مستوى تنافسي في SkillLeague.",
    relegation:
      "الهبوط إلى Division II يحدث إذا انخفض ELO دون 600 أو كنت في أسفل 10% من اللاعبين في نهاية الموسم. كن حذراً.",
    rewards:
      "مكافآت ممتازة تشمل عملات حصرية وشارات احترافية وإمكانية الوصول إلى البطولات الأسبوعية ذات الجوائز الكبيرة.",
  },
  "champions": {
    name: "Champions League",
    shortLabel: "ELITE",
    emblem: "🏆",
    color: "#a78bfa",
    colorRgb: "167,139,250",
    eloRange: "900+ ELO",
    description:
      "Champions League هو قمة SkillLeague. مجموعة مختارة من أفضل اللاعبين في العالم يتنافسون على اللقب الأسمى. كل مباراة تُبث وتُراقَب. هذا هو الاختبار الحقيقي للمهارة.",
    difficulty:
      "مستوى الخبراء. أصعب الأسئلة وأقصر الأوقات وأعقد الأحجيات. الخداع البصري متقدم والشبكات أكبر. لا هامش للخطأ.",
    promotion:
      "لا توجد مرحلة أعلى — Champions League هي الذروة. الهدف هو البقاء في القمة والتنافس على المرتبة الأولى في لادربورد SkillLeague العالمي.",
    relegation:
      "الهبوط إلى Professional League يحدث إذا أدى اللاعب بشكل سيئ خلال الموسم وانخفض ELO دون 900. الاستمرار يتطلب الأداء المستمر.",
    rewards:
      "أعلى مكافآت في اللعبة. جوائز موسمية حصرية، شارات اللقب، وعملات كبيرة. الفائز الأول يحصل على لقب بطل الموسم وميزات حصرية.",
  },
} as const;

type LeagueId = keyof typeof LEAGUE_INFO;

// ── InfoSection ────────────────────────────────────────────────────────────────

function InfoSection({
  icon,
  title,
  body,
  color,
}: {
  icon: string;
  title: string;
  body: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color }}>
          {title}
        </span>
      </div>
      <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
        {body}
      </p>
    </motion.div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function LeagueDetailsPage() {
  const [match, params] = useRoute("/league/:leagueId");
  const [, go] = useLocation();

  const leagueId = (params?.leagueId ?? "") as LeagueId;
  const info = LEAGUE_INFO[leagueId];

  if (!match || !info) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: "#07010f" }}>
        <Trophy className="w-12 h-12 text-white/20" />
        <p className="text-white/40 text-sm">الدوري غير موجود</p>
        <Link href="/league-select">
          <button className="text-purple-400 underline text-sm">رجوع</button>
        </Link>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full overflow-y-auto pb-28"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, rgba(${info.colorRgb},0.08) 0%, #07010f 40%, #000 100%)`,
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-5 pt-5 pb-4"
        style={{ background: "rgba(7,1,15,0.88)", backdropFilter: "blur(20px)" }}
      >
        <Link href="/league-select">
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
            className="text-xl font-black tracking-tight text-white"
          >
            {info.name}
          </h1>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
            {info.shortLabel} · {info.eloRange}
          </p>
        </div>
      </div>

      <div className="px-4 pt-2 space-y-4 relative z-10">
        {/* Hero emblem card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-3xl overflow-hidden p-6 flex flex-col items-center text-center"
          style={{
            background: `linear-gradient(140deg, rgba(${info.colorRgb},0.22) 0%, rgba(${info.colorRgb},0.06) 50%, rgba(0,0,0,0.75) 100%)`,
            border: `1.5px solid rgba(${info.colorRgb},0.35)`,
            boxShadow: `0 0 60px rgba(${info.colorRgb},0.2), 0 8px 40px rgba(0,0,0,0.6)`,
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-[3px]"
            style={{ background: `linear-gradient(90deg, transparent, ${info.color}, transparent)` }}
          />

          <motion.div
            animate={{
              boxShadow: [
                `0 0 20px rgba(${info.colorRgb},0.4)`,
                `0 0 50px rgba(${info.colorRgb},0.8)`,
                `0 0 20px rgba(${info.colorRgb},0.4)`,
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 rounded-[1.4rem] flex items-center justify-center text-5xl mb-4"
            style={{ background: `rgba(${info.colorRgb},0.15)`, border: `2px solid rgba(${info.colorRgb},0.35)` }}
          >
            {info.emblem}
          </motion.div>

          <div
            className="text-2xl font-black mb-1"
            style={{ color: info.color }}
          >
            {info.name}
          </div>

          <div
            className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{
              background: `rgba(${info.colorRgb},0.12)`,
              border: `1px solid rgba(${info.colorRgb},0.25)`,
              color: info.color,
            }}
          >
            ⚡ {info.eloRange}
          </div>
        </motion.div>

        {/* Info sections */}
        <InfoSection
          icon="📋"
          title="وصف الدوري"
          body={info.description}
          color={info.color}
        />
        <InfoSection
          icon="⚔️"
          title="مستوى الصعوبة"
          body={info.difficulty}
          color={info.color}
        />
        <InfoSection
          icon="⬆️"
          title="الترقية"
          body={info.promotion}
          color="#4ade80"
        />
        <InfoSection
          icon="⬇️"
          title="الهبوط"
          body={info.relegation}
          color="#f87171"
        />
        <InfoSection
          icon="🏅"
          title="المكافآت"
          body={info.rewards}
          color="#fbbf24"
        />

        {/* PLAY CTA */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => go('/match-arena')}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative w-full overflow-hidden py-5 rounded-2xl flex items-center justify-center gap-2 mt-2"
          style={{
            background: `linear-gradient(135deg, rgba(${info.colorRgb},0.85) 0%, rgba(${info.colorRgb},0.5) 100%)`,
            border: `1.5px solid rgba(${info.colorRgb},0.6)`,
            boxShadow: `0 0 36px rgba(${info.colorRgb},0.4), 0 4px 20px rgba(0,0,0,0.5)`,
          }}
        >
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.18) 50%, transparent 75%)",
            }}
            animate={{ x: ["-120%", "220%"] }}
            transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
          />
          <span className="relative text-[15px] font-black uppercase tracking-[0.2em] text-white">
            ▶ PLAY NOW
          </span>
        </motion.button>
      </div>
    </div>
  );
}
