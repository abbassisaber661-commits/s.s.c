---
name: Official S.S.C page visual identity
description: How official system pages (Wisdom/Health/Faith/Explore/Motivation, id-prefixed sl_page_*) are branded across the UI without touching DB/auth.
---

Official pages are `players` rows with id prefix `sl_page_*`; their raw stored `name`/`username` still contains legacy text (e.g. shield emoji + "SkillLeague ..."). Never edit those seeded rows to "fix" branding — normalize purely at the frontend display layer.

Shared helper: `artifacts/skill-league/src/lib/officialPage.ts` exports `isOfficialPageId(id)`, `officialPageDisplayName(rawName)` (strips any leading shield emoji + "SkillLeague"/"S.S.C" prefix, rebuilds clean "S.S.C <Category>"), and `OFFICIAL_FOLLOW_LABEL` ("Suivre").

**Why:** the original inline regex in `SocialPostCard.tsx`/`ProfileCoverHeader.tsx` anchored on `^SkillLeague`, but raw names start with a shield emoji first, so it silently never matched — old branding was still leaking to users.

**How to apply:** any new surface showing an official page's identity (feed, comments, profile header, search) must: detect via `isOfficialPageId`, render `Avatar` with the `isOfficialPage` prop (shield tile, no photo/initials), use `officialPageDisplayName` for the name, keep `VerificationBadge tier="official"`, and force the follow button label to `OFFICIAL_FOLLOW_LABEL` instead of localized Follow/Following text.
