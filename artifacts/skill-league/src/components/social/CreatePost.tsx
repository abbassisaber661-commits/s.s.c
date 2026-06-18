import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ImageIcon, Camera, X, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import Avatar from "@/components/Avatar";

interface CreatePostProps {
  onPost: (content: string, imageUrl?: string) => Promise<void> | void;
  username?: string;
  onAvatarClick?: () => void;
}

async function compressImage(file: File, maxWidth = 900, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not available")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };
    img.src = objectUrl;
  });
}

export default function CreatePost({ onPost, username, onAvatarClick }: CreatePostProps) {
  const [open, setOpen]           = useState(false);
  const [draft, setDraft]         = useState("");
  const [imageUrl, setImageUrl]   = useState<string | undefined>();
  const [error, setError]         = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [posting, setPosting]     = useState(false);
  const [posted, setPosted]       = useState(false);

  const galleryRef  = useRef<HTMLInputElement>(null);
  const cameraRef   = useRef<HTMLInputElement>(null);
  const selfieRef   = useRef<HTMLInputElement>(null);

  // ✅ تحسين: إعادة تعيين حالة "تم النشر" تلقائياً مع تنظيف المؤقت
  useEffect(() => {
    if (posted) {
      const timer = setTimeout(() => setPosted(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [posted]);

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10 MB.");
      e.target.value = "";
      return;
    }

    setLoadingImage(true);
    setError(null);
    try {
      const compressed = await compressImage(file);
      setImageUrl(compressed);
      if (!open) setOpen(true);
    } catch {
      setError("Could not load image. Please try another file.");
    } finally {
      setLoadingImage(false);
      e.target.value = "";
    }
  }

  async function handleSubmit() {
    if (posting) return;

    const hasText = draft.trim().length >= 1;
    const hasImage = !!imageUrl;

    if (!hasText && !hasImage) {
      setError("Write something or add an image before posting.");
      return;
    }

    if (hasText && draft.trim().length < 3) {
      setError("Write at least 3 characters, or clear the text field.");
      return;
    }

    setPosting(true);
    setError(null);

    try {
      await onPost(draft.trim(), imageUrl);

      setDraft("");
      setImageUrl(undefined);
      setError(null);
      setOpen(false);
      setPosted(true);

      // ✅ تحسين UX: تمرير الصفحة إلى الأعلى بعد الإغلاق
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
    } catch (err) {
      setError("Failed to post. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  function handleCancel() {
    setOpen(false);
    setDraft("");
    setImageUrl(undefined);
    setError(null);
    setPosted(false);

    // ✅ تحسين UX: تمرير الصفحة إلى الأعلى بعد الإلغاء
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
  }

  const canPost = !!imageUrl || draft.trim().length >= 3;

  return (
    <div className="px-4 py-3">
      {/* Hidden file inputs */}
      <input ref={galleryRef} type="file" accept="image/*"
        className="sr-only" tabIndex={-1} aria-hidden="true" onChange={handleImagePick} />
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment"
        className="sr-only" tabIndex={-1} aria-hidden="true" onChange={handleImagePick} />
      <input ref={selfieRef}  type="file" accept="image/*" capture="user"
        className="sr-only" tabIndex={-1} aria-hidden="true" onChange={handleImagePick} />

      <AnimatePresence mode="wait">
        {!open ? (
          <motion.div key="trigger" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2">
            {username && (
              <button type="button" onClick={onAvatarClick}
                className="flex-shrink-0 active:scale-90 transition-transform" aria-label="View profile">
                <Avatar username={username} size="sm" shape="rounded-full" />
              </button>
            )}
            <button type="button" onClick={() => setOpen(true)}
              className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-full transition-all active:scale-[0.99]"
              style={{ background: "#F0F2F5", border: "1px solid #CED0D4", color: "#65676B" }}>
              <span className="text-sm" style={{ color: "#65676B" }}>Share a win, tip, or achievement…</span>
            </button>
            <button type="button" onClick={() => galleryRef.current?.click()}
              className="flex-shrink-0 p-2 rounded-full active:scale-90 transition-transform"
              style={{ background: "#F0F2F5", color: "#45BD62" }}
              aria-label="Add image">
              {loadingImage
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <ImageIcon className="w-5 h-5" />}
            </button>
          </motion.div>
        ) : (
          <motion.div key="composer" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="rounded-2xl space-y-3 p-4"
            style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>

            <div className="flex items-center gap-2">
              {username && <Avatar username={username} size="sm" shape="rounded-full" />}
              <div className="text-sm font-bold" style={{ color: "#050505" }}>Create Post</div>
              {posted && (
                <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full ml-auto">
                  <CheckCircle className="w-3.5 h-3.5" /> Posted!
                </div>
              )}
            </div>

            <AnimatePresence>
              {imageUrl && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }} className="relative">
                  <img src={imageUrl} alt="attachment"
                    className="w-full max-h-56 object-cover rounded-xl"
                    style={{ border: "1px solid #E4E6EB" }} />
                  <button type="button" onClick={() => setImageUrl(undefined)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center active:scale-90 transition-transform"
                    aria-label="Remove image">
                    <X className="w-4 h-4 text-white" />
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: "rgba(0,0,0,0.55)", color: "#FFFFFF" }}>
                    📷 Image attached
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {loadingImage && (
              <div className="flex items-center gap-2 text-xs py-2" style={{ color: "#65676B" }}>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#1877F2" }} />
                Compressing image…
              </div>
            )}

            <div className="space-y-1">
              {imageUrl && (
                <div className="text-xs font-semibold" style={{ color: "#65676B" }}>
                  Caption <span style={{ color: "#BCC0C4" }}>(optional)</span>
                </div>
              )}
              <textarea
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setError(null); }}
                placeholder={imageUrl
                  ? "Add a caption to your photo…"
                  : "What's on your mind? Share a match result, tip, or challenge…"}
                autoFocus={!imageUrl}
                maxLength={280}
                rows={imageUrl ? 2 : 3}
                className="w-full rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none transition-all"
                style={{ background: "#F0F2F5", border: "1px solid #E4E6EB", color: "#050505" }}
                onFocus={e  => (e.currentTarget.style.borderColor = "#1877F2")}
                onBlur={e   => (e.currentTarget.style.borderColor = "#E4E6EB")}
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-1.5 text-xs text-red-500">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-1 p-2 rounded-xl" style={{ border: "1px solid #E4E6EB" }}>
              <span className="text-xs font-semibold flex-1" style={{ color: "#65676B" }}>Add to your post</span>

              <button type="button" onClick={() => galleryRef.current?.click()}
                className="p-1.5 rounded-lg active:scale-95 transition-transform" title="Gallery"
                style={{ color: "#45BD62" }} aria-label="Choose from gallery">
                <ImageIcon className="w-5 h-5" />
              </button>
              <button type="button" onClick={() => selfieRef.current?.click()}
                className="text-base px-1 rounded-lg active:scale-95 transition-transform" title="Selfie"
                aria-label="Take a selfie">
                🤳
              </button>
              <button type="button" onClick={() => cameraRef.current?.click()}
                className="p-1.5 rounded-lg active:scale-95 transition-transform" title="Camera"
                style={{ color: "#1877F2" }} aria-label="Take a photo">
                <Camera className="w-5 h-5" />
              </button>

              <span className="text-[11px] pl-1 tabular-nums" style={{ color: "#BCC0C4" }}>
                {draft.length}/280
              </span>
            </div>

            <div className="flex gap-2">
              <button onClick={handleCancel}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors active:scale-95"
                style={{ background: "#E4E6EB", color: "#050505" }}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={!canPost || posting || loadingImage}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                style={{ background: canPost && !posting ? "#1877F2" : "#BCC0C4" }}>
                {posting
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Posting…</>
                  : <><Send className="w-3.5 h-3.5" />Post</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}