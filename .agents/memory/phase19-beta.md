---
name: Phase 19 Beta Launch
description: Invite code system, beta dashboard, session tracking, Pi VIP payments with backend, game balance config, BetaBanner.
---

## Invite Code System
- Backend: `artifacts/api-server/src/routes/beta.ts` — in-memory INVITE_CODES map with built-in codes.
- Built-in codes: SKILL2025 (200 uses), TESTER100 (100), PINETWORK (50), BETAVIP01 (50), TEAM2025 (20).
- Frontend: `artifacts/skill-league/src/lib/betaSystem.ts` — `tryBuiltinCode()` validates locally, `validateInviteCode()` calls backend.
- `InviteGate.tsx` — shown to users without beta access (currently not gating, just available as component).

**Why in-memory:** Beta codes don't need persistence across restarts; easy to reset. Move to DB when going to full launch.

## Beta Dashboard
- Route: `/beta-dashboard` (no auth gate — team members can access).
- `BetaDashboard.tsx` — 4 tabs: Overview (stats), Security (suspicious activity), Invites (code management), My Session.
- Stats use `api.admin.stats()` — requires admin JWT role; non-admins see empty state gracefully.

## Beta Banner
- `BetaBanner.tsx` — persistent top bar showing v0.19.0, online/offline status, link to /beta-dashboard.
- Dismissible per session (not persisted).
- Placed in `AppShell` ABOVE `BetaFeedbackWidget`.

## Session Tracking
- `artifacts/skill-league/src/lib/sessionTracker.ts` — `startSession()`/`endSession()` track play time in localStorage.
- Sends `session_end` analytics event on unmount.
- `trackFeatureUse()` / `trackPageView()` for granular events.
- Wired into `GameContext.tsx` via `useEffect` on mount/unmount.

## Pi VIP Payments (Backend-Wired)
- `VIP.tsx` now calls `api.pi.create()` → `api.pi.approve()` → `api.pi.complete()` on the backend.
- Test mode button shows when Pi SDK is not available (for browser testing).
- `trackFeatureUse()` called on buy attempt and activation.

## Game Balance Config
- `artifacts/skill-league/src/lib/balance.ts` — single source of truth for all economy constants.
- Covers: coins, XP, ELO, fame, anti-cheat limits, store prices, Pi prices.
- `calcMatchCoins()` / `calcMatchXp()` helper functions for randomized rewards.

## Anti-Cheat Improvements
- Rate limits in `rateLimit.ts`: `strictRateLimit` = 20 req/min (auth, beta invite), `postRateLimit` = 30/min.
- `logAudit()` / `logSuspicious()` called on all auth events.
- `detectMultiAccount()` flags if 3+ distinct player IDs share same IP.
