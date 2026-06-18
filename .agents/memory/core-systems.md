---
name: Core Systems Completion
description: One-league-per-season rule, gem entry costs, relegation, promotion rewards, tier-aware bot lobby counts.
---

## One-league-per-season
- `getPlayerActiveLeague(playerId)` in `league-store.ts` scans all active season entries.
- `joinLeague()` calls it; returns `{ error: 'already_in_league', conflictLeague }` if player is active elsewhere.
- Route returns HTTP 409 with `error: 'already_in_league'` and `conflictLeague` field.
- Frontend `LeagueDashboard.tsx`: `activeLeagueId` derived from `myEntries`; `isBlockedFromSelected` computed; join strip shows lock message when blocked.

**Why:** Season integrity — a player can only compete meaningfully in one league table at a time.

## Gem entry costs
- `LEAGUE_GEM_COST` in `league-store.ts`: coins=0, pro=1, elite=2, champion=4.
- Route `POST /league-system/leagues/:id/join` checks balance → 402 `insufficient_gems` if low → deducts after successful join.
- Frontend: gem balance loaded in `load()` via `GET /api/economy/:pid/gems`; shown in header; subscribe button disabled if balance < cost.
- `League` object now has `entryCostGems` field (added to both store and `league-api.ts` types).

**Why:** Economy progression — gems are earned by playing matches; higher leagues require gem investment.

## Relegation system
- `advanceSeason()` now marks bottom 30% (`relegated: true`, `relegatedToLeague: prevLeague`).
- `SeasonEntry` has `relegated` and `relegatedToLeague` fields.
- Migration: v1→v2 runs on store load; adds missing fields to existing entries.
- Schema version bumped to 2.

**Why:** Seasonal stakes — relegation creates tension for low-ranked players alongside promotion for top players.

## Promotion economy rewards
- `calcPromotionReward(fromTier, toTier, coins, gems)` in `economy-engine.ts`.
- Reward table: div3→div2: +10 coins +1 gem; div2→pro: +20 coins +2 gems; pro→champions: +30 coins +3 gems.
- `POST /admin/advance-season` triggers grants per promoted player (DB coins + JSON gems).
- Returns `promotionRewards` array in response.

## Tier-aware bot counts (MatchArena)
- `MATCH_BOTS` in `match-engine.ts` expanded to 19 bots (diverse skill range 0.35–0.94).
- `getMatchBots(tier)` returns 19 bots for div3/div2/training/coin, 7 bots for pro/champions.
- `matchBotsRef` in `MatchArena.tsx` stores active bots for current match.
- `botScoresRef` and `botStreaksRef` sized dynamically from `matchBots.map(()=>0)`.

**Why:** Larger leagues have 20-player lobbies (19 bots), elite/champion have 8 (7 bots) for tighter competition feel.
