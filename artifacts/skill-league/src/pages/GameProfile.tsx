import { useEffect, useState, useMemo } from "react";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { Logo } from "@/components/Logo";
import { getLevelTitle, xpProgressInLevel } from "@/lib/xp";

function getRank(elo: number) {
  if (elo < 800) return { name: "Bronze", color: "#cd7f32", icon: "🥉" };
  if (elo < 1200) return { name: "Silver", color: "#c0c0c0", icon: "🥈" };
  if (elo < 1600) return { name: "Gold", color: "#fbbf24", icon: "🥇" };
  return { name: "Legend", color: "#a855f7", icon: "👑" };
}

export default function GameProfile() {
  const { userId } = useParams();
  const game = useGame();

  const [player, setPlayer] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const res = await fetch(`/api/users/${userId || game.authUser?.uid}`);
      const data = await res.json();

      const res2 = await fetch(`/api/matches/${userId || game.authUser?.uid}`);
      const matchData = await res2.json();

      setPlayer(data);
      setMatches(matchData || []);
      setLoading(false);
    }

    load();
  }, [userId]);

  if (loading) return <LoadingScreen />;

  const rank = getRank(player.elo);
  const xp = xpProgressInLevel(player.xp);
  const level = getLevelTitle(player.level);

  const winRate =
    player.wins + player.losses === 0
      ? 0
      : Math.round((player.wins / (player.wins + player.losses)) * 100);

  const aiStyle = useMemo(() => {
    if (player.wins > player.losses + 15) return "Aggressive Striker ⚔️";
    if (player.losses > player.wins) return "Defensive Builder 🛡️";
    return "Balanced Midfield ⚖️";
  }, [player]);

  const marketValue = useMemo(() => {
    return player.elo * 12 + player.wins * 50;
  }, [player]);

  return (
    <div className="min-h-screen text-white bg-black overflow-hidden">

      {/* ── Back button ── */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors active:scale-90"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-white/70" />
        </button>
        <span className="text-sm font-bold text-white/60">Game Profile</span>
      </div>

      {/* HERO */}
      <div className="p-6 flex items-center gap-4">
        <Avatar name={player.username} />

        <div>
          <h1 className="text-2xl font-black">{player.username}</h1>
          <p className="text-white/50">{level.title}</p>
          <XPBar pct={xp.pct} />
        </div>
      </div>

      {/* RANK + VALUE */}
      <div className="mx-6 grid grid-cols-2 gap-3">
        <Card title="Rank" value={rank.name} color={rank.color} icon={rank.icon} />
        <Card title="Market Value" value={marketValue} color="#22c55e" />
      </div>

      {/* STATS CORE */}
      <div className="p-6 space-y-2">
        <Stat label="Wins" value={player.wins} />
        <Stat label="Losses" value={player.losses} />
        <Stat label="Win Rate" value={winRate + "%"} />
        <Stat label="ELO" value={player.elo} />
      </div>

      {/* AI ANALYSIS */}
      <div className="mx-6 p-4 rounded-2xl bg-purple-900/20 border border-purple-500/20">
        <h3 className="font-black">🧠 AI Scout Report</h3>
        <p className="text-sm text-white/70 mt-2">{aiStyle}</p>
        <p className="text-xs text-white/40 mt-2">
          Recommendation: Improve defensive stability to reach higher tier.
        </p>
      </div>

      {/* MATCH HISTORY */}
      <div className="p-6">
        <h3 className="font-black mb-2">🎥 Career Matches</h3>

        <div className="space-y-2">
          {matches.slice(0, 6).map((m, i) => (
            <motion.div
              key={i}
              className="p-3 rounded-xl bg-white/5 border border-white/10 flex justify-between"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <span>{m.opponent}</span>
              <span className={m.win ? "text-green-400" : "text-red-400"}>
                {m.win ? "WIN" : "LOSS"}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* FOOTER EVOLUTION */}
      <div className="mx-6 mb-10 p-4 rounded-2xl bg-gradient-to-r from-purple-900/30 to-blue-900/20">
        <p className="text-sm">
          ⚡ Player Evolution System Active — Career is dynamically tracking growth
        </p>
      </div>
    </div>
  );
}

/* ───── Components ───── */

function LoadingScreen() {
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 text-purple-400 font-black">
      <Logo size={72} rounded="rounded-2xl" />
      LOADING PLAYER DATA...
    </div>
  );
}

function Avatar({ name }: any) {
  return (
    <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-3xl font-black">
      {name?.[0]?.toUpperCase()}
    </div>
  );
}

function XPBar({ pct }: any) {
  return (
    <div className="w-52 h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
      <div className="h-full bg-purple-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Card({ title, value, color, icon }: any) {
  return (
    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
      <p className="text-xs text-white/50">{title}</p>
      <p className="text-lg font-black" style={{ color }}>
        {icon} {value}
      </p>
    </div>
  );
}

function Stat({ label, value }: any) {
  return (
    <div className="flex justify-between text-sm border-b border-white/5 py-1">
      <span className="text-white/50">{label}</span>
      <span className="font-black">{value}</span>
    </div>
  );
}