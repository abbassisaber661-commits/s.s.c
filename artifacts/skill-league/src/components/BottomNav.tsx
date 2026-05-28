import { Link, useLocation } from "wouter";
import { Home, Swords, Trophy, MessageCircle, User } from "lucide-react";
import { motion } from "framer-motion";

interface BottomNavProps {
  unreadMessages?: number;
}

const NAV_ITEMS = [
  { href: '/',          icon: Home,          label: 'Home' },
  { href: '/pvp',       icon: Swords,        label: 'Ranked' },
  { href: '/tournament',icon: Trophy,        label: 'Cup' },
  { href: '/community', icon: MessageCircle, label: 'Feed' },
  { href: '/profile',   icon: User,          label: 'Profile' },
];

export default function BottomNav({ unreadMessages = 0 }: BottomNavProps) {
  const [location] = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden">
      <div className="bg-background/95 backdrop-blur-lg border-t border-border/60 px-2 pb-safe">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {NAV_ITEMS.map(item => {
            const active = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <button className="relative flex flex-col items-center gap-0.5 py-2.5 px-3 min-w-[52px] active:scale-90 transition-transform">
                  <motion.div
                    animate={{ scale: active ? 1.15 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.75}
                      style={{ color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} />
                  </motion.div>
                  <span className="text-[10px] font-semibold transition-colors"
                    style={{ color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}>
                    {item.label}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="bottomNavDot"
                      className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                    />
                  )}
                  {item.href === '/community' && unreadMessages > 0 && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
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
