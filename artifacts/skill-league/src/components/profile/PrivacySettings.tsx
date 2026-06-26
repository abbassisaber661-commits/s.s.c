import React, { memo, useState } from "react";
import { motion } from "framer-motion";
import { Shield, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PrivacyConfig, PrivacyVisibility } from "@/types/profile";

const VISIBILITY_OPTIONS: { value: PrivacyVisibility; label: string; icon: string }[] = [
  { value: "everyone", label: "Everyone", icon: "🌍" },
  { value: "friends", label: "Friends Only", icon: "👥" },
  { value: "followers", label: "Followers", icon: "📣" },
  { value: "nobody", label: "Nobody", icon: "🔒" },
];

interface PrivacySelectProps {
  label: string;
  description: string;
  value: PrivacyVisibility;
  onChange: (value: PrivacyVisibility) => void;
}

const PrivacySelect = memo(({ label, description, value, onChange }: PrivacySelectProps) => {
  const [open, setOpen] = useState(false);
  const current = VISIBILITY_OPTIONS.find((o) => o.value === value);

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 ml-3 px-3 py-1.5 rounded-xl text-xs font-semibold",
            "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
            "text-gray-700 dark:text-gray-300 transition-colors flex-shrink-0"
          )}
        >
          <span>{current?.icon}</span>
          <span>{current?.label}</span>
          <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl overflow-hidden"
        >
          {VISIBILITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                value === opt.value
                  ? "text-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              <span>{opt.icon}</span>
              <span className="flex-1 text-left font-medium">{opt.label}</span>
              {value === opt.value && (
                <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white" />
                </span>
              )}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
});

PrivacySelect.displayName = "PrivacySelect";

interface ProfileToggleProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

const ProfileToggle = memo(({ label, description, value, onChange }: ProfileToggleProps) => (
  <div className="flex items-center justify-between px-4 py-3">
    <div className="flex-1 min-w-0 mr-4">
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
    </div>
    <button
      onClick={() => onChange(!value)}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors flex-shrink-0",
        value ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
      )}
    >
      <motion.div
        animate={{ x: value ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
      />
    </button>
  </div>
));

ProfileToggle.displayName = "ProfileToggle";

const Divider = () => (
  <div className="mx-4 border-b border-gray-100 dark:border-gray-800" />
);

interface PrivacySettingsProps {
  config: PrivacyConfig;
  onChange: (key: keyof PrivacyConfig, value: PrivacyConfig[keyof PrivacyConfig]) => void;
  className?: string;
}

export const PrivacySettings = memo(({ config, onChange, className }: PrivacySettingsProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border border-gray-100 dark:border-gray-800",
        "bg-white dark:bg-gray-900/60 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-100 dark:border-gray-800">
        <Shield size={18} className="text-green-500" />
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Privacy</h3>
      </div>

      <ProfileToggle
        label="Private Profile"
        description="Only approved followers can see your profile"
        value={config.isPrivate}
        onChange={(v) => onChange("isPrivate", v)}
      />
      <Divider />

      <PrivacySelect
        label="Who can follow me"
        description="Control who can send follow requests"
        value={config.whoCanFollow}
        onChange={(v) => onChange("whoCanFollow", v)}
      />
      <Divider />

      <PrivacySelect
        label="Who can message me"
        description="Control who can send you direct messages"
        value={config.whoCanMessage}
        onChange={(v) => onChange("whoCanMessage", v)}
      />
      <Divider />

      <PrivacySelect
        label="Who can see my friends"
        description="Control who can view your friends list"
        value={config.whoCanSeeFriends}
        onChange={(v) => onChange("whoCanSeeFriends", v)}
      />
      <Divider />

      <PrivacySelect
        label="Who can see my followers"
        description="Control who can see your followers list"
        value={config.whoCanSeeFollowers}
        onChange={(v) => onChange("whoCanSeeFollowers", v)}
      />
      <Divider />

      <PrivacySelect
        label="Who can see my following"
        description="Control who can see who you follow"
        value={config.whoCanSeeFollowing}
        onChange={(v) => onChange("whoCanSeeFollowing", v)}
      />
      <Divider />

      <PrivacySelect
        label="Who can view my posts"
        description="Control who can see your posts"
        value={config.whoCanViewPosts}
        onChange={(v) => onChange("whoCanViewPosts", v)}
      />
    </motion.div>
  );
});

PrivacySettings.displayName = "PrivacySettings";
export default PrivacySettings;
