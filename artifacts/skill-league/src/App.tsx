import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameProvider } from "@/contexts/GameContext";
import NotFound from "@/pages/not-found";

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

const queryClient = new QueryClient();

function Router() {
  return (
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
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GameProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </GameProvider>
    </QueryClientProvider>
  );
}
