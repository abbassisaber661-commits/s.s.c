import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const followersTable = pgTable('followers', {
  id:          text('id').primaryKey(),
  followerId:  text('follower_id').notNull(),
  followingId: text('following_id').notNull(),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
});

export const storiesTable = pgTable('stories', {
  id:          text('id').primaryKey(),
  authorId:    text('author_id').notNull(),
  authorName:  text('author_name').notNull(),
  authorLevel: integer('author_level').notNull().default(1),
  emoji:       text('emoji').notNull().default('⚡'),
  content:     text('content').notNull().default(''),
  imageUrl:    text('image_url'),
  views:       integer('views').notNull().default(0),
  expiresAt:   timestamp('expires_at').notNull(),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
});

export type Follower = typeof followersTable.$inferSelect;
export type Story    = typeof storiesTable.$inferSelect;
