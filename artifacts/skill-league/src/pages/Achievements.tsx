import { useGame } from "@/contexts/GameContext";
import { useT } from "@/lib/i18n";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACHIEVEMENT_DEFS } from "@/lib/achievements";

const TIER_COLORS = {
  bronze: '#CD7F32',
  silver: '#A8A9AD',
  gold:   '#FFD700',
};

export default function Achievements() {
  const { language, achievements } = useGame();
  const t = useT(language);

  const unlockedSet = new Set(achievements.map(a => a.id));
  const unlockedCount = unlockedSet.size;

  const unlockedList = achievements.reduce((acc, a) => {
    acc[a.id] = a.date;
    return acc;
  }, {} as Record<string, string>);

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(language, { month: 'short', day: 'numeric' }); }
    catch { return ''; }
  };

  const byTier: Record<string, typeof ACHIEVEMENT_DEFS> = { gold: [], silver: [], bronze: [] };
  ACHIEVEMENT_DEFS.forEach(d => byTier[d.tier].push(d));

  return (
    <div className="min-h-screen bg-background p-5 flex flex-col max-w-md mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex-1">{t('achievements')}</h1>
        <div className="text-sm font-bold text-muted-foreground">
          {unlockedCount}/{ACHIEVEMENT_DEFS.length}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-2 bg-card rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-yellow-400 transition-all duration-700"
            style={{ width: `${(unlockedCount / ACHIEVEMENT_DEFS.length) * 100}%` }} />
        </div>
        <div className="text-xs text-muted-foreground mt-1.5 text-center">
          {Math.round((unlockedCount / ACHIEVEMENT_DEFS.length) * 100)}% {t('completed')}
        </div>
      </div>

      {/* Tier groups */}
      {(['gold', 'silver', 'bronze'] as const).map(tier => (
        <div key={tier} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TIER_COLORS[tier] }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: TIER_COLORS[tier] }}>
              {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {byTier[tier].map(def => {
              const isUnlocked = unlockedSet.has(def.id);
              const date = unlockedList[def.id];
              const tc = TIER_COLORS[tier];

              return (
                <div key={def.id}
                  className="flex items-center gap-4 rounded-2xl p-4 border transition-all"
                  style={{
                    backgroundColor: isUnlocked ? `${tc}10` : 'hsl(var(--card))',
                    borderColor: isUnlocked ? `${tc}40` : 'hsl(var(--border))',
                    opacity: isUnlocked ? 1 : 0.5,
                  }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: isUnlocked ? `${tc}20` : 'hsl(var(--card))' }}>
                    {isUnlocked ? def.icon : '🔒'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm" style={{ color: isUnlocked ? tc : undefined }}>
                      {def.name}
                    </div>
                    <div className="text-xs text-muted-foreground">{def.desc}</div>
                    {isUnlocked && date && (
                      <div className="text-xs mt-1" style={{ color: `${tc}80` }}>{formatDate(date)}</div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {def.rewardDN > 0 && (
                      <div className="text-xs text-yellow-400 font-bold">+{def.rewardDN} DN$</div>
                    )}
                    {def.rewardElo > 0 && (
                      <div className="text-xs text-primary font-bold">+{def.rewardElo} ELO</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
