import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ShieldCheck, X, Check, ArrowLeft, Clock, AlertCircle } from "lucide-react";
import { api } from "@/lib/apiClient";
import { useGame } from "@/contexts/GameContext";

interface PendingRequest {
  id: string;
  username: string;
  avatar: string;
  level: number;
  matchesPlayed: number;
  verificationStatus: string;
  verificationRequestedAt: string | null;
  createdAt: string;
}

function timeAgo(ts: string | null) {
  if (!ts) return "Unknown";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminVerificationPanel() {
  const [, navigate] = useLocation();
  const { authUser } = useGame();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.verification.pending();
      setRequests(data);
    } catch (err: any) {
      if (err?.message?.includes("Forbidden")) {
        setError("Access denied. Admin only.");
      } else {
        setError("Failed to load verification requests.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleApprove = async (userId: string, username: string) => {
    if (actionLoading) return;
    setActionLoading(userId);
    try {
      await api.verification.approve(userId);
      toast.success(`✅ ${username} is now verified`);
      setRequests(prev => prev.filter(r => r.id !== userId));
    } catch {
      toast.error("Failed to approve. Try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string, username: string) => {
    if (actionLoading) return;
    setActionLoading(userId);
    try {
      await api.verification.reject(userId);
      toast.success(`❌ ${username}'s request rejected`);
      setRequests(prev => prev.filter(r => r.id !== userId));
    } catch {
      toast.error("Failed to reject. Try again.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{ background: "linear-gradient(160deg, #0a0818 0%, #0f0d2a 50%, #0a0818 100%)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <ArrowLeft size={16} className="text-white" />
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-blue-400" />
            <h1 className="text-white font-black text-lg">Verification Panel</h1>
          </div>
          <p className="text-white/40 text-xs mt-0.5">Admin — Pending requests</p>
        </div>

        <button
          onClick={fetchPending}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white/70 transition-all active:scale-95"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          Refresh
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 rounded-full border-2"
              style={{ borderColor: "rgba(59,130,246,0.3)", borderTopColor: "#3b82f6" }}
            />
            <p className="text-white/40 text-sm">Loading requests…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <AlertCircle size={22} className="text-red-400" />
            </div>
            <p className="text-red-400 text-sm font-semibold">{error}</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
              ✅
            </div>
            <p className="text-white/60 text-sm font-semibold">No pending requests</p>
            <p className="text-white/30 text-xs">All verification requests have been reviewed</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-2">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">
              {requests.length} pending request{requests.length !== 1 ? "s" : ""}
            </p>

            <AnimatePresence>
              {requests.map((req, idx) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -30, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="relative rounded-2xl overflow-hidden p-4"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(59,130,246,0.2)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  {/* User info */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 font-bold"
                      style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(99,102,241,0.3))", border: "1px solid rgba(59,130,246,0.3)" }}
                    >
                      {req.avatar?.startsWith("data:") || req.avatar?.startsWith("http") ? (
                        <img src={req.avatar} alt={req.username} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <span>{req.avatar || req.username[0]?.toUpperCase()}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">@{req.username}</p>
                      <p className="text-white/40 text-xs mt-0.5">Level {req.level} · {req.matchesPlayed} matches</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock size={10} className="text-amber-400 flex-shrink-0" />
                        <p className="text-amber-300/80 text-xs">{timeAgo(req.verificationRequestedAt)}</p>
                      </div>
                    </div>

                    <div
                      className="px-2.5 py-1 rounded-lg text-xs font-bold"
                      style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)" }}
                    >
                      PENDING
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => handleApprove(req.id, req.username)}
                      disabled={actionLoading === req.id}
                      whileTap={{ scale: 0.96 }}
                      className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 font-bold text-sm text-white transition-all disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #2563eb, #3b82f6)", boxShadow: "0 4px 16px rgba(59,130,246,0.35)" }}
                    >
                      {actionLoading === req.id ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 rounded-full border-2"
                          style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }}
                        />
                      ) : (
                        <>
                          <Check size={14} />
                          Approve
                        </>
                      )}
                    </motion.button>

                    <motion.button
                      onClick={() => handleReject(req.id, req.username)}
                      disabled={actionLoading === req.id}
                      whileTap={{ scale: 0.96 }}
                      className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all disabled:opacity-50"
                      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
                    >
                      <X size={14} />
                      Reject
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
