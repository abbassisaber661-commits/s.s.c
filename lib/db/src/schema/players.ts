import { pgTable, text, integer, real, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod/v4';

export const playersTable = pgTable('players', {
  id:             text('id').primaryKey(),
  username:       text('username').notNull(),
  coins:          integer('coins').notNull().default(100),
  xp:             integer('xp').notNull().default(0),
  level:          integer('level').notNull().default(1),
  elo:            integer('elo').notNull().default(1000),
  skillSpeed:     integer('skill_speed').notNull().default(50),
  skillAccuracy:  integer('skill_accuracy').notNull().default(50),
  skillMemory:    integer('skill_memory').notNull().default(50),
  matchesPlayed:  integer('matches_played').notNull().default(0),
  matchesWon:     integer('matches_won').notNull().default(0),
  pvpWins:        integer('pvp_wins').notNull().default(0),
  pvpLosses:      integer('pvp_losses').notNull().default(0),
  pvpWinStreak:   integer('pvp_win_streak').notNull().default(0),
  bestPvpStreak:  integer('best_pvp_streak').notNull().default(0),
  tournamentWins: integer('tournament_wins').notNull().default(0),
  bestStreak:     integer('best_streak').notNull().default(0),
  trophies:       jsonb('trophies').$type<string[]>().notNull().default([]),
  achievements:   jsonb('achievements').$type<{ id: string; date: string }[]>().notNull().default([]),
  highScores:     jsonb('high_scores').$type<Record<string, number>>().notNull().default({}),
  language:       text('language').notNull().default('en'),
  piUid:          text('pi_uid'),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().defaultNow(),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({ createdAt: true, updatedAt: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;
