---
name: Gift Support Bar
description: Horizontal top-supporters row on posts, driven by gift ledger aggregation.
---

The Gift Support Bar (row of top Pi supporters with avatar + amount, shown between post content/stats and the reaction bar) is a pure read-only display feature on top of the existing gift ledger aggregation endpoint.

**Why:** Posts have no `authorAvatar`/`avatar` field wired anywhere in the community feed today — all avatars in the social feed render as initials/gradient fallback via the shared `Avatar` component, not real photos. So supporter avatars in the bar also fall back to initials; this is consistent with the rest of the app, not a missing feature.

**How to apply:** The gift ledger stats route's top-senders query limit is the only backend knob for "how many supporters to show" — it was raised from 3 to 10 for this bar. Widening that limit is a safe, non-schema, non-payment change. Never touch payment/Pi/JWT/OWNER_UID logic to build display features like this — aggregate off `gift_ledger` read-only.
