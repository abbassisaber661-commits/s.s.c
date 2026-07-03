import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGame } from "@/contexts/GameContext";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Trophy, RefreshCw, Loader2, Medal, Gift, TrendingUp, TrendingDown, Flame, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import Avatar from "@/components/Avatar";
import { getStoredPlayerId, api } from "@/lib/apiClient";
import { leagueApi, type SeasonEntry, type LeagueId } from "@/lib/league-api";
import { cn } from "@/lib/utils";

// ─── Division definitions ─────────────────────────────────────────────────────

type DivisionId = "training" | "coin" | "pro" | "champion";
type TopTab = "league" | "earners" | "supporters" | "posts";

interface DivisionDef {
  id: DivisionId; leagueId: LeagueId; label: string;
  emoji: string; color: string; rgb: string; slotCount: number;
}

const DIVISIONS: DivisionDef[] = [
  { id: "training", leagueId: "coins",    label: "Division III",     emoji: "🎯", color: "#3AB4FF", rgb: "58,180,255",  slotCount: 16 },
  { id: "coin",     leagueId: "pro",      label: "Division II",      emoji: "🪙", color: "#FFD93D", rgb: "255,217,61",  slotCount: 16 },
  { id: "pro",      leagueId: "elite",    label: "Pro League",       emoji: "🏆", color: "#2EE87A", rgb: "46,232,122",  slotCount: 20 },
  { id: "champion", leagueId: "champion", label: "Champions League", emoji: "👑", color: "#B44FFF", rgb: "180,79,255",  slotCount: 25 },
];

const fmt = (n: number) =>
  n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M"
  : n >= 1_000   ? (n / 1_000).toFixed(1) + "K"
  : String(n);

const medalFor = (i: number) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
const rankColor = (i: number) =>
  i === 0 ? "#FFD700" : i === 1 ? "#A8A9AD" : i === 2 ? "#CD7F32" : "rgba(255,255,255,0.3)";
const dnRankColor = (i: number) =>
  i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "#555";

// ─── DN Earners Tab ───────────────────────────────────────────────────────────

function EarnersTab({ myId }: { myId: string | null }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["lb", "top-earners"],
    queryFn:  () => api.leaderboardDN.topEarners(25),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const rows = data ?? [];

  return (
    <div className="space-y-2">
      {isLoading && <LoadingRows color="#FFD60A" />}
      {!isLoading && rows.length === 0 && <EmptyState icon="💰" msg="لا توجد هدايا مستلمة بعد — كن أول من يستقبل!" />}
      {rows.map((r, i) => {
        const isMe = r.playerId === myId;
        return (
          <motion.div key={r.playerId} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            className="flex items-center gap-3 px-3 py-3 rounded-2xl"
            style={isMe
              ? { background: "rgba(255,214,10,0.1)", border: "1.5px solid rgba(255,214,10,0.45)" }
              : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="w-7 text-center font-black text-sm shrink-0" style={{ color: rankColor(i) }}>
              {medalFor(i) ?? `${i + 1}`}
            </div>
            <Avatar username={r.username} size="sm" shape="rounded-xl" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-sm truncate" style={{ color: isMe ? "#FFD60A" : "rgba(255,255,255,0.88)" }}>
                  {r.username}
                </span>
                {isMe && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-yellow-400/20 text-yellow-400">أنت</span>}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                {r.totalReceived} هدية مستلمة
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-black tabular-nums" style={{ color: "#FFD60A" }}>
                +{fmt(r.totalReceivedDN)}
              </div>
              <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>DN$</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── DN$ Supporters Tab ────────────────────────────────────────────────────────

function SupportersTab({ myId }: { myId: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["lb", "top-supporters"],
    queryFn:  () => api.leaderboardDN.topSupporters(25),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const rows = data ?? [];

  return (
    <div className="space-y-2">
      {isLoading && <LoadingRows color="#FF9500" />}
      {!isLoading && rows.length === 0 && <EmptyState icon="🎁" msg="لا يوجد داعمون بعد — ابدأ بإرسال هديتك!" />}
      {rows.map((r, i) => {
        const isMe = r.playerId === myId;
        return (
          <motion.div key={r.playerId} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            className="flex items-center gap-3 px-3 py-3 rounded-2xl"
            style={isMe
              ? { background: "rgba(255,149,0,0.1)", border: "1.5px solid rgba(255,149,0,0.45)" }
              : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="w-7 text-center font-black text-sm shrink-0" style={{ color: rankColor(i) }}>
              {medalFor(i) ?? `${i + 1}`}
            </div>
            <Avatar username={r.username} size="sm" shape="rounded-xl" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-sm truncate" style={{ color: isMe ? "#FF9500" : "rgba(255,255,255,0.88)" }}>
                  {r.username}
                </span>
                {isMe && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-orange-400/20 text-orange-400">أنت</span>}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                {r.totalSent} هدية مُرسَلة
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-black tabular-nums" style={{ color: "#FF9500" }}>
                {fmt(r.totalSentDN)}
              </div>
              <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>DN$ مُرسَل</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Top Posts Tab ────────────────────────────────────────────────────────────

function TopPostsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["lb", "top-posts"],
    queryFn:  () => api.leaderboardDN.topPosts(20),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const posts = data ?? [];

  return (
    <div className="space-y-2">
      {isLoading && <LoadingRows color="#FF4F6B" />}
      {!isLoading && posts.length === 0 && <EmptyState icon="📝" msg="لا توجد منشورات تلقّت هدايا بعد" />}
      {posts.map((p, i) => (
        <motion.div key={p.postId} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
          className="flex items-center gap-3 px-3 py-3 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="w-7 text-center font-black text-sm shrink-0" style={{ color: rankColor(i) }}>
            {medalFor(i) ?? `${i + 1}`}
          </div>
          <Avatar username={p.authorUsername} size="sm" shape="rounded-xl" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate" style={{ color: "rgba(255,255,255,0.88)" }}>
              {p.authorUsername}
            </div>
            {p.content && (
              <div className="text-[10px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                {p.content}
              </div>
            )}
            <div className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
              {p.totalGiftCount} {p.totalGiftCount === 1 ? "هدية" : "هدايا"}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-black"
              style={{ background: "linear-gradient(135deg,#FFD60A,#FF9500)", color: "#111" }}>
              <Gift size={10} />
              <span>{fmt(p.totalGiftAmount)}</span>
            </div>
            <div className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>DN$</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function LoadingRows({ color }: { color: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color }} />
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>جارٍ التحميل…</p>
    </div>
  );
}

function EmptyState({ icon, msg }: { icon: string; msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <span className="text-4xl">{icon}</span>
      <p className="text-sm text-center max-w-[200px]" style={{ color: "rgba(255,255,255,0.4)" }}>{msg}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Leaderboard() {
  const { username } = useGame();
  const playerId = getStoredPlayerId();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const [topTab, setTopTab] = useState<TopTab>("league");
  const [selected, setSelected] = useState<DivisionId>("training");
  const [entries,    setEntries]    = useState<SeasonEntry[]>([]);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(async (div: DivisionId) => {
    setLoading(true); setError(null);
    try {
      const leagueId = DIVISIONS.find(d => d.id === div)!.leagueId;
      const data = await leagueApi.getStandings(leagueId);
      setEntries(data); setTotal(data.length);
      const idx = data.findIndex(e => e.playerId === playerId);
      setPlayerRank(idx >= 0 ? idx + 1 : null);
    } catch {
      setError("تعذّر تحميل الترتيب"); setEntries([]); setPlayerRank(null); setTotal(0);
    } finally { setLoading(false); }
  }, [playerId]);

  useEffect(() => { if (topTab === "league") load(selected); }, [selected, topTab, load]);
  useEffect(() => { const id = setInterval(() => { if (topTab === "league") load(selected); }, 60_000); return () => clearInterval(id); }, [selected, topTab, load]);

  const div = DIVISIONS.find(d => d.id === selected)!;

  const handleRefresh = () => {
    if (topTab === "league") load(selected);
    else {
      qc.invalidateQueries({ queryKey: ["lb"] });
    }
  };

  const TOP_TABS: { id: TopTab; label: string; icon: React.ReactNode; color: string }[] = [
    { id: "league",     label: "الدوري",    icon: <Trophy size={13} />,     color: "#3AB4FF" },
    { id: "earners",    label: "أعلى دخل",  icon: <TrendingUp size={13} />, color: "#FFD60A" },
    { id: "supporters", label: "أكبر داعم", icon: <Gift size={13} />,       color: "#FF9500" },
    { id: "posts",      label: "أفضل بوست", icon: <Flame size={13} />,      color: "#FF4F6B" },
  ];

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #0e0025 0%, #000 70%)" }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3">
        <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => window.history.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-black flex-1" style={{ color: "rgba(255,255,255,0.92)" }}>🏅 لوحة الصدارة</h1>
        <button onClick={handleRefresh} className="p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <RefreshCw className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} />
        </button>
      </div>

      {/* ── Top-level tabs ── */}
      <div className="px-4 mb-3">
        <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {TOP_TABS.map(t => (
            <button key={t.id} onClick={() => setTopTab(t.id)}
              className="flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all duration-200"
              style={topTab === t.id
                ? { background: `rgba(255,255,255,0.08)`, border: `1px solid ${t.color}55` }
                : { border: "1px solid transparent" }}
            >
              <span style={{ color: topTab === t.id ? t.color : "rgba(255,255,255,0.3)" }}>{t.icon}</span>
              <span className="text-[8px] font-black leading-tight text-center" style={{ color: topTab === t.id ? t.color : "rgba(255,255,255,0.3)" }}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── DN tabs header badge ── */}
      {topTab !== "league" && (
        <motion.div key="dn-header" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-3 px-4 py-3 rounded-2xl flex items-center gap-3"
          style={{ background: "rgba(255,214,10,0.07)", border: "1.5px solid rgba(255,214,10,0.2)" }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background: "linear-gradient(135deg,#FFD60A,#FF9500)" }}>
            {topTab === "earners" ? "💰" : topTab === "supporters" ? "🎁" : "🔥"}
          </div>
          <div>
            <div className="text-sm font-black" style={{ color: "#FFD60A" }}>
              {topTab === "earners"    ? "أعلى المستقبِلين" :
               topTab === "supporters" ? "أكبر الداعمين"    : "أفضل المنشورات"}
            </div>
            <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
              محسوب من سجل هدايا DN · يُحدَّث تلقائياً
            </div>
          </div>
        </motion.div>
      )}

      {/* ── League sub-tabs ── */}
      <AnimatePresence mode="wait">
        {topTab === "league" && (
          <motion.div key="league-tabs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="px-4 mb-3">
              <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {DIVISIONS.map(d => (
                  <button key={d.id} onClick={() => setSelected(d.id)}
                    className="flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all duration-200"
                    style={d.id === selected
                      ? { background: `rgba(${d.rgb},0.18)`, border: `1px solid rgba(${d.rgb},0.4)` }
                      : { border: "1px solid transparent" }}
                  >
                    <span className="text-base leading-none">{d.emoji}</span>
                    <span className="text-[9px] font-black leading-tight text-center" style={{ color: d.id === selected ? d.color : "rgba(255,255,255,0.35)" }}>
                      {d.label.split(" ")[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <motion.div key={selected} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              className="mx-4 mb-3 px-4 py-3 rounded-2xl flex items-center justify-between"
              style={{ background: `linear-gradient(135deg, rgba(${div.rgb},0.14) 0%, rgba(0,0,0,0.5) 100%)`, border: `1.5px solid rgba(${div.rgb},0.28)` }}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{div.emoji}</span>
                <div>
                  <div className="text-sm font-black" style={{ color: div.color }}>{div.label}</div>
                  <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{div.slotCount} مقعد · الموسم الحالي</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black tabular-nums" style={{ color: "rgba(255,255,255,0.7)" }}>{total}</div>
                <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>لاعب</div>
              </div>
            </motion.div>

            <AnimatePresence>
              {playerRank !== null && !loading && (
                <motion.div key="rank-badge" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="mx-4 mb-3 px-4 py-2.5 rounded-xl flex items-center gap-2"
                  style={{ background: `rgba(${div.rgb},0.1)`, border: `1px solid rgba(${div.rgb},0.35)` }}
                >
                  <Medal className="w-4 h-4 shrink-0" style={{ color: div.color }} />
                  <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>ترتيبك:</span>
                  <span className="text-sm font-black" style={{ color: div.color }}>#{playerRank}</span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>في {div.label}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content ── */}
      <div className="flex-1 px-4 pb-24 overflow-y-auto">
        <AnimatePresence mode="wait">
          {topTab === "league" && (
            <motion.div key="league-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {loading && <div className="flex flex-col items-center justify-center gap-3 py-20">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: div.color }} />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>جارٍ التحميل…</p>
              </div>}
              {!loading && error && <div className="flex flex-col items-center justify-center gap-4 py-20">
                <Trophy className="w-12 h-12 opacity-20" />
                <p className="text-sm text-center" style={{ color: "rgba(255,255,255,0.45)" }}>{error}</p>
                <Button variant="outline" onClick={() => load(selected)}>إعادة المحاولة</Button>
              </div>}
              {!loading && !error && entries.length === 0 && <div className="flex flex-col items-center justify-center gap-3 py-20">
                <Trophy className="w-14 h-14 opacity-15" />
                <p className="text-sm text-center" style={{ color: "rgba(255,255,255,0.4)" }}>لا يوجد لاعبون في {div.label} بعد</p>
                <Link href="/league-select"><Button variant="outline" size="sm">ابدأ اللعب</Button></Link>
              </div>}
              {!loading && !error && entries.length > 0 && (
                <div className="space-y-2">
                  {entries.map((entry, i) => {
                    const isMe = entry.playerId === playerId || entry.playerName === username;
                    const isBot = entry.playerId.startsWith("bot_standings_");
                    const medal = medalFor(i);
                    const played = entry.wins + entry.draws + entry.losses;
                    return (
                      <motion.div key={entry.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.025, 0.4) }}
                        className="flex items-center gap-3 px-3 py-3 rounded-2xl"
                        style={isMe
                          ? { background: `rgba(${div.rgb},0.1)`, border: `1.5px solid rgba(${div.rgb},0.45)` }
                          : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                      >
                        <div className="w-7 text-center font-black text-sm shrink-0 tabular-nums" style={{ color: rankColor(i) }}>
                          {medal ?? `${i + 1}`}
                        </div>
                        <Avatar
                          username={entry.playerName}
                          avatar={isBot ? `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(entry.playerName.replace(/\s+/g, ''))}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf` : undefined}
                          size="sm"
                          shape="rounded-xl"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-bold text-sm truncate" style={{ color: isMe ? div.color : "rgba(255,255,255,0.88)" }}>
                              {entry.playerName}
                            </span>
                            {isMe && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md" style={{ background: `rgba(${div.rgb},0.22)`, color: div.color }}>أنت</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                              {played}م · {entry.wins}ف {entry.draws}ت {entry.losses}خ
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-black tabular-nums" style={{ color: div.color }}>{entry.points}</div>
                          <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>نقطة</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {topTab === "earners" && (
            <motion.div key="earners" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EarnersTab myId={playerId} />
            </motion.div>
          )}

          {topTab === "supporters" && (
            <motion.div key="supporters" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SupportersTab myId={playerId} />
            </motion.div>
          )}

          {topTab === "posts" && (
            <motion.div key="posts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TopPostsTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
