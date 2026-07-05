import { pgTable, text, integer, real, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod/v4';

export const playersTable = pgTable('players', {
  id:                text('id').primaryKey(),
  username:          text('username').notNull(),
  avatar:            text('avatar').notNull().default('🎮'),
  xp:                integer('xp').notNull().default(0),
  level:             integer('level').notNull().default(1),
  elo:               integer('elo').notNull().default(1000),
  lp:                integer('lp').notNull().default(0),
  fame:              integer('fame').notNull().default(0),
  leagueDivision:    text('league_division').notNull().default('training'),
  unlockedLeagues:   jsonb('unlocked_leagues').$type<string[]>().notNull().default(['training']),
  ownedItems:        jsonb('owned_items').$type<string[]>().notNull().default([]),
  xpBoostUntil:      timestamp('xp_boost_until'),
  skillSpeed:        integer('skill_speed').notNull().default(50),
  skillAccuracy:     integer('skill_accuracy').notNull().default(50),
  skillMemory:       integer('skill_memory').notNull().default(50),
  matchesPlayed:     integer('matches_played').notNull().default(0),
  matchesWon:        integer('matches_won').notNull().default(0),
  pvpWins:           integer('pvp_wins').notNull().default(0),
  pvpLosses:         integer('pvp_losses').notNull().default(0),
  pvpWinStreak:      integer('pvp_win_streak').notNull().default(0),
  bestPvpStreak:     integer('best_pvp_streak').notNull().default(0),
  tournamentWins:    integer('tournament_wins').notNull().default(0),
  bestStreak:        integer('best_streak').notNull().default(0),
  trophies:          jsonb('trophies').$type<string[]>().notNull().default([]),
  achievements:      jsonb('achievements').$type<{ id: string; date: string }[]>().notNull().default([]),
  highScores:        jsonb('high_scores').$type<Record<string, number>>().notNull().default({}),
  dailyChallenges:   jsonb('daily_challenges').$type<Record<string, boolean>>().notNull().default({}),
  bio:               text('bio'),
  cover:             text('cover'),
  verified:           boolean('verified').notNull().default(false),
  suspended:          boolean('suspended').notNull().default(false),
  verificationStatus:text('verification_status').notNull().default('none'),
  verificationRequestedAt: timestamp('verification_requested_at'),
  piUid:             text('pi_uid'),
  language:          text('language').notNull().default('en'),
  passwordHash:      text('password_hash'),
  lastActiveAt:      timestamp('last_active_at').notNull().defaultNow(),
  createdAt:         timestamp('created_at').notNull().defaultNow(),
  updatedAt:         timestamp('updated_at').notNull().defaultNow(),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({ createdAt: true, updatedAt: true });
export type InsertPlayer        = z.infer<typeof insertPlayerSchema>;
export type Player              = typeof playersTable.$inferSelect;
