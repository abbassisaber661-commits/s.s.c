---
name: Danous Coin Real Assets
description: How the 7-tier Danous (DN$) coin visuals are sourced — image-based, not hand-drawn SVG.
---

The `DanousCoin` component (`artifacts/skill-league/src/components/wallet/DanousCoin.tsx`) renders one PNG image per tier (white/yellow/orange/red/green/blue/purple), sourced from a single reference infographic the user provided showing all 7 coins. Each coin was cropped out of that infographic with ImageMagick and had its background stripped via the background-removal tool, producing transparent per-tier PNGs in `src/assets/coins/`.

**Why:** The user explicitly asked to replace the previously-approved hand-coded SVG/gradient coin design with their own real coin artwork, used as-is (same pattern as the app logo: no redesign, just crop/resize/cleanup of the provided image).

**How to apply:** If the user provides a new/updated version of the coin artwork (single coin or full sheet), re-crop and re-run background removal into `src/assets/coins/<color>.png`, keeping the `DANOUS_TIERS` data shape (id/name/piValue/etc.) intact since other components (e.g. `DanousInfoModal`) depend on it — only the `image` field and rendering method change.
