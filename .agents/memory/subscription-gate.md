---
name: Subscription Gate ID System
description: The Pi subscription gate uses backend player.id (nanoid), NOT authUser.uid (Pi UUID). These are two different identifiers that must never be mixed in the gate or subscription storage.
---

## Rule
Always use `storedPlayerId` (`localStorage['sl_player_id']`, the backend nanoid) as the subscription identifier — not `authUser.uid` (the Pi Network UUID).

## Two Different Identifiers for Pi Users
- `authUser.uid` = Pi Network UUID (e.g. `11d93052-ca70-4b46-a82e-352214de48c0`) — comes from `POST /api/auth/pi → player.piUid` (which equals the Pi Network `/v2/me` uid)
- `storedPlayerId` = backend player.id nanoid (e.g. `V1StGXR8_Z5jdHi6B-myT`) — comes from `POST /api/auth/pi → player.id` stored via `setStoredPlayerId()`
- `useDbSync` uses `authUser.uid` as the game-data player ID (creates/patches players by Pi UUID)
- The subscription system uses `player.id` (nanoid) as the subscription owner

## Why
`confirmSubscription({ playerId: authResp.player.id })` stores `sub.playerId` = nanoid.
`hasActiveLocalSubscription(authUser?.uid)` was passing the Pi UUID → they never matched → gate always failed for ALL Pi users.

**How to apply:** In `AppRoot`, derive `hasValidSub` from `hasActiveLocalSubscription(storedPlayerId ?? undefined)`. In `SubscriptionGate`, pass and use `storedPlayerId`. In the hydration effect, call `api.subscriptions.status(storedPlayerId)` and save with `playerId: storedPlayerId`.

## Hydration Pattern (backend subscription recovery)
When a Pi user is authenticated (`isPiUser && isAuthenticated && storedPlayerId`) but has no local subscription cache (`!hasValidSub`), AppRoot fires a one-time `useEffect` that:
1. Calls `GET /api/subscriptions/status/:storedPlayerId` (JWT-authenticated, existing endpoint)
2. If active: writes to localStorage via `saveLocalSubscription({ playerId: storedPlayerId, expiresAt: new Date(result.expiresAt).getTime(), ... })`
3. Increments `expiryTick` to re-render; `hasValidSub` becomes true
4. Shows "Verifying subscription…" loading screen during the check to prevent flicker
5. `subCheckedForRef` prevents re-checking the same playerId more than once per session
