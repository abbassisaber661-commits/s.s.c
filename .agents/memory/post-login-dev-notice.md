---
name: Post-Login Dev Notice
description: How the "app is under development" welcome modal works and where it lives.
---

`components/DevNotice.tsx` renders a floating (not full-screen) card once per browser session, shown inside `AppShell` (i.e. after either a guest or an authenticated Pi user reaches the main app past the subscription gate).

**Why:** the notice is meant for people who are already using the app, not the pre-login/subscription flow, so it deliberately uses the main app's `useTranslation()` (backed by `GameContext`'s persisted `language`) rather than `EntryLanguageContext` — those are two separate language systems in this codebase (see `entry-language-selector.md`).

**How to apply:**
- Text only exists for `en`/`ar`/`fr` per product requirement; any other app language (es/de/pt/tr/hi/zh/ru) falls back to English via `resolveNoticeLanguage()`. If more languages get real copy, add them to `DEV_NOTICE_TEXT` and extend that resolver.
- "Seen" state is `sessionStorage` (`sl_dev_notice_seen_v1`), intentionally session-scoped (not localStorage) so it reappears each new session, per the product spec — don't change this to localStorage without checking that requirement still holds.
- Mounted unconditionally at the top of `AppShell` in `App.tsx`; it self-gates via the sessionStorage check, so don't add extra visibility conditions elsewhere or it can end up mounted twice.
