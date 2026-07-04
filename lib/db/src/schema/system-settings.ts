import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

/**
 * Generic key/value store for admin-configurable system settings
 * (official pages bot control, social interaction toggles, reserved
 * usernames, etc). Purely additive — does not touch any existing table.
 */
export const systemSettingsTable = pgTable('system_settings', {
  key:       text('key').primaryKey(),
  value:     jsonb('value').$type<unknown>().notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type SystemSetting = typeof systemSettingsTable.$inferSelect;
