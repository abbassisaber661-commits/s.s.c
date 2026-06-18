import { pgTable, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod/v4';

export const pvpMatchesTable = pgTable('pvp_matches', {
  id:           text('id').primaryKey(),
  playerAId:    text('player_a_id').notNull(),
  playerBId:    text('player_b_id').notNull(),
  winnerId:     text('winner_id'),
  playerAScore: integer('player_a_score').notNull().default(0),
  playerBScore: integer('player_b_score').notNull().default(0),
  leagueId:     text('league_id').notNull(),
  matchType:    text('match_type').notNull().default('pvp'),
  duration:     integer('duration').notNull().default(60),
  rounds:       jsonb('rounds').$type<any[]>().default([]),
  coinsStake:   integer('coins_stake').notNull().default(0),
  // Per-player outcome data (stored for match history display)
  eloChangeA:   integer('elo_change_a').notNull().default(0),
  eloChangeB:   integer('elo_change_b').notNull().default(0),
  coinsWonA:    integer('coins_won_a').notNull().default(0),
  coinsWonB:    integer('coins_won_b').notNull().default(0),
  xpGainedA:    integer('xp_gained_a').notNull().default(0),
  xpGainedB:    integer('xp_gained_b').notNull().default(0),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  finishedAt:   timestamp('finished_at'),
});

export const tournamentsTable = pgTable('tournaments', {
  id:           text('id').primaryKey(),
  name:         text('name').notNull(),
  type:         text('type').notNull().default('daily'),
  status:       text('status').notNull().default('open'),
  size:         integer('size').notNull().default(8),
  rewardCoins:  integer('reward_coins').notNull().default(500),
  rewardXp:     integer('reward_xp').notNull().default(300),
  bracket:      jsonb('bracket').$type<any>().default(null),
  participants: jsonb('participants').$type<string[]>().notNull().default([]),
  startAt:      timestamp('start_at').notNull(),
  endAt:        timestamp('end_at'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
});

export const pvpRoomsTable = pgTable('pvp_rooms', {
  id:        text('id').primaryKey(),
  code:      text('code').notNull().unique(),
  type:      text('type').notNull().default('public'),
  leagueId:  text('league_id').notNull(),
  hostId:    text('host_id').notNull(),
  guestId:   text('guest_id'),
  status:    text('status').notNull().default('waiting'),
  entryCost: integer('entry_cost').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const insertPvpMatchSchema   = createInsertSchema(pvpMatchesTable).omit({ createdAt: true });
export type InsertPvpMatch          = z.infer<typeof insertPvpMatchSchema>;
export type PvpMatch                = typeof pvpMatchesTable.$inferSelect;

export const insertTournamentSchema = createInsertSchema(tournamentsTable).omit({ createdAt: true });
export type InsertTournament        = z.infer<typeof insertTournamentSchema>;
export type Tournament              = typeof tournamentsTable.$inferSelect;
