import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameProvider } from "@/contexts/GameContext";
import { useGame } from "@/contexts/GameContext";
import BottomNav from "@/components/BottomNav";
import { getNotifications, unreadCount } from "@/lib/messages";
import { useState, useEffect } from "react";
import NotFound from "@/pages/not-found";
import AuthScreen from "@/pages/AuthScreen";

import Home            from "@/pages/Home";
import LeagueSelect    from "@/pages/LeagueSelect";
import Game            from "@/pages/Game";
import Results         from "@/pages/Results";
import Rules           from "@/pages/Rules";
import Profile         from "@/pages/Profile";
import Leaderboard     from "@/pages/Leaderboard";
import Achievements    from "@/pages/Achievements";
import DailyChallenges from "@/pages/DailyChallenges";
import PvP             from "@/pages/PvP";
import Rooms           from "@/pages/Rooms";
import Tournament      from "@/pages/Tournament";
import Seasons         from "@/pages/Seasons";
import Community       from "@/pages/Community";
import Store           from "@/pages/Store";
import WeeklyMissions  from "@/pages/WeeklyMissions";
import Messages        from "@/pages/Messages";
import Wallet          from "@/pages/Wallet";
import PiLock          from "@/pages/PiLock";
import Settings        from "@/pages/Settings";
import Journey         from "@/pages/Journey";

const queryClient = new QueryClient();

// Pages that should NOT show BottomNav
const NO_NAV_PATHS = ['/game/', '/results'];

function AppShell() {
  const [location] = useLocation();
  const [unread, setUnread] = useState(0);
  const { isAuthenticated } = useGame();

  useEffect(() => {
    setUnread(unreadCount(getNotifications()));
  }, [location]);

  const hideNav = NO_NAV_PATHS.some(p => location.startsWith(p));

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <>
      <Switch>
        <Route path="/"                  component={Home} />
        <Route path="/leagues"           component={LeagueSelect} />
        <Route path="/game/:league"      component={Game} />
        <Route path="/results"           component={Results} />
        <Route path="/rules"             component={Rules} />
        <Route path="/profile"           component={Profile} />
        <Route path="/leaderboard"       component={Leaderboard} />
        <Route path="/achievements"      component={Achievements} />
        <Route path="/daily-challenges"  component={DailyChallenges} />
        <Route path="/pvp"               component={PvP} />
        <Route path="/rooms"             component={Rooms} />
        <Route path="/tournament"        component={Tournament} />
        <Route path="/seasons"           component={Seasons} />
        <Route path="/community"         component={Community} />
        <Route path="/store"             component={Store} />
        <Route path="/weekly-missions"   component={WeeklyMissions} />
        <Route path="/messages"          component={Messages} />
        <Route path="/wallet"            component={Wallet} />
        <Route path="/pi-lock"           component={PiLock} />
        <Route path="/settings"          component={Settings} />
        <Route path="/journey"           component={Journey} />
        <Route component={NotFound} />
      </Switch>
      {!hideNav && <BottomNav unreadMessages={unread} />}
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GameProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppShell />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </GameProvider>
    </QueryClientProvider>
  );
}
