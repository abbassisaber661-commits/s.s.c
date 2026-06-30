import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Users, Swords, TrendingUp, Star, BarChart3, MessageSquare, Trophy, Activity, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/apiClient";

interface DashboardData {
  totals: {
    players: number;
    activePlayers24h: number;
    activePlayers7d: number;
    newPlayers7d: number;
    pvpMatches24h: number;
    pvpMatches7d: number;
  };
  topPlayers: Array<{ id: string; username: string; avatar: string; elo: number; pvpWins: number; level: number; verificationStatus: string }>;
  leagueStats: Array<{ league: string; count: number }>;
  recentFeedback: Array<{ id: string; username: string; rating: number; category: string; message: string; createdAt: string }>;
}

const LEAGUE_COLORS: Record<string, string> = {
  training: "#6b7280", bronze: "#cd7f32", silver: "#9ca3af",
  gold: "#fbbf24", platinum: "#e5e4e2", diamond: "#67e8f9", elite: "#a855f7",
};

const LEAGUE_LABELS: Record<string, string> = {
  training: "تدريب", bronze: "برونز", silver: "فضة",
  gold: "ذهب", platinum: "بلاتين", diamond: "ماس", elite: "إيليت",
};

function StatCard({ icon: Icon, label, value, sub, color, delay = 0 }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
      <div className="p-2.5 rounded-xl" style={{ backgroundColor: color + "22" }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-bold tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </motion.div>
  );
}

export default function Analytics() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = () => {
    setLoading(true);
    api.analytics.dashboard()
      .then(d => { setData(d as any); setLastUpdated(new Date()); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const badge = (s: string) => s === "elite" ? " 👑" : s === "verified" ? " ✅" : "";

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button className="p-2 rounded-xl hover:bg-card" onClick={() => window.history.back()}><ArrowLeft size={20} /></button>
        <div className="flex-1">
          <h1 className="font-bold text-lg flex items-center gap-2">📊 التحليلات</h1>
          {lastUpdated && <p className="text-xs text-muted-foreground">آخر تحديث: {lastUpdated.toLocaleTimeString("ar")}</p>}
        </div>
        <button onClick={load} className="p-2 rounded-xl hover:bg-card text-muted-foreground hover:text-foreground">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
        <div className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
          <Activity size={12} /><span>Live</span>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {loading && !data ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-10 h-10 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : data ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Users}      label="إجمالي اللاعبين"   value={data.totals.players}           color="#6366f1" delay={0}    />
              <StatCard icon={Activity}   label="نشطون (24 ساعة)"   value={data.totals.activePlayers24h}  color="#10b981" delay={0.05} />
              <StatCard icon={TrendingUp} label="لاعبون جدد (7 أيام)" value={data.totals.newPlayers7d}   color="#f59e0b" delay={0.1}  />
              <StatCard icon={Swords}     label="PvP (24 ساعة)"     value={data.totals.pvpMatches24h}     color="#ef4444" delay={0.15} />
              <StatCard icon={Users}      label="نشطون (7 أيام)"    value={data.totals.activePlayers7d}   color="#8b5cf6" delay={0.2}  sub="آخر أسبوع" />
              <StatCard icon={BarChart3}  label="PvP إجمالي (7d)"   value={data.totals.pvpMatches7d}      color="#3b82f6" delay={0.25} />
            </div>

            {/* League distribution */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="bg-card border border-border rounded-2xl p-4">
              <h2 className="font-bold mb-4 flex items-center gap-2"><Trophy size={16} className="text-amber-400" /> توزيع الدوريات</h2>
              <div className="space-y-3">
                {[...data.leagueStats].sort((a, b) => b.count - a.count).map(ls => {
                  const total = Math.max(data.totals.players, 1);
                  const pct = Math.round((ls.count / total) * 100);
                  return (
                    <div key={ls.league}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{LEAGUE_LABELS[ls.league] || ls.league}</span>
                        <span className="text-muted-foreground tabular-nums">{ls.count} لاعب ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full"
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.4 }}
                          style={{ backgroundColor: LEAGUE_COLORS[ls.league] || "#6b7280" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Top players */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="bg-card border border-border rounded-2xl p-4">
              <h2 className="font-bold mb-3 flex items-center gap-2"><Star size={16} className="text-yellow-400" /> أفضل اللاعبين</h2>
              <div className="divide-y divide-border/50">
                {data.topPlayers.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 py-2.5">
                    <span className={`text-sm font-bold w-6 tabular-nums ${i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-700" : "text-muted-foreground"}`}>{i + 1}</span>
                    <span className="text-xl">{p.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{p.username}{badge(p.verificationStatus)}</div>
                      <div className="text-xs text-muted-foreground">Lv.{p.level} · {p.pvpWins} انتصار PvP</div>
                    </div>
                    <span className="font-bold text-primary tabular-nums text-sm">{p.elo}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Beta Feedback */}
            {data.recentFeedback.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="bg-card border border-border rounded-2xl p-4">
                <h2 className="font-bold mb-3 flex items-center gap-2"><MessageSquare size={16} className="text-blue-400" /> ملاحظات Beta ({data.recentFeedback.length})</h2>
                <div className="space-y-3">
                  {data.recentFeedback.slice(0, 8).map(fb => (
                    <div key={fb.id} className="bg-muted/30 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{fb.username}</span>
                        <span className="text-xs">{"⭐".repeat(fb.rating)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{fb.message}</p>
                      <span className="text-xs text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full mt-1.5 inline-block">{fb.category}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-muted-foreground">تعذر تحميل البيانات</div>
        )}
      </div>
    </div>
  );
}
