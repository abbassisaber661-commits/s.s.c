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
import AuthScreen    from "@/pages/AuthScreen";
import LeagueDashboard  from "@/pages/LeagueDashboard";

// User System
import Profile              from "@/pages/ProfilePage";
import GameProfile          from "@/pages/GameProfile";
import FollowersPage        from "@/pages/FollowersPage";
import FollowingPage        from "@/pages/FollowingPage";
import ProfileSettingsPage  from "@/pages/ProfileSettingsPage";
import Leaderboard          from "@/pages/Leaderboard";
import Store         from "@/pages/Store";
import Wallet        from "@/pages/Wallet";
import Settings      from "@/pages/Settings";

// Social Hub
import Community     from "@/pages/Community";
import SocialPage    from "@/pages/SocialPage";
import FeedPage      from "@/pages/FeedPage";
import ReelsPage     from "@/pages/ReelsPage";
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

      <Switch>
        {/* Core */}
        <Route path="/" component={HomeScreen} />
        <Route path="/league-select" component={LeagueSelectPage} />

        {/* Profile system */}
        <Route path="/profile/:userId?" component={Profile} />
        <Route path="/game-profile/:userId?" component={GameProfile} />
        <Route path="/profile/:userId/followers" component={FollowersPage} />
        <Route path="/profile/:userId/following" component={FollowingPage} />
        <Route path="/profile-settings" component={ProfileSettingsPage} />

        {/* rest of routes */}
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/store" component={Store} />
        <Route path="/wallet" component={Wallet} />
        <Route path="/settings" component={Settings} />

        <Route path="/social" component={FeedPage} />
        <Route path="/feed" component={FeedPage} />
        <Route path="/reels" component={ReelsPage} />
        <Route path="/community" component={Community} />
        <Route path="/social-classic" component={SocialPage} />
        <Route path="/friends" component={FriendsPage} />
        <Route path="/chat/:username" component={ChatPage} />

        <Route path="/messages" component={Messages} />
        <Route path="/notifications" component={Notifications} />

        <Route path="/seasons" component={Seasons} />
        <Route path="/journey" component={Journey} />

        <Route path="/match-arena" component={MatchArena} />
        <Route path="/results" component={Results} />

        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />

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
  const playerId = authUser?.uid ?? null;

  return (
    <RealtimeProvider playerId={playerId}>
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