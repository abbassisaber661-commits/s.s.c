---
  name: Pi Authentication Timeout Fix
  description: Root cause and fix for "Authentication timed out" on Pi.authenticate() login flow
  ---

  ## Root cause
  An automatic, gesture-less Pi.authenticate() call fired on app mount (auto-login in GameContext.tsx)
  raced against the manual "Sign in with Pi" button. Both funneled through the same
  in-flight-promise guard in pi-auth.ts (`authInFlight`/`authPromise`), so once the
  gesture-less auto attempt got stuck (Pi Browser's native bridge does not reliably
  resolve/reject authenticate() calls that weren't triggered by a real tap), the
  manual click just awaited the same stuck promise instead of starting its own
  gesture-backed call — surfacing as a 15s "Authentication timed out" error on both
  the direct production URL and Pi Browser.

  **Why:** Pi Network's SDK authenticate() is only reliable when triggered by a genuine
  user gesture (click/tap). Silent/background calls can hang indefinitely with no
  resolve/reject, and because concurrent calls share one promise by design (to prevent
  duplicate SDK invocations), a hung silent call blocks the legitimate manual one too.

  **How to apply:** Never call Pi.authenticate() automatically on mount/effect without a
  user gesture. Keep the single in-flight guard (module-level authInFlight/authPromise
  in pi-auth.ts) for de-duping legitimate manual clicks only. Also: request only the
  "username" scope during login; request "payments" scope separately, only at the
  actual payment moment (see SubscriptionPage.tsx), not during sign-in — this avoids
  Pi Browser blocking on incomplete-payment resolution during plain login.
  