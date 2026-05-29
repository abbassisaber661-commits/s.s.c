import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const followersTable = pgTable('followers', {
  id:          text('id').primaryKey(),
  followerId:  text('follower_id').notNull(),
  followingId: text('following_id').notNull(),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
});

export type Follower = typeof followersTable.$inferSelect;
