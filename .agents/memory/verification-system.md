---
name: Verification System (Blue Badge) + Owner Panel
description: Key decisions for DB schema, backend auth, and frontend owner detection for verification + admin dashboard.
---

# Verification System + Owner Panel

## Critical: Rebuild @workspace/db after schema changes
The api-server uses TypeScript project references → it resolves @workspace/db via `lib/db/dist/*.d.ts` (compiled declarations), NOT live source. After any schema column addition, always run `pnpm --filter @workspace/db run build` before typechecking the api-server, or TS will report "property does not exist" errors on the new columns.

**Why:** `lib/db/tsconfig.json` has `"composite": true, "emitDeclarationOnly": true`; the api-server's `tsconfig.json` references `../../lib/db` as a project reference, so tsc reads dist not src.

**How to apply:** Any PR adding schema columns must rebuild @workspace/db as part of the build order before running api-server typecheck.

## Owner/Admin Detection (Frontend)
The frontend `AuthUser` type has no `role` field. Owner panel decodes JWT (base64 split) client-side without verification — acceptable because all backend owner routes use `requireAdmin` server-side.
`getJwtRole()` is defined locally in `OwnerPanel.tsx` (not a shared util — no need to pollute auth.ts).

**Why:** JWT role is in payload.role ("player" | "admin" | "guest"). Backend assigns "admin" to privileged users at login. UI gate is decorative; real enforcement is `requireAdmin` middleware.

## DB Columns for Verification + Moderation
- `verified boolean (default false)` — is user blue-badged
- `verificationStatus text (default 'none')` — none | pending | approved | rejected  
- `verificationRequestedAt timestamp (nullable)` — when user clicked "Request"
- `suspended boolean (default false)` — soft ban (UI display only, does not block login)

## Social Profile Must Return Verification Fields
`GET /social/profile/:id` must select `verified` + `verificationStatus` from playersTable and include them in the `player` response object. Without this, `useProfileData` always falls back to 'none' and badges never show.

## Backend Route Groups
- `/api/verification/*` — user-facing verification (request/status) + admin approve/reject  
- `/api/owner/*` — owner panel only (overview stats, user list, force-verify, remove-verify, suspend)  
- Both groups use `requireAdmin` middleware — no "owner" role exists in JWT (admin is the highest)

## Owner Panel Route
Hidden at `/owner-panel`, not in any nav. Shows access-denied screen if JWT role !== "admin". Polls verification requests every 30s. Does not use real-time socket (avoids touching notification system).
