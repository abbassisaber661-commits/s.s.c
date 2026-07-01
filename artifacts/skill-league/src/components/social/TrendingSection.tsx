// src/components/social/TrendingSection.tsx
import React, { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Flame, Gift, RefreshCw, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { api } from "@/lib/apiClient";
import Avatar from "@/components/Avatar";
import { cn } from "@/lib/utils";

type TrendingPost = {
  postId: string;
  authorUsername: string;
  authorId: string;
  content: string;
  imageUrl: string | null;
  totalGiftAmount: number;
  totalGiftCount: number;
  last24hAmount: number;
  trendScore: number;
};

const fmt = (n: number) =>
  n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M"
  : n >= 1_000   ? (n / 1_000).toFixed(1) + "K"
  : String(n);

const heatColor = (score: number) => {
  if (score >= 500) return { bg: "from-red-500/20 to-orange-500/10", badge: "bg-red-500", icon: "🔥🔥" };
  if (score >= 200) return { bg: "from-orange-500/15 to-yellow-500/10", badge: "bg-orange-500", icon: "🔥" };
  return { bg: "from-yellow-500/10 to-amber-500/5", badge: "bg-yellow-500", icon: "⭐" };
};

export default function TrendingSection({
  onCommentClick,
}: {
  onCommentClick?: (postId: string) => void;
}) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["trending", "posts"],
    queryFn:  () => api.trending.posts(8),
    staleTime: 60_000,          // refresh every 60s
    refetchInterval: 90_000,    // auto-refetch for real-time feel
  });

  const posts: TrendingPost[] = data ?? [];

  const handleRefresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["trending", "posts"] });
  }, [qc]);

  if (!isLoading && posts.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* ── Section header ── */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-sm">
            <Flame size={14} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-black text-[#111]">Trending Now</div>
            <div className="text-[10px] text-[#999] leading-none">مرتّب بالهدايا DN</div>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="p-1.5 rounded-lg hover:bg-[#F5F5F7] transition-colors"
        >
          <RefreshCw size={13} className="text-[#999]" />
        </button>
      </div>

      {/* ── Posts list ── */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-3 animate-pulse border border-[#EBEBEB]">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F0F0F0]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-[#F0F0F0] rounded w-1/3" />
                  <div className="h-2 bg-[#F5F5F5] rounded w-2/3" />
                </div>
                <div className="w-16 h-8 bg-[#F0F0F0] rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post, i) => {
            const heat = heatColor(post.trendScore);
            const isHot24h = post.last24hAmount > 0;

            return (
              <motion.div
                key={post.postId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onCommentClick?.(post.postId)}
                className={cn(
                  "bg-white rounded-2xl border border-[#EBEBEB] overflow-hidden cursor-pointer",
                  "active:scale-[0.99] transition-transform",
                  "shadow-[0_1px_4px_rgba(0,0,0,0.05)]"
                )}
              >
                <div className={cn("bg-gradient-to-r p-3", heat.bg)}>
                  <div className="flex items-start gap-3">
                    {/* Rank */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                        style={{
                          background: i === 0 ? "linear-gradient(135deg,#FFD700,#FFA500)"
                            : i === 1 ? "linear-gradient(135deg,#C0C0C0,#A8A9AD)"
                            : i === 2 ? "linear-gradient(135deg,#CD7F32,#A0522D)"
                            : "rgba(0,0,0,0.15)"
                        }}
                      >
                        {i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}
                      </div>
                    </div>

                    {/* Avatar + content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar username={post.authorUsername} size="sm" />
                        <div>
                          <span className="font-bold text-xs text-[#111]">{post.authorUsername}</span>
                          {isHot24h && (
                            <span className="ml-1.5 text-[9px] font-black text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full">
                              🔥 آخر 24س
                            </span>
                          )}
                        </div>
                      </div>
                      {post.content && (
                        <p className="text-xs text-[#444] leading-relaxed line-clamp-2">{post.content}</p>
                      )}
                      {post.imageUrl && !post.content && (
                        <div className="text-xs text-[#888] italic">📷 منشور صورة</div>
                      )}
                    </div>

                    {/* Gift stats */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <div
                        className="flex items-center gap-1 px-2 py-1 rounded-xl text-white text-xs font-black"
                        style={{ background: "linear-gradient(135deg,#FFD60A,#FF9500)", boxShadow: "0 2px 8px rgba(255,149,0,0.3)" }}
                      >
                        <Gift size={10} />
                        <span>{fmt(post.totalGiftAmount)} DN</span>
                      </div>
                      <div className="text-[9px] text-[#AAA] text-right">
                        {post.totalGiftCount} {post.totalGiftCount === 1 ? "هدية" : "هدايا"}
                      </div>
                    </div>
                  </div>

                  {/* Trend bar */}
                  {post.imageUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden" style={{ maxHeight: 100 }}>
                      <img src={post.imageUrl} alt="" className="w-full object-cover" loading="lazy" />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Bottom link */}
      {posts.length > 0 && (
        <button
          onClick={() => navigate("/leaderboard")}
          className="w-full py-2 text-xs font-bold text-[#FF9500] hover:text-[#FF7700] transition-colors text-center"
        >
          عرض لوحة الصدارة الكاملة →
        </button>
      )}
    </div>
  );
}
