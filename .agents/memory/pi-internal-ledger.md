---
name: Pi Internal Ledger
description: How Pi payment state (pending/confirmed/failed) is tracked without a real internal Pi wallet. Read before touching pi-payments.ts, wallets Pi fields, or the gift/purchase flow.
---

The app never holds real Pi — Pi Network settles actual funds. `pi_payments`
(schema `piPaymentsTable`, security.ts) is a persisted ledger recording every
payment attempt end-to-end, and `wallets.totalEarnedPi`/`pendingPi`/`availablePi`
mirror aggregate state per player.

**Why:** the original implementation tracked "pending" Pi payments only in an
in-memory `Map` inside `pi-payments.ts` — lost on server restart, and there was
no way to ever record a failed/cancelled payment (only successful ones were
persisted, via a raw-SQL insert at completion time). This made it impossible to
build a transaction history or reconcile stuck pending gifts.

**How to apply:**
- Every `POST /pi/payments` call inserts a `pi_payments` row immediately with
  `status='pending'` — never hold payment state only in memory.
- Status transitions are `pending → confirmed` (via `/complete`, after the Pi
  SDK reports `onReadyForServerCompletion`) or `pending → failed` (via `/fail`,
  called from `onCancel`/`onError`/any client-side failure after payment
  creation). Both are idempotent no-ops if already resolved.
- For gifts: creating the payment immediately adds the amount to the
  receiver's `pendingPi`; confirming moves it from `pendingPi` to
  `totalEarnedPi` + `availablePi`; failing subtracts it back out of
  `pendingPi`. `availablePi` mirrors `totalEarnedPi` for now (no withdrawal
  system exists) but is kept as a separate column specifically so a future
  Mainnet withdrawal/reserve feature doesn't require a schema change.
- `GET /pi/ledger/:playerId` returns the full sent+received transaction
  history (senderId/receiverId/amountPi/status/txId) sourced directly from
  `pi_payments` — this is the "transactions" ledger, not `gift_ledger` (which
  stays as the confirmed-gifts-only analytics table for leaderboards/feed).
  It also resolves `senderName`/`receiverName` server-side via a single
  batched `inArray` lookup against `playersTable` (falls back to the raw ID
  if a username isn't found) — do this resolution in the endpoint, not N+1
  lookups from the frontend.
- Frontend "Transaction History" UI lives in `PiLedgerHistory.tsx`
  (components/wallet), rendered inside `Wallet.tsx` alongside (not replacing)
  the existing DN$ transaction list — it has its own All/Pending/Confirmed/
  Failed filter tabs, skeleton loading, and empty state, and reads
  `api.pi.ledger(playerId)` directly (no props/callbacks needed from Wallet).
- Any frontend flow that creates a Pi payment (Pi SDK `createPayment`) MUST
  call `api.pi.fail(paymentId)` on cancel/error, or the ledger leaves stale
  `pendingPi` amounts forever.
