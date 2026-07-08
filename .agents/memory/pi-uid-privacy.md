---
name: Pi UID Privacy Boundary
description: Rule for keeping raw Pi Network UIDs out of the UI and out of API responses about other users, while preserving internal auth.
---

Raw `piUid` values must never be rendered in the UI (no "copy UID" cards, no admin/owner UID displays, no truncated UID debug rows) and must never be included in API responses describing a player other than the caller.

**Why:** the Pi UID is a sensitive identifier; owner-verification only needs a boolean (`isOwner`, `isOwnerPiUid()` against the `OWNER_UID` secret), never the literal value. Exposing it anywhere increases risk of impersonation/spoofing the owner check and generally leaks account-linkage data to unauthorized viewers.

**How to apply:**
- Any Drizzle query that selects `piUid` for endpoints returning a list of players or another player's profile/leaderboard/search data must destructure `piUid` out before `res.json(...)` and pass only the derived `isOwner` boolean.
- The one sanctioned exception is `POST /auth/pi` — it returns `player.piUid` in the response because `GameContext.tsx`'s `loginWithPiNetwork()` explicitly requires the backend-verified `piUid` to build the trusted local `PiUser`/`authUser` state (this is the caller's own session data, not another user's).
- Frontend components should never read/display `piUser.uid` / `authUser.uid` as visible text (e.g. old "🔑 Pi UID" owner card in ProfilePage, "ACCOUNT UID" row in Settings, truncated UID in BetaDashboard — all removed). Internal usages of `authUser.uid` as a fallback player-identifier in app logic (chat, likes, follows, matches, etc.) are fine to keep — that's an existing architecture pattern, not a display, and rewriting it app-wide is out of scope for a UID-hiding request.
