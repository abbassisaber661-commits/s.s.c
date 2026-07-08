/**
 * pi-auth.ts
 *
 * Pi Network SDK wrapper.
 *
 * Security contract:
 *  - The accessToken returned by Pi.authenticate() is NEVER trusted on the
 *    frontend as proof of identity.
 *  - It is forwarded immediately to the backend, which verifies it by calling
 *    GET https://api.minepi.com/v2/me with `Authorization: Bearer <token>`.
 *  - Only after that server-side verification does the backend create a
 *    session; the frontend only stores what the backend returns.
 *  - No Pi Network API key is required for this verification flow.
 */

import { z } from "zod";

export const PiUserSchema = z.object({
  uid: z.string(),
  username: z.string(),
});

export type PiUser = z.infer<typeof PiUserSchema>;

export interface PiAuthResult {
  accessToken: string;
  user: PiUser;
}

// Single shared init promise so concurrent callers don't double-init.
let initPromise: Promise<void> | null = null;

// Prevent concurrent Pi.authenticate() calls — only one at a time.
let authInFlight = false;

// Track whether we've already dynamically loaded the SDK script.
let sdkScriptLoaded = false;

/**
 * Dynamically loads the Pi SDK script if not already present.
 * In the actual Pi Browser, window.Pi is pre-injected so this is a no-op.
 * Outside Pi Browser (e.g. Replit preview), this loads the script on demand
 * only when the user explicitly requests Pi login.
 */
function loadPiSdkScript(): Promise<void> {
  if (typeof (window as any).Pi !== "undefined" || sdkScriptLoaded) {
    return Promise.resolve();
  }
  sdkScriptLoaded = true;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://sdk.minepi.com/pi-sdk.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Pi SDK script"));
    document.head.appendChild(script);
  });
}

/**
 * Returns true when the Pi SDK object is present in the window.
 * This is true when running inside the Pi Browser (which pre-injects
 * window.Pi). Outside Pi Browser the script must be explicitly loaded.
 */
export function hasPiSDK(): boolean {
  return typeof (window as any).Pi !== "undefined";
}

/**
 * Loads the SDK script on demand (if not already loaded), then fully
 * awaits Pi.init() as a Promise before any authenticate call.
 * Returns true when the SDK is ready, false on failure.
 *
 * IMPORTANT: Pi.init() MUST complete before Pi.authenticate() is called.
 * ensurePiInitialized() enforces this with a shared promise so concurrent
 * callers all wait for the same initialisation.
 */
export async function ensurePiInitialized(): Promise<boolean> {
  try {
    await loadPiSdkScript();
  } catch {
    return false;
  }

  const Pi = (window as any).Pi;
  if (!Pi) return false;

  if (!initPromise) {
    // Pi.init() may return a Promise or undefined — wrap to normalise.
    initPromise = Promise.resolve(
      Pi.init({ version: "2.0", sandbox: import.meta.env.DEV }),
    ).catch((err: unknown) => {
      initPromise = null; // allow retry on transient failure
      throw err;
    });
  }

  // All callers await the same promise — only one init runs.
  await initPromise;
  return true;
}

/**
 * Call this once at app boot (e.g. in main.tsx).
 *
 * When running inside Pi Browser, window.Pi is already available so we
 * immediately fire Pi.init() in the background. This means init is fully
 * complete long before the user taps any button, eliminating the per-button
 * init delay.
 *
 * Outside Pi Browser (Replit preview, desktop browser) window.Pi is absent
 * so this is a silent no-op.
 */
export function startPiAutoInit(): void {
  if (!hasPiSDK()) return; // not in Pi Browser — nothing to do
  ensurePiInitialized().catch((err) => {
    console.warn("[Pi] Auto-init failed:", err);
  });
}

/**
 * Typed error codes thrown by loginWithPi() / _doAuth().
 *
 *  "pi_sdk_unavailable"  — window.Pi not found, or Pi.init() failed.
 *  "pi_auth_cancelled"   — user dismissed the Pi auth dialog.
 *  "pi_auth_timeout"     — Pi.authenticate() did not resolve within 15 s.
 *
 * Callers can inspect `(err as Error).message` to branch on these codes.
 * The backend adds a fourth code via the consuming layer: "pi_verify_failed".
 */
export type PiAuthErrorCode =
  | "pi_sdk_unavailable"
  | "pi_auth_cancelled"
  | "pi_auth_timeout";

/**
 * Initialises the SDK then calls Pi.authenticate(["username"]).
 *
 * Scope contract: only "username" is requested here. The "payments" scope
 * is NOT requested during login — it is only requested later, at the
 * moment an actual payment is initiated (see SubscriptionPage.tsx), which
 * is both the principle of least privilege and avoids Pi Browser blocking
 * on unrelated incomplete-payment resolution during a plain sign-in.
 *
 * Concurrency contract:
 *  - Only one Pi.authenticate() call may be in flight at a time, enforced
 *    by the module-level `authInFlight` / `authPromise` guard below.
 *  - If a call is already in progress, a second caller receives the SAME
 *    promise instead of triggering a second, overlapping SDK call — Pi
 *    Browser's native bridge does not reliably support concurrent
 *    authenticate() calls, and calling it twice can leave the SECOND call
 *    hanging indefinitely even though a fresh 15s timer is attached to it.
 *  - The 15-second timer is always cleared (success, failure, or timeout)
 *    so no dangling timer can fire after the attempt has already settled.
 *
 * Throws with a PiAuthErrorCode message — never returns null — so callers
 * can distinguish SDK failure, user cancellation, and timeout.
 */
let authPromise: Promise<PiAuthResult> | null = null;

export async function loginWithPi(): Promise<PiAuthResult> {
  // A call is already active — every caller (auto or manual) shares it.
  // This is the single source of truth that guarantees only one
  // Pi.authenticate() request is ever active at a time.
  if (authInFlight && authPromise) return authPromise;

  authInFlight = true;
  authPromise = _doAuth().finally(() => {
    authInFlight = false;
    authPromise = null;
  });
  return authPromise;
}

/** True while a Pi.authenticate() call is in flight — lets callers avoid
 *  starting a second, redundant login attempt (e.g. auto-login checking
 *  before firing so it never races a manual click, and vice versa). */
export function isPiAuthInProgress(): boolean {
  return authInFlight;
}

async function _doAuth(): Promise<PiAuthResult> {
  // Step 1: ensure init is complete (no-op if startPiAutoInit() already ran).
  const ready = await ensurePiInitialized();
  if (!ready) {
    throw new Error("pi_sdk_unavailable" satisfies PiAuthErrorCode);
  }

  // Re-read window.Pi after init has resolved — it may have been injected
  // by the dynamically loaded script during ensurePiInitialized().
  const Pi = (window as any).Pi;
  if (!Pi) {
    throw new Error("pi_sdk_unavailable" satisfies PiAuthErrorCode);
  }

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  try {
    const authenticatePromise = Pi.authenticate(
      ["username"],
      async (incompletePayment: {
        identifier: string;
        transaction: { txid: string } | null;
      }) => {
        console.info("[Pi] onIncompletePaymentFound:", incompletePayment.identifier);
        try {
          // Dynamic import avoids a circular dependency between pi-auth ↔ apiClient.
          const { api } = await import("./apiClient");
          await api.pi.incomplete(
            incompletePayment.identifier,
            incompletePayment.transaction?.txid,
          );
          console.info("[Pi] Incomplete payment handled via backend");
        } catch (err) {
          // Non-fatal — log and let auth proceed; the Pi SDK keeps the
          // payment in recoverable state so the user can retry later.
          console.error("[Pi] Failed to handle incomplete payment:", err);
        }
      },
    ) as Promise<unknown>;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error("pi_auth_timeout" satisfies PiAuthErrorCode)),
        15_000,
      );
    });

    const result = (await Promise.race([
      authenticatePromise,
      timeoutPromise,
    ])) as Record<string, unknown>;

    // Validate the shape returned by the Pi SDK.
    const user: PiUser = PiUserSchema.parse(result?.user ?? result);
    return { accessToken: result.accessToken as string, user };
  } catch (err) {
    const msg = (err as Error)?.message ?? "";
    // Re-throw typed codes as-is; map anything else to pi_auth_cancelled
    // (covers the Pi Browser "user dismissed" path which throws a generic error).
    if (
      msg === "pi_auth_timeout" ||
      msg === "pi_sdk_unavailable"
    ) {
      throw err;
    }
    console.info("[Pi] authenticate did not complete:", msg);
    throw new Error("pi_auth_cancelled" satisfies PiAuthErrorCode);
  } finally {
    // Always clear the timer — prevents a dangling setTimeout from lingering
    // in memory after the race has already settled via the real SDK call.
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  }
}

// ── Persisted Pi user (local cache only — source of truth is the JWT) ────────

const PI_USER_KEY = "sl_pi_user";

export function getCachedPiUser(): PiUser | null {
  try {
    const raw = localStorage.getItem(PI_USER_KEY);
    if (raw) return PiUserSchema.parse(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return null;
}

export function cachePiUser(user: PiUser): void {
  localStorage.setItem(PI_USER_KEY, JSON.stringify(user));
}

export function clearCachedPiUser(): void {
  localStorage.removeItem(PI_USER_KEY);
}

// Keep old name so existing imports don't break.
export const getCurrentUser  = getCachedPiUser;
export const logoutPi        = clearCachedPiUser;
