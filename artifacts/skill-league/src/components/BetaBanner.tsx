import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bug, Wifi, WifiOff, ChevronRight } from 'lucide-react';
import { BETA_VERSION, getBetaAccess, getBetaTierLabel } from '@/lib/betaSystem';
import { isOfflineMode } from '@/lib/syncService';
import { Link } from 'wouter';

export default function BetaBanner() {
  const [visible, setVisible] = useState(true);
  const access  = getBetaAccess();
  const offline = isOfflineMode();

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        className="relative z-50 w-full px-3 py-1.5 flex items-center justify-between gap-2 text-xs"
        style={{
          background: 'linear-gradient(90deg, #7c3aed22, #a855f733, #7c3aed22)',
          borderBottom: '1px solid #7c3aed44',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-purple-400 shrink-0">β {BETA_VERSION}</span>
          {access.granted && (
            <span className="text-purple-300/80 truncate hidden sm:inline">
              {getBetaTierLabel(access.tier)}
            </span>
          )}
          <span className="text-muted-foreground/60 hidden md:inline">·</span>
          <span className="text-muted-foreground/60 hidden md:inline">نسخة تجريبية — قد تحتوي على أخطاء</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {offline ? (
            <span className="flex items-center gap-1 text-amber-400">
              <WifiOff size={11} />
              <span className="hidden sm:inline">غير متصل</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-green-400">
              <Wifi size={11} />
              <span className="hidden sm:inline">متصل</span>
            </span>
          )}
          <Link href="/beta-dashboard">
            <button className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors">
              <Bug size={12} />
              <span className="hidden sm:inline">لوحة Beta</span>
              <ChevronRight size={10} />
            </button>
          </Link>
          <button onClick={() => setVisible(false)} className="text-muted-foreground/50 hover:text-muted-foreground p-0.5">
            <X size={12} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
