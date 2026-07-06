import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import Avatar from "@/components/Avatar";
import { Trophy, Zap, Target, TrendingUp, TrendingDown, Minus } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MatchResult {
  league: string;
  leagueName: string;
  leagueColor: string;
  leagueIcon: string;
  playerName: string;
  score: number;
  correct: number;
  accuracy: number;
  total: number;
  opponents: { name: string; score: number }[];
}

// ── Prize config ──────────────────────────────────────────────────────────────

function getPrize(rank: number, total: number, league: string): number {
  if (league === "training") return 0;
  if (league === "bronze" || league === "coin") {
    const paidPlaces = total <= 5 ? 2 : 4;
    if (rank > paidPlaces) return 0;
    const prizes = [50, 30, 20, 10];
    return prizes[rank - 1] ?? 0;
  }
  if (league === "gold" || league === "pro") {
    if (rank <= 4) return [120, 80, 50, 30][rank - 1] ?? 0;
    return [15, 10, 8, 5][rank - 5] ?? 0;
  }
  return 0;
}

function getXpReward(rank: number, total: number): number {
  if (rank === 1) return 100;
  if (rank <= 3) return 60;
  if (rank <= Math.ceil(total * 0.3)) return 40;
  if (rank <= Math.ceil(total * 0.5)) return 25;
  return 15;
}

// ── Rank badge ────────────────────────────────────────────────────────────────

function RankBadge({ rank, color }: { rank: number; color: string }) {
  const cfg =
    rank === 1 ? { emoji: "👑", label: "بطل", glow: "rgba(255,215,0,0.5)", bg: "rgba(255,215,0,0.12)", border: "rgba(255,215,0,0.4)" } :
    rank === 2 ? { emoji: "🥈", label: "وصيف", glow: "rgba(192,192,192,0.4)", bg: "rgba(192,192,192,0.08)", border: "rgba(192,192,192,0.3)" } :
    rank === 3 ? { emoji: "🥉", label: "المركز الثالث", glow: "rgba(205,127,50,0.4)", bg: "rgba(205,127,50,0.08)", border: "rgba(205,127,50,0.3)" } :
    rank <= 5   ? { emoji: "⭐", label: `المركز #${rank}`, glow: `${color}55`, bg: `${color}15`, border: `${color}40` } :
                  { emoji: "🎮", label: `المركز #${rank}`, glow: "rgba(100,116,139,0.2)", bg: "rgba(100,116,139,0.06)", border: "rgba(100,116,139,0.15)" };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 16, delay: 0.3 }}
      className="flex flex-col items-center gap-3"
    >
      <motion.div
        className="w-24 h-24 rounded-[2rem] flex items-center justify-center text-5xl relative"
        animate={{ boxShadow: [`0 0 20px ${cfg.glow}`, `0 0 55px ${cfg.glow}`, `0 0 20px ${cfg.glow}`] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: cfg.bg, border: `2px solid ${cfg.border}` }}
      >
        {/* Inner glow ring */}
        <motion.div
          className="absolute inset-0 rounded-[2rem]"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          style={{ boxShadow: `inset 0 0 20px ${cfg.glow}` }}
        />
        {cfg.emoji}
      </motion.div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-base font-black tracking-widest uppercase"
        style={{ color: cfg.border }}
      >
        {cfg.label}
      </motion.span>
    </motion.div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ value, label, color, icon, delay = 0 }: {
  value: string | number;
  label: string;
  color: string;
  icon: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl"
      style={{ background: `${color}10`, border: `1px solid ${color}25` }}
    >
      <div style={{ color }}>{icon}</div>
      <div className="text-2xl font-black tabular-nums" style={{ color }}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-white/35">{label}</div>
    </motion.div>
  );
}

// ── Reward row ────────────────────────────────────────────────────────────────

function RewardRow({ icon, label, amount, color, delay = 0 }: {
  icon: string;
  label: string;
  amount: string;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: `${color}0d`, border: `1px solid ${color}25` }}
    >
      <span className="text-xl">{icon}</span>
      <span className="flex-1 text-sm text-white/70">{label}</span>
      <motion.span
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: delay + 0.15, type: "spring", stiffness: 300 }}
        className="text-base font-black"
        style={{ color }}
      >
        {amount}
      </motion.span>
    </motion.div>
  );
}

// ── Zone indicator ─────────────────────────────────────────────────────────────

function ZoneIndicator({ rank, total, lc }: { rank: number; total: number; lc: string }) {
  const promotionCutoff = Math.ceil(total * 0.3);
  const relegationCutoff = Math.floor(total * 0.8);
  const inPromotion = rank <= promotionCutoff;
  const inRelegation = rank > relegationCutoff;

  if (total <= 1) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.65 }}
    >
      {inPromotion && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)' }}
        >
          <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="text-sm font-black text-emerald-400">🚀 منطقة الترقي!</div>
            <div className="text-xs text-emerald-400/60">أنت ضمن أفضل 30٪ — ستُرقى للموسم القادم</div>
          </div>
        </div>
      )}
      {!inPromotion && !inRelegation && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: `${lc}0d`, border: `1px solid ${lc}25` }}
        >
          <Minus className="w-5 h-5 shrink-0" style={{ color: lc }} />
          <div>
            <div className="text-sm font-black" style={{ color: lc }}>📊 المنطقة الوسطى</div>
            <div className="text-xs text-white/40">
              المركز {rank} من {total} — ارتقِ {rank - promotionCutoff} مراكز للترقي
            </div>
          </div>
        </div>
      )}
      {inRelegation && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          <TrendingDown className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <div className="text-sm font-black text-red-400">⚠️ منطقة الإنحدار</div>
            <div className="text-xs text-red-400/60">المركز {rank} من {total} — حسّن أداءك للابتعاد عن الإنحدار</div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Results() {
  const [, go] = useLocation();
  const { addDN } = useGame();

  const [result, setResult] = useState<MatchResult | null>(null);
  const [showBoard, setShowBoard] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [showRewards, setShowRewards] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("sl_match_result");
    if (raw) {
      try {
        const r: MatchResult = JSON.parse(raw);
        setResult(r);
        sessionStorage.removeItem("sl_match_result");
        const ranked = [...r.opponents, { name: r.playerName, score: r.score }]
          .sort((a, b) => b.score - a.score);
        const rank = ranked.findIndex((p) => p.name === r.playerName) + 1;
        const prize = getPrize(rank, ranked.length, r.league);
        if (prize > 0) addDN(prize);
      } catch (_) { /* ignore */ }
    }
    setTimeout(() => setShowBoard(true), 900);
    setTimeout(() => setShowRewards(true), 600);
  }, []);

  const allPlayers = result
    ? [...result.opponents, { name: result.playerName, score: result.score }]
        .sort((a, b) => b.score - a.score)
    : [];

  const myRank = result
    ? allPlayers.findIndex((p) => p.name === result.playerName) + 1
    : 0;

  const prize = result ? getPrize(myRank, allPlayers.length, result.league) : 0;
  const xpEarned = result ? getXpReward(myRank, allPlayers.length) : 0;

  useEffect(() => {
    if (myRank > 0 && myRank <= 3) setConfetti(true);
  }, [myRank]);

  if (!result) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-6"
        style={{ background: "#000" }}
      >
        <p className="text-white/40 text-sm">لا توجد بيانات مباراة.</p>
        <button
          onClick={() => go("/league-select")}
          className="px-6 py-3 rounded-2xl font-bold text-sm text-white"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          العودة للدوريات
        </button>
      </div>
    );
  }

  const lc = result.leagueColor;

  return (
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{ background: `radial-gradient(ellipse at 50% 0%, ${lc}1a 0%, #060010 55%, #000 100%)` }}
    >
      {/* Confetti */}
      {confetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
          {Array.from({ length: 40 }, (_, i) => (
            <motion.div
              key={i}
              className={`absolute ${i % 3 === 0 ? 'w-3 h-1' : 'w-2 h-2'} rounded-sm`}
              style={{
                left: `${(i * 2.5) % 100}%`,
                background: [lc, "#ffd700", "#fff", "#a78bfa", "#22c55e", "#f472b6"][i % 6],
              }}
              initial={{ y: -20, opacity: 1, rotate: 0, x: 0 }}
              animate={{
                y: "110vh",
                opacity: [1, 1, 0],
                rotate: 360 * (i % 2 === 0 ? 1 : -1),
                x: [0, (i % 2 === 0 ? 30 : -30), 0],
              }}
              transition={{
                duration: 2.5 + (i % 4) * 0.4,
                delay: (i * 0.06) % 1.2,
                ease: "easeIn",
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-20 max-w-md mx-auto px-4 py-8 flex flex-col gap-5">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3 text-xs font-black uppercase tracking-widest"
            style={{ background: `${lc}15`, border: `1px solid ${lc}40`, color: lc }}
          >
            {result.leagueIcon} {result.leagueName}
          </motion.div>
          <h1
            className="text-5xl font-black tracking-tight"
            style={{
              background: "linear-gradient(135deg, #fff 30%, rgba(255,255,255,0.5))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 20px rgba(255,255,255,0.15))",
            }}
          >
            MATCH
            <br />
            COMPLETE
          </h1>
        </motion.div>

        {/* ── Player Result Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-3xl p-6 flex flex-col items-center gap-5"
          style={{
            background: `linear-gradient(135deg, ${lc}1a 0%, rgba(255,255,255,0.03) 100%)`,
            border: `1px solid ${lc}35`,
            boxShadow: `0 8px 50px ${lc}18, inset 0 1px 0 rgba(255,255,255,0.06)`,
          }}
        >
          <RankBadge rank={myRank} color={lc} />

          {/* Stats row */}
          <div className="flex gap-2 w-full">
            <StatCard
              value={result.score}
              label="النقاط"
              color={lc}
              icon={<Trophy className="w-4 h-4" />}
              delay={0.45}
            />
            <StatCard
              value={`${result.accuracy}%`}
              label="الدقة"
              color={result.accuracy >= 70 ? "#4ade80" : result.accuracy >= 50 ? "#f59e0b" : "#f87171"}
              icon={<Target className="w-4 h-4" />}
              delay={0.5}
            />
            <StatCard
              value={`${result.correct}/${result.total}`}
              label="الصحيح"
              color="rgba(255,255,255,0.7)"
              icon={<Zap className="w-4 h-4" />}
              delay={0.55}
            />
          </div>
        </motion.div>

        {/* ── Rewards Breakdown ── */}
        {showRewards && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-2"
          >
            <div className="text-xs font-black uppercase tracking-widest text-white/30 px-1 mb-3">
              🏅 مكاسب المباراة
            </div>

            {prize > 0 && (
              <RewardRow
                icon="💰"
                label="DN$ مكتسبة"
                amount={`+${prize} DN$`}
                color="#fbbf24"
                delay={0.1}
              />
            )}

            <RewardRow
              icon="⚡"
              label="نقاط الخبرة"
              amount={`+${xpEarned} XP`}
              color="#818cf8"
              delay={prize > 0 ? 0.2 : 0.1}
            />

            {myRank === 1 && (
              <RewardRow
                icon="👑"
                label="مكافأة البطولة"
                amount="مجد أبدي!"
                color={lc}
                delay={0.3}
              />
            )}

            {prize === 0 && myRank > 3 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="text-center text-xs text-white/25 py-1"
              >
                تحتاج المركز الأول لكسب DN$ أكثر — تدرّب وعُد أقوى!
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── Zone indicator (league context) ── */}
        <ZoneIndicator rank={myRank} total={allPlayers.length} lc={lc} />

        {/* ── Leaderboard ── */}
        <AnimatePresence>
          {showBoard && (
            <motion.div
              key="board"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-3xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {/* Board header */}
              <div
                className="px-5 py-3.5 flex items-center justify-between"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span className="text-xs font-black uppercase tracking-widest text-white/40">
                  الترتيب النهائي
                </span>
                <span className="text-xs text-white/25">{allPlayers.length} لاعب</span>
              </div>

              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                {allPlayers.map((p, i) => {
                  const isMe      = p.name === result.playerName;
                  const rank      = i + 1;
                  const rankPrize = getPrize(rank, allPlayers.length, result.league);
                  const rankXp    = getXpReward(rank, allPlayers.length);
                  const rankMedal =
                    rank === 1 ? "👑" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
                  const inPromo   = rank <= Math.ceil(allPlayers.length * 0.3);
                  const inRele    = rank > Math.floor(allPlayers.length * 0.8);

                  return (
                    <motion.div
                      key={p.name}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 + 0.05 }}
                      className="flex items-center gap-3 px-5 py-3"
                      style={{
                        background: isMe
                          ? `${lc}10`
                          : rank <= 3
                            ? "rgba(255,255,255,0.02)"
                            : "transparent",
                      }}
                    >
                      {/* Rank */}
                      <div className="w-8 flex items-center justify-center shrink-0">
                        {rankMedal ? (
                          <span className="text-lg">{rankMedal}</span>
                        ) : (
                          <span className="text-sm font-black tabular-nums text-white/25">
                            {rank}
                          </span>
                        )}
                      </div>

                      {/* Avatar */}
                      <Avatar username={p.name} size="xs" shape="rounded-full" />

                      {/* Name + zone */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p
                            className="text-sm font-bold truncate"
                            style={{ color: isMe ? lc : "rgba(255,255,255,0.75)" }}
                          >
                            {isMe ? `${p.name} (أنت)` : p.name}
                          </p>
                          {inPromo && <span className="text-[9px] text-emerald-400 shrink-0">▲</span>}
                          {inRele  && <span className="text-[9px] text-red-400 shrink-0">▼</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {rankPrize > 0 && (
                            <span className="text-[10px] font-bold text-yellow-400">+{rankPrize} DN$</span>
                          )}
                          <span className="text-[10px] text-white/25">+{rankXp} XP</span>
                        </div>
                      </div>

                      {/* Score */}
                      <span
                        className="text-sm font-black tabular-nums shrink-0"
                        style={{ color: isMe ? lc : "rgba(255,255,255,0.55)" }}
                      >
                        {p.score}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Zone legend */}
              <div
                className="px-5 py-2.5 flex gap-4 text-[10px] text-white/25"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              >
                <span className="flex items-center gap-1"><span className="text-emerald-400">▲</span> منطقة الترقي</span>
                <span className="flex items-center gap-1"><span className="text-red-400">▼</span> منطقة الإنحدار</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Actions ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="flex flex-col gap-3"
        >
          <motion.button
            onClick={() => go("/league-select")}
            whileTap={{ scale: 0.96 }}
            className="w-full h-14 rounded-2xl font-black text-base text-white relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${lc}cc, ${lc}88)`,
              boxShadow: `0 0 35px ${lc}35`,
            }}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",
                left: "-100%",
              }}
              animate={{ left: ["−100%", "200%"] }}
              transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.2 }}
            />
            <span className="relative z-10 tracking-wide">🏟️ العودة للدوريات</span>
          </motion.button>

          <button
            onClick={() => go("/")}
            className="w-full h-11 rounded-2xl font-bold text-sm transition-all active:scale-95"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            ← الصفحة الرئيسية
          </button>
        </motion.div>
      </div>
    </div>
  );
}
