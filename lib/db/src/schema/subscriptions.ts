import { pgTable, text, real, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * subscriptions — one active subscription record per player.
 *
 * Subscription is created (status='active') when a Pi payment of kind='subscription'
 * is confirmed in pi_payments. Only Pi is accepted; there is no guest subscription.
 *
 * The table enforces one active subscription per player via the unique index.
 * On renewal a new row is inserted (the old one is left for audit history).
 */
export const subscriptionsTable = pgTable('subscriptions', {
  id:          text('id').primaryKey(),
  playerId:    text('player_id').notNull(),
  plan:        text('plan').notNull(),          // 'premium3' | 'premium1'
  amountPi:    real('amount_pi').notNull(),     // Pi amount paid (Testnet or Mainnet)
  piPaymentId: text('pi_payment_id'),           // Pi Network payment identifier
  piTxId:      text('pi_tx_id'),               // Pi Network blockchain transaction ID
  status:      text('status').notNull().default('active'), // 'active' | 'expired'
  expiresAt:   timestamp('expires_at').notNull(),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
});

export type Subscription = typeof subscriptionsTable.$inferSelect;
