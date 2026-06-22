import { useState, useCallback } from "react";
import { toast } from "sonner";
import { api, getStoredPlayerId } from "@/lib/apiClient";

export function useFollowUser(userId: string) {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async (action: "follow" | "unfollow") => {
      const followerId = getStoredPlayerId();

      if (!followerId || !userId) {
        toast.error("Unable to perform action");
        return;
      }

      try {
        setIsPending(true);

        if (action === "follow") {
          await api.followers.follow(userId, followerId);
          toast.success("Followed successfully");
        } else {
          await api.followers.unfollow(userId, followerId);
          toast.success("Unfollowed successfully");
        }
      } catch (error) {
        console.error(error);
        toast.error("Operation failed");
      } finally {
        setIsPending(false);
      }
    },
    [userId]
  );

  return {
    isPending,
    mutate,
  };
}