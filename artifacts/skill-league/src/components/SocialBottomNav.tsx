import { Link, useLocation } from "wouter";
import { Home, Briefcase, PenSquare, ShoppingBag, ArrowLeft, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useGame } from "@/contexts/GameContext";
import { useT, isRTL } from "@/lib/i18n";
import { useCreatePost } from "@/hooks/useCommunity";
import { getStoredPlayerId } from "@/lib/apiClient";
import CreatePost from "@/components/social/CreatePost";

export default function SocialBottomNav() {
  const [location, navigate] = useLocation();
  const { language, authUser } = useGame();
  const t = useT(language);
  const rtl = isRTL(language);
  const { mutate: createPost } = useCreatePost();

  const [postOpen, setPostOpen] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  const username = authUser?.username ?? "guest";

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

  async function handlePost(content: string, imageUrl?: string) {
    return new Promise<void>((resolve, reject) => {
      const authorId = getStoredPlayerId() ?? undefined;
      createPost(
        { content, imageUrl, username, authorId },
        {
          onSuccess: () => { setPostOpen(false); resolve(); },
          onError: (err) => reject(err),
        }
      );
    });
  }

  function handleBack() {
    window.history.back();
  }

  const LEFT_ITEMS = [
    { href: "/feed",  icon: Home,        label: t("nav_social") || "Home" },
    { href: "/jobs",  icon: Briefcase,   label: t("nav_jobs")   || "Job"  },
  ];

  const RIGHT_ITEMS = [
    { href: "/marketplace", icon: ShoppingBag, label: t("nav_market") || "Market" },
  ];

  return (
    <>
      {/* ── Social Bottom Nav Bar ── */}
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

            {/* ── CENTER: Post Button ── */}
            <div className="flex flex-col items-center -mt-4">
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setPostOpen(true)}
                className="flex flex-col items-center justify-center w-14 h-14 rounded-full shadow-lg relative"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.75))",
                  boxShadow: "0 4px 20px hsl(var(--primary)/0.45)",
                }}
                aria-label="Create post"
              >
                <PenSquare className="w-6 h-6 text-white" strokeWidth={2} />
              </motion.button>
              <span
                className="text-[10px] font-bold mt-1"
                style={{ color: "hsl(var(--primary))" }}
              >
                {t("nav_post") || "Post"}
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

      {/* ── Post Creation Bottom Sheet ── */}
      <AnimatePresence>
        {postOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(0,0,0,0.55)" }}
              onClick={() => setPostOpen(false)}
            />

            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
              style={{ background: "hsl(var(--background))", maxHeight: "90vh" }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: "hsl(var(--muted-foreground)/0.35)" }}
                />
              </div>

              <div className="flex items-center justify-between px-4 pb-2">
                <span
                  className="text-base font-bold"
                  style={{ color: "hsl(var(--foreground))" }}
                >
                  {t("createPost.title") || "Create Post"}
                </span>
                <button
                  onClick={() => setPostOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: "hsl(var(--muted)/0.6)" }}
                  aria-label="Close"
                >
                  <X className="w-4 h-4" style={{ color: "hsl(var(--foreground))" }} />
                </button>
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: "calc(90vh - 80px)" }}>
                <CreatePost
                  onPost={handlePost}
                  username={username}
                  defaultOpen={true}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
