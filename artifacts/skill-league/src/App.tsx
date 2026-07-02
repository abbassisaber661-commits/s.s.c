import {
  Switch,
  Route,
  Router as WouterRouter,
  useLocation,
  Link,
} from "wouter";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";

// Context
import { GameProvider, useGame } from "@/contexts/GameContext";
import { RealtimeProvider } from "@/contexts/RealtimeProvider";

// Core
import HomeScreen from "@/pages/HomeScreen";
import EntryFlow from "@/pages/EntryFlow";
import NotFound from "@/pages/not-found";

// Game
import LeagueSelectPage from "@/pages/LeagueSelectPage";
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

// Legacy / Optional Social (can remove later if unused)
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

// Subscription (standalone route — no payment triggered here, just plan selection)
import SubscriptionPage from "@/pages/SubscriptionPage";
import { EntryLanguageProvider } from "@/contexts/EntryLanguageContext";

/** Standalone subscription page — accessible by guests who dismissed the entry flow. */
function SubscriptionRoute() {
  const [, navigate] = useLocation();
  return (
    <EntryLanguageProvider>
      <SubscriptionPage onBack={() => navigate("/")} />
    </EntryLanguageProvider>
  );
}

// UI
import BottomNav from "@/components/BottomNav";
import SocialBottomNav from "@/components/SocialBottomNav";
import LiveNotifToast from "@/components/LiveNotifToast";
import NotificationBell from "@/components/NotificationBell";

// Utils
import { getNotifications, unreadCount } from "@/lib/messages";

const queryClient = new QueryClient();

/**
 * ❗ Routes that should hide bottom navigation
 */
const NO_NAV_PATHS = [
  "/results",
  "/match-arena",
  "/chat/",
];

/**
 * 🌐 Social section routes — show SocialBottomNav here
 */
const SOCIAL_PATHS = [
  "/feed",
  "/social",
  "/friends",
  "/jobs",
  "/marketplace",
];

/**
 * ❗ Public routes (no auth required)
 */
const PUBLIC_PATHS = [
  "/match-arena",
  "/privacy",
  "/terms",
];

function AppShell() {
  const [location] = useLocation();
  const { isAuthenticated, isGuest } = useGame();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    setUnread(unreadCount(getNotifications()));
  }, [location]);

  const hideNav = NO_NAV_PATHS.some((p) => location.startsWith(p));
  const showSocialNav = !hideNav && SOCIAL_PATHS.some((p) => location.startsWith(p));

  // Initialise theme from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sl_theme") as "dark" | "light" | null;
      const theme = saved === "light" ? "light" : "dark";
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.classList.add(theme);
    } catch {}
  }, []);

  // 🔐 Auth Guard
  // - Unauthenticated users → always show entry flow
  // - Pi/paid users → persistent across sessions, skip entry flow
  // - Guests → sessionStorage flag allows them through for the current session only;
  //   on next app open the flag is gone → entry flow appears again
  const guestSessionActive = (() => { try { return sessionStorage.getItem("sl_guest_active") === "1"; } catch { return false; } })();

  if (
    (!isAuthenticated || (isGuest && !guestSessionActive)) &&
    !PUBLIC_PATHS.some((p) => location.startsWith(p))
  ) {
    return <EntryFlow />;
  }

  const onSettingsPage = location === "/settings";

  return (
    <>
      <LiveNotifToast />

      {/* ── Top-right cluster: Bell + Settings — hidden on social/settings pages ── */}
      {!hideNav && !onSettingsPage && !showSocialNav && (
        <div
          style={{
            position: "fixed",
            top: 12,
            right: 12,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <NotificationBell />
          <Link href="/settings">
            <button
              className="w-10 h-10 flex items-center justify-center rounded-2xl active:scale-90 transition-transform"
              style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)" }}
              aria-label="Settings"
            >
              <span className="text-white font-bold text-lg leading-none select-none">☰</span>
            </button>
          </Link>
        </div>
      )}

      <Switch>
        {/* ================= CORE ================= */}
        <Route path="/" component={HomeScreen} />
        <Route path="/league-select" component={LeagueSelectPage} />

        {/* ================= GAME ================= */}
        <Route path="/match-arena" component={MatchArena} />
        <Route path="/results" component={Results} />

        {/* ================= PROFILE ================= */}
        <Route path="/profile/:userId?" component={Profile} />
        <Route path="/game-profile/:userId?" component={GameProfile} />
        <Route path="/profile/:userId/followers" component={FollowersPage} />
        <Route path="/profile/:userId/following" component={FollowingPage} />
        <Route path="/profile-settings" component={ProfileSettingsPage} />

        {/* ================= SOCIAL (UNIFIED SYSTEM) ================= */}
        <Route path="/feed" component={FeedPage} />
        <Route path="/social" component={FeedPage} />
        <Route path="/reels" component={ReelsPage} />
        <Route path="/search" component={SearchPage} />

        {/* User profile by username (from search results / legacy links) */}
        <Route path="/user/:username" component={UserProfile} />

        {/* Legacy social (kept for compatibility) */}
        <Route path="/social-classic" component={SocialPage} />
        <Route path="/community" component={Community} />
        <Route path="/friends" component={FriendsPage} />
        <Route path="/marketplace" component={Marketplace} />
        <Route path="/jobs" component={JobsPage} />

        {/* ================= COMMUNICATION ================= */}
        <Route path="/messages" component={Messages} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/chat/:username" component={ChatPage} />

        {/* ================= PROGRESSION ================= */}
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/seasons" component={Seasons} />
        <Route path="/journey" component={Journey} />

        {/* ================= ECONOMY ================= */}
        <Route path="/store" component={Store} />
        <Route path="/wallet" component={Wallet} />

        {/* ================= SETTINGS ================= */}
        <Route path="/settings" component={Settings} />

        {/* ================= ADMIN ================= */}
        <Route path="/admin/verification" component={AdminVerificationPanel} />
        <Route path="/owner-panel" component={OwnerPanel} />

        {/* ================= SUBSCRIPTION (standalone) ================= */}
        <Route path="/subscription" component={SubscriptionRoute} />

        {/* ================= FALLBACK ================= */}
        <Route component={NotFound} />
      </Switch>

      {!hideNav && !showSocialNav && <BottomNav unreadMessages={unread} />}
      {showSocialNav && <SocialBottomNav />}
    </>
  );
}

function AppContent() {
  const { authUser } = useGame();

  return (
    <RealtimeProvider playerId={authUser?.uid ?? null}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AppShell />
      </WouterRouter>
    </RealtimeProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GameProvider>
          <AppContent />
        </GameProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}