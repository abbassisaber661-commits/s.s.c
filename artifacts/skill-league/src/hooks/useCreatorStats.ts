import { useState, useEffect, useCallback } from "react";
import { useRealtime } from "@/contexts/RealtimeContext";
import { api } from "@/lib/apiClient";

export interface GiftStats {
  totalReceivedDN: number;
  totalSentDN: number;
  netBalance: number;
  totalReceived: number;
  totalSent: number;
  totalGiftTransactions: number;
}

export interface WalletStats {
  dnBalance: number;
  totalIncome: number;
  totalSpending: number;
}

export interface CreatorRank {
  globalRank: number | null;
  earnerRank: number | null;
  supporterRank: number | null;
  topSupporterName: string | null;
  topSupporterAmount: number;
}

export interface CreatorBadge {
  id: string;
  icon: string;
  label: string;
  gradient: string;
  glow: string;
}

export interface CreatorStats {
  giftStats: GiftStats | null;
  walletStats: WalletStats | null;
  rank: CreatorRank;
  badges: CreatorBadge[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

function computeBadges(
  giftStats: GiftStats | null,
  rank: CreatorRank,
  postsCount: number,
): CreatorBadge[] {
  const badges: CreatorBadge[] = [];

  if (rank.earnerRank !== null && rank.earnerRank <= 10) {
    badges.push({
      id: "top-earner",
      icon: "🥇",
      label: "Top Earner",
      gradient: "from-amber-400 to-yellow-600",
      glow: "rgba(251,191,36,0.5)",
    });
  }

  if (rank.supporterRank !== null && rank.supporterRank <= 10) {
    badges.push({
      id: "top-supporter",
      icon: "🥈",
      label: "Top Supporter",
      gradient: "from-slate-300 to-slate-500",
      glow: "rgba(148,163,184,0.5)",
    });
  }

  if (
    giftStats &&
    giftStats.totalReceivedDN > 0 &&
    giftStats.totalReceived >= 3
  ) {
    badges.push({
      id: "trending",
      icon: "🔥",
      label: "Trending Creator",
      gradient: "from-orange-500 to-red-600",
      glow: "rgba(239,68,68,0.5)",
    });
  }

  if (postsCount >= 3) {
    badges.push({
      id: "active",
      icon: "⭐",
      label: "Active Creator",
      gradient: "from-violet-500 to-purple-700",
      glow: "rgba(139,92,246,0.5)",
    });
  }

  return badges;
}

export function useCreatorStats(userId: string, postsCount: number): CreatorStats {
  const { liveLeaderboard, subscribeLeaderboard } = useRealtime();

  const [giftStats, setGiftStats] = useState<GiftStats | null>(null);
  const [walletStats, setWalletStats] = useState<WalletStats | null>(null);
  const [rank, setRank] = useState<CreatorRank>({
    globalRank: null,
    earnerRank: null,
    supporterRank: null,
    topSupporterName: null,
    topSupporterAmount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setIsError(false);

    try {
      const [gifts, wallet, earners, supporters] = await Promise.allSettled([
        api.gifts.userStats(userId),
        api.wallet.getBalance(userId),
        api.leaderboardDN.topEarners(50),
        api.leaderboardDN.topSupporters(50),
      ]);

      if (gifts.status === "fulfilled") {
        const g = gifts.value;
        setGiftStats({
          totalReceivedDN: g.totalReceivedDN,
          totalSentDN: g.totalSentDN,
          netBalance: g.totalReceivedDN - g.totalSentDN,
          totalReceived: g.totalReceived,
          totalSent: g.totalSent,
          totalGiftTransactions: g.totalGiftTransactions,
        });
      }

      if (wallet.status === "fulfilled") {
        setWalletStats(wallet.value);
      }

      const earnersList =
        earners.status === "fulfilled" ? earners.value : [];
      const supportersList =
        supporters.status === "fulfilled" ? supporters.value : [];

      const earnerIdx = earnersList.findIndex((e) => e.playerId === userId);
      const supporterIdx = supportersList.findIndex(
        (s) => s.playerId === userId,
      );

      // Top supporter for this user: person who sent the most DN to this user
      // We approximate from earners list: the user who sent most to this receiver
      // (gift-ledger /gifts/user/:id/history would need grouping, so we use top-supporters list for now)
      const topSupporter =
        supportersList.length > 0 ? supportersList[0] : null;

      setRank((prev) => ({
        ...prev,
        earnerRank: earnerIdx >= 0 ? earnerIdx + 1 : null,
        supporterRank: supporterIdx >= 0 ? supporterIdx + 1 : null,
        topSupporterName: topSupporter?.username ?? null,
        topSupporterAmount: topSupporter
          ? Number((topSupporter as any).totalSentDN ?? 0)
          : 0,
      }));
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Update global rank from live leaderboard
  useEffect(() => {
    if (!liveLeaderboard?.length) return;
    const idx = liveLeaderboard.findIndex((e) => e.id === userId);
    setRank((prev) => ({
      ...prev,
      globalRank: idx >= 0 ? idx + 1 : prev.globalRank,
    }));
  }, [liveLeaderboard, userId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Subscribe to live leaderboard
  useEffect(() => {
    subscribeLeaderboard();
  }, [subscribeLeaderboard]);

  const badges = computeBadges(giftStats, rank, postsCount);

  return {
    giftStats,
    walletStats,
    rank,
    badges,
    isLoading,
    isError,
    refetch: fetchAll,
  };
}
