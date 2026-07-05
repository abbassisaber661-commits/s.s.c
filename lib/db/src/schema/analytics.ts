import { pgTable, text, integer, real, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const analyticsEventsTable = pgTable('analytics_events', {
  id:        text('id').primaryKey(),
  playerId:  text('player_id'),
  event:     text('event').notNull(),
  data:      jsonb('data').$type<Record<string, unknown>>().default({}),
  session:   text('session'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const dailyStatsTable = pgTable('daily_stats', {
  id:             text('id').primaryKey(),
  date:           text('date').notNull(),
  activePlayers:  integer('active_players').notNull().default(0),
  newPlayers:     integer('new_players').notNull().default(0),
  matchesPlayed:  integer('matches_played').notNull().default(0),
  pvpMatches:     integer('pvp_matches').notNull().default(0),
  avgSessionMins: real('avg_session_mins').notNull().default(0),
  dnEarned:       integer('dn_earned').notNull().default(0),
  dnSpent:        integer('dn_spent').notNull().default(0),
  topLeague:      text('top_league').notNull().default('training'),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
});

export const betaFeedbackTable = pgTable('beta_feedback', {
  id:        text('id').primaryKey(),
  playerId:  text('player_id'),
  username:  text('username').notNull().default('guest'),
  rating:    integer('rating').notNull().default(5),
  category:  text('category').notNull().default('general'),
  message:   text('message').notNull(),
  page:      text('page').notNull().default('/'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type AnalyticsEvent = typeof analyticsEventsTable.$inferSelect;
export type DailyStats     = typeof dailyStatsTable.$inferSelect;
export type BetaFeedback   = typeof betaFeedbackTable.$inferSelect;
