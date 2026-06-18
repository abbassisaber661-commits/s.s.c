// src/components/Story/StoryViewersList.tsx

import { useEffect, useState, useRef } from "react";

interface Viewer {
  userId: string;
  userName: string;
  userAvatar?: string;
  viewedAt?: number;
}

interface Props {
  storyId: string;
  viewersCount?: number;
}

export default function StoryViewersList({ storyId, viewersCount }: Props) {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // ── جلب المشاهدين عند فتح القائمة ──
  useEffect(() => {
    if (!open || !storyId) return;

    const loadViewers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stories/${storyId}/viewers`);
        if (!res.ok) throw new Error("فشل جلب المشاهدين");
        const data = await res.json();
        setViewers(data.viewers || []);
      } catch (err) {
        console.error("Error loading viewers:", err);
        // في حال عدم وجود endpoint مخصص، نعرض رسالة
        setViewers([]);
      } finally {
        setLoading(false);
      }
    };

    loadViewers();
  }, [open, storyId]);

  // ── إغلاق القائمة عند الضغط خارجها ──
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative inline-block">
      {/* زر فتح القائمة */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="text-xs text-white/70 hover:text-white transition flex items-center gap-1"
      >
        👁️ المشاهدون
        {viewersCount !== undefined && viewersCount > 0 && (
          <span className="bg-white/10 px-1.5 py-0.5 rounded-full text-[10px]">
            {viewersCount}
          </span>
        )}
      </button>

      {/* قائمة المشاهدين */}
      {open && (
        <div
          ref={popupRef}
          className="absolute bottom-full left-0 mb-2 w-64 bg-black/90 backdrop-blur-sm rounded-xl p-3 max-h-60 overflow-y-auto z-50 shadow-lg border border-white/10"
        >
          <p className="text-white text-sm font-semibold mb-2 flex items-center justify-between">
            <span>المشاهدون</span>
            {viewersCount !== undefined && (
              <span className="text-xs text-gray-400 font-normal">
                {viewersCount} مشاهد
              </span>
            )}
          </p>

          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : viewers.length === 0 ? (
            <p className="text-gray-400 text-xs text-center py-2">
              لا يوجد مشاهدون حتى الآن
            </p>
          ) : (
            <div className="space-y-1">
              {viewers.slice(0, 20).map((v) => (
                <div
                  key={v.userId}
                  className="flex items-center gap-2 text-white text-sm py-1.5 border-b border-white/5 last:border-0"
                >
                  {v.userAvatar ? (
                    <img
                      src={v.userAvatar}
                      alt={v.userName}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-300">
                      {v.userName?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <span className="flex-1 truncate">{v.userName}</span>
                  {v.viewedAt && (
                    <span className="text-[10px] text-gray-500">
                      {new Date(v.viewedAt).toLocaleTimeString("ar", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}