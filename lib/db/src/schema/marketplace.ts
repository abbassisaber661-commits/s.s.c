import { pgTable, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const marketplaceListingsTable = pgTable('marketplace_listings', {
  id:         text('id').primaryKey(),
  sellerId:   text('seller_id').notNull(),
  sellerName: text('seller_name').notNull(),
  itemId:     text('item_id').notNull(),
  itemName:   text('item_name').notNull(),
  itemEmoji:  text('item_emoji').notNull().default('🎨'),
  itemType:   text('item_type').notNull().default('cosmetic'),
  price:      integer('price').notNull().default(100),
  status:     text('status').notNull().default('active'),
  buyerId:    text('buyer_id'),
  soldAt:     timestamp('sold_at'),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
});

export type MarketplaceListing = typeof marketplaceListingsTable.$inferSelect;
