import { xpProgressInLevel, getLevelTitle } from '@/lib/xp';
import { motion } from 'framer-motion';

interface Props {
  xp: number;
  level: number;
  compact?: boolean;
}

export default function XPBar({ xp, level, compact = false }: Props) {
  const { current, needed, pct } = xpProgressInLevel(xp);
  const { title, color } = getLevelTitle(level);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-xs font-bold tabular-nums" style={{ color }}>Lv.{level}</div>
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden min-w-[60px]">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tabular-nums" style={{ color }}>
            {level}
          </span>
          <div>
            <div className="font-bold text-sm leading-none" style={{ color }}>{title}</div>
            <div className="text-muted-foreground leading-none mt-0.5">Level</div>
          </div>
        </div>
        <div className="text-right text-muted-foreground">
          <span className="font-bold text-foreground tabular-nums">{current}</span>
          <span> / {needed} XP</span>
        </div>
      </div>
      <div className="h-3 bg-card rounded-full overflow-hidden border border-border">
        <motion.div
          className="h-full rounded-full relative overflow-hidden"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse" style={{ animationDuration: '2s' }} />
        </motion.div>
      </div>
    </div>
  );
}
