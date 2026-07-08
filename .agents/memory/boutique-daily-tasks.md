---
name: Boutique Daily Tasks + Premium placeholder
description: How the Boutique (/store) page's Daily Tasks and locked Premium sections are wired, and why no backend/DB changes were needed.
---

## What it is
Two new sections added at the **top** of the existing Boutique page (`pages/Store.tsx`,
bottom-nav label "Boutique"), above the pre-existing DN$ Bundles / Boosts / Cosmetics /
Passes sections (kept untouched, per explicit user instruction — nothing was removed):

1. **🎯 Daily Tasks** (open, active) — `components/store/DailyTasksSection.tsx`
2. **🔒 Premium** (locked placeholder) — `components/store/PremiumSection.tsx`

## Daily Tasks: reused existing backend, no new endpoints/DB
The app already had a full daily-tasks engine (`api-server/src/lib/daily-rewards.ts`,
`routes/daily-economy.ts`, exposed to frontend as `api.daily.status`/`api.daily.claim`,
aliased at `/daily/status/:id` and `/daily/claim`). Rather than building parallel
infrastructure, the Boutique section just renders 3 of its existing tasks (match, content,
social) as compact horizontal rows instead of the full `DailyRewards.tsx` page's card layout.
This means daily reset, one-time-claim enforcement, and DN$ amounts are already
server-authoritative and correct — the Boutique section is a thinner UI view, not new logic.

## Check → Claim → redirect flow
- "Check" button (task incomplete) navigates to the task's page: `/match-arena` (play match),
  `/feed?compose=1` (create post), `/feed` (social interaction).
- `?compose=1` query param is a new minimal hook added to `FeedPage.tsx` (via wouter's
  `useSearch`) that auto-opens the existing `CreatePostModal` — the only change made to
  FeedPage to support "redirect straight into the create-post flow."
- Once the backend marks the task complete, the row's button becomes "Claim" and calls
  `api.daily.claim`.

## Premium placeholder
Pure UI, no logic: shows "Locked / Coming Soon" with 3 greyed-out level slots
(Level 1/2/3). No purchase/entitlement code — intentionally deferred to a future task.
