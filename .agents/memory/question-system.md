---
name: Question System
description: SkillLeague question system — new types, seeded RNG, 3/0 scoring, trivia display kind
---

## New QTypes added to match-engine.ts
- `sports_trivia` — Players, teams, tournaments, results
- `culture_trivia` — Geography, history, countries, cities
- `philosophy_trivia` — Figures, scientists, philosophers
- `religion_trivia` — Factual knowledge only (no debate)
- `visual_deception` — Near-identical emoji options, misleading distractors
- `puzzle_assembly` — Extended emoji grid (3×3 → 5×4 by tier)

## New display kind: `trivia`
Added to `DisplayData.kind` union. `QuestionDisplay` in Game.tsx renders it as:
- Category badge (Sports/Culture/Philosophy/Religion/Visual) with color
- Prominent question text box (full question in `d.value`)
- No small prompt header (hidden for trivia kind)
Classic types still show the small prompt header.

## Scoring rule (BREAKING change)
`calcScore(correct, ...)` now returns 3 if correct, 0 if wrong.
The `timeLeftMs / timeLimitMs / streak` params are kept for API compat but ignored.
Opponent ticker in Game.tsx updated to add 3 pts per tick (not 100+).

## Seeded RNG for synchronized questions
Seed = `Math.floor(Date.now() / 86_400_000) * 37 + tierOffset * 1000003`
Same league + same UTC day → same questions in same order for every player.
Optional `matchSeed` param on `generateMatchQuestions` overrides (for server-assigned seeds).

## Question composition per match (10 Qs)
- 4 knowledge Qs: 1 × (sports, culture, philosophy, religion) — no repeats
- 1 visual deception Q
- 1 puzzle assembly Q (grid size varies by tier)
- 1 word assembly Q
- 1 logic pattern Q
- 2 classic Qs (color/shape/pattern/category/pair)

## Puzzle assembly grid sizes
- easy (Division III): 3×3 = 9 cells, 2 missing visible
- medium (Division II): 4×3 = 12 cells, 2 missing visible
- hard (Professional): 4×4 = 16 cells, 3 missing visible
- champion: 5×4 = 20 cells, 4 missing visible, 8 options

## Difficulty mapping (updated)
- training / coin / division-iii → easy
- pro / division-ii → medium
- champion / champions / professional → hard

## File locations
- `artifacts/skill-league/src/lib/question-bank.ts` — all trivia banks
- `artifacts/skill-league/src/lib/match-engine.ts` — generators + seeded RNG + scoring
- `artifacts/skill-league/src/pages/Game.tsx` — display + PuzzleBadge + isPuzzle

**Why:** User required competitive skill system: knowledge, attention, deception, puzzle solving, speed. Seeded RNG ensures all players in same match see exactly same questions in same order.
