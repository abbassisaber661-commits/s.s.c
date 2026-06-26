import React, { memo, useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Image as ImageIcon, Video, BarChart3, MapPin, Hash,
  AtSign, Globe, Users, ChevronDown, Loader2, CheckCircle2,
  Trash2, Plus, Send,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/imageUtils";
import { saveDraft, getDraft, clearDraft } from "@/lib/engagement";
import { useGame } from "@/contexts/GameContext";

// ── Types ─────────────────────────────────────────────────────────
export type PostAudience = "public" | "friends";
export type PostFormat   = "text" | "image" | "video" | "reel" | "poll";

export interface PollOption { id: string; text: string; }

export interface CreatePostData {
  content:    string;
  imageUrls:  string[];
  videoUrl?:  string;
  format:     PostFormat;
  audience:   PostAudience;
  location?:  string;
  hashtags:   string[];
  mentions:   string[];
  poll?:      { question: string; options: PollOption[]; duration: number };
}

interface CreatePostModalProps {
  isOpen:   boolean;
  onClose:  () => void;
  onSubmit: (data: CreatePostData) => Promise<void>;
}

// ── Constants ─────────────────────────────────────────────────────
const MAX_CHARS   = 500;
const MAX_IMAGES  = 4;
const MAX_POLL_OPTIONS = 4;
const AUDIENCE_OPTIONS: { value: PostAudience; label: string; icon: React.ElementType }[] = [
  { value: "public",  label: "Everyone",     icon: Globe },
  { value: "friends", label: "Friends only", icon: Users },
];

// ── Subcomponents ─────────────────────────────────────────────────
const Toolbar = memo(({
  onImage, onVideo, onPoll, onLocation, onHashtag,
  hasImage, hasVideo, hasPoll,
}: {
  onImage(): void; onVideo(): void; onPoll(): void;
  onLocation(): void; onHashtag(): void;
  hasImage: boolean; hasVideo: boolean; hasPoll: boolean;
}) => {
  const btn = (
    icon: React.ElementType,
    onClick: () => void,
    active?: boolean,
    disabled?: boolean,
    label?: string,
  ) => {
    const Icon = icon;
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title={label}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg transition-all",
          active
            ? "text-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
          "disabled:opacity-40 disabled:cursor-not-allowed"
        )}
      >
        <Icon size={17} />
      </button>
    );
  };

  return (
    <div className="flex items-center gap-0.5 px-1">
      {btn(ImageIcon, onImage, hasImage, hasVideo || hasPoll, "Add image")}
      {btn(Video,     onVideo, hasVideo, hasImage || hasPoll, "Add video")}
      {btn(BarChart3, onPoll,  hasPoll,  hasImage || hasVideo, "Create poll")}
      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
      {btn(Hash,      onHashtag, false, false, "Add hashtag")}
      {btn(AtSign,    () => {}, false, false, "Mention user")}
      {btn(MapPin,    onLocation, false, false, "Add location")}
    </div>
  );
});
Toolbar.displayName = "Toolbar";

const PollBuilder = memo(({
  question, options, onQuestionChange, onOptionChange, onAddOption, onRemoveOption,
}: {
  question: string;
  options: PollOption[];
  onQuestionChange(q: string): void;
  onOptionChange(id: string, text: string): void;
  onAddOption(): void;
  onRemoveOption(id: string): void;
}) => (
  <div className="space-y-2 px-4 pb-2">
    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Poll</p>
    <input
      value={question}
      onChange={(e) => onQuestionChange(e.target.value)}
      placeholder="Ask a question…"
      className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-xl border border-transparent focus:border-blue-400 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400"
    />
    <div className="space-y-1.5">
      {options.map((opt, i) => (
        <div key={opt.id} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-5 text-right font-medium">{i + 1}.</span>
          <input
            value={opt.text}
            onChange={(e) => onOptionChange(opt.id, e.target.value)}
            placeholder={`Option ${i + 1}`}
            className="flex-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg border border-transparent focus:border-blue-400 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400"
          />
          {options.length > 2 && (
            <button onClick={() => onRemoveOption(opt.id)} className="text-gray-400 hover:text-red-400 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
    {options.length < MAX_POLL_OPTIONS && (
      <button
        onClick={onAddOption}
        className="flex items-center gap-1.5 text-xs text-blue-500 font-semibold hover:text-blue-600 transition-colors"
      >
        <Plus size={13} /> Add option
      </button>
    )}
  </div>
));
PollBuilder.displayName = "PollBuilder";

// ── Main Component ────────────────────────────────────────────────
export const CreatePostModal = memo(({ isOpen, onClose, onSubmit }: CreatePostModalProps) => {
  const { username, level } = useGame();

  const [content,  setContent]  = useState("");
  const [images,   setImages]   = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | undefined>();
  const [audience, setAudience] = useState<PostAudience>("public");
  const [location, setLocation] = useState("");
  const [showLocation, setShowLocation] = useState(false);
  const [showPoll,  setShowPoll]  = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions,  setPollOptions]  = useState<PollOption[]>([
    { id: "1", text: "" }, { id: "2", text: "" },
  ]);
  const [showAudience, setShowAudience] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);

  // Restore draft on open
  useEffect(() => {
    if (!isOpen) return;
    const draft = getDraft();
    if (draft && (draft.content || draft.imageUrls?.length)) {
      setHasDraft(true);
    }
    textareaRef.current?.focus();
  }, [isOpen]);

  // Auto-save draft every 3 seconds
  useEffect(() => {
    if (!isOpen) return;
    const t = setInterval(() => {
      if (content.trim() || images.length) {
        saveDraft({ content, imageUrls: images, audience });
      }
    }, 3000);
    return () => clearInterval(t);
  }, [isOpen, content, images, audience]);

  const reset = useCallback(() => {
    setContent(""); setImages([]); setVideoUrl(undefined);
    setAudience("public"); setLocation(""); setShowLocation(false);
    setShowPoll(false); setPollQuestion(""); setHasDraft(false);
    setPollOptions([{ id: "1", text: "" }, { id: "2", text: "" }]);
    clearDraft();
  }, []);

  const handleClose = useCallback(() => {
    if (content.trim() || images.length) {
      saveDraft({ content, imageUrls: images, audience });
    }
    reset();
    onClose();
  }, [content, images, audience, reset, onClose]);

  const restoreDraft = useCallback(() => {
    const draft = getDraft();
    if (!draft) return;
    setContent(draft.content ?? "");
    setImages(draft.imageUrls ?? []);
    setAudience(draft.audience ?? "public");
    setHasDraft(false);
    toast.success("Draft restored");
  }, []);

  const handleImagePick = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = MAX_IMAGES - images.length;
    const toProcess = files.slice(0, remaining);

    for (const file of toProcess) {
      try {
        const compressed = await compressImage(file);
        const url = URL.createObjectURL(compressed);
        setImages((prev) => [...prev, url]);
      } catch {
        toast.error("Failed to load image");
      }
    }
    e.target.value = "";
  }, [images]);

  const handleVideoPick = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { toast.error("Video must be under 100 MB"); return; }
    setVideoUrl(URL.createObjectURL(file));
    e.target.value = "";
  }, []);

  const handleHashtag = useCallback(() => {
    setContent((c) => c + (c.endsWith(" ") || !c ? "#" : " #"));
    textareaRef.current?.focus();
  }, []);

  const handleAddPollOption = () => {
    if (pollOptions.length >= MAX_POLL_OPTIONS) return;
    setPollOptions((prev) => [...prev, { id: String(Date.now()), text: "" }]);
  };

  const handleSubmit = useCallback(async () => {
    if (!content.trim() && !images.length && !videoUrl && !showPoll) {
      toast.error("Write something or add media");
      return;
    }
    if (showPoll && !pollQuestion.trim()) { toast.error("Add a poll question"); return; }

    const hashtags = (content.match(/#[\w\u0600-\u06FF]+/g) ?? []);
    const mentions = (content.match(/@[\w]+/g) ?? []);

    setSubmitting(true);
    try {
      await onSubmit({
        content:   content.trim(),
        imageUrls: images,
        videoUrl,
        format:    videoUrl ? "video" : images.length ? "image" : showPoll ? "poll" : "text",
        audience,
        location:  location.trim() || undefined,
        hashtags,
        mentions,
        poll: showPoll
          ? { question: pollQuestion, options: pollOptions.filter((o) => o.text.trim()), duration: 24 }
          : undefined,
      });
      reset();
      onClose();
      toast.success("Posted!");
    } catch {
      toast.error("Failed to post");
    } finally {
      setSubmitting(false);
    }
  }, [content, images, videoUrl, showPoll, pollQuestion, pollOptions, audience, location, onSubmit, reset, onClose]);

  const charCount = content.length;
  const charLeft  = MAX_CHARS - charCount;
  const canPost   = (content.trim().length > 0 || images.length > 0 || videoUrl || showPoll) && !submitting;

  const currentAudience = AUDIENCE_OPTIONS.find((a) => a.value === audience)!;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-[60] max-w-2xl mx-auto",
              "bg-white dark:bg-gray-950 rounded-t-3xl shadow-2xl",
              "flex flex-col max-h-[92vh]"
            )}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-3 flex-shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b border-gray-100 dark:border-gray-800">
              <button
                onClick={handleClose}
                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
              >
                Cancel
              </button>

              <h3 className="text-sm font-bold text-gray-900 dark:text-white">New Post</h3>

              {/* Audience selector */}
              <div className="relative">
                <button
                  onClick={() => setShowAudience((v) => !v)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold",
                    "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
                    "hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  )}
                >
                  <currentAudience.icon size={12} />
                  {currentAudience.label}
                  <ChevronDown size={11} className={cn(showAudience && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {showAudience && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -4 }}
                      className="absolute right-0 top-full mt-1 z-50 w-40 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden"
                    >
                      {AUDIENCE_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => { setAudience(opt.value); setShowAudience(false); }}
                            className={cn(
                              "w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors",
                              audience === opt.value
                                ? "text-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                            )}
                          >
                            <Icon size={14} />
                            <span className="font-medium">{opt.label}</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Draft banner */}
            <AnimatePresence>
              {hasDraft && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 flex-shrink-0"
                >
                  <span className="text-xs text-amber-700 dark:text-amber-400 flex-1">You have a saved draft</span>
                  <button onClick={restoreDraft} className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline">Restore</button>
                  <button onClick={() => { clearDraft(); setHasDraft(false); }} className="text-xs text-amber-500 hover:text-amber-700">
                    <X size={12} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Author row */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {username[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{username}</p>
                  <p className="text-xs text-gray-400">Level {level}</p>
                </div>
              </div>

              {/* Text area */}
              <div className="px-4 pb-2">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
                  placeholder="What's on your mind? Use # for hashtags, @ for mentions…"
                  className={cn(
                    "w-full resize-none bg-transparent text-sm text-gray-900 dark:text-white",
                    "placeholder-gray-400 focus:outline-none leading-relaxed",
                    "min-h-[80px]"
                  )}
                  rows={4}
                />
                <div className="flex justify-end">
                  <span className={cn(
                    "text-[10px] font-medium",
                    charLeft < 20 ? "text-red-500" : charLeft < 60 ? "text-amber-500" : "text-gray-400"
                  )}>
                    {charLeft}
                  </span>
                </div>
              </div>

              {/* Image preview grid */}
              <AnimatePresence>
                {images.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={cn(
                      "px-4 pb-3 grid gap-1.5",
                      images.length === 1 ? "grid-cols-1" :
                      images.length === 2 ? "grid-cols-2" : "grid-cols-2"
                    )}
                  >
                    {images.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {images.length < MAX_IMAGES && (
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        className="aspect-square rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors"
                      >
                        <Plus size={20} />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Video preview */}
              <AnimatePresence>
                {videoUrl && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 pb-3"
                  >
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                      <video src={videoUrl} controls className="w-full h-full" />
                      <button
                        onClick={() => setVideoUrl(undefined)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Poll builder */}
              <AnimatePresence>
                {showPoll && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-gray-100 dark:border-gray-800 pt-3"
                  >
                    <PollBuilder
                      question={pollQuestion}
                      options={pollOptions}
                      onQuestionChange={setPollQuestion}
                      onOptionChange={(id, text) => setPollOptions((prev) =>
                        prev.map((o) => o.id === id ? { ...o, text } : o)
                      )}
                      onAddOption={handleAddPollOption}
                      onRemoveOption={(id) => setPollOptions((prev) => prev.filter((o) => o.id !== id))}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Location input */}
              <AnimatePresence>
                {showLocation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 pb-3"
                  >
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                      <MapPin size={14} className="text-blue-500 flex-shrink-0" />
                      <input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Add location…"
                        autoFocus
                        className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                      />
                      {location && (
                        <button onClick={() => setLocation("")} className="text-gray-400">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 px-4 py-3 pb-safe">
              <div className="flex items-center gap-1">
                {/* Toolbar */}
                <Toolbar
                  onImage={() => imageInputRef.current?.click()}
                  onVideo={() => videoInputRef.current?.click()}
                  onPoll={() => setShowPoll((v) => !v)}
                  onLocation={() => setShowLocation((v) => !v)}
                  onHashtag={handleHashtag}
                  hasImage={images.length > 0}
                  hasVideo={!!videoUrl}
                  hasPoll={showPoll}
                />

                <div className="flex-1" />

                {/* Submit */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmit}
                  disabled={!canPost}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                    canPost
                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                      : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                  )}
                >
                  {submitting
                    ? <Loader2 size={15} className="animate-spin" />
                    : <Send size={15} />
                  }
                  Post
                </motion.button>
              </div>
            </div>

            {/* Hidden inputs */}
            <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagePick} />
            <input ref={videoInputRef} type="file" accept="video/*"  className="hidden" onChange={handleVideoPick} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

CreatePostModal.displayName = "CreatePostModal";
export default CreatePostModal;
