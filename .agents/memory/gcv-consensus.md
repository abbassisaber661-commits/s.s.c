---
name: GCV Consensus Price Section
description: Home-page community consensus price poll — how it's isolated from Pi/wallet, and an api-server dev-workflow gotcha hit while building it.
---

GCV is a standalone, additive feature (new `gcv_votes` table + `/api/gcv/results` and `/api/gcv/vote` routes) letting players vote once (changeable) on a small fixed set of price values. It intentionally does NOT touch Pi auth, Pi payments, wallet, or DB tables belonging to those systems — the disclaimer text and design must always make clear it's a community-voted internal number, not the official Pi price.

**Gotcha — api-server dev workflow needs a manual restart after adding new routes/schema.** The `artifacts/api-server: API Server` workflow's `dev` script does `build && start` once at launch; it does NOT hot-reload on file changes (only the Vite frontend does). After adding a new route file, editing routes/index.ts, or changing the DB schema package, the standalone api-server workflow (not just "Start application") must be explicitly restarted for the new build to take effect — otherwise new endpoints 404 even though `tsc` and the code both look correct.

**How to apply:** whenever a new backend route/table is added and later returns unexpected 404s despite passing typecheck, restart the `artifacts/api-server: API Server` workflow (and/or `Start application`) before assuming the code is wrong.
