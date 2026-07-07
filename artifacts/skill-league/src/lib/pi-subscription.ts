/**
 * pi-subscription.ts — Subscription state utilities
 *
 * Manages the local subscription record (localStorage) and exposes helpers
 * for checking whether the current user has a valid active subscription.
 *
 * The authoritative source of truth is the backend `subscriptions` table.
 * The local record is used for instant UI decisions on app start without
 * a network round-trip. It is always written immediately after a Pi payment
 * is confirmed (onReadyForServerCompletion) and carries the same expiry as
 * the backend record.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

/** Subscription plans and their Pi (Testnet) amounts */
export const SUBSCRIPTION_PLANS = {
  premium3: { price: 3, label: "Premium",  durationDays: 30 },
  premium1: { price: 1, label: "Standard", durationDays: 30 },
} as const;

export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS;

/** localStorage key — versioned so old keys don't interfere */
const SUB_KEY = "sl_subscription_v2";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LocalSubscription {
  playerId:    string;
  plan:        SubscriptionPlanId;
  piTxId:      string;
  expiresAt:   number;  // Unix ms timestamp
  confirmedAt: number;  // Unix ms timestamp
}

// ── Read / Write ──────────────────────────────────────────────────────────────

export function getLocalSubscription(): LocalSubscription | null {
  try {
    const raw = localStorage.getItem(SUB_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalSubscription>;
    if (!parsed.playerId || !parsed.plan || !parsed.expiresAt) return null;
    return parsed as LocalSubscription;
  } catch {
    return null;
  }
}

export function saveLocalSubscription(sub: LocalSubscription): void {
  try {
    localStorage.setItem(SUB_KEY, JSON.stringify(sub));
  } catch { /* ignore storage quota errors */ }
}

export function clearLocalSubscription(): void {
  try {
    localStorage.removeItem(SUB_KEY);
  } catch { /* ignore */ }
}

// ── Validity check ────────────────────────────────────────────────────────────

/**
 * Returns true when the given subscription record exists and has not expired.
 * Treats records within a 5-minute grace period as valid to handle clock skew.
 */
export function isSubscriptionValid(sub: LocalSubscription | null): boolean {
  if (!sub) return false;
  const GRACE_MS = 5 * 60 * 1000; // 5 min
  return sub.expiresAt > Date.now() - GRACE_MS;
}

/**
 * Convenience: read from localStorage and check validity in one call.
 * Use this in the auth guard.
 */
export function hasActiveLocalSubscription(playerId?: string): boolean {
  const sub = getLocalSubscription();
  if (!sub) return false;
  if (playerId && sub.playerId !== playerId) return false;
  return isSubscriptionValid(sub);
}

/**
 * Build a LocalSubscription from a confirmed payment and persist it.
 */
export function confirmSubscription(opts: {
  playerId: string;
  plan:     SubscriptionPlanId;
  piTxId:   string;
}): LocalSubscription {
  const plan = SUBSCRIPTION_PLANS[opts.plan];
  const now  = Date.now();
  const sub: LocalSubscription = {
    playerId:    opts.playerId,
    plan:        opts.plan,
    piTxId:      opts.piTxId,
    confirmedAt: now,
    expiresAt:   now + plan.durationDays * 24 * 60 * 60 * 1000,
  };
  saveLocalSubscription(sub);
  return sub;
}
