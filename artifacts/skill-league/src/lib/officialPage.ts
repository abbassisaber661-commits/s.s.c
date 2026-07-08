// src/lib/officialPage.ts
// Shared helpers for the official "S.S.C" system pages (Wisdom / Health / Faith /
// Explore / Motivation, id-prefixed `sl_page_*`). Visual/label helpers only —
// never touches auth, payments, or DB logic.

export const OFFICIAL_PAGE_ID_PREFIX = "sl_page_";

/** True when the given id belongs to an official S.S.C system page. */
export function isOfficialPageId(id?: string | null): boolean {
  return typeof id === "string" && id.startsWith(OFFICIAL_PAGE_ID_PREFIX);
}

/**
 * Normalises an official page's raw stored name into the "S.S.C <Category>"
 * form, stripping any leading shield emoji and/or legacy "SkillLeague" text
 * regardless of how it was originally seeded. Null-safe.
 */
export function officialPageDisplayName(rawName?: string | null): string {
  let name = (rawName ?? "").trim();
  // strip any leading shield emoji (with or without variation selector) + spaces
  name = name.replace(/^[\u{1F6E1}\u{FE0F}]+\s*/u, "").trim();
  // strip legacy "SkillLeague" branding
  name = name.replace(/^SkillLeague\s*/i, "").trim();
  // strip a redundant leading "S.S.C" if it was already present
  name = name.replace(/^S\.S\.C\s*/i, "").trim();
  return name ? `S.S.C ${name}` : "S.S.C";
}

/** Fixed label used for the follow action on official pages, per spec. */
export const OFFICIAL_FOLLOW_LABEL = "Suivre";
