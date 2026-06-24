---
name: Difficulty Scaling System
description: How per-division difficulty, time limits, and question mix are computed in question-session.ts
---

## Rule
Every division must produce a distinctly different match experience via three levers:
1. **Question difficulty** — different `difficulties[]` arrays per tier
2. **Category mix** — `CATEGORY_CAPS` defines MCQ/VA/Puzzle ratio per division
3. **Time pressure** — `computeTimeLimitMs` × `applyTimeFactor` produces final ms

## Category Mix (CATEGORY_CAPS in question-session.ts)
| Division | MCQ | VA | PZ |
|----------|-----|----|----|
| div3     | 7   | 2  | 1  |
| div2     | 6   | 2  | 2  |
| pro      | 5   | 3  | 3  |
| champions| 4   | 3  | 3  |

Enforced via `PUZZLE_TARGET` (pre-placed), then VA fill, then MCQ fill.

## Time Computation
`computeTimeLimitMs(q, division)` ignores `q.timeLimitMs` and computes:
- knowledge: base { diff1=32s, diff2=28s, diff3=24s, diff4=20s } × divFactor
- visual_attention: base { diff1=12s, diff2=10s, diff3=8s, diff4=6s } × divFactor
- puzzle_assembly: base { diff1=36s, diff2=30s, diff3=24s, diff4=20s } × divFactor

Division time factors (applyTimeFactor):
- div3: ×1.00
- div2: ×0.88
- pro: ×0.75
- champions: ×0.62

## Pool Sizes (as of current state)
MCQ: div3=34, div2=31, pro=37, champions=61
VA: div3=50, div2=61, pro=31, champions=34
PZ: div3=4, div2=7, pro=7, champions=14

## Why
Without this, all leagues used the same flat question mix and the same raw timeLimitMs from the pool (which was being ignored entirely — `prepareDisplayQuestion` never applied `applyTimeFactor`). The fix wires time scaling to `prepareSessionForDisplay` automatically.
