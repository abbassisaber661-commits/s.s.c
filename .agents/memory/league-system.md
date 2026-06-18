---
name: League System Architecture
description: Full-stack league/season system built on top of SkillLeague — backend store, REST routes, frontend dashboard.
---

## Architecture

**Backend** (api-server):
- `src/lib/league-store.ts` — Self-contained JSON file store at `/tmp/sl-league-data.json`. All league business logic lives here (join, simulate, season advance, prizes).
- `src/routes/league-system.ts` — Express router registered as the last entry in `src/routes/index.ts`.

**Frontend** (skill-league):
- `src/lib/league-api.ts` — Typed fetch wrapper using `BASE + '/api-server/api/league-system'`.
- `src/pages/LeagueDashboard.tsx` — Route at `/league-dashboard`. Gated behind app auth (Pi auth).
- Entry point: `🏆 Seasons` button added to `LeaguesHub.tsx` top bar.

## Business Rules
- 4 leagues: Coins (500 coins), Pro (0.5π), Elite (0.75π), Champion (1π)
- 7-day seasons, 20 matches per player distributed [3,3,3,3,3,3,2] across days
- Win=3pts, Draw=1pt, Loss=0pt
- Prize splits: 25/18/14/10/8/7/6/5/4/3% → top 10
- Top 30% promoted each season
- Match simulation: difficulty-based win probability (easy=65%, medium=50%, hard=38%, expert=28%)

**Why JSON store**: User requested "JSON or SQLite, no complex setup". better-sqlite3 has native module issues with esbuild bundling. JSON file at /tmp is simple and zero-dependency.

## API Port
API server runs on port 8080 (discovered via curl probe loop). Confirmed working via `GET /api/league-system/leagues`.
