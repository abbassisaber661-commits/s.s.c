---
name: Economy Integration Layer
description: Daily Coins + Gems system fully wired into auth/matches/community/seasons; DB-backed daily limits; shop service.
---

## Architecture

- **DB Schema additions**: `gems` column on `playersTable`; `user_daily_economy` table (1 row per player per UTC date) with unique index on (playerId, date).
- **Lib files**: `artifacts/api-server/src/lib/daily-rewards.ts` (coin award service), `artifacts/api-server/src/lib/shop-service.ts` (shop catalog + purchase).
- **Routes**: `artifacts/api-server/src/routes/daily-economy.ts` — all new economy endpoints.

## Daily Coin Sources (all fire-and-forget hooks)

| Source | Hook location | Function |
|--------|--------------|----------|
| Login | `auth.ts` — all 3 login paths (password/guest/pi) | `claimLoginReward(playerId)` |
| Match | `matches.ts` — after player stats persist | `claimMatchReward(playerId)` |
| Posts | `community.ts` — after post insert | `recordPost(authorId)` |
| Likes | `community.ts` — liked:true branch | `recordInteraction(postAuthorId, 'like')` |
| Comments | `community.ts` — after comment insert | `recordInteraction(postAuthorId, 'comment')` |

## Daily Limits (user_daily_economy table)
- Login: 1x/day — `loginClaimed` boolean
- Posts: max 2/day, reward on 2nd — `postsCount` + `postRewardClaimed`
- Match: 1x/day — `matchPlayedClaimed`
- Interactions: capped at 5 likes + 5 comments, reward once — `interactionRewardClaimed`

## Season-End Gems
- `awardSeasonEndGems(leagueId)` in `league-system.ts` — called BEFORE `advanceSeason()` in both manual and auto-advance paths.
- Queries top N real players by LP within division range, awards gems via DB (not JSON store).
- Gem table: div3: {1:1}, div2: {1:2,2:1}, pro: {1:3,2:2,3:1}, champions: {1:4,2:3,3:2,4:1}

## Shop Items (Coins)
- post_promotion: 50, avatar_weekly: 8, avatar_permanent: 80, game_assist: 20
- Endpoint: POST /api/economy/shop/:playerId/buy { itemId }

## Important
- All hooks are fire-and-forget (`.catch(() => {})`) — never break existing flows.
- Gems stored in `playersTable.gems` (integer DB column), NOT in JSON player-store.
- Daily reset is implicit — each UTC date creates a new `user_daily_economy` row.

**Why:** Gems were previously in JSON file (data/players.json) which is fragile. DB column is authoritative for the new economy system.
