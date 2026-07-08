---
name: Replit Development Mode auth/subscription bypass
description: How the Replit-dev-only auto-login and subscription-gate skip is gated, and why it can never leak into production.
---

The app auto-signs-in a temporary local player and skips the Pi subscription
gate when `import.meta.env.DEV === true` — a Vite build-time constant that
is permanently `false` in any production build and cannot be toggled by a
runtime env var. This is the same mechanism already used for Pi SDK sandbox
mode, so it's a consistent, proven signal for "Replit dev environment only".

**Why:** Testing gift/social/game features shouldn't require a real Pi
Network login + paid subscription on every dev iteration, but Pi auth,
payments, subscriptions, DB, `OWNER_UID`, and `JWT_SECRET` must stay
completely untouched for Pi Browser/production correctness.

**How it works:**
- New `authMode: 'dev'` (distinct from `'guest'`) so it never inherits
  guest-only restrictions (e.g. `onGuestInteract` blocks) and is never
  confused with a real session.
- The dev user is a *real* backend player, created by calling the existing
  `/api/auth/guest` route with a fixed id/username — no new backend route,
  no changes to `auth.ts`/`middleware/auth.ts`/`owner.ts`.
- Gate check appears twice: once in `GameContext`'s auto-login effect
  (`IS_DEV_MODE` only fires if no session exists yet) and again in
  `AppRoot` (`isDevUser = IS_DEV_MODE && authMode === 'dev'`) before
  skipping the subscription gate — belt-and-suspenders so a stray
  `authMode:'dev'` localStorage record can never bypass the gate outside
  dev.

**How to apply:** If extending dev-only bypasses elsewhere, reuse
`IS_DEV_MODE` from `lib/devMode.ts` rather than introducing a new env
signal, and always double-guard (check at both creation time and at the
point where the bypass takes effect).
