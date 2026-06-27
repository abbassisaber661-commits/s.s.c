import {
  Switch,
  Route,
  Router as WouterRouter,
  useLocation,
} from "wouter";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";

// Context
import { GameProvider, useGame } from "@/contexts/GameContext";
import { RealtimeProvider } from "@/contexts/RealtimeProvider";

// Core
import HomeScreen from "@/pages/HomeScreen";
import AuthScreen from "@/pages/AuthScreen";
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

// UI
import BottomNav from "@/components/BottomNav";
import LiveNotifToast from "@/components/LiveNotifToast";
import BetaBanner from "@/components/BetaBanner";
import BetaFeedbackWidget from "@/components/BetaFeedbackWidget";

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
 * ❗ Public routes (no auth required)
 */
const PUBLIC_PATHS = [
  "/match-arena",
  "/privacy",
  "/terms",
];

function AppShell() {
  const [location] = useLocation();
  const { isAuthenticated } = useGame();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    setUnread(unreadCount(getNotifications()));
  }, [location]);

  const hideNav = NO_NAV_PATHS.some((p) => location.startsWith(p));

  // 🔐 Auth Guard
  if (
    !isAuthenticated &&
    !PUBLIC_PATHS.some((p) => location.startsWith(p))
  ) {
    return <AuthScreen />;
  }

  return (
    <>
      <LiveNotifToast />

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

        {/* ================= FALLBACK ================= */}
        <Route component={NotFound} />
      </Switch>

      {!hideNav && <BottomNav unreadMessages={unread} />}

      <BetaBanner />
      <BetaFeedbackWidget />
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