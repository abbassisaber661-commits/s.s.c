/**
 * LeagueDetailsPage.tsx
 * ──────────────────────
 * Real data integration: season stats, standings, prize pool loaded from backend.
 * URL leagueId: division-iii | division-ii | professional | champions
 */
import { useRoute, useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Loader2, Users, Calendar, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { leagueApi, type LeagueId, type SeasonEntry } from "@/lib/league-api";

// ── URL → backend ID mapping ────────────────────────────────────────────────────

const URL_TO_BACKEND: Record<string, LeagueId> = {
  "division-iii": "coins",
  "division-ii":  "pro",
  "professional": "elite",
  "champions":    "champion",
};

// ── Static league descriptions (game rules — not in DB) ───────────────────────

const LEAGUE_INFO: Record<string, {
  name: string; shortLabel: string; emblem: string;
  color: string; colorRgb: string; eloRange: string;
  description: string; difficulty: string;
  promotion: string; relegation: string; rewards: string;
}> = {
  "division-iii": {
    name: "Division III", shortLabel: "DIV III", emblem: "🥉",
    color: "#cd7f32", colorRgb: "205,127,50", eloRange: "0 – 99 LP",
    description: "Division III هي نقطة البداية لكل لاعب في SkillLeague. هنا ستواجه منافسين حقيقيين وتتعلم أساسيات الأداء تحت الضغط. المنافسة متاحة للجميع بدون قيود.",
    difficulty: "مستوى سهل إلى متوسط. الأسئلة تختبر المعرفة العامة والسرعة في الإجابة. زمن الإجابة كافٍ لكل سؤال.",
    promotion: "الوصول إلى 100 نقطة LP يؤهلك للترقية التلقائية إلى Division II في نهاية الموسم.",
    relegation: "لا يوجد هبوط من Division III. هذا هو مستوى الانطلاق لجميع اللاعبين الجدد.",
    rewards: "الفوز يمنحك نقاط XP وLP. أداء استثنائي يفتح صناديق المكافآت اليومية وجواهر نهاية الموسم.",
  },
  "division-ii": {
    name: "Division II", shortLabel: "DIV II", emblem: "🥈",
    color: "#94a3b8", colorRgb: "148,163,184", eloRange: "100 – 299 LP",
    description: "Division II مخصصة للاعبين الذين أثبتوا أنفسهم في المستوى التمهيدي. المنافسة أشد والأسئلة أكثر تعقيداً.",
    difficulty: "مستوى متوسط. تتضمن أسئلة أكثر تخصصاً. وقت الإجابة أقصر ويتطلب تركيزاً أعلى.",
    promotion: "الوصول إلى 300 نقطة LP مع الحفاظ على معدل فوز جيد يفتح لك الباب نحو Pro League.",
    relegation: "الهبوط إلى Division III يحدث إذا انخفض LP إلى أقل من 100 في نهاية الموسم.",
    rewards: "مكافآت أعلى من Division III. الفوز يمنح مكافآت عملات مضاعفة. 2 جواهر لأفضل لاعب بنهاية الموسم.",
  },
  "professional": {
    name: "Professional League", shortLabel: "PRO", emblem: "🥇",
    color: "#ffd700", colorRgb: "255,215,0", eloRange: "300 – 499 LP",
    description: "Professional League هي حيث يتنافس المحترفون الحقيقيون. المستوى عالٍ والضغط مستمر. كل مباراة تُحسب وكل قرار مهم.",
    difficulty: "مستوى صعب. أسئلة معقدة تشمل الخداع البصري والمعرفة المتخصصة. الوقت محدود جداً.",
    promotion: "الوصول إلى 500 نقطة LP مع أداء استثنائي يفتح الطريق نحو Champions League.",
    relegation: "الهبوط إلى Division II يحدث إذا انخفض LP دون 300 في نهاية الموسم.",
    rewards: "مكافآت ممتازة تشمل جواهر حصرية (3 جواهر للأول) وشارات احترافية وبطولات أسبوعية.",
  },
  "champions": {
    name: "Champions League", shortLabel: "ELITE", emblem: "👑",
    color: "#a78bfa", colorRgb: "167,139,250", eloRange: "500+ LP",
    description: "Champions League هو قمة SkillLeague. مجموعة مختارة من أفضل اللاعبين في العالم يتنافسون على اللقب الأسمى.",
    difficulty: "مستوى الخبراء. أصعب الأسئلة وأقصر الأوقات. لا هامش للخطأ.",
    promotion: "لا توجد مرحلة أعلى — Champions League هي الذروة. الهدف هو البقاء في القمة.",
    relegation: "الهبوط إلى Pro League يحدث إذا انخفض LP دون 500 في نهاية الموسم.",
    rewards: "أعلى مكافآت في اللعبة. 4 جواهر للأول · 3 للثاني · 2 للثالث · 1 للرابع. لقب بطل الموسم.",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

function daysLeft(endAt: string): string {
  const diff = Math.ceil((new Date(endAt).getTime() - Date.now()) / 86_400_000);
  if (diff <= 0) return "انتهى";
  if (diff === 1) return "يوم واحد";
  return `${diff} أيام`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoSection({ icon, title, body, color }: { icon: string; title: string; body: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color }}>{title}</span>
      </div>
      <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{body}</p>
    </motion.div>
  );
}

function SeasonStats({
  participantCount,
  currentRound,
  totalRounds,
  endAt,
  color,
}: {
  participantCount: number;
  currentRound: number;
  totalRounds: number;
  endAt: string;
  color: string;
}) {
  const stats = [
    { icon: <Users className="w-4 h-4" />, label: "لاعبون", value: String(participantCount) },
    { icon: <Star className="w-4 h-4" />,  label: "الجولة", value: `${currentRound}/${totalRounds}` },
    { icon: <Calendar className="w-4 h-4" />, label: "الموسم ينتهي", value: daysLeft(endAt) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">📊</span>
        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color }}>إحصائيات الموسم الحالي</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1">
            <div style={{ color: "rgba(255,255,255,0.3)" }}>{s.icon}</div>
            <div className="text-base font-black text-white">{s.value}</div>
            <div className="text-[10px] text-center" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function TopPlayers({
  entries,
  color,
}: {
  entries: SeasonEntry[];
  color: string;
}) {
  const top = entries.slice(0, 5);
  if (top.length === 0) return null;

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🏆</span>
        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color }}>أبطال الموسم</span>
      </div>
      <div className="space-y-2">
        {top.map((e, i) => (
          <div key={e.id} className="flex items-center gap-3">
            <div className="w-6 text-center text-sm font-black shrink-0" style={{ color: i < 3 ? undefined : "rgba(255,255,255,0.3)" }}>
              {medals[i] ?? `${i + 1}`}
            </div>
            <div className="flex-1 min-w-0 text-[13px] font-bold truncate" style={{ color: "rgba(255,255,255,0.82)" }}>
              {e.playerName}
            </div>
            <div className="text-[11px] font-black shrink-0" style={{ color }}>
              {e.points} نقطة
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Season-end gem rewards per league (mirrors backend SEASON_END_GEM_TABLE)
const GEM_TABLE: Record<string, Array<{ rank: number; gems: number }>> = {
  "division-iii": [{ rank: 1, gems: 1 }],
  "division-ii":  [{ rank: 1, gems: 2 }, { rank: 2, gems: 1 }],
  "professional": [{ rank: 1, gems: 3 }, { rank: 2, gems: 2 }, { rank: 3, gems: 1 }],
  "champions":    [{ rank: 1, gems: 4 }, { rank: 2, gems: 3 }, { rank: 3, gems: 2 }, { rank: 4, gems: 1 }],
};

function GemRewards({ urlId, color }: { urlId: string; color: string }) {
  const rewards = GEM_TABLE[urlId];
  if (!rewards || rewards.length === 0) return null;

  const maxGems = rewards[0]?.gems ?? 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">💎</span>
        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color }}>جوائز الجواهر — نهاية الموسم</span>
      </div>
      <div className="space-y-2">
        {rewards.map((r) => (
          <div key={r.rank} className="flex items-center gap-3">
            <div className="w-5 text-center text-[11px] font-black shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
              #{r.rank}
            </div>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${(r.gems / maxGems) * 100}%`, background: "#a78bfa" }}
              />
            </div>
            <div className="text-[11px] font-black shrink-0" style={{ color: "#a78bfa" }}>
              +{r.gems} 💎
            </div>
          </div>
        ))}
      </div>
      <div className="text-[10px] mt-3" style={{ color: "rgba(255,255,255,0.25)" }}>
        تُمنح تلقائياً للاعبين الحقيقيين (غير البوتات) في نهاية كل موسم.
      </div>
    </motion.div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function LeagueDetailsPage() {
  const [match, params] = useRoute("/league/:leagueId");
  const [, go]          = useLocation();

  const urlId     = params?.leagueId ?? "";
  const backendId = URL_TO_BACKEND[urlId] as LeagueId | undefined;
  const info      = LEAGUE_INFO[urlId];

  // Real data queries
  const { data: season, isLoading: seasonLoading } = useQuery({
    queryKey: ["season", backendId],
    queryFn:  () => leagueApi.getSeason(backendId!),
    enabled:  !!backendId,
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
  });

  const { data: standings = [], isLoading: standingsLoading } = useQuery({
    queryKey: ["standings", backendId],
    queryFn:  () => leagueApi.getStandings(backendId!),
    enabled:  !!backendId,
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  const isLoading = seasonLoading || standingsLoading;

  if (!match || !info) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#07010f" }}>
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
          <h1 className="text-xl font-black tracking-tight text-white">{info.name}</h1>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
            {info.shortLabel} · {info.eloRange}
            {season && ` · ${season.participantCount} لاعب`}
          </p>
        </div>
      </div>

      <div className="px-4 pt-2 space-y-4 relative z-10">

        {/* Hero emblem */}
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

          <div className="text-2xl font-black mb-1" style={{ color: info.color }}>{info.name}</div>

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

        {/* Season stats — live from DB */}
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: info.color }} />
            <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.35)" }}>جارٍ تحميل بيانات الموسم…</span>
          </div>
        ) : season ? (
          <SeasonStats
            participantCount={season.participantCount}
            currentRound={season.currentRound ?? 1}
            totalRounds={season.totalRounds ?? 30}
            endAt={season.endAt}
            color={info.color}
          />
        ) : null}

        {/* Top players — live from DB */}
        {standings.length > 0 && (
          <TopPlayers entries={standings as SeasonEntry[]} color={info.color} />
        )}

        {/* Gem rewards — season-end table (mirrors backend) */}
        <GemRewards urlId={urlId} color={info.color} />

        {/* Static info sections */}
        <InfoSection icon="📋" title="وصف الدوري"  body={info.description} color={info.color} />
        <InfoSection icon="⚔️" title="مستوى الصعوبة" body={info.difficulty} color={info.color} />
        <InfoSection icon="⬆️" title="الترقية"       body={info.promotion}  color="#4ade80" />
        <InfoSection icon="⬇️" title="الهبوط"        body={info.relegation} color="#f87171" />
        <InfoSection icon="🏅" title="المكافآت"      body={info.rewards}    color="#fbbf24" />

        {/* PLAY CTA */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => go("/match-arena")}
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
            style={{ background: "linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.18) 50%, transparent 75%)" }}
            animate={{ x: ["-120%", "220%"] }}
            transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
          />
          <span className="relative text-[15px] font-black uppercase tracking-[0.2em] text-white">▶ PLAY NOW</span>
        </motion.button>
      </div>
    </div>
  );
}
