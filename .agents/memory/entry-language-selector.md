---
name: Entry-Flow Language Selector
description: How language switching works on IntroPage/SubscriptionPage (pre-login entry flow), and the UI convention for the selector itself.
---

`SubscriptionPage.tsx` and `IntroPage.tsx` (the pre-auth entry flow, rendered before a user is logged in / has a valid Pi subscription) get their language from `EntryLanguageContext` (`useEntryLanguage()` → `{ language, setLanguage, isRTL }`), which persists to `localStorage` under `sl_entry_lang`. This is a **separate, smaller** translation system from the main app's `lib/i18n.ts` `T` table (used post-login) — each page has its own local `T: Record<Language, SubT>` translation object keyed by the same `Language` type from `lib/i18n.ts`.

**Why:** the entry flow needs to work before any player/session exists, so it can't depend on backend-driven or session-scoped i18n; a lightweight per-page translation table + localStorage-backed context is the existing pattern.

**How to apply:**
- When adding new visible strings to `SubscriptionPage`/`IntroPage`, add a key to that page's local `SubT` interface and fill in a value for every `Language` in its `T` object (TypeScript's `Record<Language, SubT>` will fail to compile otherwise) — don't reuse the main app's `lib/i18n.ts` `T` table for these pages.
- The language selector UI must live in its own visually isolated container (bordered/background-distinct card), never inline inside the header row next to the logo/title — inline placement previously caused visual overlap with the title text when the language name was long.
- `isRTL` in `EntryLanguageContext` is hardcoded as `language === "ar"`; if more RTL languages are ever added there, switch it to use `isRTL()` from `lib/i18n.ts` instead.
