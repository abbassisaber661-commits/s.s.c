import { Link, useLocation } from "wouter";
import { Home, Swords, Trophy, ShoppingBag, User } from "lucide-react";
import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { useT, isRTL } from "@/lib/i18n";

interface BottomNavProps {
  unreadMessages?: number;
}

export default function BottomNav({ unreadMessages = 0 }: BottomNavProps) {
  const [location] = useLocation();
  const { language } = useGame();
  const t = useT(language);
  const rtl = isRTL(language);

  const NAV_ITEMS = [
    { href: '/',           icon: Home,        label: t('nav_home')       },
    { href: '/pvp',        icon: Swords,      label: t('nav_compete')    },
    { href: '/tournament', icon: Trophy,      label: t('nav_tournament') },
    { href: '/store',      icon: ShoppingBag, label: t('nav_store')      },
    { href: '/profile',    icon: User,        label: t('nav_profile')    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="bg-background/95 backdrop-blur-xl border-t border-border/60 px-1 pb-safe">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {NAV_ITEMS.map(item => {
            const active = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <button className="relative flex flex-col items-center gap-0.5 py-2.5 px-2 min-w-[52px] active:scale-90 transition-transform">
                  {active && (
                    <motion.div
                      layoutId="navPill"
                      className="absolute inset-0 rounded-2xl"
                      style={{ background: 'hsl(var(--primary)/0.12)' }}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  {active && (
                    <motion.div
                      layoutId="bottomNavDot"
                      className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full bg-primary"
                    />
                  )}
                  <motion.div
                    animate={{ scale: active ? 1.12 : 1, y: active ? -1 : 0 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 22 }}
                    className="relative"
                  >
                    <Icon
                      className="w-5 h-5"
                      strokeWidth={active ? 2.5 : 1.75}
                      style={{ color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
                    />
                  </motion.div>
                  <span
                    className="text-[10px] font-bold transition-colors relative z-10"
                    style={{ color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
                  >
                    {item.label}
                  </span>
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
