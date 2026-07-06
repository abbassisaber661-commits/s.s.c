---
name: Economy Migration Complete
description: Full removal of coins/gems from frontend and backend; two-currency system (DN$ + Pi) fully wired.
---

## Rule
The app has exactly two currencies: **DN$** (internal points, `dnBalance` in PlayerData/GameState) and **Pi** (real payments only). `coins` and `gems` are fully removed.

## Key renames applied
- `PlayerData.coins` → `PlayerData.dnBalance`
- `PlayerData.totalCoinsEarned` → `totalDnEarned`
- `PlayerData.totalCoinsSpent` → `totalDnSpent`
- `WeeklyMission.rewardCoins` → `rewardDN`
- `CareerStats.coins` → `CareerStats.dn`
- `career.ts` achievement rewards: `{ coins }` → `{ dn }`
- `useDbSync` payload: `coins: d.coins` → `dnBalance: d.dnBalance`
- PvP.tsx: `setCoinsEarned` → `setDnEarned`
- Tournament.tsx: `cfg.coins` → `cfg.dn`
- Journey.tsx streak milestones: `m.rewardDN ?? m.coins` → `m.dn` (type is `{ days, dn, xp, label }`)

## Backward-compat aliases (GameContext)
`addCoins = addDN` and `spendCoins = spendDN` are kept as deprecated aliases to avoid breaking components that weren't migrated.

## League entry fees
Entry costs in LeagueSelectPage/LeagueDashboard now show `π` (Pi) not `💎`. `getPlayerGems()` removed from leagueApi calls; gem balance hardcoded removed.

## HomeScreen
`loadLocalGems` import and gem badge fully removed.

**Why:** Ran full typecheck + build to verify — zero TS errors.
