---
name: Username Identity System
description: How the sole-public-identity username system works, its rules, and where the real Pi name is (and is not) allowed to appear.
---

## Rules
- The `username` field is the ONE public identity shown everywhere (posts, comments, profile header, search, leaderboards).
- The real Pi Network account name is only ever shown in the profile "About" info panel (owner-only, read-only) — never in posts, comments, or as the public display name.
- Default username = Pi name at first registration only. On every subsequent login, the backend must NOT overwrite an existing player's `username` — only refresh volatile fields (lastActiveAt, verificationStatus).
- Custom usernames persist across future logins/re-auth.
- There is exactly ONE editable username field app-wide (in Settings). Profile edit modals must not have their own separate name/username field — that caused a duplicate "third field" bug.
- Validation (both frontend `anti-cheat.ts` and backend `username-validate.ts`, kept in sync): any-language letters+digits only (`\p{L}\p{N}`), minimum 1 digit required, no symbols/spaces, case-insensitive, length 3-20, plus a reserved-name blocklist.

**Why:** Before this fix, `/auth/pi` and `POST /players` overwrote `username` with the live Pi name on every login, silently discarding any custom username the player had set.

**How to apply:** Any new login/registration flow must sync local `data.username` from the backend-confirmed value right after auth, never write the Pi name directly as the public identity. Any new "edit profile" surface must reuse the single Settings username editor rather than adding its own field.

## Badge ordering convention
Verification badges follow a fixed left-to-right order: **owner crown BEFORE the name, verified/official checkmark AFTER the name** (e.g. "👑 Saber123 ✔️"). This is a rendering-order-only rule — it does not change which badge tiers are computed/shown for a given author; only where in the JSX the badge sits relative to the name span. Applies in `SocialPostCard.tsx`, `CommentItem.tsx`, and `ProfileCoverHeader.tsx`.
