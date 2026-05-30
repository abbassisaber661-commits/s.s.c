import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Image, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreatePostProps {
  onPost: (content: string, imageUrl?: string) => void;
}

export default function CreatePost({ onPost }: CreatePostProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setImageUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    if (draft.trim().length < 3) {
      setError("Write at least 3 characters before posting.");
      return;
    }
    onPost(draft.trim(), imageUrl);
    setDraft("");
    setImageUrl(undefined);
    setError(null);
    setOpen(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleCancel() {
    setOpen(false);
    setDraft("");
    setImageUrl(undefined);
    setError(null);
  }

  return (
    <div className="px-4">
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.button
            key="trigger"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-dashed border-border bg-card/60 text-muted-foreground text-sm hover:bg-card hover:border-primary/40 transition-all active:scale-[0.99]"
          >
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Send className="w-3.5 h-3.5 text-primary" />
            </div>
            Share a win, tip, or achievement…
          </motion.button>
        ) : (
          <motion.div
            key="composer"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm"
          >
            <div className="text-sm font-bold">New Post</div>

            <textarea
              value={draft}
              onChange={e => { setDraft(e.target.value); setError(null); }}
              placeholder="What's on your mind? Share a match result, tip, or challenge…"
              autoFocus
              maxLength={280}
              rows={3}
              className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />

            {imageUrl && (
              <div className="relative inline-block">
                <img
                  src={imageUrl}
                  alt="attachment"
                  className="w-full max-h-40 object-cover rounded-xl"
                />
                <button
                  onClick={() => { setImageUrl(undefined); if (fileRef.current) fileRef.current.value = ""; }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-1.5 text-xs text-red-400"
                >
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-primary/10"
                >
                  <Image className="w-3.5 h-3.5" />
                  Photo
                </button>
                <span className="text-[11px] text-muted-foreground">{draft.length}/280</span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={draft.trim().length < 3}
                  className="gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Post
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
