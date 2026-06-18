import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod/v4';

export const botsTable = pgTable('bots', {
  id:           text('id').primaryKey(),
  name:         text('name').notNull().unique(),
  lp:           integer('lp').notNull().default(0),
  division:     text('division').notNull().default('training'),
  skillLevel:   integer('skill_level').notNull().default(50),
  wins:         integer('wins').notNull().default(0),
  losses:       integer('losses').notNull().default(0),
  lastActiveAt: timestamp('last_active_at').notNull().defaultNow(),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
});

export const insertBotSchema = createInsertSchema(botsTable).omit({ createdAt: true });
export type InsertBot        = z.infer<typeof insertBotSchema>;
export type Bot              = typeof botsTable.$inferSelect;
