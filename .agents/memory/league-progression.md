---
name: League Progression System
description: LP-based ranking across 4 tiers (Training/Coin/Pro/Champion), localStorage-backed, integrated into MatchArena results screen.
---

## Key files
- `src/lib/league-progression.ts` — all tier defs, LP calc, leaderboard sim
- `src/pages/LeagueHub.tsx` — Overview/Rankings/Stats tabs, public route `/league-hub`
- `src/pages/MatchArena.tsx` — computes LpChange in `finishMatch()`, shows card in results

## Storage
- localStorage key: `sl_league_v2` (LeagueStats)
- Weekly LP resets automatically when `weekStart` is a past Monday

## LP thresholds
- Training: 0–99 LP (no loss penalty)
- Coin League: 100–299 LP
- Pro League: 300–499 LP
- Champion: 500+ LP

## Routing
- `/league-hub` — public (in PUBLIC_PATHS array in App.tsx)
- `/match-arena` — public (in PUBLIC_PATHS array in App.tsx)

**Why:** These two routes are designed for guests so they can play and see their progression without an account.

## Do NOT conflict with
- `src/lib/game-engine.ts` LEAGUES config (training/bronze/silver/elite) — completely separate ladder
- `src/lib/elo.ts` ELO system — separate ranking axis
