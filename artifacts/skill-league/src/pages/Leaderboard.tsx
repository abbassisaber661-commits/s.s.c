import { useState, useEffect } from "react";
import { useGame } from "@/contexts/GameContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useT } from "@/lib/i18n";
import { Link } from "wouter";
import { ArrowLeft, Trophy, Wifi, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LEAGUES, LeagueId, LEAGUE_ORDER } from "@/lib/game-engine";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "local" | "global";

export default function Leaderboard() {
  const { language, leaderboard, username } = useGame();
  const { liveLeaderboard, subscribeLeaderboard, connected } = useRealtime();
  const t = useT(language);

  const [selected, setSelected] = useState<LeagueId>("training");
  const [tab, setTab] = useState<Tab>("global");
  const [justUpdated, setJustUpdated] = useState(false);

  useEffect(() => {
    subscribeLeaderboard();
  }, []);

  useEffect(() => {
    if (liveLeaderboard.length > 0) {
      setJustUpdated(true);
      const t = setTimeout(() => setJustUpdated(false), 1500);
      return () => clearTimeout(t);
    }
  }, [liveLeaderboard]);

  const cfg = LEAGUES[selected];
  const localEntries = (leaderboard[selected] ?? []).slice().sort((a, b) => b.score - a.score);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(language, { month: "short", day: "numeric" });
    } catch { return "—"; }
  };

  const VERIFICATION_BADGE: Record<string, string> = {
    verified: "✓",
    pro: "⭐",
  };

  return (
    <div className="min-h-screen bg-background p-5 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Link href="/"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="w-6 h-6" /></Button></Link>
        <h1 className="text-2xl font-bold flex-1">{t("leaderboard")}</h1>
        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${connected ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
          {connected ? <Wifi className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
          {connected ? "مباشر" : "غير متصل"}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-card rounded-2xl p-1 border border-border mb-4">
        {(["global", "local"] as Tab[]).map(tp => (
          <button key={tp} onClick={() => setTab(tp)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${tab === tp ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {tp === "global" ? "🌍 عالمي" : "🏅 محلي"}
          </button>
        ))}
      </div>

      {/* GLOBAL Tab — live from WebSocket */}
      {tab === "global" && (
        <div>
          <AnimatePresence>
            {justUpdated && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-3 text-center text-xs text-green-400 flex items-center justify-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-ping inline-block" />
                تحديث مباشر
              </motion.div>
            )}
          </AnimatePresence>

          {liveLeaderboard.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground py-16">
              <Trophy className="w-16 h-16 opacity-20" />
              <p className="text-center text-sm">{connected ? "لا يوجد لاعبون بعد" : "اتصال بالخادم…"}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {liveLeaderboard.map((entry, i) => {
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                const isMe = entry.username === username;
                return (
                  <motion.div key={entry.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${isMe ? "border-primary/40 bg-primary/8" : "border-border bg-card"}`}
                    style={isMe ? { backgroundColor: "rgba(var(--primary-rgb),0.05)" } : {}}>
                    <div className="w-7 text-center font-black text-sm" style={{ color: i === 0 ? "#FFD700" : i === 1 ? "#A8A9AD" : i === 2 ? "#CD7F32" : "hsl(var(--muted-foreground))" }}>
                      {medal ?? `${i + 1}`}
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center text-sm font-black text-primary flex-shrink-0">
                      {entry.avatar && entry.avatar.length <= 2 ? entry.avatar : entry.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-sm truncate">{entry.username}</span>
                        {entry.verificationStatus === "verified" && <span className="text-blue-400 text-xs">✓</span>}
                        {isMe && <span className="text-[10px] bg-primary/20 text-primary px-1 rounded">أنت</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">Lv.{entry.level} · {entry.pvpWins} انتصار PvP</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black tabular-nums text-primary">{entry.elo}</div>
                      <div className="text-xs text-muted-foreground">ELO</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* LOCAL Tab — personal records */}
      {tab === "local" && (
        <div>
          {/* League tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {LEAGUE_ORDER.map(id => {
              const c = LEAGUES[id];
              const isActive = id === selected;
              return (
                <button key={id} onClick={() => setSelected(id)}
                  className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
                  style={{
                    backgroundColor: isActive ? `${c.themeColor}30` : "transparent",
                    color: isActive ? c.themeColor : "hsl(var(--muted-foreground))",
                    border: `1px solid ${isActive ? c.themeColor + "60" : "hsl(var(--border))"}`,
                  }}>
                  {t(`league_${id}` as any)}
                </button>
              );
            })}
          </div>

          {localEntries.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground py-12">
              <Trophy className="w-16 h-16 opacity-20" />
              <p className="text-center">{t("no_scores_yet")}</p>
              <Link href="/leagues"><Button variant="outline">{t("play")}</Button></Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-[2rem_1fr_auto_auto_auto] gap-3 px-4 text-xs text-muted-foreground uppercase">
                <span>{t("rank")}</span>
                <span>{username}</span>
                <span>{t("score")}</span>
                <span>{t("streak")}</span>
                <span />
              </div>
              {localEntries.map((entry, i) => {
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                return (
                  <div key={i}
                    className="grid grid-cols-[2rem_1fr_auto_auto_auto] gap-3 items-center px-4 py-4 rounded-2xl border"
                    style={{
                      backgroundColor: i === 0 ? `${cfg.themeColor}12` : "hsl(var(--card))",
                      borderColor: i === 0 ? `${cfg.themeColor}40` : "hsl(var(--border))",
                    }}>
                    <div className="font-bold text-sm w-8 text-center" style={{ color: i === 0 ? cfg.themeColor : undefined }}>
                      {medal ?? `${i + 1}`}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{username}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(entry.date)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black tabular-nums" style={{ color: cfg.themeColor }}>{entry.score}</div>
                      <div className="text-xs text-muted-foreground">{entry.accuracy}%</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold tabular-nums text-orange-400">×{entry.streak}</div>
                      <div className="text-xs text-muted-foreground">{entry.correct} ✓</div>
                    </div>
                    <div />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
