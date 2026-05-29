import { pgTable, text, integer, real, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod/v4';

export const coinTransactionsTable = pgTable('coin_transactions', {
  id:          text('id').primaryKey(),
  playerId:    text('player_id').notNull(),
  amount:      integer('amount').notNull(),
  type:        text('type').notNull(),
  source:      text('source').notNull(),
  description: text('description').notNull().default(''),
  balanceAfter:integer('balance_after').notNull().default(0),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
});

export const storePurchasesTable = pgTable('store_purchases', {
  id:          text('id').primaryKey(),
  playerId:    text('player_id').notNull(),
  itemId:      text('item_id').notNull(),
  itemName:    text('item_name').notNull(),
  piPrice:     real('pi_price').notNull().default(0),
  coinsSpent:  integer('coins_spent').notNull().default(0),
  piTxId:      text('pi_tx_id'),
  status:      text('status').notNull().default('completed'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
});

export const boostUsageTable = pgTable('boost_usage', {
  id:         text('id').primaryKey(),
  playerId:   text('player_id').notNull(),
  type:       text('type').notNull().default('xp'),
  multiplier: real('multiplier').notNull().default(2),
  hours:      integer('hours').notNull().default(1),
  startAt:    timestamp('start_at').notNull().defaultNow(),
  endAt:      timestamp('end_at').notNull(),
  active:     boolean('active').notNull().default(true),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
});

export const seasonsTable = pgTable('seasons', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull(),
  status:    text('status').notNull().default('upcoming'),
  rewards:   jsonb('rewards').$type<{ rank: number; coins: number; xp: number; badge?: string }[]>().default([]),
  startAt:   timestamp('start_at').notNull(),
  endAt:     timestamp('end_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const insertCoinTxSchema      = createInsertSchema(coinTransactionsTable).omit({ createdAt: true });
export const insertStorePurchSchema  = createInsertSchema(storePurchasesTable).omit({ createdAt: true });
export const insertBoostSchema       = createInsertSchema(boostUsageTable).omit({ createdAt: true });

export type CoinTransaction  = typeof coinTransactionsTable.$inferSelect;
export type StorePurchase    = typeof storePurchasesTable.$inferSelect;
export type BoostUsage       = typeof boostUsageTable.$inferSelect;
export type Season           = typeof seasonsTable.$inferSelect;
