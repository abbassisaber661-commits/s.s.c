// src/pages/Settings.tsx
import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  Settings2,
  CheckCircle2,
  LogOut,
  ChevronRight,
  Bell,
  Globe,
  Shield,
  Lock,
  Info,
  LifeBuoy,
  Trash2,
  User,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { validateUsername } from "@/lib/anti-cheat";
import { useTranslation } from "@/hooks/useTranslation";
import LanguageSelector from "@/components/LanguageSelector";
import type { Language } from "@/lib/i18n";

export const APP_VERSION = "1.1.0";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-xs font-black uppercase tracking-widest px-1 mb-2"
      style={{ color: "#65676B" }}
    >
      {children}
    </div>
  );
}

function SettingsRow({
  icon: Icon,
  iconColor = "#1877F2",
  iconBg,
  label,
  sublabel,
  value,
  onClick,
  href,
  rightNode,
  noBorder,
}: {
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  label: string;
  sublabel?: string;
  value?: string;
  onClick?: () => void;
  href?: string;
  rightNode?: React.ReactNode;
  noBorder?: boolean;
}) {
  const inner = (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50 active:bg-gray-100 ${onClick || href ? "cursor-pointer" : ""}`}
      style={{ borderBottom: noBorder ? "none" : "1px solid #E4E6EB" }}
      onClick={onClick}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: iconBg ?? `${iconColor}18` }}
      >
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold" style={{ color: "#050505" }}>
          {label}
        </div>
        {sublabel && (
          <div className="text-xs mt-0.5" style={{ color: "#65676B" }}>
            {sublabel}
          </div>
        )}
      </div>
      {value && (
        <span className="text-sm font-semibold shrink-0" style={{ color: "#65676B" }}>
          {value}
        </span>
      )}
      {rightNode}
      {(onClick || href) && !rightNode && !value && (
        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#65676B" }} />
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

export default function Settings() {
  const { t } = useTranslation();
  const { username, updateUsername, logout, language, setLanguage } = useGame();
  const [, setLocation] = useLocation();

  const [draft, setDraft] = useState(username);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showUsernameEdit, setShowUsernameEdit] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [cacheCleared, setCacheCleared] = useState(false);

  function handleSaveName() {
    const { valid, reason } = validateUsername(draft);
    if (!valid) {
      setNameError(reason ?? t("settingsPage.usernameError"));
      return;
    }
    updateUsername(draft);
    setNameError(null);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setShowUsernameEdit(false);
    }, 1500);
  }

  function handleLogout() {
    logout();
    setLocation("/");
  }

  function handleClearCache() {
    // Clear non-critical cached data only (not auth/game state)
    const keepPrefixes = ["sl_player", "sl_league_v2", "sl_avatar_v1", "sl_auth"];
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && !keepPrefixes.some((prefix) => k.startsWith(prefix))) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: "#F0F2F5", color: "#050505" }}>

      {/* ── Header ── */}
      <div
        className="sticky top-0 z-20 border-b px-4 py-3 flex items-center gap-3"
        style={{
          background: "#FFFFFF",
          borderColor: "#E4E6EB",
          boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
        }}
      >
        <Link href="/">
          <button className="p-1.5 rounded-xl hover:bg-gray-100 active:scale-95 transition-transform">
            <ArrowLeft className="w-5 h-5" style={{ color: "#050505" }} />
          </button>
        </Link>
        <Settings2 className="w-5 h-5" style={{ color: "#1877F2" }} />
        <h1 className="text-lg font-black flex-1" style={{ color: "#050505" }}>
          {t("settingsPage.title")}
        </h1>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-5">

        {/* ══ 1. ACCOUNT SETTINGS ══ */}
        <div>
          <SectionHeader>👤 {t("settingsPage.accountSection")}</SectionHeader>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}
          >
            {/* Change Username */}
            <div style={{ borderBottom: "1px solid #E4E6EB" }}>
              <button
                onClick={() => setShowUsernameEdit((v) => !v)}
                className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50 active:bg-gray-100 text-left"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "#1877F218" }}
                >
                  <User className="w-4 h-4" style={{ color: "#1877F2" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: "#050505" }}>
                    {t("settingsPage.changeUsername")}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "#65676B" }}>
                    @{username}
                  </div>
                </div>
                <ChevronRight
                  className="w-4 h-4 shrink-0 transition-transform duration-200"
                  style={{
                    color: "#65676B",
                    transform: showUsernameEdit ? "rotate(90deg)" : "none",
                  }}
                />
              </button>
              {showUsernameEdit && (
                <div className="px-4 pb-4 space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      style={{
                        background: "#F0F2F5",
                        border: "1px solid #E4E6EB",
                        color: "#050505",
                      }}
                      maxLength={20}
                      placeholder={t("settingsPage.usernamePlaceholder")}
                    />
                    <Button size="sm" onClick={handleSaveName} className="px-4">
                      {saved ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        t("common.save")
                      )}
                    </Button>
                  </div>
                  {nameError && <p className="text-xs text-red-500">{nameError}</p>}
                </div>
              )}
            </div>

            {/* Log Out */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-red-50 active:bg-red-100 text-left"
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "#FFF0F2" }}
              >
                <LogOut className="w-4 h-4" style={{ color: "#E41E3F" }} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold" style={{ color: "#E41E3F" }}>
                  {t("settingsPage.logout")}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#E41E3F" }} />
            </button>
          </motion.div>
        </div>

        {/* ══ 2. PRIVACY ══ */}
        <div>
          <SectionHeader>🔐 {t("settingsPage.privacySection")}</SectionHeader>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}
          >
            {/* Device Data */}
            <div className="px-4 py-3.5" style={{ borderBottom: "1px solid #E4E6EB" }}>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "#2D8A3E18" }}
                >
                  <Shield className="w-4 h-4" style={{ color: "#2D8A3E" }} />
                </div>
                <div className="text-sm font-semibold" style={{ color: "#050505" }}>
                  {t("settingsPage.deviceDataTitle")}
                </div>
              </div>
              <div className="text-xs leading-relaxed mb-2 pl-11" style={{ color: "#65676B" }}>
                {t("settingsPage.deviceDataDescription")}
              </div>
              <div className="flex gap-2 flex-wrap pl-11">
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "#E7F3E8", color: "#2D8A3E" }}
                >
                  {t("settingsPage.deviceDataTag1")}
                </span>
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "#F0E9FF", color: "#7B2FF7" }}
                >
                  {t("settingsPage.deviceDataTag2")}
                </span>
              </div>
            </div>

            <SettingsRow
              icon={Lock}
              iconColor="#1877F2"
              label={t("settingsPage.privacyPolicy")}
              href="/privacy"
            />
            <SettingsRow
              icon={ExternalLink}
              iconColor="#65676B"
              label={t("settingsPage.termsOfService")}
              href="/terms"
              noBorder
            />
          </motion.div>
        </div>

        {/* ══ 3. NOTIFICATIONS ══ */}
        <div>
          <SectionHeader>🔔 {t("settingsPage.notifications")}</SectionHeader>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}
          >
            {/* Push Notifications toggle */}
            <div
              className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: "1px solid #E4E6EB" }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "#FF6B0018" }}
              >
                <Bell className="w-4 h-4" style={{ color: "#FF6B00" }} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold" style={{ color: "#050505" }}>
                  {t("settingsPage.pushNotifications")}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#65676B" }}>
                  {t("settingsPage.notifMatchResults")}
                </div>
              </div>
              <button
                onClick={() => setNotifEnabled((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                  notifEnabled ? "bg-blue-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    notifEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* View all notifications */}
            <Link href="/notifications">
              <div className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50 active:bg-gray-100 cursor-pointer">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "#1877F218" }}
                >
                  <Bell className="w-4 h-4" style={{ color: "#1877F2" }} />
                </div>
                <div className="flex-1 text-sm font-semibold" style={{ color: "#050505" }}>
                  {t("settingsPage.viewAllNotifications")}
                </div>
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#65676B" }} />
              </div>
            </Link>
          </motion.div>
        </div>

        {/* ══ 4. LANGUAGE ══ */}
        <div>
          <SectionHeader>🌐 {t("settingsPage.language")}</SectionHeader>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}
          >
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "#1877F218" }}
              >
                <Globe className="w-4 h-4" style={{ color: "#1877F2" }} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold" style={{ color: "#050505" }}>
                  {t("settingsPage.appLanguage")}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#65676B" }}>
                  {t("settingsPage.appLanguageDesc")}
                </div>
              </div>
              <LanguageSelector
                current={(language as Language) ?? "en"}
                onChange={(lang: Language) => setLanguage(lang)}
              />
            </div>
          </motion.div>
        </div>

        {/* ══ 5. SECURITY ══ */}
        <div>
          <SectionHeader>🛡️ {t("settingsPage.securitySection")}</SectionHeader>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}
          >
            <div className="px-4 py-3.5" style={{ borderBottom: "1px solid #E4E6EB" }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "#7B2FF718" }}
                >
                  <Lock className="w-4 h-4" style={{ color: "#7B2FF7" }} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold" style={{ color: "#050505" }}>
                    {t("settingsPage.sessionSecurity")}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "#65676B" }}>
                    {t("settingsPage.sessionSecurityDesc")}
                  </div>
                </div>
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "#E7F3E8", color: "#2D8A3E" }}
                >
                  {t("settingsPage.secureLabel")}
                </span>
              </div>
            </div>
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "#2D8A3E18" }}
                >
                  <Shield className="w-4 h-4" style={{ color: "#2D8A3E" }} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold" style={{ color: "#050505" }}>
                    {t("settingsPage.antiCheatProtection")}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "#65676B" }}>
                    {t("settingsPage.antiCheatDesc")}
                  </div>
                </div>
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "#E7F3E8", color: "#2D8A3E" }}
                >
                  {t("settingsPage.activeLabel")}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ══ 6. APP INFO ══ */}
        <div>
          <SectionHeader>📱 {t("settingsPage.appInfoSection")}</SectionHeader>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}
          >
            {[
              { icon: Info,   color: "#1877F2", label: t("settingsPage.versionLabel"),   value: APP_VERSION },
              { icon: Globe,  color: "#65676B", label: t("settingsPage.platformLabel"),  value: "Pi Network" },
              { icon: Shield, color: "#2D8A3E", label: t("settingsPage.poweredByLabel"), value: "SkillLeague" },
            ].map((row, i, arr) => (
              <div
                key={row.label}
                className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderBottom: i < arr.length - 1 ? "1px solid #E4E6EB" : "none" }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${row.color}18` }}
                >
                  <row.icon className="w-4 h-4" style={{ color: row.color }} />
                </div>
                <span className="text-sm flex-1" style={{ color: "#65676B" }}>
                  {row.label}
                </span>
                <span className="text-sm font-semibold" style={{ color: "#050505" }}>
                  {row.value}
                </span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ══ 7. SUPPORT ══ */}
        <div>
          <SectionHeader>🆘 {t("settingsPage.supportSection")}</SectionHeader>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}
          >
            <SettingsRow
              icon={LifeBuoy}
              iconColor="#FF6B00"
              label={t("settingsPage.helpCenter")}
              sublabel={t("settingsPage.helpCenterDesc")}
              href="/community"
            />
            <SettingsRow
              icon={ExternalLink}
              iconColor="#1877F2"
              label={t("settingsPage.reportProblem")}
              sublabel={t("settingsPage.reportProblemDesc")}
              onClick={() => window.open("mailto:support@skillleague.app", "_blank")}
              noBorder
            />
          </motion.div>
        </div>

        {/* ══ 8. STORAGE / CLEAR CACHE ══ */}
        <div>
          <SectionHeader>🧹 {t("settingsPage.storageSection")}</SectionHeader>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}
          >
            <button
              onClick={handleClearCache}
              className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-orange-50 active:bg-orange-100 text-left"
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: cacheCleared ? "#E7F3E8" : "#FF6B0018" }}
              >
                {cacheCleared ? (
                  <CheckCircle2 className="w-4 h-4" style={{ color: "#2D8A3E" }} />
                ) : (
                  <Trash2 className="w-4 h-4" style={{ color: "#FF6B00" }} />
                )}
              </div>
              <div className="flex-1">
                <div
                  className="text-sm font-semibold"
                  style={{ color: cacheCleared ? "#2D8A3E" : "#050505" }}
                >
                  {cacheCleared ? t("settingsPage.cacheClearedTitle") : t("settingsPage.clearCache")}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#65676B" }}>
                  {cacheCleared ? t("settingsPage.cacheClearedDesc") : t("settingsPage.clearCacheDesc")}
                </div>
              </div>
              {!cacheCleared && (
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#65676B" }} />
              )}
            </button>
          </motion.div>
        </div>

        <p className="text-center text-xs pb-6" style={{ color: "#BEC3C9" }}>
          SkillLeague v{APP_VERSION} · Pi Network
        </p>
      </div>
    </div>
  );
}
