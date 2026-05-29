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

/**
 * Awaits Pi.init() as a Promise before any authenticate call.
 * Returns true when the SDK is ready, false when not in Pi browser.
 */
export async function ensurePiInitialized(): Promise<boolean> {
  const Pi = (window as any).Pi;
  if (!Pi) return false;
  if (!initPromise) {
    initPromise = Promise.resolve(
      Pi.init({ version: "2.0", sandbox: import.meta.env.DEV }),
    ).catch((err: unknown) => {
      // Reset so it can be retried.
      initPromise = null;
      throw err;
    });
  }
  await initPromise;
  return true;
}

/**
 * Returns true when the Pi SDK object is present in the window (i.e. running
 * inside the Pi Browser / Pi App).
 */
export function hasPiSDK(): boolean {
  return typeof (window as any).Pi !== "undefined";
}

/**
 * Initialises the SDK then calls Pi.authenticate(["username"]).
 * Returns the raw { accessToken, user } from the SDK — the caller is
 * responsible for sending the accessToken to the backend for validation.
 */
export async function loginWithPi(): Promise<PiAuthResult | null> {
  try {
    const ready = await ensurePiInitialized();
    if (!ready) return null;

    const Pi = (window as any).Pi;

    const result = await Pi.authenticate(
      ["username"],
      // onIncompletePaymentFound — acknowledge and move on so auth isn't blocked.
      (_incompletePayment: unknown) => {
        console.warn("[Pi] Incomplete payment found during auth — ignored.");
      },
    );

    // Normalise: SDK can return either result.user or result directly.
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
