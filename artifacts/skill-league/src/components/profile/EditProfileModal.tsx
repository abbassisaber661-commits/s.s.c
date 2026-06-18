import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
// أنواع الخصائص
// ============================================================
interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    username: string;
    bio: string;
    avatar: string;
    fullName?: string;
    location?: string;
    website?: string;
  };
  onSave: (data: {
    username: string;
    bio: string;
    avatar: string | File;
    fullName?: string;
    location?: string;
    website?: string;
  }) => Promise<void> | void;
}

// ============================================================
// أنواع الأخطاء
// ============================================================
type Errors = {
  username?: string;
  bio?: string;
  website?: string;
  avatar?: string;
  general?: string;
};

// ============================================================
// المكون الرئيسي
// ============================================================
export default function EditProfileModal({
  isOpen,
  onClose,
  initialData,
  onSave,
}: EditProfileModalProps) {
  // ===== الحالات =====
  const [username, setUsername] = useState(initialData.username || "");
  const [bio, setBio] = useState(initialData.bio || "");
  const [fullName, setFullName] = useState(initialData.fullName || "");
  const [location, setLocation] = useState(initialData.location || "");
  const [website, setWebsite] = useState(initialData.website || "");
  const [avatarPreview, setAvatarPreview] = useState<string>(initialData.avatar || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true);

  // ===== منع تسريب الذاكرة =====
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ===== إعادة ضبط النموذج عند الفتح =====
  useEffect(() => {
    if (isOpen) {
      setUsername(initialData.username || "");
      setBio(initialData.bio || "");
      setFullName(initialData.fullName || "");
      setLocation(initialData.location || "");
      setWebsite(initialData.website || "");
      setAvatarPreview(initialData.avatar || "");
      setAvatarFile(null);
      setErrors({});
      setIsSuccess(false);
    }
  }, [isOpen, initialData]);

  // ===== إعادة تعيين حالة النجاح عند الإغلاق =====
  useEffect(() => {
    if (!isOpen) {
      setIsSuccess(false);
    }
  }, [isOpen]);

  // ===== معالجة تغيير الصورة =====
  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, avatar: "الصورة كبيرة جداً (حد أقصى 5 ميجابايت)" }));
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, avatar: "يرجى اختيار صورة فقط" }));
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!isMounted.current) return;
      setAvatarPreview(e.target?.result as string);
    };
    reader.onerror = () => {
      if (!isMounted.current) return;
      setErrors((prev) => ({ ...prev, avatar: "حدث خطأ أثناء قراءة الصورة" }));
    };
    reader.readAsDataURL(file);
    setErrors((prev) => {
      const { avatar, ...rest } = prev;
      return rest;
    });
  }, []);

  // ===== التحقق من صحة النموذج =====
  const validate = useCallback((): Errors => {
    const newErrors: Errors = {};
    const trimmedUsername = username.trim();
    const trimmedWebsite = website?.trim();

    if (!trimmedUsername) {
      newErrors.username = "اسم المستخدم مطلوب";
    } else if (trimmedUsername.length < 3) {
      newErrors.username = "اسم المستخدم يجب أن يكون 3 أحرف على الأقل";
    }

    if (bio && bio.length > 150) {
      newErrors.bio = "السيرة الذاتية لا تتجاوز 150 حرفاً";
    }

    if (trimmedWebsite && !/^https?:\/\/\S+$/.test(trimmedWebsite)) {
      newErrors.website = "يرجى إدخال رابط صحيح (يبدأ بـ http:// أو https://)";
    }

    return newErrors;
  }, [username, bio, website]);

  // ===== حفظ البيانات =====
  const handleSave = useCallback(async () => {
    if (isSaving) return;

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    setErrors({});
    setIsSuccess(false);

    try {
      const data = {
        username: username.trim(),
        bio: bio.trim(),
        avatar: avatarFile || avatarPreview,
        fullName: fullName.trim() || undefined,
        location: location.trim() || undefined,
        website: website.trim() || undefined,
      };
      await onSave(data);
      setIsSuccess(true);
      setTimeout(() => {
        if (isMounted.current) {
          onClose();
        }
      }, 800);
    } catch (error) {
      console.error("❌ فشل حفظ البيانات:", error);
      if (isMounted.current) {
        setErrors((prev) => ({ ...prev, general: "حدث خطأ أثناء الحفظ، حاول مرة أخرى" }));
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  }, [username, bio, avatarFile, avatarPreview, fullName, location, website, validate, onSave, onClose, isSaving]);

  // ===== إغلاق مع إلغاء التعديلات =====
  const handleClose = useCallback(() => {
    if (isSaving) return;
    onClose();
  }, [isSaving, onClose]);

  // ===== إزالة الصورة المحددة =====
  const handleRemoveAvatar = useCallback(() => {
    setAvatarFile(null);
    setAvatarPreview(initialData.avatar || "");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setErrors((prev) => {
      const { avatar, ...rest } = prev;
      return rest;
    });
  }, [initialData.avatar]);

  // ============================================================
  // التصيير
  // ============================================================
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* الخلفية */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* المودال */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              {/* رأس المودال */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  تعديل الملف الشخصي
                </h2>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors disabled:opacity-50"
                  disabled={isSaving}
                >
                  <X size={20} className="text-gray-500 dark:text-gray-400" />
                </motion.button>
              </div>

              {/* محتوى المودال */}
              <div className="p-4 space-y-4">
                {/* صورة الملف الشخصي */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative group">
                    <img
                      src={avatarPreview || "https://i.pravatar.cc/150?img=1"}
                      alt="الصورة الشخصية"
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
                    />
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-1.5 bg-blue-500 text-white rounded-full border-2 border-white dark:border-gray-900 hover:bg-blue-600 transition-colors disabled:opacity-50"
                      disabled={isSaving}
                    >
                      <Camera size={14} />
                    </motion.button>
                    {avatarFile && (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleRemoveAvatar}
                        className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors text-xs"
                      >
                        ✕
                      </motion.button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  {errors.avatar && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.avatar}
                    </p>
                  )}
                </div>

                {/* الحقول */}
                <div className="space-y-3">
                  {/* اسم المستخدم */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      اسم المستخدم *
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setErrors((prev) => {
                          const { username, ...rest } = prev;
                          return rest;
                        });
                      }}
                      className={cn(
                        "w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition",
                        errors.username ? "border-red-500" : "border-gray-300 dark:border-gray-700"
                      )}
                      placeholder="@username"
                      disabled={isSaving}
                    />
                    {errors.username && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle size={12} /> {errors.username}
                      </p>
                    )}
                  </div>

                  {/* الاسم الكامل */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      الاسم الكامل
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="الاسم الكامل"
                      disabled={isSaving}
                    />
                  </div>

                  {/* السيرة الذاتية */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      السيرة الذاتية
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => {
                        setBio(e.target.value);
                        setErrors((prev) => {
                          const { bio, ...rest } = prev;
                          return rest;
                        });
                      }}
                      rows={3}
                      className={cn(
                        "w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none",
                        errors.bio ? "border-red-500" : "border-gray-300 dark:border-gray-700"
                      )}
                      placeholder="أخبرنا عن نفسك..."
                      maxLength={150}
                      disabled={isSaving}
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>{bio.length}/150</span>
                      {errors.bio && <span className="text-red-500">{errors.bio}</span>}
                    </div>
                  </div>

                  {/* الموقع */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      الموقع
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="المدينة، الدولة"
                      disabled={isSaving}
                    />
                  </div>

                  {/* الموقع الإلكتروني */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      الموقع الإلكتروني
                    </label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => {
                        setWebsite(e.target.value);
                        setErrors((prev) => {
                          const { website, ...rest } = prev;
                          return rest;
                        });
                      }}
                      className={cn(
                        "w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition",
                        errors.website ? "border-red-500" : "border-gray-300 dark:border-gray-700"
                      )}
                      placeholder="https://example.com"
                      disabled={isSaving}
                    />
                    {errors.website && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle size={12} /> {errors.website}
                      </p>
                    )}
                  </div>

                  {/* خطأ عام */}
                  {errors.general && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm">
                      <AlertCircle size={16} />
                      {errors.general}
                    </div>
                  )}

                  {/* رسالة النجاح */}
                  {isSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-3 rounded-lg flex items-center gap-2 text-sm"
                    >
                      <Check size={16} />
                      تم حفظ التغييرات بنجاح!
                    </motion.div>
                  )}
                </div>
              </div>

              {/* أزرار الإجراءات */}
              <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors disabled:opacity-50"
                  disabled={isSaving}
                >
                  إلغاء
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSave}
                  disabled={isSaving || isSuccess}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : isSuccess ? (
                    <>
                      <Check size={16} />
                      تم الحفظ ✓
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      حفظ التغييرات
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}