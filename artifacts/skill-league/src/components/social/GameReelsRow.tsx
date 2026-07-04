import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clapperboard, Play } from "lucide-react";
import { useLocation } from "wouter";
import { api } from "@/lib/apiClient";

interface ReelThumb {
  id: string;
  authorName: string;
  imageUrl?: string;
}

export default function GameReelsRow() {
  const [, navigate] = useLocation();
  const [reels, setReels] = useState<ReelThumb[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.community
      .getPosts("video", 1, 8)
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.posts ?? [];
        setReels(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="mx-4 rounded-xl overflow-hidden"
      style={{ background: "#FFFFFF", boxShadow: "0 1px 2px rgba(0,0,0,0.1)", border: "1px solid #E4E6EB" }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid #E4E6EB" }}
      >
        <div className="flex items-center gap-2">
          <Clapperboard className="w-4 h-4" style={{ color: "#7C3AED" }} />
          <span className="text-sm font-black" style={{ color: "#050505" }}>Game Reels</span>
        </div>
        <span
          onClick={() => navigate("/reels")}
          className="text-xs font-semibold cursor-pointer"
          style={{ color: "#1877F2" }}
        >
          View all
        </span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto px-4 py-3 scrollbar-hide">
        {loading &&
          [1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-24 h-36 rounded-xl bg-gray-100 animate-pulse flex-shrink-0"
            />
          ))}

        {!loading && reels.length === 0 &&
          Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              onClick={() => navigate("/reels")}
              whileTap={{ scale: 0.96 }}
              className="relative w-24 h-36 rounded-xl flex-shrink-0 overflow-hidden cursor-pointer"
              style={{
                background: `linear-gradient(160deg, hsl(${(i * 47) % 360} 70% 35%), hsl(${(i * 47 + 40) % 360} 70% 20%))`,
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-4 h-4 text-white fill-white" />
                </div>
              </div>
              <div className="absolute bottom-1.5 left-1.5 right-1.5 text-[10px] font-bold text-white truncate drop-shadow">
                Highlight #{i + 1}
              </div>
            </motion.div>
          ))}

        {!loading && reels.length > 0 &&
          reels.slice(0, 8).map((reel, i) => (
            <motion.div
              key={reel.id}
              onClick={() => navigate("/reels")}
              whileTap={{ scale: 0.96 }}
              className="relative w-24 h-36 rounded-xl flex-shrink-0 overflow-hidden cursor-pointer bg-gray-900"
            >
              {reel.imageUrl ? (
                <img
                  src={reel.imageUrl}
                  alt={reel.authorName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(160deg, hsl(${(i * 47) % 360} 70% 35%), hsl(${(i * 47 + 40) % 360} 70% 20%))`,
                  }}
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-4 h-4 text-white fill-white" />
                </div>
              </div>
              <div className="absolute bottom-1.5 left-1.5 right-1.5 text-[10px] font-bold text-white truncate drop-shadow">
                {reel.authorName}
              </div>
            </motion.div>
          ))}
      </div>
    </div>
  );
}
