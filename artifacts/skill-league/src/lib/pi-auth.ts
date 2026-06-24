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
 * This only returns true when running inside the actual Pi Browser
 * (which pre-injects window.Pi), because we no longer load the SDK
 * script unconditionally at page load.
 */
export function hasPiSDK(): boolean {
  return typeof (window as any).Pi !== "undefined";
}

/**
 * Loads the SDK script on demand (if not already loaded), then awaits
 * Pi.init() as a Promise before any authenticate call.
 * Returns true when the SDK is ready, false on failure.
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
    initPromise = Promise.resolve(
      Pi.init({ version: "2.0", sandbox: import.meta.env.DEV }),
    ).catch((err: unknown) => {
      initPromise = null;
      throw err;
    });
  }
  await initPromise;
  return true;
}

/**
 * Initialises the SDK then calls Pi.authenticate(["username"]).
 * Includes a 15-second timeout so the promise never hangs forever.
 * If a call is already in progress, the second caller awaits the same result.
 */
let authPromise: Promise<PiAuthResult | null> | null = null;

export async function loginWithPi(): Promise<PiAuthResult | null> {
  if (authInFlight && authPromise) return authPromise;

  authInFlight = true;
  authPromise = _doAuth().finally(() => {
    authInFlight = false;
    authPromise = null;
  });
  return authPromise;
}

async function _doAuth(): Promise<PiAuthResult | null> {
  try {
    const ready = await ensurePiInitialized();
    if (!ready) return null;

    const Pi = (window as any).Pi;

    const authWithTimeout = Promise.race([
      Pi.authenticate(
        ["username"],
        (_incompletePayment: unknown) => {
          console.warn("[Pi] Incomplete payment found during auth — ignored.");
        },
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Pi.authenticate() timed out after 15s")), 15000)
      ),
    ]);

    const result = await authWithTimeout;

    const user: PiUser = PiUserSchema.parse(
      result?.user ?? result,
    );

    return { accessToken: result.accessToken as string, user };
  } catch (err) {
    console.error("[Pi] authenticate error", err);
    return null;
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
