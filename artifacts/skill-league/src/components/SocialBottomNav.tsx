import { Link, useLocation } from "wouter";
import { Home, Users, PenSquare, Briefcase, ShoppingBag, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { useT, isRTL } from "@/lib/i18n";
import { useCreatePost } from "@/hooks/useCommunity";
import CreatePost from "@/components/social/CreatePost";

export default function SocialBottomNav() {
  const [location] = useLocation();
  const { language, authUser } = useGame();
  const t = useT(language);
  const rtl = isRTL(language);
  const { mutate: createPost } = useCreatePost();
  const [postOpen, setPostOpen] = useState(false);

  const username = authUser?.username ?? "guest";

  const NAV_ITEMS = [
    { href: "/feed",        icon: Home,        label: t("nav_social") || "Home"    },
    { href: "/friends",     icon: Users,       label: t("nav_friends") || "Friends" },
    { href: "/jobs",        icon: Briefcase,   label: t("nav_jobs") || "Jobs"       },
    { href: "/marketplace", icon: ShoppingBag, label: t("nav_market") || "Market"  },
  ];

  async function handlePost(content: string, imageUrl?: string) {
    return new Promise<void>((resolve, reject) => {
      createPost(
        { content, imageUrl, username },
        {
          onSuccess: () => { setPostOpen(false); resolve(); },
          onError: (err) => reject(err),
        }
      );
    });
  }

  return (
    <>
      {/* Social Bottom Nav Bar — sits above the main BottomNav (~64px) */}
      <div
        className="fixed left-0 right-0 z-40"
        dir={rtl ? "rtl" : "ltr"}
        style={{ bottom: "64px" }}
      >
        {/* Glass border line */}
        <div
          className="w-full h-px"
          style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary)/0.4), transparent)" }}
        />
        <div
          className="px-1 pb-1 pt-1"
          style={{
            background: "hsl(var(--background)/0.97)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <div className="flex items-end justify-around max-w-md mx-auto gap-1">
            {/* Home + Friends */}
            {NAV_ITEMS.slice(0, 2).map((item) => {
              const active =
                location === item.href ||
                (item.href !== "/" && location.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <button className="relative flex flex-col items-center gap-0.5 py-2 px-3 min-w-[52px] active:scale-90 transition-transform">
                    {active && (
                      <motion.div
                        layoutId="socialNavPill"
                        className="absolute inset-0 rounded-2xl"
                        style={{ background: "hsl(var(--primary)/0.12)" }}
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                    {active && (
                      <motion.div
                        layoutId="socialNavDot"
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

            {/* CENTER: Post Button */}
            <div className="flex flex-col items-center -mt-4">
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setPostOpen(true)}
                className="flex flex-col items-center justify-center w-14 h-14 rounded-full shadow-lg relative"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.75))",
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

            {/* Jobs + Market */}
            {NAV_ITEMS.slice(2, 4).map((item) => {
              const active =
                location === item.href ||
                (item.href !== "/" && location.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <button className="relative flex flex-col items-center gap-0.5 py-2 px-3 min-w-[52px] active:scale-90 transition-transform">
                    {active && (
                      <motion.div
                        layoutId={`socialNavPill_${item.href}`}
                        className="absolute inset-0 rounded-2xl"
                        style={{ background: "hsl(var(--primary)/0.12)" }}
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                    {active && (
                      <motion.div
                        layoutId={`socialNavDot_${item.href}`}
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
          </div>
        </div>
      </div>

      {/* Post Creation Bottom Sheet */}
      <AnimatePresence>
        {postOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(0,0,0,0.55)" }}
              onClick={() => setPostOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
              style={{ background: "hsl(var(--background))", maxHeight: "90vh" }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: "hsl(var(--muted-foreground)/0.35)" }}
                />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-2">
                <span className="text-base font-bold" style={{ color: "hsl(var(--foreground))" }}>
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
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
