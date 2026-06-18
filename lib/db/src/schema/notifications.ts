import { pgTable, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod/v4';

export const notificationsTable = pgTable('notifications', {
  id:        text('id').primaryKey(),
  playerId:  text('player_id').notNull(),
  type:      text('type').notNull(),
  title:     text('title').notNull(),
  body:      text('body').notNull().default(''),
  data:      jsonb('data').$type<Record<string, unknown>>().default({}),
  read:      boolean('read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const insertNotifSchema = createInsertSchema(notificationsTable).omit({ createdAt: true });
export type Notification       = typeof notificationsTable.$inferSelect;
export type InsertNotif        = z.infer<typeof insertNotifSchema>;
