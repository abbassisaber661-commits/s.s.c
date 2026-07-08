---
name: Owner Dashboard (8-section admin control center)
description: Where the private owner dashboard lives, how it's gated, and what it must never touch.
---

## What it is
A private, sidebar-based admin interface (`/owner-dashboard`, dark/black+gold theme) covering:
Overview stats, User Management, Social Content Management, SkillLeague Management,
Economy & Pi, Verification, Notifications/Announcements, Security & Logs.

## Access control
- Client-side gate: only rendered/linked when `getJwtRole() === "admin"` (checked in `Settings.tsx`
  and inside the dashboard page itself, which redirects non-admins to `/settings`).
- Real security is 100% backend: every route is behind the existing `requireAdmin` middleware
  (unchanged). The client-side check is UX only, not a security boundary.
- No link exists anywhere except a conditional row in Settings — never add nav-bar/bottom-nav entries.

## What it must never touch
Pi auth, payments, subscriptions, DB schema, `OWNER_UID`/`OWNER_USERNAME` logic (`lib/owner.ts`),
`JWT_SECRET`, or `requireAdmin` itself. Build new, additive read/moderation endpoints only
(new router file), never edit the existing `OwnerPanel.tsx` (navy/blue legacy panel, still used
at `/owner-panel`) or `owner-admin.ts`.

## Gotchas
- Drizzle's `db.execute(sql\`...\`)` result is not directly iterable/destructurable in this
  codebase's TS setup — assign to a plain variable and read `.rows` with an `as any` cast
  (matches existing pattern in `owner-admin.ts`/`security.ts`), don't do
  `const [row] = await db.execute(sql\`...\`)`.
- In Express 5 + this TS config, `req.params.id` types as `string | string[]` — wrap with
  `String(req.params.id)` before passing into Drizzle `eq()` calls.
- Announcements/broadcast notifications: one row per player tagged with `data.broadcastId`,
  grouped for history display via `data->>'broadcastId'` in a raw SQL GROUP BY.
