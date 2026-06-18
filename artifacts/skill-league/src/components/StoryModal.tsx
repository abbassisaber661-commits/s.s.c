// src/components/Story/StoryModal.tsx

import { useState, useRef, useEffect } from "react";
import { X, Image, Smile, Send, Loader2 } from "lucide-react";
import { addStoryAsync, resizeImageToBase64 } from "@/lib/stories";
import { useGame } from "@/contexts/GameContext";

interface StoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const EMOJI_LIST = ["⚡", "🔥", "💪", "🎯", "🧠", "🌟", "😎", "🎮", "🚀", "💯", "🏆", "👑"];

export default function StoryModal({ isOpen, onClose, onSuccess }: StoryModalProps) {
  const { authUser } = useGame();

  const [content, setContent] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("⚡");
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // ── إغلاق عند الضغط خارج المودال ──
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  // ── إغلاق المودال مع إعادة الضبط ──
  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setContent("");
    setSelectedEmoji("⚡");
    setImage(null);
    setImageFile(null);
    setShowEmojiPicker(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── اختيار صورة ──
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await resizeImageToBase64(file, 600, 0.75);
      setImage(base64);
      setImageFile(file);
    } catch (error) {
      console.error("خطأ في تحميل الصورة:", error);
    }
  };

  // ── نشر الستوري ──
  const handleSubmit = async () => {
    if (!authUser) return;
    if (!content.trim() && !image) return;

    setLoading(true);

    try {
      const authorName = (authUser as any).displayName || authUser.email?.split("@")[0] || "مستخدم";
      const authorLevel = (authUser as any).level || 1;

      await addStoryAsync(
        authorName,
        authorLevel,
        content.trim() || "📸",
        selectedEmoji,
        image || undefined
      );

      resetForm();
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("خطأ في نشر الستوري:", error);
    } finally {
      setLoading(false);
    }
  };

  // ── اختيار إيموجي سريع ──
  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
    setShowEmojiPicker(false);
  };

  if (!isOpen) return null;

  const canSubmit = (content.trim() || image) && !loading;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        ref={modalRef}
        className="bg-gray-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-700"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-white text-lg font-bold">إنشاء ستوري</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition p-1"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-4 space-y-4">
          {/* معاينة الصورة */}
          {image && (
            <div className="relative rounded-lg overflow-hidden bg-gray-800">
              <img
                src={image}
                alt="معاينة الستوري"
                className="w-full max-h-60 object-contain"
              />
              <button
                onClick={() => { setImage(null); setImageFile(null); }}
                className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-black/80"
                disabled={loading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* إيموجي + نص */}
          <div className="flex items-center gap-3">
            {/* إيموجي مختار */}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-2xl hover:bg-gray-700 transition"
              disabled={loading}
            >
              {selectedEmoji}
            </button>

            {/* حقل النص */}
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 120))}
              placeholder="اكتب شيئاً..."
              className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              maxLength={120}
              disabled={loading}
            />
          </div>

          {/* منقي الإيموجي */}
          {showEmojiPicker && (
            <div className="bg-gray-800 rounded-lg p-3 grid grid-cols-6 gap-2">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiSelect(emoji)}
                  className={`text-2xl p-1 rounded hover:bg-gray-700 transition ${
                    selectedEmoji === emoji ? "bg-gray-700 ring-2 ring-blue-500" : ""
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* أزرار الإضافة */}
          <div className="flex gap-3">
            {/* زر إضافة صورة */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition"
              disabled={loading}
            >
              <Image className="w-5 h-5" />
              <span className="text-sm">صورة</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* عداد الأحرف */}
          <div className="text-right text-xs text-gray-500">
            {content.length}/120
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="p-4 border-t border-gray-700 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition"
            disabled={loading}
          >
            إلغاء
          </button>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition ${
              canSubmit
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري النشر...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>نشر</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}