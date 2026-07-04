---
name: Pi vs DN$ Currency Separation
description: Pi is the only real payment/gifting currency; DN$ is a non-monetary internal points system. Read before touching wallet, gifts, or DN$ code.
---

Two currencies exist in SkillLeague and must never be linked:

- **Pi** (Pi Network — Testnet now, Mainnet later): the only real payment/gifting currency. All gifting and paid purchases (VIP, coins, post gifts) go through `pi-payments.ts` using the Pi SDK create/approve/complete flow. Gift tiers live in `piGiftTiers.ts` (`PI_GIFT_TIERS`, real fractional Pi amounts like 0.01–10 π).
- **DN$ (Danous)**: a pure internal gamification points system (`danousCoins.ts`). Earned only from gameplay (matches/streaks/levels/achievements) via `DANOUS_EARN_SOURCES`. It has no monetary value, no conversion/exchange rate to Pi, and cannot be sent, gifted, or withdrawn between users.

**Why:** The user explicitly required removing any DN$↔Pi linkage after DN$ had originally been designed as a giftable/sendable currency (old `DANOUS_COINS` tier grid with `dnAmount`, `wallet.sendGift` endpoint, `POST /wallet/gift`). All of that P2P/monetary DN$ machinery was deleted.

**How to apply:**
- Never add a DN$→Pi conversion rate, a "send DN$ to another user" feature, or a DN$ withdrawal path.
- Gift-related backend fields/leaderboards are named with `Pi` (e.g. `totalReceivedPi`, `totalSentPi`, `giftLedgerTable.amount` is now `real` Pi, `currency`/`piPaymentId` columns) — not `DN`. `walletsTable.totalEarnedPi`/`pendingPi`/`availablePi` track Pi received via gifts (see `pi-internal-ledger.md`); `walletsTable.dnBalance` tracks DN$ points only.
- If you see any component/hook still importing `DANOUS_COINS`, `dnAmount`, `wallet.sendGift`, or `totalReceivedDN`/`totalSentDN`, it is stale pre-separation code — rename to the Pi equivalents rather than reintroducing DN$ transfer.
- The 7-tier coin *images* (white/yellow/orange/.../purple, see `danous-coin-assets.md`) are shared/reused as the visual style for `PI_GIFT_TIERS` — only the DN$ tier *concept* (amounts, sending) was removed, not the artwork.
