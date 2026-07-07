import { Link, useLocation } from "wouter";
import { Home, Briefcase, Tv, ShoppingBag, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useGame } from "@/contexts/GameContext";
import { useT, isRTL } from "@/lib/i18n";

export default function SocialBottomNav() {
  const [location, navigate] = useLocation();
  const { language } = useGame();
  const t = useT(language);
  const rtl = isRTL(language);

  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  /* ── Scroll-direction tracking (no timers) ── */
  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      if (delta > 6) {
        setNavVisible(false);
      } else if (delta < -6) {
        setNavVisible(true);
      }
      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Re-show nav when route changes ── */
  useEffect(() => {
    setNavVisible(true);
    lastScrollY.current = window.scrollY;
  }, [location]);

  function handleBack() {
    navigate("/");
  }

  const LEFT_ITEMS = [
    { href: "/feed",  icon: Home,        label: t("nav_social") || "Home" },
    { href: "/jobs",  icon: Briefcase,   label: t("nav_jobs")   || "Job"  },
  ];

  const RIGHT_ITEMS = [
    { href: "/marketplace", icon: ShoppingBag, label: t("nav_market") || "Market" },
  ];

  return (
    <motion.div
      className="fixed left-0 right-0 z-40"
      dir={rtl ? "rtl" : "ltr"}
      style={{ bottom: 0 }}
      animate={{ y: navVisible ? 0 : "100%", opacity: navVisible ? 1 : 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 36, mass: 0.75 }}
    >
      {/* Top accent line */}
      <div
        className="w-full h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, hsl(var(--primary)/0.45), transparent)",
        }}
      />

      <div
        className="px-1 pb-safe pt-1"
        style={{
          background: "hsl(var(--background)/0.97)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-end justify-around max-w-md mx-auto gap-1">

          {/* ── Left side: Home + Job ── */}
          {LEFT_ITEMS.map((item) => {
            const active =
              location === item.href ||
              (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <button className="relative flex flex-col items-center gap-0.5 py-2 px-3 min-w-[52px] active:scale-90 transition-transform">
                  {active && (
                    <motion.div
                      layoutId={`snavPill_${item.href}`}
                      className="absolute inset-0 rounded-2xl"
                      style={{ background: "hsl(var(--primary)/0.12)" }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  {active && (
                    <motion.div
                      layoutId={`snavDot_${item.href}`}
                      className="absolute -top-px left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-primary"
                    />
                  )}
                  <motion.div
                    animate={{ scale: active ? 1.12 : 1, y: active ? -1 : 0 }}
                    transition={{ type: "spring", stiffness: 450, damping: 22 }}
                  >
                    <Icon
                      className="w-5 h-5"
                      strokeWidth={active ? 2.5 : 1.75}
                      style={{
                        color: active
                          ? "hsl(var(--primary))"
                          : "hsl(var(--muted-foreground))",
                      }}
                    />
                  </motion.div>
                  <span
                    className="text-[10px] font-bold transition-colors relative z-10"
                    style={{
                      color: active
                        ? "hsl(var(--primary))"
                        : "hsl(var(--muted-foreground))",
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              </Link>
            );
          })}

          {/* ── CENTER: Channel ── */}
          <div className="flex flex-col items-center -mt-4">
            <Link href="/community">
              <motion.button
                whileTap={{ scale: 0.88 }}
                className="flex flex-col items-center justify-center w-14 h-14 rounded-full shadow-lg relative"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.75))",
                  boxShadow: "0 4px 20px hsl(var(--primary)/0.45)",
                }}
                aria-label="Channel"
              >
                <Tv className="w-6 h-6 text-white" strokeWidth={2} />
              </motion.button>
            </Link>
            <span
              className="text-[10px] font-bold mt-1"
              style={{ color: "hsl(var(--primary))" }}
            >
              {t("nav_channel") || "Channel"}
            </span>
          </div>

          {/* ── Right side: Market ── */}
          {RIGHT_ITEMS.map((item) => {
            const active =
              location === item.href ||
              (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <button className="relative flex flex-col items-center gap-0.5 py-2 px-3 min-w-[52px] active:scale-90 transition-transform">
                  {active && (
                    <motion.div
                      layoutId={`snavPill_${item.href}`}
                      className="absolute inset-0 rounded-2xl"
                      style={{ background: "hsl(var(--primary)/0.12)" }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  {active && (
                    <motion.div
                      layoutId={`snavDot_${item.href}`}
                      className="absolute -top-px left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-primary"
                    />
                  )}
                  <motion.div
                    animate={{ scale: active ? 1.12 : 1, y: active ? -1 : 0 }}
                    transition={{ type: "spring", stiffness: 450, damping: 22 }}
                  >
                    <Icon
                      className="w-5 h-5"
                      strokeWidth={active ? 2.5 : 1.75}
                      style={{
                        color: active
                          ? "hsl(var(--primary))"
                          : "hsl(var(--muted-foreground))",
                      }}
                    />
                  </motion.div>
                  <span
                    className="text-[10px] font-bold transition-colors relative z-10"
                    style={{
                      color: active
                        ? "hsl(var(--primary))"
                        : "hsl(var(--muted-foreground))",
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              </Link>
            );
          })}

          {/* ── Back Button ── */}
          <button
            onClick={handleBack}
            className="relative flex flex-col items-center gap-0.5 py-2 px-3 min-w-[52px] active:scale-90 transition-transform"
            aria-label="Back to Home"
          >
            <motion.div
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 450, damping: 22 }}
            >
              <ArrowLeft
                className="w-5 h-5"
                strokeWidth={1.75}
                style={{ color: "hsl(var(--muted-foreground))" }}
              />
            </motion.div>
            <span
              className="text-[10px] font-bold relative z-10"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Back
            </span>
          </button>

        </div>
      </div>
    </motion.div>
  );
}
