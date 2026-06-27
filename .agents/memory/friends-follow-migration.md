---
name: Friends-to-Follow Migration
description: Full replacement of localStorage friends system with API-based followers; Jobs feature added with real backend.
---

## What changed

**lib/friends.ts** — Completely rewritten. All localStorage removed.
- `getFriendStatus()` → stub returning 'none' (sync callers)
- `checkFollowStatus(myId, theirId)` → async API call
- `followPlayer(myId, theirId)` / `unfollowPlayer(myId, theirId)` → use api.followers.follow/unfollow
- `getFriendsListAsync(myId)` → calls api.followers.listFollowing()
- `sendFriendRequest` / `unfriend` → kept as stubs for backwards compat but call API

**FriendsPage.tsx** — Rewritten to call `api.followers.listFollowing(myId)`. Shows who the player follows (≈ friends).

**Messages.tsx** — Removed getFriendsList import + friends quick-start bar (was localStorage-only).

**ChatPage.tsx** — Removed `canChat` gate (was based on localStorage friendship). Anyone whose ID is resolved can be messaged. Also removed `Lock` icon import.

**PostCard.tsx FriendButton** — Rewritten to accept `meId`/`themId` props; uses `api.followers.get` to check status on mount; uses `api.followers.follow/unfollow` for actions.

**UserProfile.tsx FriendBtn** — Removed the entire `FriendBtn` localStorage component. The page already had `isFollowing` state + `handleFollow` API logic. Message button now always visible.

## Jobs feature (full-stack)

**DB**: `jobsTable` added to `lib/db/src/schema/community.ts` — fields: id, authorId, authorName, title, description, jobType, country, category, createdAt.

**Backend**: `artifacts/api-server/src/routes/jobs.ts` — GET /jobs, POST /jobs, DELETE /jobs/:id. Registered in routes/index.ts.

**Frontend**: `JobsPage.tsx` rewritten — loads from `api.jobs.list()`, creates via `api.jobs.create()`, deletes own jobs.

**apiClient.ts**: Added `api.jobs` section.

**Why:** All these features were using localStorage/fake data as primary data source, meaning data was lost on page refresh and not shared between users.

**How to apply:** When adding new social features, always wire to API. PostCard FriendButton needs IDs (meId/themId), not usernames.
