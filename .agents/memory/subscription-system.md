---
name: Pi Subscription System
description: Full Pi U2A payment gate for S.S.C Premium subscription — correct server-to-Pi-Network API call sequence, integrity checks, and incomplete payment recovery.
---

## Rule
Every Pi user must have an active `sl_subscription_v2` entry (localStorage) + a `subscriptions` DB row to access the app.

## Pi Network U2A Payment Call Sequence (server-authoritative)

The backend MUST call Pi Network for every step — the frontend SDK result is never trusted:

1. **`onReadyForServerApproval(piPaymentId)`** → backend calls:
   `POST https://api.minepi.com/v2/payments/:piPaymentId/approve`
   `Authorization: Key <PI_NETWORK_API_KEY>`
   ← Treat 4xx/5xx response as hard failure (return 502 to frontend); Pi SDK will not submit to blockchain until approved.

2. **`onReadyForServerCompletion(piPaymentId, txId)`** → backend calls:
   `POST https://api.minepi.com/v2/payments/:piPaymentId/complete`
   `Authorization: Key <PI_NETWORK_API_KEY>`
   `Body: { txid: string }`
   ← Then validate `piResult.amount` ≈ `pending.amount` before fulfilling product.

3. **`onIncompletePaymentFound(payment)`** → frontend calls:
   `POST /api/pi/payments/incomplete` (PUBLIC endpoint, no JWT)
   `Body: { piPaymentId, txId? }`
   ← txId present: backend calls Pi Network `/complete` + fulfills sub
   ← txId absent: backend marks payment failed (no blockchain tx; Pi Network auto-expires it)

**Why:** Skipping steps 1–2 means Pi Network never gets approve/complete signals. The old code only called `GET /v2/payments/:id` (verification read, not the required write endpoints). `onIncompletePaymentFound` fires BEFORE `Pi.authenticate()` resolves, so there is no JWT — the incomplete route must be unauthenticated.

## Security / Integrity Checks

- **Amount integrity**: After `/complete` returns, compare `piResult.amount` vs `pending.amount` (skip when no key — Testnet bypass).
- **Plan-price integrity**: `SUBSCRIPTION_PLAN_PRICES` map in `pi-payments.ts` is the server-authoritative source. Validate `pending.amount` against `SUBSCRIPTION_PLAN_PRICES[plan]` before inserting subscription. Prevents underpayment escalation attacks.
- **Idempotent fulfillment**: `fulfillSubscription()` checks for existing `subscriptions` row by `piPaymentId` before inserting — no double-fulfillment on recovery path.
- **Approve is a hard failure**: If `piNetworkApprove()` returns false AND PI key is set, return 502 — do not silently continue.

## Environment
- Secret: `PI_NETWORK_API_KEY` (primary) with fallback to `PI_API_KEY`.
- Testnet: if no key set, approve/complete calls are skipped with a warning (bypass for dev/Testnet only — must be removed before Mainnet).

## Database
- `subscriptionsTable`: id, playerId, plan, amountPi, piPaymentId, piTxId, status, expiresAt. No unique on piPaymentId — guard via `fulfillSubscription()` helper.
- `piPaymentsTable.piPaymentId` has `.unique()` — look up incomplete payments by it.

## Frontend
- `SubscriptionPage.tsx`: `Pi.authenticate(["username", "payments"], asyncIncompleteHandler)` → backend auth/pi (JWT) → `Pi.createPayment()`. Approve failure (non-2xx from backend) propagates to `approvalError` — not swallowed.
- `api.pi.incomplete(piPaymentId, txId?)` — public POST, no JWT needed.
- Memo format: `"S.S.C Premium — <plan> — 30 days"`.

## path-to-regexp v8 Compatibility
`app.get("*", ...)` crashes with path-to-regexp v8. Fix: `app.get("/{*path}", ...)`.
**Why:** Express 5 / path-to-regexp v8 rejects bare `*` wildcard routes; named wildcards (`{*name}`) are required.
