import { pgTable, text, integer, boolean, timestamp, jsonb, bigserial, real } from 'drizzle-orm/pg-core';

export const playerSessionsTable = pgTable('player_sessions', {
  id:                text('id').primaryKey(),
  playerId:          text('player_id').notNull(),
  tokenHash:         text('token_hash').notNull(),
  ipAddress:         text('ip_address'),
  userAgent:         text('user_agent'),
  deviceFingerprint: text('device_fingerprint'),
  isActive:          boolean('is_active').notNull().default(true),
  expiresAt:         timestamp('expires_at').notNull(),
  createdAt:         timestamp('created_at').notNull().defaultNow(),
  lastUsedAt:        timestamp('last_used_at').notNull().defaultNow(),
});

export const auditLogsTable = pgTable('audit_logs', {
  id:          bigserial('id', { mode: 'bigint' }).primaryKey(),
  playerId:    text('player_id'),
  action:      text('action').notNull(),
  entity:      text('entity').notNull(),
  entityId:    text('entity_id'),
  oldValue:    jsonb('old_value'),
  newValue:    jsonb('new_value'),
  ipAddress:   text('ip_address'),
  userAgent:   text('user_agent'),
  status:      text('status').notNull().default('ok'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
});

export const suspiciousActivityTable = pgTable('suspicious_activity', {
  id:                bigserial('id', { mode: 'bigint' }).primaryKey(),
  playerId:          text('player_id'),
  ipAddress:         text('ip_address'),
  deviceFingerprint: text('device_fingerprint'),
  type:              text('type').notNull(),
  severity:          text('severity').notNull().default('low'),
  details:           jsonb('details').default({}),
  resolved:          boolean('resolved').notNull().default(false),
  createdAt:         timestamp('created_at').notNull().defaultNow(),
});

export const ipFingerprintsTable = pgTable('ip_fingerprints', {
  id:                bigserial('id', { mode: 'bigint' }).primaryKey(),
  ipAddress:         text('ip_address').notNull(),
  deviceFingerprint: text('device_fingerprint'),
  playerId:          text('player_id').notNull(),
  firstSeenAt:       timestamp('first_seen_at').notNull().defaultNow(),
  lastSeenAt:        timestamp('last_seen_at').notNull().defaultNow(),
});

export const piPaymentsTable = pgTable('pi_payments', {
  id:           text('id').primaryKey(),
  playerId:     text('player_id').notNull(),
  piPaymentId:  text('pi_payment_id').notNull().unique(),
  piTxId:       text('pi_tx_id'),
  amount:       real('amount').notNull(),
  memo:         text('memo').notNull(),
  metadata:     jsonb('metadata').default({}),
  status:       text('status').notNull().default('pending'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  completedAt:  timestamp('completed_at'),
});

export type PlayerSession      = typeof playerSessionsTable.$inferSelect;
export type AuditLog           = typeof auditLogsTable.$inferSelect;
export type SuspiciousActivity = typeof suspiciousActivityTable.$inferSelect;
export type IpFingerprint      = typeof ipFingerprintsTable.$inferSelect;
export type PiPayment          = typeof piPaymentsTable.$inferSelect;
