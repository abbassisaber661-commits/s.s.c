---
name: Match Economy Sync
description: Coins/gems/LP synchronisation between frontend localStorage and backend DB — critical bugs found and fixed.
---

## Rule
Coins are awarded ONCE via `POST /matches`. `POST /economy/match-result` handles GEMS ONLY (not coins).

**Why:** Both endpoints previously awarded coins causing double-counting. `POST /matches` is the authoritative source for all match rewards (LP, XP, Coins). The economy endpoint was the legacy system designed before `POST /matches` existed.

## How to apply
- After `api.matches.create()` resolves, call `game.addCoins(coinsR.earned)` immediately so localStorage stays in sync and `useDbSync` (4s debounce) does not overwrite the server with a stale balance.
- `/economy/match-result` must only update gems (in both JSON file + DB `players.gems` column).
- `GET /economy/:playerId/gems` reads from DB first (`playersTable.gems`), JSON file as fallback.

## Daily Routes
Frontend `api.daily.status(playerId)` → `GET /daily/status/:playerId`
Frontend `api.daily.claim(playerId, taskId)` → `POST /daily/claim` `{playerId, taskId}`
These are aliased in `daily-economy.ts` to the real routes `/economy/daily/:playerId/status` and `/economy/daily/:playerId/claim/{login|social|content|match}`.

## Sync Architecture
- LP: Server is authoritative. After match, server LP is synced back to localStorage `sl_league_v2`.
- Coins: Server is authoritative. After match, `game.addCoins(earned)` updates localStorage so `useDbSync` sends correct value.
- Gems: DB `players.gems` is authoritative (read via `/economy/:playerId/gems`). JSON file is a write-through cache.
- XP/Level: DB is authoritative (players table). JSON file (player-store) is a separate legacy system NOT synced. Do not mix.
