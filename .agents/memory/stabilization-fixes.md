---
name: Stabilization Fixes
description: Three confirmed production bugs patched in the minimal stabilization pass.
---

## Results.tsx — recordMatch never called (Critical)
Game.tsx flow posted results to sessionStorage and Results.tsx only called `addCoins(prize)`.
This silently skipped XP, ELO, matchesPlayed, daily/weekly challenges, level-ups, and achievements for every Game.tsx match.

**Fix:** Replaced `addCoins(prize)` with `recordMatch(r.league, r.score, r.accuracy, 0, r.correct)` in the useEffect that reads sessionStorage. Streak is passed as 0 because MatchResult does not carry a streak field.

**Why:** recordMatch is the authoritative function for crediting all game-state side effects. Using only addCoins bypasses the entire progression pipeline.

## PvP.tsx — ELO calculation used wrong playerElo (High)
Line: `getEloChange(matchEnd.won, matchEnd.draw, elo * 100 + 800, elo, mt)`
`elo * 100 + 800` produced a value like 105,800 instead of 1,050. Expected win always returned ≈1, making (score - expected) ≈ 0, so wins awarded ~0 ELO. Losses still gave full -K.

**Fix:** Changed to `getEloChange(matchEnd.won, matchEnd.draw, elo, matchInfo?.playerB.elo ?? elo, mt)` so both player and opponent ELO are real values from state/matchInfo.

**Why:** matchEnd event from the server does not include opponent ELO; it must be read from matchInfo.playerB.elo (available from the match:found event stored in state).

## GameContext.tsx — addCoins mislabeled transaction (Minor)
`addCoins` unconditionally logged `label: 'Referral reward'` for every generic coin addition, polluting the Wallet transaction ledger.

**Fix:** Changed label to `'Coins earned'`.

## Pre-existing TypeScript error fixed
`PvP.tsx` rendered `<WinAnimation />` without the required `show` prop. Fixed to `<WinAnimation show={showWinAnim} />`.
