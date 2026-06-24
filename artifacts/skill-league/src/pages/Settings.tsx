// src/pages/Settings.tsx
import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Settings2, CheckCircle2, LogOut, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { validateUsername } from "@/lib/anti-cheat";
import { useTranslation } from "@/hooks/useTranslation"; // ✅ إضافة الترجمة

export const APP_VERSION = '1.1.0';

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-black uppercase tracking-widest px-1 mb-2" style={{ color: '#65676B' }}>
      {children}
    </div>
  );
}

export default function Settings() {
  const { t } = useTranslation(); // ✅ استخدم الترجمة
  const { username, updateUsername, logout } = useGame();
  const [, setLocation] = useLocation();

  const [draft, setDraft]               = useState(username);
  const [nameError, setNameError]       = useState<string | null>(null);
  const [saved, setSaved]               = useState(false);
  const [showUsernameEdit, setShowUsernameEdit] = useState(false);

  function handleSaveName() {
    const { valid, reason } = validateUsername(draft);
    if (!valid) { 
      setNameError(reason ?? t('settingsPage.usernameError')); 
      return; 
    }
    updateUsername(draft);
    setNameError(null);
    setSaved(true);
    setTimeout(() => { setSaved(false); setShowUsernameEdit(false); }, 1500);
  }

  function handleLogout() {
    logout();
    setLocation('/');
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: '#F0F2F5', color: '#050505' }}>

      {/* ── Header ── */}
      <div
        className="sticky top-0 z-20 border-b px-4 py-3 flex items-center gap-3"
        style={{ background: '#FFFFFF', borderColor: '#E4E6EB', boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}
      >
        <Link href="/">
          <button className="p-1.5 rounded-xl hover:bg-gray-100 active:scale-95 transition-transform">
            <ArrowLeft className="w-5 h-5" style={{ color: '#050505' }} />
          </button>
        </Link>
        <Settings2 className="w-5 h-5" style={{ color: '#1877F2' }} />
        <h1 className="text-lg font-black flex-1" style={{ color: '#050505' }}>
          {t('settingsPage.title')}
        </h1>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-5">

        {/* ══ 1. ACCOUNT ══ */}
        <div>
          <SectionHeader>{t('settingsPage.accountSection')}</SectionHeader>
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: '#FFFFFF', border: '1px solid #E4E6EB' }}
          >
            {/* Change Username */}
            <div style={{ borderBottom: '1px solid #E4E6EB' }}>
              <button
                onClick={() => setShowUsernameEdit(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50 active:bg-gray-100 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: '#050505' }}>
                    {t('settingsPage.changeUsername')}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#65676B' }}>
                    @{username}
                  </div>
                </div>
                <ChevronRight
                  className="w-4 h-4 shrink-0 transition-transform duration-200"
                  style={{ color: '#65676B', transform: showUsernameEdit ? 'rotate(90deg)' : 'none' }}
                />
              </button>
              {showUsernameEdit && (
                <div className="px-4 pb-4 space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      style={{ background: '#F0F2F5', border: '1px solid #E4E6EB', color: '#050505' }}
                      maxLength={20}
                      placeholder={t('settingsPage.usernamePlaceholder')}
                    />
                    <Button size="sm" onClick={handleSaveName} className="px-4">
                      {saved ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : t('common.save')}
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
              <div className="flex-1">
                <div className="text-sm font-semibold" style={{ color: '#E41E3F' }}>
                  {t('common.logout')}
                </div>
              </div>
              <LogOut className="w-4 h-4 shrink-0" style={{ color: '#E41E3F' }} />
            </button>
          </motion.div>
        </div>

        {/* ══ 2. PRIVACY & LEGAL ══ */}
        <div>
          <SectionHeader>{t('settingsPage.privacySection')}</SectionHeader>
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: '#FFFFFF', border: '1px solid #E4E6EB' }}
          >
            {/* Device Data */}
            <div className="px-4 py-3.5" style={{ borderBottom: '1px solid #E4E6EB' }}>
              <div className="text-sm font-semibold mb-1" style={{ color: '#050505' }}>
                {t('settingsPage.deviceDataTitle')}
              </div>
              <div className="text-xs leading-relaxed mb-2" style={{ color: '#65676B' }}>
                {t('settingsPage.deviceDataDescription')}
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#E7F3E8', color: '#2D8A3E' }}>
                  {t('settingsPage.deviceDataTag1')}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#F0E9FF', color: '#7B2FF7' }}>
                  {t('settingsPage.deviceDataTag2')}
                </span>
              </div>
            </div>

            {/* Privacy Policy */}
            <Link href="/privacy">
              <div
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
                style={{ borderBottom: '1px solid #E4E6EB' }}
              >
                <div className="flex-1 text-sm font-semibold" style={{ color: '#1877F2' }}>
                  {t('settingsPage.privacyPolicy')}
                </div>
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#65676B' }} />
              </div>
            </Link>

            {/* Terms of Service */}
            <Link href="/terms">
              <div className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50 active:bg-gray-100 cursor-pointer">
                <div className="flex-1 text-sm font-semibold" style={{ color: '#1877F2' }}>
                  {t('settingsPage.termsOfService')}
                </div>
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#65676B' }} />
              </div>
            </Link>
          </motion.div>
        </div>

        {/* ══ 3. APP INFO ══ */}
        <div>
          <SectionHeader>{t('settingsPage.appInfoSection')}</SectionHeader>
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: '#FFFFFF', border: '1px solid #E4E6EB' }}
          >
            {[
              { label: t('settingsPage.versionLabel'),    value: APP_VERSION },
              { label: t('settingsPage.platformLabel'),   value: 'Pi Network' },
              { label: t('settingsPage.poweredByLabel'), value: 'SkillLeague / Pi Network' },
            ].map((row, i, arr) => (
              <div
                key={row.label}
                className="flex items-center justify-between px-4 py-3.5"
                style={{ borderBottom: i < arr.length - 1 ? '1px solid #E4E6EB' : 'none' }}
              >
                <span className="text-sm" style={{ color: '#65676B' }}>{row.label}</span>
                <span className="text-sm font-semibold" style={{ color: '#050505' }}>{row.value}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <p className="text-center text-xs pb-6" style={{ color: '#BEC3C9' }}>
          SkillLeague · Powered by Pi Network
        </p>

      </div>
    </div>
  );
}