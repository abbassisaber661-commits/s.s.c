/**
 * PiSignInButton.tsx
 *
 * Manual "Sign in with Pi" button.
 *
 * Auth flow (all server-authoritative):
 *  1. Pi.init() already resolved (startPiAutoInit() fired at app boot).
 *  2. Pi.authenticate(["username"]) → { accessToken, user }
 *  3. POST /api/auth/pi  { accessToken }
 *     Backend calls GET https://api.minepi.com/v2/me
 *       Authorization: Bearer <accessToken>
 *     Returns verified { uid, username } — frontend data is NEVER trusted.
 *  4. Backend creates/gets player, signs JWT, returns { token, player }.
 *  5. Frontend stores JWT + playerId and updates auth state from the
 *     backend-verified player record.
 *
 * No Pi API key is required for this flow.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { useGame } from "@/contexts/GameContext";

interface Props {
  /** Called after successful sign-in. */
  onSuccess?: () => void;
  /** Called on error (receives the human-readable message). */
  onError?: (msg: string) => void;
  /** Override button label. Defaults to "Sign in with Pi". */
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

const PI_PURPLE = "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)";

export default function PiSignInButton({
  onSuccess,
  onError,
  label,
  className = "",
  style,
}: Props) {
  const { loginWithPiNetwork } = useGame();
  const [loading, setLoading] = useState(false);
  const [step,    setStep]    = useState<"idle" | "init" | "auth" | "verify">("idle");

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    setStep("init");

    try {
      // loginWithPiNetwork in GameContext:
      //   1. ensurePiInitialized() — awaits Pi.init() (may already be done)
      //   2. Pi.authenticate(["username"]) — gets accessToken
      //   3. POST /api/auth/pi { accessToken } — server verifies with /v2/me
      //   4. Stores JWT + playerId, updates auth state
      setStep("auth");
      await loginWithPiNetwork();
      setStep("idle");
      onSuccess?.();
    } catch (err) {
      const code = (err as Error)?.message ?? "";
      const msg =
        code === "pi_sdk_unavailable"
          ? "Pi Network SDK not available. Open the app inside Pi Browser."
          : code === "pi_auth_cancelled"
            ? "Sign-in was cancelled."
            : code === "pi_auth_timeout"
              ? "Authentication timed out. Please try again."
              : code === "pi_verify_failed"
                ? "Server could not verify your Pi account. Please try again."
                : "Sign-in failed. Please try again.";
      setStep("idle");
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  const stepLabel = (() => {
    if (step === "init")   return "Connecting to Pi…";
    if (step === "auth")   return "Authenticating…";
    if (step === "verify") return "Verifying…";
    return label ?? "Sign in with Pi";
  })();

  return (
    <motion.button
      whileTap={{ scale: loading ? 1 : 0.95 }}
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-sm transition-opacity ${className}`}
      style={{
        background: PI_PURPLE,
        color: "white",
        boxShadow: loading
          ? "none"
          : "0 0 24px rgba(124,58,237,0.55), 0 2px 8px rgba(0,0,0,0.35)",
        opacity: loading ? 0.75 : 1,
        cursor: loading ? "not-allowed" : "pointer",
        minWidth: 180,
        ...style,
      }}
      aria-busy={loading}
    >
      {/* Pi logo mark */}
      {loading ? (
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          className="inline-block text-base leading-none"
          aria-hidden
        >
          ⏳
        </motion.span>
      ) : (
        <span
          className="inline-flex items-center justify-center font-black text-white"
          style={{
            width: 20,
            height: 20,
            fontSize: 14,
            lineHeight: 1,
            letterSpacing: "-0.03em",
          }}
          aria-hidden
        >
          π
        </span>
      )}
      <span>{stepLabel}</span>
    </motion.button>
  );
}
