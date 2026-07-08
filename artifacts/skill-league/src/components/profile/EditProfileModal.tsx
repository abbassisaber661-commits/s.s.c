import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    bio: string;
    avatar: string;
    location?: string;
    website?: string;
  };
  onSave: (data: {
    bio: string;
    avatar: string | File;
    location?: string;
    website?: string;
  }) => Promise<void> | void;
}

type Errors = {
  bio?: string;
  website?: string;
  avatar?: string;
  general?: string;
};

// Shared input class
const inputCls = (error?: string) =>
  cn(
    "w-full px-3 py-2.5 border rounded-xl text-sm text-[#111111] bg-[#F5F5F7]",
    "placeholder-[#666666] transition focus:outline-none focus:border-[#FFD60A]",
    error ? "border-red-400" : "border-[#E5E5E5]"
  );

export default function EditProfileModal({ isOpen, onClose, initialData, onSave }: EditProfileModalProps) {
  const [bio,           setBio]           = useState(initialData.bio || "");
  const [location,      setLocation]      = useState(initialData.location || "");
  const [website,       setWebsite]       = useState(initialData.website || "");
  const [avatarPreview, setAvatarPreview] = useState<string>(initialData.avatar || "");
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null);
  const [errors,        setErrors]        = useState<Errors>({});
  const [isSaving,      setIsSaving]      = useState(false);
  const [isSuccess,     setIsSuccess]     = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMounted    = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setBio(initialData.bio || "");
      setLocation(initialData.location || "");
      setWebsite(initialData.website || "");
      setAvatarPreview(initialData.avatar || "");
      setAvatarFile(null);
      setErrors({});
      setIsSuccess(false);
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!isOpen) setIsSuccess(false);
  }, [isOpen]);

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors((p) => ({ ...p, avatar: "Image too large (max 5 MB)" }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      setErrors((p) => ({ ...p, avatar: "Please select an image file" }));
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload  = (e) => { if (isMounted.current) setAvatarPreview(e.target?.result as string); };
    reader.onerror = ()  => { if (isMounted.current) setErrors((p) => ({ ...p, avatar: "Error reading image" })); };
    reader.readAsDataURL(file);
    setErrors((p) => { const { avatar, ...rest } = p; return rest; });
  }, []);

  const validate = useCallback((): Errors => {
    const errs: Errors = {};
    const w = website?.trim();
    if (bio && bio.length > 150)             errs.bio     = "Bio max 150 characters";
    if (w && !/^https?:\/\/\S+$/.test(w))   errs.website = "Enter a valid URL (http:// or https://)";
    return errs;
  }, [bio, website]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setIsSaving(true);
    setErrors({});
    setIsSuccess(false);

    try {
      await onSave({
        bio:      bio.trim(),
        avatar:   avatarFile || avatarPreview,
        location: location.trim() || undefined,
        website:  website.trim()  || undefined,
      });
      setIsSuccess(true);
      setTimeout(() => { if (isMounted.current) onClose(); }, 800);
    } catch {
      if (isMounted.current) setErrors((p) => ({ ...p, general: "Failed to save. Please try again." }));
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  }, [bio, avatarFile, avatarPreview, location, website, validate, onSave, onClose, isSaving]);

  const handleClose = useCallback(() => { if (!isSaving) onClose(); }, [isSaving, onClose]);

  const handleRemoveAvatar = useCallback(() => {
    setAvatarFile(null);
    setAvatarPreview(initialData.avatar || "");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setErrors((p) => { const { avatar, ...rest } = p; return rest; });
  }, [initialData.avatar]);

  const Field = ({
    label, error, children,
  }: { label: string; error?: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-semibold text-[#666666] uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-[#E5E5E5]">

              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5]">
                <h2 className="text-base font-bold text-[#111111]">Edit Profile</h2>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                  disabled={isSaving}
                  className="p-2 hover:bg-[#F5F5F7] rounded-full transition-colors disabled:opacity-50"
                >
                  <X size={18} className="text-[#666666]" />
                </motion.button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4">

                {/* Avatar */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative group">
                    <img
                      src={avatarPreview || "https://i.pravatar.cc/150?img=1"}
                      alt="Avatar"
                      className="w-24 h-24 rounded-full object-cover border-4 border-[#E5E5E5]"
                    />
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSaving}
                      className="absolute bottom-0 right-0 p-1.5 bg-[#FFD60A] text-black rounded-full border-2 border-white hover:bg-[#F5C800] transition-colors disabled:opacity-50"
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
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  {errors.avatar && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.avatar}
                    </p>
                  )}
                </div>

                {/* Fields */}
                <div className="space-y-3">
                  <Field label="Bio" error={errors.bio}>
                    <textarea
                      value={bio}
                      onChange={(e) => { setBio(e.target.value); setErrors((p) => { const { bio, ...r } = p; return r; }); }}
                      rows={3}
                      maxLength={150}
                      placeholder="Tell us about yourself…"
                      disabled={isSaving}
                      className={cn(inputCls(errors.bio), "resize-none")}
                    />
                    <div className="flex justify-between text-xs text-[#666666] mt-1">
                      <span>{bio.length}/150</span>
                      {errors.bio && <span className="text-red-500">{errors.bio}</span>}
                    </div>
                  </Field>

                  <Field label="Location">
                    <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls()} placeholder="City, Country" disabled={isSaving} />
                  </Field>

                  <Field label="Website" error={errors.website}>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => { setWebsite(e.target.value); setErrors((p) => { const { website, ...r } = p; return r; }); }}
                      className={inputCls(errors.website)}
                      placeholder="https://example.com"
                      disabled={isSaving}
                    />
                  </Field>

                  {/* Error banner */}
                  {errors.general && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm">
                      <AlertCircle size={16} /> {errors.general}
                    </div>
                  )}

                  {/* Success banner */}
                  {isSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl flex items-center gap-2 text-sm"
                    >
                      <Check size={16} /> Changes saved!
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-4 border-t border-[#E5E5E5]">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClose}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 bg-[#F5F5F7] hover:bg-[#E5E5E5] text-[#111111] rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 border border-[#E5E5E5]"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSave}
                  disabled={isSaving || isSuccess}
                  className="flex-1 px-4 py-2.5 bg-[#FFD60A] hover:bg-[#F5C800] text-black rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isSaving ? (
                    <><Loader2 size={16} className="animate-spin" /> Saving…</>
                  ) : isSuccess ? (
                    <><Check size={16} /> Saved ✓</>
                  ) : (
                    <><Check size={16} /> Save Changes</>
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
