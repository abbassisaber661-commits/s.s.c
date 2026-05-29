---
name: Phase 18 Backend Architecture
description: JWT auth, anti-cheat, Pi payment routes, DB schema, frontend API client — what was built and how it fits together.
---

## JWT Auth
- Secret defaults to `skillleague-dev-secret-change-in-prod`; set JWT_SECRET env var for production.
- Middleware: `artifacts/api-server/src/middleware/auth.ts` — `requireAuth`, `optionalAuth`, `requireAdmin`, `signToken`, `verifyTokenRaw`.
- Routes: `src/routes/auth.ts` — POST /auth/register, /auth/login, /auth/guest, /auth/pi, /auth/refresh, /auth/logout.
- All auth routes rate-limited via `strictRateLimit` (20 req/min).

## Anti-Cheat
- `artifacts/api-server/src/middleware/antiCheat.ts` — uses raw SQL (not Drizzle ORM) to insert into `ip_fingerprints`, `suspicious_activity`, `audit_logs`.
- `validateScoreAntiCheat`: max 50 points/second, rejects >99% accuracy sustained >30s.
- `detectMultiAccount`: flags if 3+ distinct player IDs share the same IP.

**Why raw SQL:** security tables were added via SQL DDL but the Drizzle ORM types exist in `lib/db/src/schema/security.ts` for type safety. The execute() calls use raw SQL with parameterized `$1` placeholders.

## DB Schema
- Security tables live in `lib/db/src/schema/security.ts` and are exported from `schema/index.ts`.
- `password_hash` column added to `players` table (TEXT, nullable).
- All tables created via `executeSql` DDL — no Drizzle migrations needed.

## Frontend API Client
- `artifacts/skill-league/src/lib/apiClient.ts` — JWT token stored in `localStorage` as `sl_jwt_token`; all requests auto-attach `Authorization: Bearer <token>`.
- `api.auth.*` — register, login, guest, pi, refresh, logout.
- `api.pi.*` — create/approve/complete payment.
- `api.admin.*` — logs, suspicious, stats (admin-only routes).

## Frontend Sync
- `useDbSync.ts` calls `api.auth.guest()` on first player init to get JWT token.
- `GameContext.tsx` calls `api.auth.pi()` after Pi login and `api.auth.guest()` after guest login to store JWT.

## Pi Payments
- `src/routes/pi-payments.ts` — in-memory pending payment map; completes by awarding coins from `PI_PRODUCTS` map.
- Products: vip_silver, vip_gold, vip_diamond, coins_250, coins_500, coins_1000, tournament_entry.

## Feature Flags
- `artifacts/skill-league/src/lib/featureFlags.ts` — `MVP_MODE=true`, heavy features (events, marketplace, analytics, liveStream) disabled.
