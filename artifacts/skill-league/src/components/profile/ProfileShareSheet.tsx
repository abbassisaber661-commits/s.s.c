import React, { memo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Link2, Share2, QrCode, ExternalLink, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileShareSheetProps {
  username: string;
  profileUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ShareOptionProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick: () => void;
  done?: boolean;
  disabled?: boolean;
}

const ShareOption = memo(({ icon: Icon, label, description, onClick, done, disabled }: ShareOptionProps) => (
  <motion.button
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all",
      "bg-[#F5F5F7] hover:bg-[#E5E5E5] border border-[#E5E5E5]",
      "disabled:opacity-60 disabled:cursor-not-allowed"
    )}
  >
    <div
      className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
        done ? "bg-green-500" : "bg-[#FFD60A]/15"
      )}
    >
      {done ? (
        <Check size={18} className="text-white" />
      ) : (
        <Icon size={18} className="text-[#111111]" />
      )}
    </div>
    <div className="text-left flex-1">
      <p className="text-sm font-semibold text-[#111111]">
        {done ? "Done!" : label}
      </p>
      {description && (
        <p className="text-xs text-[#666666]">{description}</p>
      )}
    </div>
  </motion.button>
));
ShareOption.displayName = "ShareOption";

export const ProfileShareSheet = memo(({ username, profileUrl, isOpen, onClose }: ProfileShareSheetProps) => {
  const [copyDone,  setCopyDone]  = useState(false);
  const [shareDone, setShareDone] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {}
  }, [profileUrl]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `@${username} on S.S.C`,
          text:  `Check out ${username}'s profile on S.S.C!`,
          url:   profileUrl,
        });
        setShareDone(true);
        setTimeout(() => setShareDone(false), 2000);
      } catch {}
    } else {
      handleCopy();
    }
  }, [username, profileUrl, handleCopy]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-2xl mx-auto bg-white rounded-t-3xl px-4 pt-3 pb-8 shadow-2xl"
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-[#E5E5E5] rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-[#111111]">Share Profile</h3>
                <p className="text-xs text-[#666666] mt-0.5">@{username}</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#666666] hover:bg-[#E5E5E5] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* URL preview */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-[#F5F5F7] rounded-xl mb-4 border border-[#E5E5E5]">
              <Link2 size={14} className="text-[#666666] flex-shrink-0" />
              <p className="text-xs text-[#666666] truncate flex-1">{profileUrl}</p>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <ShareOption icon={Link2}       label="Copy Profile Link"   description="Copy the URL to your clipboard"      onClick={handleCopy}  done={copyDone} />
              <ShareOption icon={Share2}      label="Share Profile"        description="Share via apps on your device"       onClick={handleShare} done={shareDone} />
              <ShareOption icon={QrCode}      label="QR Code"              description="Scan to open this profile — coming soon" onClick={() => {}} disabled />
              <ShareOption icon={ExternalLink} label="Open in Browser"     description="Open this profile in a new tab"     onClick={() => window.open(profileUrl, "_blank")} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

ProfileShareSheet.displayName = "ProfileShareSheet";
export default ProfileShareSheet;
