import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";

import { GameProvider } from "@/contexts/GameContext";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import { useGame } from "@/contexts/GameContext";

// Core Pages
import HomeScreen from "@/pages/HomeScreen";
import CinematicIntro from "@/pages/CinematicIntro";
import LeaguesHub from "@/pages/LeaguesHub";
import LeagueSelect from "@/pages/LeagueSelect";
import MatchEntry from "@/pages/MatchEntry";
import MatchArena from "@/pages/MatchArena";
import Game from "@/pages/Game";
import Results from "@/pages/Results";
import NotFound from "@/pages/not-found";
import AuthScreen from "@/pages/AuthScreen";

// Advanced Pages
import Profile from "@/pages/Profile";
import Leaderboard from "@/pages/Leaderboard";
import Store from "@/pages/Store";
import Wallet from "@/pages/Wallet";
import Settings from "@/pages/Settings";

// Beta / System Pages
import BetaDashboard from "@/pages/BetaDashboard";
import MonitorDashboard from "@/pages/MonitorDashboard";
import ReleasePage from "@/pages/ReleasePage";

// UI Components
import BottomNav from "@/components/BottomNav";
import LiveNotifToast from "@/components/LiveNotifToast";
import BetaBanner from "@/components/BetaBanner";
import BetaFeedbackWidget from "@/components/BetaFeedbackWidget";

// Utils
import { getNotifications, unreadCount } from "@/lib/messages";

const queryClient = new QueryClient();

const NO_NAV_PATHS = [
  "/game/",
  "/results",
  "/ai-coach",
  "/intro",
  "/hub",
  "/match-entry/",
  "/match-arena",
];

function AppShell() {
  const [location] = useLocation();
  const [unread, setUnread] = useState(0);
  const { isAuthenticated } = useGame();

  useEffect(() => {
    setUnread(unreadCount(getNotifications()));
  }, [location]);

  const hideNav = NO_NAV_PATHS.some((p) => location.startsWith(p));

  const PUBLIC_PATHS = ["/match-arena", "/league-hub"];

  if (!isAuthenticated && !PUBLIC_PATHS.some((p) => location.startsWith(p))) {
    return <AuthScreen />;
  }

  return (
    <>
      <LiveNotifToast />

      <Switch>
        {/* Core Flow */}
        <Route path="/" component={HomeScreen} />
        <Route path="/intro" component={CinematicIntro} />
        <Route path="/hub" component={LeaguesHub} />
        <Route path="/leagues" component={LeagueSelect} />

        {/* Match System */}
        <Route path="/match-entry/:league" component={MatchEntry} />
        <Route path="/match-arena" component={MatchArena} />
        <Route path="/game/:league" component={Game} />
        <Route path="/results" component={Results} />

        {/* User System */}
        <Route path="/profile" component={Profile} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/store" component={Store} />
        <Route path="/wallet" component={Wallet} />
        <Route path="/settings" component={Settings} />

        {/* Beta System */}
        <Route path="/beta-dashboard" component={BetaDashboard} />
        <Route path="/monitor" component={MonitorDashboard} />
        <Route path="/release" component={ReleasePage} />

        <Route component={NotFound} />
      </Switch>

      {!hideNav && <BottomNav unreadMessages={unread} />}
      <BetaBanner />
      <BetaFeedbackWidget />
    </>
  );
}

function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  const { authUser } = useGame();
  const playerId = authUser?.id ?? null;

  return <RealtimeProvider playerId={playerId}>{children}</RealtimeProvider>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GameProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthenticatedProviders>
              <AppShell />
            </AuthenticatedProviders>
          </WouterRouter>
        </TooltipProvider>
      </GameProvider>
    </QueryClientProvider>
  );
}
