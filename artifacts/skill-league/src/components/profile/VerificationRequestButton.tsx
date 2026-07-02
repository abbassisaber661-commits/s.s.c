import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BadgeCheck, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";

type Status = "none" | "unverified" | "pending" | "approved" | "rejected";

interface Props {
  verificationStatus?: Status | string;
  onRequested?: () => void;
}

export default function VerificationRequestButton({ verificationStatus, onRequested }: Props) {
  const [loading, setLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState<Status | string | undefined>(verificationStatus);

  const status = localStatus ?? "none";

  const handleRequest = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      await api.verification.request();
      setLocalStatus("pending");
      toast.success("Verification request sent! Our team will review it soon.");
      onRequested?.();
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("already_pending")) {
        toast.info("Your request is already under review.");
        setLocalStatus("pending");
      } else if (msg.includes("already_approved")) {
        toast.info("You are already verified!");
        setLocalStatus("approved");
      } else {
        toast.error("Failed to submit request. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [loading, onRequested]);

  // Already verified — show nothing (badge is shown elsewhere)
  if (status === "approved") return null;

  return (
    <AnimatePresence mode="wait">
      {status === "pending" ? (
        <motion.div
          key="pending"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24" }}
        >
          <Clock size={13} />
          Verification under review
        </motion.div>
      ) : status === "rejected" ? (
        <motion.button
          key="rejected"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          onClick={handleRequest}
          disabled={loading}
          whileTap={{ scale: 0.96 }}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold w-full transition-all disabled:opacity-60"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}
        >
          <XCircle size={13} />
          {loading ? "Submitting…" : "Reapply for Verification"}
        </motion.button>
      ) : (
        <motion.button
          key="request"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          onClick={handleRequest}
          disabled={loading}
          whileTap={{ scale: 0.96 }}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold w-full text-white transition-all disabled:opacity-60 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
            boxShadow: "0 4px 20px rgba(59,130,246,0.35)",
          }}
        >
          {/* Shimmer */}
          <motion.div
            className="absolute inset-0 opacity-20"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)" }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
          />
          {loading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 rounded-full border-2"
              style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }}
            />
          ) : (
            <BadgeCheck size={14} />
          )}
          {loading ? "Submitting…" : "Request Verification"}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
