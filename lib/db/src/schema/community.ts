import { pgTable, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod/v4';

export const postsTable = pgTable('posts', {
  id:         text('id').primaryKey(),
  authorId:   text('author_id').notNull(),
  username:   text('username').notNull(),
  level:      integer('level').notNull().default(1),
  content:    text('content').notNull().default(''),
  imageUrl:   text('image_url'),
  type:       text('type').notNull().default('text'),
  meta:       jsonb('meta').$type<Record<string, unknown>>().default({}),
  likes:      integer('likes').notNull().default(0),
  replies:    integer('replies').notNull().default(0),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
});

export const postLikesTable = pgTable('post_likes', {
  id:        text('id').primaryKey(),
  postId:    text('post_id').notNull(),
  playerId:  text('player_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const postCommentsTable = pgTable('post_comments', {
  id:        text('id').primaryKey(),
  postId:    text('post_id').notNull(),
  authorId:  text('author_id').notNull(),
  username:  text('username').notNull(),
  content:   text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const insertPostSchema    = createInsertSchema(postsTable).omit({ createdAt: true });
export const insertCommentSchema = createInsertSchema(postCommentsTable).omit({ createdAt: true });

export type Post        = typeof postsTable.$inferSelect;
export type PostLike    = typeof postLikesTable.$inferSelect;
export type PostComment = typeof postCommentsTable.$inferSelect;
export type InsertPost  = z.infer<typeof insertPostSchema>;
