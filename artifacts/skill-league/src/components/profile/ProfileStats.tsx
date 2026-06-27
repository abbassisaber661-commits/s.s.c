import { cn } from "@/lib/utils";

type Props = {
  xp: number;
  level: number;
  posts: number;
  followers: number;
  following: number;
  coins: number;
  winRate: number;
  className?: string;
};

const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000)     return (num / 1_000).toFixed(num >= 10_000 ? 0 : 1) + "K";
  return num.toString();
};

const StatCard = ({ label, value, icon }: { label: string; value: string | number; icon?: string }) => (
  <div className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm border border-[#E5E5E5] hover:shadow-md transition-shadow">
    {icon && <span className="text-xl">{icon}</span>}
    <div className="flex flex-col min-w-0">
      <span className="text-xs text-[#666666] tracking-wide">{label}</span>
      <span className="font-bold text-base text-[#111111] truncate">{value}</span>
    </div>
  </div>
);

export default function ProfileStats({ xp, level, posts, followers, following, coins, winRate, className }: Props) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard label="Level"    value={level}              icon="🎯" />
        <StatCard label="XP"       value={formatNumber(xp)}   icon="⚡" />
        <StatCard label="Coins"    value={formatNumber(coins)} icon="🪙" />
        <StatCard label="Win Rate" value={`${winRate}%`}       icon="🏆" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Posts"     value={formatNumber(posts)}     icon="📝" />
        <StatCard label="Followers" value={formatNumber(followers)} icon="👥" />
        <StatCard label="Following" value={formatNumber(following)} icon="🔍" />
      </div>
    </div>
  );
}
