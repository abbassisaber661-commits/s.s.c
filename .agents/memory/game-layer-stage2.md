---
name: Game Layer Stage 2
description: XP/level/streak/badges/arcade/daily reward system wired into SkillLeague — architecture and known bugs.
---

## Status: Complete

## Architecture
- `artifacts/api-server/src/lib/player-store.ts` — JSON store at `/tmp/sl-player-data.json`. XP/level/streak/badges/arcade/daily logic.
- `artifacts/api-server/src/routes/game-layer.ts` — arcade/daily/profile/XP-leaderboard endpoints.
- `artifacts/api-server/src/routes/league-system.ts` — play route calls `applyMatchResult` as non-breaking side-effect; returns `{ ...matchResult, progression }`.
- `artifacts/skill-league/src/lib/game-layer-api.ts` — typed client.
- `artifacts/skill-league/src/components/PlayerProgress.tsx` — XP bar, level badge, streak, badges grid.
- `artifacts/skill-league/src/components/ArcadeZone.tsx` — 3 mini-games with animation.
- `artifacts/skill-league/src/pages/LeagueDashboard.tsx` — 3 page-level tabs: 🏆 Leagues / 🎮 Arcade / 📈 Progress.

## Known Bug (fixed)
`XP_PER_PLAYED` was used in `applyMatchResult` but the constant is named `XP_PLAYED`. This caused silent catch → `progression: null` on every match play response. Fixed to `XP_PLAYED`.

**Why:** The constant was defined with a shorter name (`XP_PLAYED`) but the function used a longer name (`XP_PER_PLAYED`). TypeScript caught it at compile time (TS2552) but the esbuild bundler doesn't type-check, so the runtime error was silently swallowed by the `try/catch` wrapper.

**How to apply:** Any time `applyMatchResult` returns `null` in the match response, check this constant name first.

## XP Rules
- Win: 50 XP + 20 played bonus = 70 XP
- Draw: 20 XP + 20 played = 40 XP
- Loss: 10 XP + 20 played = 30 XP
- Streak bonuses: 3=+20, 5=+50, 10=+100 XP
- Arcade: +10–15 XP per game
- Daily: +10 XP +20 coins, once per calendar day
- Level = floor(xp / 500) + 1

## playerName Requirement
`playMatch` in league-api.ts must pass `playerName` (third arg, default 'Player') so `applyMatchResult` can create/find the profile.
