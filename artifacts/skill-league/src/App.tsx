import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameProvider } from "@/contexts/GameContext";
import NotFound from "@/pages/not-found";

import Home        from "@/pages/Home";
import LeagueSelect from "@/pages/LeagueSelect";
import Game        from "@/pages/Game";
import Results     from "@/pages/Results";
import Rules       from "@/pages/Rules";
import Profile     from "@/pages/Profile";
import Leaderboard from "@/pages/Leaderboard";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/"            component={Home} />
      <Route path="/leagues"     component={LeagueSelect} />
      <Route path="/game/:league" component={Game} />
      <Route path="/results"     component={Results} />
      <Route path="/rules"       component={Rules} />
      <Route path="/profile"     component={Profile} />
      <Route path="/leaderboard" component={Leaderboard} />
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
