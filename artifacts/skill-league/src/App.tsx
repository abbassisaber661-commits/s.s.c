import {
  Switch,
  Route,
  Router as WouterRouter,
  useLocation,
  Link,
} from "wouter";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";

// Context
import { GameProvider, useGame } from "@/contexts/GameContext";
import { RealtimeProvider } from "@/contexts/RealtimeProvider";
import { EntryLanguageProvider } from "@/contexts/EntryLanguageContext";

// Entry
import SplashScreen from "@/pages/SplashScreen";
import SubscriptionPage from "@/pages/SubscriptionPage";
import NotFound from "@/pages/not-found";

// Core
import HomeScreen from "@/pages/HomeScreen";

// Game
import LeagueSelectPage from "@/pages/LeagueSelectPage";
import CompetePage from "@/pages/CompetePage";
import LeagueDetailsPage from "@/pages/LeagueDetailsPage";
import MatchArena from "@/pages/MatchArena";
import Results from "@/pages/Results";

// Profile System
import Profile from "@/pages/ProfilePage";
import UserProfile from "@/pages/UserProfile";
import GameProfile from "@/pages/GameProfile";
import FollowersPage from "@/pages/FollowersPage";
import FollowingPage from "@/pages/FollowingPage";
import ProfileSettingsPage from "@/pages/ProfileSettingsPage";

// Social (UNIFIED)
import FeedPage from "@/pages/FeedPage";
import ReelsPage from "@/pages/ReelsPage";
import SearchPage from "@/pages/SearchPage";

// Legacy Social
import SocialPage from "@/pages/SocialPage";
import Community from "@/pages/Community";
import FriendsPage from "@/pages/FriendsPage";

// Marketplace & Jobs
import Marketplace from "@/pages/Marketplace";
import JobsPage from "@/pages/JobsPage";

// Communication
import Messages from "@/pages/Messages";
import Notifications from "@/pages/Notifications";
import ChatPage from "@/pages/ChatPage";

// Competitive
import Leaderboard from "@/pages/Leaderboard";
import Seasons from "@/pages/Seasons";
import Journey from "@/pages/Journey";

// Economy
import Store from "@/pages/Store";
import Wallet from "@/pages/Wallet";

// Settings
import Settings from "@/pages/Settings";

// Admin
import AdminVerificationPanel from "@/pages/AdminVerificationPanel";
import OwnerPanel from "@/pages/OwnerPanel";

// UI
import BottomNav from "@/components/BottomNav";
import SocialBottomNav from "@/components/SocialBottomNav";
import LiveNotifToast from "@/components/LiveNotifToast";
import NotificationBell from "@/components/NotificationBell";
import GuestBanner from "@/components/GuestBanner";
import { Logo } from "@/components/Logo";

// Utils
import { getNotifications, unreadCount } from "@/lib/messages";
import {
  hasActiveLocalSubscription,
  getLocalSubscription,
  saveLocalSubscription,
  type SubscriptionPlanId,
} from "@/lib/pi-subscription";
import { api, getStoredPlayerId } from "@/lib/apiClient";

const queryClient = new QueryClient();

/** Routes that hide bottom navigation */
const NO_NAV_PATHS = ["/results", "/match-arena", "/chat/"];

/** Social section routes — show SocialBottomNav */
const SOCIAL_PATHS = ["/feed", "/social", "/friends", "/jobs", "/marketplace", "/reels", "/search", "/community"];

// ─────────────────────────────────────────────────────────────────────────────
// Main App Shell (rendered only after subscription gate is passed)
// ─────────────────────────────────────────────────────────────────────────────

function AppShell() {
  const [location] = useLocation();
  const { isGuest } = useGame();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    setUnread(unreadCount(getNotifications()));
  }, [location]);

  // Initialise theme from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sl_theme") as "dark" | "light" | null;
      const theme = saved === "light" ? "light" : "dark";
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.classList.add(theme);
    } catch {}
  }, []);

  const hideNav    = NO_NAV_PATHS.some((p) => location.startsWith(p));
  const showSocial = !hideNav && SOCIAL_PATHS.some((p) => location.startsWith(p));
  const onSettings = location === "/settings";

  // Expose top-bar height as a CSS variable so overlays (e.g. NotificationPanel) can anchor below it
  useEffect(() => {
    const h = isGuest ? 88 : 52;
    document.documentElement.style.setProperty("--topbar-h", `${h}px`);
  }, [isGuest]);

  return (
    <>
      {/* Guest mode top banner — pushes no layout, overlays only */}
      <GuestBanner />
      <LiveNotifToast />

      {/* Top navigation bar — hidden on settings/match pages */}
      {!hideNav && !onSettings && (
        <div
          style={{
            position: "fixed",
            top: isGuest ? 36 : 0,
            left: 0,
            right: 0,
            zIndex: 10100,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Left: Logo + app name */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo size={36} rounded="rounded-xl" />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  background: "linear-gradient(135deg, #e9d5ff, #a78bfa, #818cf8)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                S.S.C
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "rgba(167,139,250,0.55)",
                  marginTop: 2,
                }}
              >
                SkillLeague Social Channel
              </span>
            </div>
          </div>

          {/* Right: Notification bell + Messages + Menu */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <NotificationBell />
            <Link href="/messages">
              <button
                className="w-10 h-10 flex items-center justify-center rounded-2xl active:scale-90 transition-transform"
                style={{
                  background: "rgba(0,0,0,0.35)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                aria-label="Messages"
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>✉️</span>
              </button>
            </Link>
            <Link href="/settings">
              <button
                className="w-10 h-10 flex items-center justify-center rounded-2xl active:scale-90 transition-transform"
                style={{
                  background: "rgba(0,0,0,0.35)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                aria-label="Settings"
              >
                <span className="text-white font-bold text-lg leading-none select-none">☰</span>
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Spacer so fixed top nav doesn't overlap page content */}
      <div style={{ paddingTop: !hideNav && !onSettings ? (isGuest ? 88 : 52) : 0 }}>
      <Switch>
        {/* ── CORE ── */}
        <Route path="/"                  component={HomeScreen} />
        <Route path="/league-select"     component={LeagueSelectPage} />
        <Route path="/league/:leagueId"  component={LeagueDetailsPage} />
        <Route path="/compete"           component={CompetePage} />

        {/* ── GAME ── */}
        <Route path="/match-arena"       component={MatchArena} />
        <Route path="/results"           component={Results} />

        {/* ── PROFILE ── */}
        <Route path="/profile/:userId?"              component={Profile} />
        <Route path="/game-profile/:userId?"         component={GameProfile} />
        <Route path="/profile/:userId/followers"     component={FollowersPage} />
        <Route path="/profile/:userId/following"     component={FollowingPage} />
        <Route path="/profile-settings"              component={ProfileSettingsPage} />

        {/* ── SOCIAL ── */}
        <Route path="/feed"              component={FeedPage} />
        <Route path="/social"            component={FeedPage} />
        <Route path="/reels"             component={ReelsPage} />
        <Route path="/search"            component={SearchPage} />
        <Route path="/user/:username"    component={UserProfile} />

        {/* Legacy */}
        <Route path="/social-classic"   component={SocialPage} />
        <Route path="/community"        component={Community} />
        <Route path="/friends"          component={FriendsPage} />
        <Route path="/marketplace"      component={Marketplace} />
        <Route path="/jobs"             component={JobsPage} />

        {/* ── COMMUNICATION ── */}
        <Route path="/messages"          component={Messages} />
        <Route path="/notifications"     component={Notifications} />
        <Route path="/chat/:username"    component={ChatPage} />

        {/* ── PROGRESSION ── */}
        <Route path="/leaderboard"       component={Leaderboard} />
        <Route path="/seasons"           component={Seasons} />
        <Route path="/journey"           component={Journey} />

        {/* ── ECONOMY ── */}
        <Route path="/store"             component={Store} />
        <Route path="/wallet"            component={Wallet} />

        {/* ── SETTINGS ── */}
        <Route path="/settings"          component={Settings} />

        {/* ── ADMIN ── */}
        <Route path="/admin/verification" component={AdminVerificationPanel} />
        <Route path="/owner-panel"        component={OwnerPanel} />

        {/* ── FALLBACK ── */}
        <Route component={NotFound} />
      </Switch>
      </div>{/* end top-nav spacer wrapper */}

      {!hideNav && !showSocial && <BottomNav unreadMessages={unread} />}
      {showSocial && <SocialBottomNav />}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscription gate (shown after splash if no valid subscription)
// Re-renders to SubscriptionPage when an in-session subscription expires.
// ─────────────────────────────────────────────────────────────────────────────

function SubscriptionGate({ playerId }: { playerId: string }) {
  // Force a re-render precisely when the stored subscription expires,
  // so a mid-session expiry sends the user back to this gate immediately.
  const [, setTick] = useState(0);

  useEffect(() => {
    const sub = getLocalSubscription();
    if (!sub || sub.playerId !== playerId) return;
    const msUntilExpiry = sub.expiresAt - Date.now();
    if (msUntilExpiry <= 0) return; // already expired — gate handles it
    const t = setTimeout(() => setTick((n) => n + 1), msUntilExpiry + 500);
    return () => clearTimeout(t);
  }, [playerId]);

  // Use the same backend player.id (nanoid) key as confirmSubscription()
  const hasValidSub = hasActiveLocalSubscription(playerId);

  if (hasValidSub) {
    // Subscription is active — hand off to the router (won't reach here normally,
    // but handles the case where the expiry timer fires and sub was just renewed).
    return null; // AppRoot will re-evaluate on next render
  }

  return (
    <EntryLanguageProvider>
      <SubscriptionPage />
    </EntryLanguageProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root controller: Splash → Subscription gate → App
// ─────────────────────────────────────────────────────────────────────────────

function AppRoot() {
  const { isAuthenticated, authUser } = useGame();
  const [splashDone, setSplashDone]   = useState(false);
  // Expiry tick — incremented by SubscriptionGate when subscription expires,
  // and also incremented after a successful backend subscription hydration.
  const [expiryTick, setExpiryTick]   = useState(0);
  // Tracks whether a backend subscription check is currently in flight.
  const [subChecking, setSubChecking] = useState(false);
  // Ref: the playerId we most recently ran a backend check for.
  // Prevents re-checking the same player more than once per session.
  const subCheckedForRef = useRef<string | null>(null);

  const handleSplashDone = useCallback(() => setSplashDone(true), []);

  // Derive these before hooks (hooks must not be called conditionally).
  const isPiUser       = authUser?.authMode === "pi";
  const isGuest        = authUser?.authMode === "guest";
  // Use storedPlayerId (backend player.id nanoid) — NOT authUser.uid (Pi UUID).
  // These are two different identifiers:
  //   authUser.uid     = Pi Network UUID  (used for Pi identity, from /v2/me)
  //   storedPlayerId   = backend player.id (nanoid, returned by POST /api/auth/pi)
  //
  // confirmSubscription() stores sub.playerId = authResp.player.id (nanoid).
  // hasActiveLocalSubscription() must check the same identifier, so we pass
  // storedPlayerId here. Passing authUser.uid (Pi UUID) always produces a
  // mismatch and the gate permanently fails for all Pi users.
  const storedPlayerId = getStoredPlayerId();
  const hasValidSub    = isPiUser && hasActiveLocalSubscription(storedPlayerId ?? undefined);

  // ── Backend subscription check ────────────────────────────────────────────
  // When a Pi user is authenticated but has no valid local subscription
  // (common on a new device, or after clearing localStorage), query the
  // backend DB once.  If an active subscription is found, hydrate localStorage
  // so the rest of the gate logic works normally.
  //
  // This does NOT change the authentication flow, the Pi SDK calls, or the
  // payment flow — it only fills the local cache from the authoritative DB.
  useEffect(() => {
    if (!splashDone)      return; // wait until after splash
    if (!isAuthenticated) return;
    if (!isPiUser)        return;
    if (hasValidSub)      return; // local cache already valid — no need to check
    if (!storedPlayerId)  return; // JWT not yet stored (auth still in progress)
    // Only run once per player per session
    if (subCheckedForRef.current === storedPlayerId) return;

    subCheckedForRef.current = storedPlayerId;
    setSubChecking(true);

    api.subscriptions.status(storedPlayerId)
      .then((result) => {
        if (result.active && result.plan && result.expiresAt) {
          // Hydrate the local subscription cache from the backend record
          saveLocalSubscription({
            playerId:    storedPlayerId,
            plan:        result.plan as SubscriptionPlanId,
            piTxId:      result.piTxId ?? "",
            expiresAt:   new Date(result.expiresAt).getTime(),
            confirmedAt: Date.now(),
          });
          // Bump tick to trigger a re-render; hasValidSub will now be true
          setExpiryTick((n) => n + 1);
        }
        // If result.active is false, fall through — SubscriptionPage will render
      })
      .catch(() => {
        // Network failure — fall through to SubscriptionPage so the user can
        // retry.  No error shown here; the subscription page handles it.
      })
      .finally(() => setSubChecking(false));
  }, [splashDone, isAuthenticated, isPiUser, hasValidSub, storedPlayerId]);

  // ── Splash phase ──────────────────────────────────────────────────────────
  // AnimatePresence stays mounted at all times so the SplashScreen exit
  // animation (`exit` prop on motion.div) can actually execute before unmount.
  if (!splashDone) {
    return (
      <AnimatePresence mode="wait">
        <SplashScreen key="splash" onDone={handleSplashDone} />
      </AnimatePresence>
    );
  }

  // ── Guest user → full app (browse-only, GuestBanner shown inside AppShell)
  if (isAuthenticated && isGuest) {
    return (
      <RealtimeProvider playerId={null}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppShell />
        </WouterRouter>
      </RealtimeProvider>
    );
  }

  // ── Valid Pi subscription → full app ──────────────────────────────────────
  if (isAuthenticated && hasValidSub) {
    return (
      <RealtimeProvider playerId={authUser!.uid}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          {/* SubscriptionGate mounts invisibly to watch for expiry */}
          <SubscriptionGate playerId={storedPlayerId!} key={`gate-${expiryTick}`} />
          <AppShell />
        </WouterRouter>
      </RealtimeProvider>
    );
  }

  // ── Backend check in progress → brief loading screen ─────────────────────
  // Prevents flicker to SubscriptionPage while we're waiting for the DB query.
  if (isAuthenticated && isPiUser && subChecking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg,#0a0818 0%,#130d2e 50%,#0a0818 100%)",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "3px solid rgba(124,58,237,0.25)",
            borderTopColor: "#7c3aed",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>
          Verifying subscription…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── No valid subscription → subscription page ─────────────────────────────
  return (
    <EntryLanguageProvider>
      <SubscriptionPage />
    </EntryLanguageProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App root
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GameProvider>
          <AppRoot />
        </GameProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
