/**
 * devMode.ts — Replit-only Development Mode.
 *
 * `import.meta.env.DEV` is a Vite build-time constant: it is `true` only
 * when the app is served by the Vite dev server (exactly what the Replit
 * "Start application" workflow runs), and it is baked to `false`
 * permanently inside any production build produced by `vite build`
 * (which is what `[deployment].build` runs before publishing). It cannot
 * be flipped by a runtime environment variable, so this flag — and every
 * code path it guards — can never be active in a deployed/published app
 * or inside Pi Browser.
 *
 * When `IS_DEV_MODE` is true, GameContext auto-signs-in a temporary local
 * player (reusing the existing `/api/auth/guest` backend route — no new
 * backend surface) and AppRoot skips the Pi subscription gate, so working
 * in the Replit preview never requires a real Pi Network login or
 * subscription payment.
 *
 * This file never touches: Pi authentication (`pi-auth.ts`,
 * `loginWithPiNetwork`), the subscription/payment flow
 * (`pi-subscription.ts`, `SubscriptionPage`), the database, `OWNER_UID`,
 * or `JWT_SECRET`.
 */
export const IS_DEV_MODE: boolean = import.meta.env.DEV === true;

/** Stable id/name for the local dev player created via /api/auth/guest. */
export const DEV_USER_ID = "dev_local_user";
export const DEV_USERNAME = "Dev Tester";
