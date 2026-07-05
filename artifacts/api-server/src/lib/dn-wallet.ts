/**
 * dn-wallet.ts
 * ────────────
 * Centralized helper for the two-currency economy:
 *   - DN$  → internal, non-transferable gamification points (dnBalance on `wallets`,
 *            logged in `wallet_transactions`). Used for daily/season rewards, shop,
 *            in-game assists.
 *   - Pi   → real currency (availablePi/pendingPi/totalEarnedPi on `wallets`). Used
 *            for gifts, league entry fees, future deposit/withdraw. Pi debits (e.g.
 *            league entry fees) are NOT logged to wallet_transactions (that table is
 *            DN$-only by design) — callers that need an audit trail should use
 *            logAudit separately.
 *
 * Every module that needs to read/mutate a player's wallet should import from here
 * instead of re-implementing getOrCreateWallet / balance math locally.
 */

import { eq } from 'drizzle-orm';
import { db, walletsTable, walletTransactionsTable } from '@workspace/db';
import { nanoid } from './nanoid.js';

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

/**
 * Credit or debit a player's DN$ balance and log a `wallet_transactions` row.
 * Pass a negative `amount` to debit. Throws if the debit would drop balance below 0
 * unless `allowNegative` is true.
 */
export async function creditDn(
  playerId: string,
  amount: number,
  type: string,
  description = '',
  opts: { allowNegative?: boolean; relatedId?: string } = {},
) {
  const wallet = await getOrCreateWallet(playerId);
  const newBalance = wallet.dnBalance + amount;
  if (newBalance < 0 && !opts.allowNegative) {
    throw new Error('insufficient_dn_balance');
  }
  const clamped = opts.allowNegative ? newBalance : Math.max(0, newBalance);

  await db.update(walletsTable)
    .set({ dnBalance: clamped, updatedAt: new Date() })
    .where(eq(walletsTable.playerId, playerId));

  const [tx] = await db.insert(walletTransactionsTable).values({
    id:          nanoid(),
    playerId,
    amount,
    type,
    description,
    relatedId:   opts.relatedId ?? null,
    balanceAfter: clamped,
  }).returning();

  return { wallet: { ...wallet, dnBalance: clamped }, transaction: tx, newBalance: clamped };
}

/** Debit DN$ — convenience wrapper around creditDn with a negative amount. */
export async function debitDn(
  playerId: string,
  amount: number,
  type: string,
  description = '',
  opts: { relatedId?: string } = {},
) {
  if (amount <= 0) throw new Error('debit amount must be positive');
  return creditDn(playerId, -amount, type, description, { relatedId: opts.relatedId });
}

/**
 * Debit Pi from a player's availablePi ledger (e.g. league entry fees).
 * No wallet_transactions row is written — that table is DN$-only. Callers that need
 * an audit trail should call logAudit separately.
 */
export async function debitPi(playerId: string, amount: number) {
  if (amount < 0) throw new Error('debit amount must be non-negative');
  if (amount === 0) return getOrCreateWallet(playerId);
  const wallet = await getOrCreateWallet(playerId);
  if (Number(wallet.availablePi) < amount) {
    throw new Error('insufficient_pi_balance');
  }
  const newAvailable = Number(wallet.availablePi) - amount;
  const [updated] = await db.update(walletsTable)
    .set({ availablePi: newAvailable, updatedAt: new Date() })
    .where(eq(walletsTable.playerId, playerId))
    .returning();
  return updated;
}

export async function getDnBalance(playerId: string): Promise<number> {
  const wallet = await getOrCreateWallet(playerId);
  return wallet.dnBalance;
}

export async function getAvailablePi(playerId: string): Promise<number> {
  const wallet = await getOrCreateWallet(playerId);
  return Number(wallet.availablePi);
}
