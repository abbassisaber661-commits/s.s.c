---
name: Economy Migration — Coins/Gems → DN$/Pi
description: Durable lessons from the economy rename migration; file corruption patterns to avoid and which identifiers were intentionally preserved.
---

## Rule: Avoid `$` in shell-embedded Python replacement strings
Never use Python `str.replace` with `$` in the replacement string inside shell `python3 -c "..."` or heredocs — the `$` gets interpreted by the shell before Python sees it, truncating strings like `'DN$'` to `'DN`. Always write replacements to a `.py` file first (via WriteFile), then run it.

**Why:** Multiple files were silently corrupted mid-string because the `$` in `DN$` was eaten by the shell. The corruption caused build failures and required full git-restore + re-apply cycles.

## Rule: When a page file has duplicate content, restore from git
If the Edit tool inserts instead of replaces (e.g. "Found N matches" or stale context), the file can grow 2–3× with duplicated sections. The reliable fix is: `git show HEAD:<path>` to restore original, then re-apply only the needed changes with a saved Python script.

**Why:** DailyRewards.tsx, Clans.tsx, AICoach.tsx, EconomyDashboard.tsx, Events.tsx all became 2–3× their original size from repeated failed edit attempts during this migration.

## Identifiers intentionally kept as-is (do NOT rename)
- `LeagueId = 'coins'` — backend DB enum value
- `leagueId: "coins"` in frontend — maps frontend route to backend ID
- `/economy/${playerId}/gems` API endpoint — would need server-side change too
- `{ gems: number }` response shape in economy.ts — matches backend API
- `coins: number` fields in apiClient.ts — match server response shapes
- `result.coins` in DailyRewards — matches backend daily-task API response
- `coins: coinsR` destructuring in MatchArena — matches server `rewards.coins` shape
- Image imports from `@/assets/currency/coins/` in piGiftTiers.ts — file system paths
- Pi payment product IDs (`coins_250`, `coins_500`, `coins_1000`) — Pi Network payment records

## Lucide `Coins` icon
The `Coins` icon from lucide-react is kept as the visual coin icon for DN$ throughout the app. It is a UI icon, not user-facing currency text.

## Events.tsx JSX corruption (now fixed)
Events.tsx in the git import had a pre-existing duplicate file embedded mid-template-literal at what was line 79. The fix was: take lines 1–78 (first clean section up to `<span>`), add the reconstructed reward line (`🎁 {(m.reward.dn ?? 0) > 0 ? \`+${m.reward.dn} DN$\` : ''}`), then continue from the remaining content of the second copy (XP line onward through the non-selectedEvent return).
