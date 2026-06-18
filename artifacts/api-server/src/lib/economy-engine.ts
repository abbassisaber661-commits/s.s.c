/**
 * economy-engine.ts
 * ─────────────────
 * Economy Engine — calculates coins and gems earned after each match.
 * Pure calculation module, no side-effects. Call calcMatchEconomy() after
 * every match to get the reward breakdown.
 *
 * Division tier mapping (from league-progression):
 *   training  → DIV3
 *   coin      → DIV2
 *   pro       → PRO
 *   champion  → CHAMPIONS
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type EconomyTier = 'div3' | 'div2' | 'pro' | 'champions';

export interface MatchEconomyInput {
  rank:        number;   // 1 = 1st place
  accuracyPct: number;   // 0–1  (e.g. 0.8 = 80%)
  tier:        EconomyTier;
}

export interface CoinBreakdown {
  base:          number;  // always +1
  rankBonus:     number;  // +3/+2/+1 for top 3
  accuracyBonus: number;  // +1 for ≥80%; +2 for 100%
  total:         number;
}

export interface GemBreakdown {
  gemsEarned: number;
  reason:     string;
}

export interface EconomyResult {
  coinsEarned:   number;
  gemsEarned:    number;
  coinBreakdown: CoinBreakdown;
  gemBreakdown:  GemBreakdown;
  newCoins:      number;
  newGems:       number;
}

// ── Gem reward table ─────────────────────────────────────────────────────────
//
//  DIV3      : 1st → +1
//  DIV2      : 1st → +2, 2nd → +1
//  PRO       : 1st → +3, 2nd → +2, 3rd → +1
//  CHAMPIONS : 1st → +4, 2nd → +3, 3rd → +2, 4th → +1

const GEM_TABLE: Record<EconomyTier, Partial<Record<number, number>>> = {
  div3:      { 1: 1 },
  div2:      { 1: 2, 2: 1 },
  pro:       { 1: 3, 2: 2, 3: 1 },
  champions: { 1: 4, 2: 3, 3: 2, 4: 1 },
};

// ── League entry gem requirements ────────────────────────────────────────────
//
//  DIV3      : 0 gems (free)
//  DIV2      : ≥1 gem
//  PRO       : ≥2 gems
//  CHAMPIONS : ≥4 gems

const ENTRY_GEM_COST: Record<EconomyTier, number> = {
  div3:      0,
  div2:      1,
  pro:       2,
  champions: 4,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Map a LeagueTier string (from league-progression) to an EconomyTier. */
export function leagueTierToEconomyTier(tier: string): EconomyTier {
  const map: Record<string, EconomyTier> = {
    training: 'div3',
    coin:     'div2',
    pro:      'pro',
    champion: 'champions',
  };
  return map[tier] ?? 'div3';
}

// ── Core calculation ─────────────────────────────────────────────────────────

/**
 * Pure function — calculates coins and gems earned from a single match result.
 * Does not mutate any state; callers must persist the returned newCoins/newGems.
 */
export function calcMatchEconomy(
  input:       MatchEconomyInput,
  playerCoins: number,
  playerGems:  number,
): EconomyResult {
  // ── Coins ──────────────────────────────────────────────────────────────────
  const base = 1; // participation coin

  let rankBonus = 0;
  if      (input.rank === 1) rankBonus = 3;
  else if (input.rank === 2) rankBonus = 2;
  else if (input.rank === 3) rankBonus = 1;

  // +1 for ≥80%, +1 extra on top for 100% = max +2 from accuracy
  let accuracyBonus = 0;
  if (input.accuracyPct >= 1.0)        accuracyBonus = 2;
  else if (input.accuracyPct >= 0.8)   accuracyBonus = 1;

  const coinsEarned = base + rankBonus + accuracyBonus;

  // ── Gems ───────────────────────────────────────────────────────────────────
  const gemsEarned = GEM_TABLE[input.tier]?.[input.rank] ?? 0;

  let gemReason = 'No gem reward for this rank/tier';
  if (gemsEarned > 0) {
    const place =
      input.rank === 1 ? '1st place' :
      input.rank === 2 ? '2nd place' : '3rd place';
    gemReason = `${place} in ${input.tier.toUpperCase()}`;
  }

  return {
    coinsEarned,
    gemsEarned,
    coinBreakdown: { base, rankBonus, accuracyBonus, total: coinsEarned },
    gemBreakdown:  { gemsEarned, reason: gemReason },
    newCoins: playerCoins + coinsEarned,
    newGems:  Math.max(0, playerGems + gemsEarned),
  };
}

/**
 * Check whether a player has enough gems to enter a league tier.
 */
export function canEnterLeague(tier: EconomyTier, playerGems: number): boolean {
  return playerGems >= ENTRY_GEM_COST[tier];
}

/**
 * Get the gem cost to enter a league tier.
 */
export function getEntryGemCost(tier: EconomyTier): number {
  return ENTRY_GEM_COST[tier];
}

// ── Promotion reward table ────────────────────────────────────────────────
//
//  div3 → div2   : +10 coins, +1 gem
//  div2 → pro    : +20 coins, +2 gems
//  pro  → champions : +30 coins, +3 gems

const PROMOTION_REWARDS: Record<string, { coins: number; gems: number }> = {
  'div3→div2':      { coins: 10, gems: 1 },
  'div2→pro':       { coins: 20, gems: 2 },
  'pro→champions':  { coins: 30, gems: 3 },
};

export interface PromotionRewardResult {
  coinsAwarded: number;
  gemsAwarded:  number;
  fromTier:     string;
  toTier:       string;
  newCoins:     number;
  newGems:      number;
}

/**
 * Calculate the promotion reward when a player advances from one tier to the next.
 * fromTier / toTier are economy tier strings (div3, div2, pro, champions).
 */
export function calcPromotionReward(
  fromTier:    string,
  toTier:      string,
  playerCoins: number,
  playerGems:  number,
): PromotionRewardResult {
  const key    = `${fromTier}→${toTier}`;
  const reward = PROMOTION_REWARDS[key] ?? { coins: 5, gems: 0 };
  return {
    coinsAwarded: reward.coins,
    gemsAwarded:  reward.gems,
    fromTier,
    toTier,
    newCoins: playerCoins + reward.coins,
    newGems:  playerGems  + reward.gems,
  };
}
