// ─────────────────────────────────────────────
// 💰 SkillLeague Economy Engine
// ─────────────────────────────────────────────

export interface Wallet {
  coins: number;
  gems: number;
}

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  currency: "coins" | "gems";
}

export function createWallet(): Wallet {
  return {
    coins: 0,
    gems: 0,
  };
}

export function addCoins(
  wallet: Wallet,
  amount: number
): Wallet {
  return {
    ...wallet,
    coins: wallet.coins + amount,
  };
}

export function addGems(
  wallet: Wallet,
  amount: number
): Wallet {
  return {
    ...wallet,
    gems: wallet.gems + amount,
  };
}

export function canBuy(
  wallet: Wallet,
  item: ShopItem
) {
  if (item.currency === "coins") {
    return wallet.coins >= item.price;
  }

  return wallet.gems >= item.price;
}

export function buyItem(
  wallet: Wallet,
  item: ShopItem
): Wallet {
  if (!canBuy(wallet, item)) {
    return wallet;
  }

  if (item.currency === "coins") {
    return {
      ...wallet,
      coins: wallet.coins - item.price,
    };
  }

  return {
    ...wallet,
    gems: wallet.gems - item.price,
  };
}

// ─────────────────────────────────────────────
// 🏆 ECONOMY TIERS
// ─────────────────────────────────────────────

export type EconomyTier = "div3" | "div2" | "pro" | "champions";

export function leagueTierToEconomyTier(leagueTier: string): EconomyTier {
  const map: Record<string, EconomyTier> = {
    training:   "div3",
    coin:       "div2",
    pro:        "pro",
    champion:   "champions",
    champions:  "champions",
    div3:       "div3",
    div2:       "div2",
  };
  return map[leagueTier] ?? "div3";
}

// ─────────────────────────────────────────────
// 💎 GEM ENTRY COSTS
// ─────────────────────────────────────────────

const ENTRY_GEM_COST: Record<EconomyTier, number> = {
  div3:      0,
  div2:      1,
  pro:       2,
  champions: 4,
};

export function getEntryGemCost(tier: EconomyTier): number {
  return ENTRY_GEM_COST[tier] ?? 0;
}

export function canEnterLeague(tier: EconomyTier, playerGems: number): boolean {
  return playerGems >= getEntryGemCost(tier);
}

// ─────────────────────────────────────────────
// 🎮 MATCH ECONOMY REWARDS
// ─────────────────────────────────────────────

export interface MatchEconomyInput {
  rank: number;
  accuracyPct: number;
  tier: EconomyTier;
}

export interface MatchEconomyResult {
  coinsEarned: number;
  gemsEarned:  number;
  newCoins:    number;
  newGems:     number;
  breakdown:   { base: number; accuracy: number; tier: number };
}

const TIER_COIN_MULTIPLIER: Record<EconomyTier, number> = {
  div3:      1.0,
  div2:      1.5,
  pro:       2.0,
  champions: 3.0,
};

export function calcMatchEconomy(
  input: MatchEconomyInput,
  currentCoins: number,
  currentGems: number,
): MatchEconomyResult {
  const { rank, accuracyPct, tier } = input;

  const baseCoins     = Math.max(0, 20 - (rank - 1) * 2);
  const accuracyBonus = Math.round(accuracyPct * 10);
  const tierMult      = TIER_COIN_MULTIPLIER[tier] ?? 1;
  const coinsEarned   = Math.round((baseCoins + accuracyBonus) * tierMult);

  const gemsEarned    = rank === 1 && tier === "champions" ? 1 : 0;

  return {
    coinsEarned,
    gemsEarned,
    newCoins: currentCoins + coinsEarned,
    newGems:  currentGems  + gemsEarned,
    breakdown: {
      base:     baseCoins,
      accuracy: accuracyBonus,
      tier:     Math.round((coinsEarned - baseCoins - accuracyBonus) + (baseCoins + accuracyBonus) * (tierMult - 1)),
    },
  };
}

// ─────────────────────────────────────────────
// 🚀 PROMOTION REWARDS
// ─────────────────────────────────────────────

export interface PromotionRewardResult {
  coinsAwarded: number;
  gemsAwarded:  number;
  newCoins:     number;
  newGems:      number;
}

const PROMOTION_COINS: Record<EconomyTier, number> = {
  div3:      50,
  div2:      100,
  pro:       200,
  champions: 400,
};

const PROMOTION_GEMS: Record<EconomyTier, number> = {
  div3:      0,
  div2:      1,
  pro:       2,
  champions: 3,
};

export function calcPromotionReward(
  _fromTier:    EconomyTier,
  toTier:       EconomyTier,
  currentCoins: number,
  currentGems:  number,
): PromotionRewardResult {
  const coinsAwarded = PROMOTION_COINS[toTier] ?? 50;
  const gemsAwarded  = PROMOTION_GEMS[toTier]  ?? 0;

  return {
    coinsAwarded,
    gemsAwarded,
    newCoins: currentCoins + coinsAwarded,
    newGems:  currentGems  + gemsAwarded,
  };
}