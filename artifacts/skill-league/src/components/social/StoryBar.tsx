import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Eye, Camera, ImageIcon } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { 
  getStoriesAsync, 
  viewStory, 
  addStoryAsync, 
  resizeImageToBase64, 
  subscribeToStories,
  type Story 
} from "@/lib/stories";
import { getSocialLeague } from "@/lib/socialLeague";
import { avatarGradient } from "@/lib/avatar";
import Avatar from "@/components/Avatar";

const StoryViewer = lazy(() => import("@/components/StoryViewer"));

function ringColor(level: number): string {
  return getSocialLeague(level).color;
}

const EMOJIS = ["⚡", "🔥", "🏆", "💎", "🎯", "🌟", "⚔️", "🧠", "👑", "🚀"];

export default function StoryBar() {
  const { username, level } = useGame();
  const [stories, setStories] = useState<Story[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [emoji, setEmoji] = useState("⚡");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [storyProgress, setStoryProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── جلب الستوريات الأولية ──
  useEffect(() => {
    getStoriesAsync().then(setStories).catch(() => {});
  }, []);

  // ── الاشتراك في الستوريات الجديدة/المحذوفة (Real-time) ──
  useEffect(() => {
    const unsubscribe = subscribeToStories(
      (newStory: Story) => {
        setStories((prev) => {
          // منع التكرار
          if (prev.some((s) => s.id === newStory.id)) return prev;
          return [newStory, ...prev];
        });
      },
      (deletedId: string) => {
        setStories((prev) => prev.filter((s) => s.id !== deletedId));
      }
    );

    return unsubscribe;
  }, []);

  // ── مؤقت التقدم (للمشاهدة) ──
  useEffect(() => {
    if (activeIndex < 0) return;
    setStoryProgress(0);
    const interval = setInterval(() => {
      setStoryProgress(prev => {
        if (prev >= 100) { clearInterval(interval); return 100; }
        return prev + 2;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [activeIndex]);

  useEffect(() => {
    if (storyProgress < 100) return;
    const t = setTimeout(() => {
      setActiveIndex(prev => (prev < stories.length - 1 ? prev + 1 : -1));
    }, 150);
    return () => clearTimeout(t);
  }, [storyProgress, stories.length]);

  const openStory = useCallback((s: Story) => {
    const idx = stories.findIndex(st => st.id === s.id);
    if (idx < 0) return;
    viewStory(s.id);
    setStories(prev => prev.map(st => st.id === s.id ? { ...st, views: st.views + 1 } : st));
    setActiveIndex(idx);
  }, [stories]);

  const handleMediaSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
      setImagePreview(null);
      setImageLoading(false);
      return;
    }

    setImageLoading(true);
    try {
      const base64 = await resizeImageToBase64(file, 600, 0.75);
      setImagePreview(base64);
      setVideoPreview(null);
    } catch {
      // skip
    } finally {
      setImageLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const handlePostStory = useCallback(async () => {
    if (draft.trim().length < 2 && !imagePreview && !videoPreview) return;
    const media = imagePreview || videoPreview;
    const updated = await addStoryAsync(
      username,
      level,
      draft.trim() || (media ? "📸" : ""),
      emoji,
      media || undefined,
    );
    setStories(updated);
    setDraft("");
    setImagePreview(null);
    setVideoPreview(null);
    setCreating(false);
  }, [draft, imagePreview, videoPreview, username, level, emoji]);

  const resetCreate = useCallback(() => {
    setCreating(false);
    setDraft("");
    setImagePreview(null);
    setVideoPreview(null);
  }, []);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleMediaSelect}
      />

      <div className="overflow-x-auto scrollbar-hide" dir="ltr" style={{ borderBottom: "1px solid #E4E6EB" }}>
        <div className="flex items-start gap-2 px-4 py-3 w-max">
          {/* Add Story card — same size/shape as story cards */}
          <div
            onClick={() => setCreating(true)}
            className="relative w-[100px] h-[160px] rounded-xl overflow-hidden cursor-pointer flex-shrink-0 flex flex-col items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95"
            style={{ background: "#F0F2F5", border: "2px dashed #C4C6CA" }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
              style={{ background: "#1877F2" }}
            >
              <Plus className="w-5 h-5 text-white" strokeWidth={3} />
            </div>
            <span className="text-[11px] font-semibold px-2 text-center leading-tight" style={{ color: "#65676B" }}>
              Add Story
            </span>
          </div>

          {stories.map(s => {
            const color = ringColor(s.authorLevel);
            const hasImg = !!s.imageUrl;
            const isVideo = /\.(mp4|webm|ogg)$/i.test(s.imageUrl ?? "");
            const reactionCount = Object.keys(s.reactions ?? {}).length;
            const replyCount = s.replies?.length ?? 0;
            const isViewed = !!sessionStorage.getItem(`viewed_${s.id}`);

            return (
              <div
                key={s.id}
                onClick={() => openStory(s)}
                className="relative w-[100px] h-[160px] rounded-xl overflow-hidden cursor-pointer flex-shrink-0 flex flex-col transition-transform duration-200 hover:scale-105"
                style={{ border: `2px solid ${color}` }}
              >
                {isVideo ? (
                  <video
                    src={s.imageUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : hasImg ? (
                  <>
                    <img
                      src={s.imageUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  </>
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${avatarGradient(s.authorName)} flex items-center justify-center`}>
                    <span className="text-3xl drop-shadow">{s.emoji}</span>
                  </div>
                )}

                {!isViewed && (
                  <div className="absolute -top-0.5 -left-0.5 right-0.5 bottom-0.5 rounded-xl border-2 border-blue-500 z-20 pointer-events-none" />
                )}

                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
                  <div className="rounded-full border-2 border-white overflow-hidden">
                    <Avatar username={s.authorName || "?"} size="xs" shape="rounded-full" />
                  </div>
                </div>

                {!hasImg && !isVideo && (
                  <div className="absolute inset-0 flex items-center justify-center px-2 pt-8">
                    <p className="text-white text-[10px] text-center font-semibold leading-tight line-clamp-4 drop-shadow">
                      {s.content}
                    </p>
                  </div>
                )}

                <div className="absolute bottom-2 left-0 right-0 px-1.5 z-10">
                  <div className="text-white text-[10px] font-semibold text-center truncate drop-shadow">
                    {s.authorName}
                  </div>
                  <div className="flex justify-center gap-2 text-[9px] text-white/80 mt-1">
                    <span>👁 {s.views}</span>
                    <span>❤️ {reactionCount}</span>
                    <span>💬 {replyCount}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {activeIndex >= 0 && (
          <Suspense fallback={<div className="fixed inset-0 bg-black flex items-center justify-center text-white">جاري التحميل...</div>}>
            <StoryViewer
              stories={stories}
              initialIndex={activeIndex}
              onClose={() => setActiveIndex(-1)}
              onStoryEnd={() => setActiveIndex(-1)}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={resetCreate}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl p-5 space-y-4"
              style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}
            >
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto" />
              <h3 className="text-base font-black text-center" style={{ color: "#050505" }}>📸 Add Story</h3>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('capture');
                      fileInputRef.current.click();
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-bold transition-colors active:scale-95"
                  style={{ background: "#F0F2F5", border: "1px solid #E4E6EB", color: "#050505" }}
                >
                  <ImageIcon className="w-4 h-4" style={{ color: "#45BD62" }} />
                  Gallery
                </button>
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('capture', 'environment');
                      fileInputRef.current.click();
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-bold transition-colors active:scale-95"
                  style={{ background: "#F0F2F5", border: "1px solid #E4E6EB", color: "#050505" }}
                >
                  <Camera className="w-4 h-4" style={{ color: "#1877F2" }} />
                  Camera
                </button>
              </div>

              {imageLoading && (
                <div className="w-full flex items-center justify-center py-4">
                  <div className="animate-pulse text-sm" style={{ color: "#65676B" }}>Loading story...</div>
                </div>
              )}

              {(imagePreview || videoPreview) && !imageLoading && (
                <div className="relative w-full rounded-2xl overflow-hidden" style={{ aspectRatio: '9/14' }}>
                  {videoPreview ? (
                    <video
                      src={videoPreview}
                      controls
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={imagePreview!}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setVideoPreview(null);
                    }}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs z-10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {!imagePreview && !videoPreview && (
                <div className="flex gap-2 flex-wrap justify-center">
                  {EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className="text-xl w-10 h-10 rounded-xl transition-all active:scale-90"
                      style={{
                        background: emoji === e ? "#E7F0FF" : "#F0F2F5",
                        outline: emoji === e ? "2px solid #1877F2" : "none",
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}

              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder={imagePreview || videoPreview ? "Add a caption… (optional)" : "What's happening? (max 120 chars)"}
                maxLength={120}
                rows={2}
                className="w-full rounded-xl px-3 py-2 text-sm resize-none focus:outline-none"
                style={{
                  background: "#F0F2F5",
                  border: "1px solid #E4E6EB",
                  color: "#050505",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "#1877F2")}
                onBlur={e => (e.currentTarget.style.borderColor = "#E4E6EB")}
              />

              <div className="flex gap-2">
                <button
                  onClick={resetCreate}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                  style={{ background: "#E4E6EB", color: "#050505" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePostStory}
                  disabled={draft.trim().length < 2 && !imagePreview && !videoPreview}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 active:scale-95 transition-transform"
                  style={{ background: "#1877F2" }}
                >
                  Post Story
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}