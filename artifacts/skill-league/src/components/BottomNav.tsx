import { Link, useLocation } from "wouter";
import { Home, Swords, Trophy, MessageCircle, User, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

interface BottomNavProps {
  unreadMessages?: number;
}

const NAV_ITEMS = [
  { href: '/',           icon: Home,          labelAr: 'الرئيسية' },
  { href: '/pvp',        icon: Swords,        labelAr: 'منافسة'   },
  { href: '/tournament', icon: Trophy,        labelAr: 'بطولة'    },
  { href: '/store',      icon: ShoppingBag,   labelAr: 'المتجر'   },
  { href: '/profile',    icon: User,          labelAr: 'ملفي'     },
];

export default function BottomNav({ unreadMessages = 0 }: BottomNavProps) {
  const [location] = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30">
      <div className="bg-background/95 backdrop-blur-xl border-t border-border/60 px-1 pb-safe">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {NAV_ITEMS.map(item => {
            const active = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            const Icon = item.icon;
            const showBadge = item.href === '/community' && unreadMessages > 0;
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
                    {showBadge && (
                      <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    )}
                  </motion.div>
                  <span
                    className="text-[10px] font-bold transition-colors relative z-10"
                    style={{ color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
                  >
                    {item.labelAr}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="bottomNavDot"
                      className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full bg-primary"
                    />
                  )}
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
