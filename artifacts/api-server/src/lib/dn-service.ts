/**
 * dn-service.ts
 * ─────────────
 * Shared DN$ helper — award, spend, and query DN$ balances.
 * DN$ is the sole internal currency (non-monetary, non-transferable).
 * All operations go through walletsTable + walletTransactionsTable.
 */

import { eq } from 'drizzle-orm';
import { db, walletsTable, walletTransactionsTable } from '@workspace/db';
import { nanoid } from './nanoid.js';

// ── Wallet helpers ────────────────────────────────────────────────────────────

export async function getOrCreateWallet(playerId: string) {
  const [existing] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.playerId, playerId))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(walletsTable)
    .values({ id: nanoid(), playerId, dnBalance: 0, totalEarnedPi: 0, pendingPi: 0, availablePi: 0 })
    .returning();
  return created;
}

export async function getDNBalance(playerId: string): Promise<number> {
  const wallet = await getOrCreateWallet(playerId);
  return wallet.dnBalance;
}

/**
 * Award DN$ to a player.
 * @param type  e.g. 'daily_login', 'match_win', 'season_end'
 */
export async function awardDN(
  playerId:    string,
  amount:      number,
  type:        string,
  description: string,
): Promise<{ newBalance: number }> {
  const wallet     = await getOrCreateWallet(playerId);
  const newBalance = wallet.dnBalance + amount;

  await db
    .update(walletsTable)
    .set({ dnBalance: newBalance, updatedAt: new Date() })
    .where(eq(walletsTable.playerId, playerId));

  await db.insert(walletTransactionsTable).values({
    id: nanoid(),
    playerId,
    amount,
    type,
    description,
    balanceAfter: newBalance,
  });

  return { newBalance };
}

/**
 * Spend DN$ from a player's wallet.
 * Returns { success: false } if balance insufficient.
 */
export async function spendDN(
  playerId:    string,
  amount:      number,
  type:        string,
  description: string,
): Promise<{ success: boolean; newBalance: number; reason?: string }> {
  const wallet = await getOrCreateWallet(playerId);
  if (wallet.dnBalance < amount) {
    return { success: false, newBalance: wallet.dnBalance, reason: 'insufficient_balance' };
  }
  const newBalance = wallet.dnBalance - amount;

  await db
    .update(walletsTable)
    .set({ dnBalance: newBalance, updatedAt: new Date() })
    .where(eq(walletsTable.playerId, playerId));

  await db.insert(walletTransactionsTable).values({
    id: nanoid(),
    playerId,
    amount: -amount,
    type,
    description,
    balanceAfter: newBalance,
  });

  return { success: true, newBalance };
}
