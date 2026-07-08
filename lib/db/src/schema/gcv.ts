import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * GCV — internal community consensus price system.
 * Purely additive, standalone table. One row per player (one vote per user).
 * This is NOT the Pi official price and is fully separate from Pi payments/wallet.
 */
export const gcvVotesTable = pgTable('gcv_votes', {
  playerId:  text('player_id').primaryKey(),
  value:     text('value').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type GcvVote = typeof gcvVotesTable.$inferSelect;
