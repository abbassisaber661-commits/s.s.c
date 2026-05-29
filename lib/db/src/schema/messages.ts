import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod/v4';

export const messagesTable = pgTable('messages', {
  id:        text('id').primaryKey(),
  fromId:    text('from_id').notNull(),
  toId:      text('to_id').notNull(),
  content:   text('content').notNull(),
  read:      boolean('read').notNull().default(false),
  deleted:   boolean('deleted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const blocksTable = pgTable('blocks', {
  id:        text('id').primaryKey(),
  blockerId:  text('blocker_id').notNull(),
  blockedId:  text('blocked_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ createdAt: true });
export type Message       = typeof messagesTable.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
