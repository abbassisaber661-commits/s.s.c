/**
 * shop-service.ts
 * ────────────────
 * Shop Service — handles in-game purchases using DN$.
 *
 * Shop items (DN$):
 *   post_promotion   → 50 DN$   (promote a post)
 *   avatar_weekly    →  8 DN$   (weekly avatar rental)
 *   avatar_permanent → 80 DN$   (permanent avatar unlock)
 *   game_assist      →  2 DN$   (eliminate one wrong answer during match)
 */

import { eq } from 'drizzle-orm';
import {
  db,
  playersTable,
  storePurchasesTable,
} from '@workspace/db';
import { nanoid } from './nanoid.js';
import { spendDN, getDNBalance } from './dn-service.js';

// ── Shop Catalog ──────────────────────────────────────────────────────────

export interface ShopItem {
  id:          string;
  name:        string;
  description: string;
  dnPrice:     number;
  category:    'social' | 'cosmetic' | 'gameplay';
  permanent:   boolean;
}

export const SHOP_ITEMS: Record<string, ShopItem> = {
  post_promotion: {
    id:          'post_promotion',
    name:        'Post Promotion',
    description: 'Boost your post to the top of the feed for 24 hours',
    dnPrice:     50,
    category:    'social',
    permanent:   false,
  },
  avatar_weekly: {
    id:          'avatar_weekly',
    name:        'Weekly Avatar',
    description: 'Unlock a special avatar for 7 days',
    dnPrice:     8,
    category:    'cosmetic',
    permanent:   false,
  },
  avatar_permanent: {
    id:          'avatar_permanent',
    name:        'Permanent Avatar',
    description: 'Permanently unlock a special avatar',
    dnPrice:     80,
    category:    'cosmetic',
    permanent:   true,
  },
  game_assist: {
    id:          'game_assist',
    name:        'Game Assist',
    description: 'Eliminate one wrong answer — leave 3 remaining choices',
    dnPrice:     2,
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
 * Purchase a shop item using DN$.
 * Validates balance, deducts DN$, records the purchase.
 */
export async function purchaseShopItem(
  playerId: string,
  itemId:   string,
): Promise<PurchaseResult> {
  const item = SHOP_ITEMS[itemId];
  if (!item) {
    return { success: false, reason: `Unknown shop item: ${itemId}` };
  }

  if (item.permanent) {
    const [player] = await db
      .select({ ownedItems: playersTable.ownedItems })
      .from(playersTable)
      .where(eq(playersTable.id, playerId))
      .limit(1);

    const owned = (player?.ownedItems ?? []) as string[];
    if (owned.includes(itemId)) {
      return { success: false, reason: 'Item already owned' };
    }
  }

  const result = await spendDN(
    playerId,
    item.dnPrice,
    'shop_purchase',
    `Purchased: ${item.name}`,
  );

  if (!result.success) {
    return {
      success: false,
      reason: `Insufficient DN$ (need ${item.dnPrice}, have ${result.newBalance})`,
    };
  }

  if (item.permanent) {
    const [player] = await db
      .select({ ownedItems: playersTable.ownedItems })
      .from(playersTable)
      .where(eq(playersTable.id, playerId))
      .limit(1);
    const owned = (player?.ownedItems ?? []) as string[];
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
      dnSpent:    item.dnPrice,
      status:     'completed',
    })
    .returning();

  return { success: true, purchase: purchase as Record<string, unknown>, newBalance: result.newBalance };
}

/**
 * Get the full shop catalog with availability info for a player.
 */
export async function getShopCatalog(playerId: string) {
  const dnBalance = await getDNBalance(playerId);

  return {
    dnBalance,
    items: Object.values(SHOP_ITEMS).map((item) => ({
      ...item,
      canAfford: dnBalance >= item.dnPrice,
      owned:     false, // permanent check done at purchase time
    })),
  };
}
