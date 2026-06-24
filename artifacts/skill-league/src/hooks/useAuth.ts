import { useGame } from "@/contexts/GameContext";
import { getStoredPlayerId } from "@/lib/apiClient";

export function useAuth() {
  const { authUser, username, isAuthenticated, isGuest } = useGame();
  const playerId = getStoredPlayerId();

  return {
    user: authUser
      ? { id: playerId ?? authUser.uid, uid: authUser.uid, username }
      : null,
    isAuthenticated,
    isGuest,
  };
}
