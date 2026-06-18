import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";

import { GameProvider } from "@/contexts/GameContext";
import { RealtimeProvider } from "@/contexts/RealtimeProvider";
import { useGame } from "@/contexts/GameContext";

// Core Pages
import HomeScreen    from "@/pages/HomeScreen";
import LeagueSelectPage from "@/pages/LeagueSelectPage";
import LeagueDetailsPage from "@/pages/LeagueDetailsPage";
import MatchArena    from "@/pages/MatchArena";
import Results       from "@/pages/Results";
import NotFound      from "@/pages/not-found";
import AuthScreen       from "@/pages/AuthScreen";
import LeagueDashboard  from "@/pages/LeagueDashboard";

// User System
import Profile       from "@/pages/ProfilePage";
import Leaderboard   from "@/pages/Leaderboard";
import Store         from "@/pages/Store";
import Wallet        from "@/pages/Wallet";
import Settings      from "@/pages/Settings";

// Social Hub
import Community     from "@/pages/Community";
import SocialPage    from "@/pages/SocialPage";
import FriendsPage   from "@/pages/FriendsPage";
import ChatPage      from "@/pages/ChatPage";

// Competitive
import PvP           from "@/pages/PvP";
import CompetePage   from "@/pages/CompetePage";
import Tournament    from "@/pages/Tournament";
import Rooms         from "@/pages/Rooms";
import Seasons       from "@/pages/Seasons";

// Progression & Missions
import Journey        from "@/pages/Journey";
import Career         from "@/pages/Career";
import DailyChallenges from "@/pages/DailyChallenges";
import DailyRewards   from "@/pages/DailyRewards";
import WeeklyMissions from "@/pages/WeeklyMissions";
import Achievements   from "@/pages/Achievements";

// Social & Community
import Messages       from "@/pages/Messages";
import Chat           from "@/pages/Chat";
import Notifications  from "@/pages/Notifications";
import Clans          from "@/pages/Clans";
import Events         from "@/pages/Events";
import UserProfile    from "@/pages/UserProfile";
import SearchPage     from "@/pages/SearchPage";
import TrendingPage   from "@/pages/TrendingPage";
import HashtagFeedPage from "@/pages/HashtagFeedPage";

// Arcade
import ArcadePage    from "@/pages/ArcadePage";

// Economy & Shop
import VIP           from "@/pages/VIP";
import Marketplace   from "@/pages/Marketplace";

// Info & Tools
import News          from "@/pages/News";
import Analytics     from "@/pages/Analytics";
import AICoach       from "@/pages/AICoach";
import PiLock        from "@/pages/PiLock";

// Legal Pages
import PrivacyPolicy   from "@/pages/PrivacyPolicy";
import TermsOfService  from "@/pages/TermsOfService";

// Beta / System Pages
import BetaDashboard   from "@/pages/BetaDashboard";
import MonitorDashboard from "@/pages/MonitorDashboard";
import ReleasePage     from "@/pages/ReleasePage";
import EconomyDashboard from "@/pages/EconomyDashboard";

// UI Components
import BottomNav         from "@/components/BottomNav";
import LiveNotifToast    from "@/components/LiveNotifToast";
import BetaBanner        from "@/components/BetaBanner";
import BetaFeedbackWidget from "@/components/BetaFeedbackWidget";
// Utils
import { getNotifications, unreadCount } from "@/lib/messages";

const queryClient = new QueryClient();

const NO_NAV_PATHS = [
  "/results",
  "/ai-coach",
  "/match-arena",
  "/chat/",
];

function AppShell() {
  const [location] = useLocation();
  const [unread, setUnread] = useState(0);
  const { isAuthenticated } = useGame();

  useEffect(() => {
    setUnread(unreadCount(getNotifications()));
  }, [location]);

  const hideNav = NO_NAV_PATHS.some((p) => location.startsWith(p));

  const PUBLIC_PATHS = ["/match-arena", "/league-hub", "/privacy", "/terms", "/puzzle-live"];

  if (!isAuthenticated && !PUBLIC_PATHS.some((p) => location.startsWith(p))) {
    return <AuthScreen />;
  }

  return (
    <>
      <LiveNotifToast />

      <Switch>  {/* ── Core Flow ───────────────────────────── */}
        <Route path="/"                    component={HomeScreen} />
        <Route path="/league-select"       component={LeagueSelectPage} />
        <Route path="/leagues"             >{() => <Redirect to="/league-select" />}</Route>
        <Route path="/intro"               >{() => <Redirect to="/league-select" />}</Route>
        <Route path="/hub"                 >{() => <Redirect to="/league-select" />}</Route>
        <Route path="/league-hub"          >{() => <Redirect to="/league-select" />}</Route>
        <Route path="/league/:leagueId"    component={LeagueDetailsPage} />
        <Route path="/league-dashboard"    component={LeagueDashboard} />

        {/* ── Match System (V2 — MatchArena only) ─── */}
        <Route path="/match-arena"         component={MatchArena} />
        <Route path="/match-entry/:league" >{() => <Redirect to="/league-select" />}</Route>
        <Route path="/game/:league"        >{() => <Redirect to="/league-select" />}</Route>
        <Route path="/results"             component={Results} />

        {/* ── User System ─────────────────────────── */}
        <Route path="/profile"             component={Profile} />
        <Route path="/leaderboard"         component={Leaderboard} />
        <Route path="/store"               component={Store} />
        <Route path="/wallet"              component={Wallet} />
        <Route path="/settings"            component={Settings} />

        {/* ── Social Hub ──────────────────────────── */}
        <Route path="/social"              component={SocialPage} />
        <Route path="/friends"             component={FriendsPage} />
        <Route path="/chat/:username"      component={ChatPage} />
        <Route path="/community"           component={Community} />
        <Route path="/user/:username"      component={UserProfile} />
        <Route path="/messages"            component={Messages} />
        <Route path="/notifications"       component={Notifications} />
        {/* ── Social Engine (Phase 2-5) ───────── */}
        <Route path="/search"              component={SearchPage} />
        <Route path="/trending"            component={TrendingPage} />
        <Route path="/hashtag/:tag"        component={HashtagFeedPage} />

        {/* ── Competitive ─────────────────────────── */}
        <Route path="/compete"             component={CompetePage} />
        <Route path="/pvp"                 component={PvP} />
        <Route path="/tournament"          component={Tournament} />
        <Route path="/rooms"               component={Rooms} />
        <Route path="/seasons"             component={Seasons} />

        {/* ── Progression & Missions ──────────────── */}
        <Route path="/journey"             component={Journey} />
        <Route path="/career"              component={Career} />
        <Route path="/daily-challenges"    component={DailyChallenges} />
        <Route path="/daily-rewards"       component={DailyRewards} />
        <Route path="/weekly-missions"     component={WeeklyMissions} />
        <Route path="/achievements"        component={Achievements} />

        {/* ── Social & Clans ──────────────────────── */}
        <Route path="/clans"               component={Clans} />
        <Route path="/events"              component={Events} />

        {/* ── Arcade ──────────────────────────────── */}
        <Route path="/arcade"              component={ArcadePage} />

        {/* ── Economy & Shop ──────────────────────── */}
        <Route path="/vip"                 component={VIP} />
        <Route path="/marketplace"         component={Marketplace} />

        {/* ── Info & Tools ────────────────────────── */}
        <Route path="/news"                component={News} />
        <Route path="/analytics"           component={Analytics} />
        <Route path="/ai-coach"            component={AICoach} />
        <Route path="/pi-lock"             component={PiLock} />

        {/* ── Legal (public) ──────────────────────── */}
        <Route path="/privacy"             component={PrivacyPolicy} />
        <Route path="/terms"               component={TermsOfService} />

        {/* ── Beta / System ───────────────────────── */}
        <Route path="/beta-dashboard"      component={BetaDashboard} />
        <Route path="/monitor"             component={MonitorDashboard} />
        <Route path="/release"             component={ReleasePage} />
        <Route path="/admin/economy-dashboard" component={EconomyDashboard} />

        <Route component={NotFound} />
      </Switch>

      {!hideNav && <BottomNav unreadMessages={unread} />}
      <BetaBanner />
      <BetaFeedbackWidget />
    </>
  );
}

function NotificationsPopup() {
  return null;
}

function AppContent() {
  const { authUser } = useGame();
  const playerId = authUser?.uid ?? null;

  return (
    <RealtimeProvider playerId={playerId}>
      <NotificationsPopup />
      <WouterRouter
        base={import.meta.env.BASE_URL.replace(/\/$/, "")}
      >
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