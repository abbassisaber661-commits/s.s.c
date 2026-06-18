import { useGame } from "@/contexts/GameContext";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

interface Props {
  message?: string;
}

export default function GuestBanner({ message }: Props) {
  const { isGuest, loginAsGuest } = useGame();
  const [, navigate] = useLocation();

  if (!isGuest) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-3 rounded-2xl overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(79,70,229,0.1))', border: '1px solid rgba(124,58,237,0.3)' }}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        <span className="text-2xl flex-shrink-0">🔒</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-purple-300">وضع الضيف — ميزة مقيّدة</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {message || 'هذه الميزة متاحة فقط للأعضاء المسجّلين. سجّل دخولك للاستمتاع بالتجربة الكاملة.'}
          </p>
        </div>
      </div>
      <button
        onClick={() => navigate('/')}
        className="w-full py-2.5 text-center text-sm font-bold text-white active:scale-95 transition-transform"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
      >
        تسجيل الدخول الآن
      </button>
    </motion.div>
  );
}
