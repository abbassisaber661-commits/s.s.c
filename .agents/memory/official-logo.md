---
name: Official Logo Rollout
description: How the app's brand logo is sourced and rendered across the UI, and a preference about not redesigning user-provided brand assets.
---

The app's logo is a single shared `Logo` component that renders the official brand image (`src/assets/branding/logo.png`) at a configurable pixel size and corner radius, replacing the earlier 🏆 emoji-in-a-gradient-box placeholder used across the navbar, auth/entry screens, invite gate, and loading screens.

**Why:** The user supplied a real brand asset (an infographic-style feature graphic, not a clean icon) and explicitly confirmed — after being warned it wasn't a typical logo shape — that it should be used exactly as uploaded, only scaled proportionally, with no cropping, redesign, or regeneration.

**How to apply:** When a user provides a brand/logo image, default to using it verbatim (object-cover inside a sized, rounded container) rather than trying to "clean it up" or regenerate a nicer-looking version, unless they ask for that. If the asset doesn't look like a typical icon, flag the concern once, but respect their explicit choice if they still want it used as-is.
