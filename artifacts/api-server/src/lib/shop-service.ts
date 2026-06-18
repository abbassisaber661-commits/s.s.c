/**
 * shop-service.ts
 * ────────────────
 * Shop Service — handles in-game purchases using Coins.
 *
 * Shop items (Coins):
 *   post_promotion    → 50 Coins  (promote a post)
 *   avatar_weekly     →  8 Coins  (weekly avatar rental)
 *   avatar_permanent  → 80 Coins  (permanent avatar unlock)
 *   game_assist       → 20 Coins  (in-game assistance)
 */

import { eq } from 'drizzle-orm';
import {
  db,
  playersTable,
  coinTransactionsTable,
  storePurchasesTable,
} from '@workspace/db';
import { nanoid } from './nanoid.js';

// ── Shop Catalog ──────────────────────────────────────────────────────────

export interface ShopItem {
  id:          string;
  name:        string;
  description: string;
  coinPrice:   number;
  category:    'social' | 'cosmetic' | 'gameplay';
  permanent:   boolean;
}

export const SHOP_ITEMS: Record<string, ShopItem> = {
  post_promotion: {
    id:          'post_promotion',
    name:        'Post Promotion',
    description: 'Boost your post to the top of the feed for 24 hours',
    coinPrice:   50,
    category:    'social',
    permanent:   false,
  },
  avatar_weekly: {
    id:          'avatar_weekly',
    name:        'Weekly Avatar',
    description: 'Unlock a special avatar for 7 days',
    coinPrice:   8,
    category:    'cosmetic',
    permanent:   false,
  },
  avatar_permanent: {
    id:          'avatar_permanent',
    name:        'Permanent Avatar',
    description: 'Permanently unlock a special avatar',
    coinPrice:   80,
    category:    'cosmetic',
    permanent:   true,
  },
  game_assist: {
    id:          'game_assist',
    name:        'Game Assist',
    description: 'Get a hint or extra time during a match',
    coinPrice:   20,
    category:    'gameplay',
    permanent:   false,
  },
};

// ── Types ──────────────────────────────────────────────────────────────────

export type PurchaseResult =
  | { success: true;  purchase: Record<string, unknown>; newBalance: number }
  | { success: false; reason: string };

// ── Service ────────────────────────────────────────────────────────────────

/**
 * Purchase a shop item using Coins.
 * Validates balance, deducts coins, records the purchase.
 */
export async function purchaseShopItem(
  playerId: string,
  itemId:   string,
): Promise<PurchaseResult> {
  const item = SHOP_ITEMS[itemId];
  if (!item) {
    return { success: false, reason: `Unknown shop item: ${itemId}` };
  }

  const [player] = await db
    .select({ coins: playersTable.coins, ownedItems: playersTable.ownedItems })
    .from(playersTable)
    .where(eq(playersTable.id, playerId))
    .limit(1);

  if (!player) {
    return { success: false, reason: 'Player not found' };
  }

  if (item.permanent) {
    const owned = (player.ownedItems ?? []) as string[];
    if (owned.includes(itemId)) {
      return { success: false, reason: 'Item already owned' };
    }
  }

  if (player.coins < item.coinPrice) {
    return {
      success: false,
      reason: `Insufficient coins (need ${item.coinPrice}, have ${player.coins})`,
    };
  }

  const newBalance = player.coins - item.coinPrice;

  await db
    .update(playersTable)
    .set({ coins: newBalance, updatedAt: new Date() })
    .where(eq(playersTable.id, playerId));

  await db.insert(coinTransactionsTable).values({
    id:          nanoid(),
    playerId,
    amount:      -item.coinPrice,
    type:        'spend',
    source:      'shop_purchase',
    description: `Purchased: ${item.name}`,
    balanceAfter: newBalance,
  });

  if (item.permanent) {
    const owned = (player.ownedItems ?? []) as string[];
    await db
      .update(playersTable)
      .set({ ownedItems: [...owned, itemId], updatedAt: new Date() })
      .where(eq(playersTable.id, playerId));
  }

  const [purchase] = await db
    .insert(storePurchasesTable)
    .values({
      id:         nanoid(),
      playerId,
      itemId,
      itemName:   item.name,
      piPrice:    0,
      coinsSpent: item.coinPrice,
      status:     'completed',
    })
    .returning();

  return { success: true, purchase: purchase as Record<string, unknown>, newBalance };
}

/**
 * Get the full shop catalog with availability info for a player.
 */
export async function getShopCatalog(playerId: string) {
  const [player] = await db
    .select({ coins: playersTable.coins, ownedItems: playersTable.ownedItems })
    .from(playersTable)
    .where(eq(playersTable.id, playerId))
    .limit(1);

  const ownedItems = (player?.ownedItems ?? []) as string[];
  const coins      = player?.coins ?? 0;

  return {
    coins,
    items: Object.values(SHOP_ITEMS).map((item) => ({
      ...item,
      canAfford: coins >= item.coinPrice,
      owned:     item.permanent && ownedItems.includes(item.id),
    })),
  };
}
