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

const ShareOption = memo(
  ({ icon: Icon, label, description, onClick, done, disabled }: ShareOptionProps) => (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all",
        "bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800",
        "disabled:opacity-60 disabled:cursor-not-allowed"
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
          done ? "bg-green-500" : "bg-blue-500/10"
        )}
      >
        {done ? (
          <Check size={18} className="text-green-50" />
        ) : (
          <Icon size={18} className="text-blue-500" />
        )}
      </div>
      <div className="text-left flex-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {done ? "Done!" : label}
        </p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
    </motion.button>
  )
);

ShareOption.displayName = "ShareOption";

export const ProfileShareSheet = memo(
  ({ username, profileUrl, isOpen, onClose }: ProfileShareSheetProps) => {
    const [copyDone, setCopyDone] = useState(false);
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
            title: `@${username} on SkillLeague`,
            text: `Check out ${username}'s profile on SkillLeague!`,
            url: profileUrl,
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
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className={cn(
                "fixed bottom-0 left-0 right-0 z-50 max-w-2xl mx-auto",
                "bg-white dark:bg-gray-900 rounded-t-3xl",
                "px-4 pt-3 pb-8 shadow-2xl"
              )}
            >
              {/* Handle */}
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-4" />

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Share Profile
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    @{username}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* URL preview */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl mb-4">
                <Link2 size={14} className="text-gray-400 flex-shrink-0" />
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">
                  {profileUrl}
                </p>
              </div>

              {/* Share options */}
              <div className="space-y-2">
                <ShareOption
                  icon={Link2}
                  label="Copy Profile Link"
                  description="Copy the URL to your clipboard"
                  onClick={handleCopy}
                  done={copyDone}
                />

                <ShareOption
                  icon={Share2}
                  label="Share Profile"
                  description="Share via apps on your device"
                  onClick={handleShare}
                  done={shareDone}
                />

                <ShareOption
                  icon={QrCode}
                  label="QR Code"
                  description="Scan to open this profile — coming soon"
                  onClick={() => {}}
                  disabled
                />

                <ShareOption
                  icon={ExternalLink}
                  label="Open in Browser"
                  description="Open this profile in a new tab"
                  onClick={() => window.open(profileUrl, "_blank")}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }
);

ProfileShareSheet.displayName = "ProfileShareSheet";
export default ProfileShareSheet;
