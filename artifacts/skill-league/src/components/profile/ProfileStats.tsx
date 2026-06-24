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

// تنسيق الأرقام (1K, 2.5M, ...)
const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(num >= 10_000 ? 0 : 1) + "K";
  return num.toString();
};

// بطاقة إحصائية قابلة لإعادة الاستخدام
const StatCard = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: string;
}) => (
  <div
    className={cn(
      "bg-white dark:bg-gray-900 rounded-xl p-3 flex items-center gap-3",
      "shadow-sm border border-gray-100 dark:border-gray-800",
      "transition hover:shadow-md"
    )}
  >
    {icon && <span className="text-xl">{icon}</span>}
    <div className="flex flex-col min-w-0">
      <span className="text-xs text-gray-400 dark:text-gray-500 tracking-wide">
        {label}
      </span>
      <span className="font-bold text-base text-gray-900 dark:text-white truncate">
        {value}
      </span>
    </div>
  </div>
);

export default function ProfileStats({
  xp,
  level,
  posts,
  followers,
  following,
  coins,
  winRate,
  className,
}: Props) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* الصف الأول: إحصائيات التقدم */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard label="المستوى" value={level} icon="🎯" />
        <StatCard label="XP" value={formatNumber(xp)} icon="⚡" />
        <StatCard label="العملات" value={formatNumber(coins)} icon="🪙" />
        <StatCard label="نسبة الفوز" value={`${winRate}%`} icon="🏆" />
      </div>

      {/* الصف الثاني: إحصائيات التواصل */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="المشاركات" value={formatNumber(posts)} icon="📝" />
        <StatCard label="المتابعون" value={formatNumber(followers)} icon="👥" />
        <StatCard label="يتابع" value={formatNumber(following)} icon="🔍" />
      </div>
    </div>
  );
}