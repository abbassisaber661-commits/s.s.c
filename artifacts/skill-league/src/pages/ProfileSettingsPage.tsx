import React, { memo, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Shield,
  ChevronRight,
  LogOut,
  BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGame } from "@/contexts/GameContext";
import { useProfileData } from "@/hooks/useProfileData";
import { PrivacySettings } from "@/components/profile/PrivacySettings";
import VerificationRequestButton from "@/components/profile/VerificationRequestButton";
import type { PrivacyConfig } from "@/types/profile";

const DEFAULT_PRIVACY: PrivacyConfig = {
  isPrivate: false,
  whoCanFollow: "everyone",
  whoCanMessage: "friends",
  whoCanSeeFriends: "everyone",
  whoCanSeeFollowers: "everyone",
  whoCanSeeFollowing: "everyone",
  whoCanViewPosts: "everyone",
};

interface SettingsRowProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick?: () => void;
  badge?: string;
  variant?: "default" | "danger";
  className?: string;
}

const SettingsRow = memo(
  ({ icon: Icon, label, description, onClick, badge, variant = "default", className }: SettingsRowProps) => (
    <motion.button
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left",
        variant === "danger"
          ? "hover:bg-red-50 dark:hover:bg-red-900/20"
          : "hover:bg-gray-50 dark:hover:bg-gray-800/50",
        className
      )}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
          variant === "danger"
            ? "bg-red-100 dark:bg-red-900/30"
            : "bg-gray-100 dark:bg-gray-800"
        )}
      >
        <Icon
          size={17}
          className={
            variant === "danger"
              ? "text-red-500"
              : "text-gray-600 dark:text-gray-400"
          }
        />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-semibold",
            variant === "danger"
              ? "text-red-500"
              : "text-gray-900 dark:text-white"
          )}
        >
          {label}
        </p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>

      {badge && (
        <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
          {badge}
        </span>
      )}

      {variant !== "danger" && (
        <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
      )}
    </motion.button>
  )
);

SettingsRow.displayName = "SettingsRow";

const SectionHeader = ({ title }: { title: string }) => (
  <p className="px-4 pt-5 pb-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
    {title}
  </p>
);

const Divider = () => (
  <div className="mx-4 border-b border-gray-100 dark:border-gray-800" />
);

type SettingsView = "main" | "privacy";

export default function ProfileSettingsPage() {
  const [, navigate] = useLocation();
  const [view, setView] = useState<SettingsView>("main");
  const [privacy, setPrivacy] = useState<PrivacyConfig>(DEFAULT_PRIVACY);
  const { logout, authUser } = useGame();

  // Fetch profile to get current verification status
  const { profile, refetch: refetchProfile } = useProfileData(authUser?.uid ?? "");

  const handlePrivacyChange = (
    key: keyof PrivacyConfig,
    value: PrivacyConfig[keyof PrivacyConfig]
  ) => {
    setPrivacy((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Only show verification section if not already verified
  const showVerification =
    profile && profile.verification !== "verified" && profile.verification !== "official";

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => {
              if (view !== "main") {
                setView("main");
              } else {
                navigate(-1 as any);
              }
            }}
            className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">
            {view === "privacy" ? "Privacy Settings" : "Profile Settings"}
          </h1>
        </div>
      </div>

      {/* ── Privacy view ── */}
      {view === "privacy" ? (
        <div className="p-4">
          <PrivacySettings config={privacy} onChange={handlePrivacyChange} />
        </div>
      ) : (
        /* ── Main settings view ── */
        <div className="pb-20">
          <SectionHeader title="Privacy & Security" />
          <div className="bg-white dark:bg-gray-900/60 rounded-2xl mx-4 border border-gray-100 dark:border-gray-800 overflow-hidden">
            <SettingsRow
              icon={Shield}
              label="Privacy Settings"
              description="Control who can see your profile and content"
              onClick={() => setView("privacy")}
            />
          </div>

          {/* ── Verification section (hidden when already verified) ── */}
          {showVerification && (
            <>
              <SectionHeader title="Verification" />
              <div className="mx-4">
                <div className="flex items-start gap-3 mb-3 px-1">
                  <BadgeCheck size={15} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Request a verification badge for your account. Our team will review your profile
                    and respond within a few days.
                  </p>
                </div>
                <VerificationRequestButton
                  verificationStatus={profile?.verificationStatus}
                  onRequested={refetchProfile}
                />
              </div>
            </>
          )}

          <SectionHeader title="Account" />
          <div className="bg-white dark:bg-gray-900/60 rounded-2xl mx-4 border border-gray-100 dark:border-gray-800 overflow-hidden">
            <SettingsRow
              icon={LogOut}
              label="Log Out"
              onClick={handleLogout}
              variant="danger"
            />
          </div>
        </div>
      )}
    </div>
  );
}
