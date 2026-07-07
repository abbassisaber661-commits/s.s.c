import { useState, useEffect } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ChevronRight, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { validateUsername } from "@/lib/anti-cheat";
import { LANGUAGES } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";

export const APP_VERSION = "1.1.0";

// ─── Theme helpers ──────────────────────────────────────────────────────────
const THEME_KEY = "sl_theme";

function getStoredTheme(): "dark" | "light" {
  try {
    return (localStorage.getItem(THEME_KEY) as "dark" | "light") || "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(theme: "dark" | "light") {
  const el = document.documentElement;
  el.classList.remove("dark", "light");
  el.classList.add(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
}

// ─── Privacy helpers ─────────────────────────────────────────────────────────
const PRIVACY_KEY = "sl_privacy";
interface PrivacySettings {
  privateAccount: boolean;
  showActivity: boolean;
}
function getPrivacy(): PrivacySettings {
  try {
    return JSON.parse(localStorage.getItem(PRIVACY_KEY) || "{}");
  } catch {
    return { privateAccount: false, showActivity: true };
  }
}
function savePrivacy(p: PrivacySettings) {
  try {
    localStorage.setItem(PRIVACY_KEY, JSON.stringify(p));
  } catch {}
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[11px] font-black uppercase tracking-widest px-1 mb-1.5 mt-5"
      style={{ color: "#8A8D91" }}
    >
      {children}
    </div>
  );
}

function Row({
  label,
  sub,
  right,
  onClick,
  danger,
  last,
}: {
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-black/5 active:bg-black/10 disabled:cursor-default"
      style={{
        borderBottom: last ? "none" : "1px solid #E4E6EB",
        textAlign: "left",
      }}
    >
      <div className="flex-1 min-w-0">
        <div
          className="text-sm font-semibold leading-snug"
          style={{ color: danger ? "#E41E3F" : "#050505" }}
        >
          {label}
        </div>
        {sub && (
          <div className="text-xs mt-0.5" style={{ color: "#65676B" }}>
            {sub}
          </div>
        )}
      </div>
      {right !== undefined ? (
        <div className="ml-3 shrink-0">{right}</div>
      ) : onClick ? (
        <ChevronRight className="w-4 h-4 ml-3 shrink-0" style={{ color: "#BEC3C9" }} />
      ) : null}
    </button>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative w-11 h-6 rounded-full transition-colors shrink-0"
      style={{ background: value ? "#1877F2" : "#BEC3C9" }}
      aria-checked={value}
      role="switch"
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: value ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Settings() {
  const { username, updateUsername, logout, language, setLanguage, authUser } = useGame();
  const [, setLocation] = useLocation();

  const [theme, setTheme] = useState<"dark" | "light">(getStoredTheme);
  const [privacy, setPrivacy] = useState<PrivacySettings>(() => {
    const stored = getPrivacy();
    return {
      privateAccount: stored.privateAccount ?? false,
      showActivity: stored.showActivity ?? true,
    };
  });

  const [showUsernameEdit, setShowUsernameEdit] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [draft, setDraft] = useState(username);
  const [nameError, setNameError] = useState<string | null>(null);
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [uidCopied, setUidCopied] = useState(false);

  // Sync draft when username changes externally
  useEffect(() => { setDraft(username); }, [username]);

  function handleThemeToggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  function handlePrivacyChange(key: keyof PrivacySettings, val: boolean) {
    const next = { ...privacy, [key]: val };
    setPrivacy(next);
    savePrivacy(next);
  }

  function handleSaveUsername() {
    const { valid, reason } = validateUsername(draft);
    if (!valid) {
      setNameError(reason ?? "Invalid username");
      return;
    }
    updateUsername(draft);
    setNameError(null);
    setUsernameSaved(true);
    setTimeout(() => {
      setUsernameSaved(false);
      setShowUsernameEdit(false);
    }, 1200);
  }

  function handleClearCache() {
    try {
      sessionStorage.clear();
      // Clear only cache-specific localStorage keys (NOT player data / auth)
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.includes("_cache") || k.includes("_feed_") || k.includes("_posts_"))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  }

  function handleLogout() {
    logout();
    setLocation("/");
  }

  function handleCopyUid() {
    const uid = authUser?.uid ?? "";
    if (!uid) return;

    const doFallback = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = uid;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setUidCopied(true);
        setTimeout(() => setUidCopied(false), 2000);
      } catch { /* ignore */ }
    };

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(uid)
        .then(() => {
          setUidCopied(true);
          setTimeout(() => setUidCopied(false), 2000);
        })
        .catch(doFallback);
    } else {
      doFallback();
    }
  }

  const currentLang = LANGUAGES.find(l => l.code === language);

  const BG = "#F0F2F5";
  const CARD = { background: "#FFFFFF", border: "1px solid #E4E6EB", borderRadius: "16px", overflow: "hidden" };

  return (
    <div className="min-h-screen pb-24" style={{ background: BG, color: "#050505" }}>

      {/* Header */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: "#FFFFFF", borderColor: "#E4E6EB", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
      >
        <button className="p-1.5 rounded-xl hover:bg-gray-100 active:scale-95 transition-transform" onClick={() => window.history.back()}>
          <ArrowLeft className="w-5 h-5" style={{ color: "#050505" }} />
        </button>
        <h1 className="text-lg font-black" style={{ color: "#050505" }}>الإعدادات</h1>
      </div>

      <div className="max-w-md mx-auto px-4">

        {/* ── ACCOUNT UID ───────────────────────────────────── */}
        <SectionLabel>الحساب</SectionLabel>
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} style={CARD}>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <span className="text-xs font-semibold" style={{ color: "#65676B" }}>معرّف المستخدم (UID)</span>
              <span
                className="text-sm font-mono font-bold truncate"
                style={{ color: "#050505", letterSpacing: "0.02em" }}
              >
                {authUser?.uid ?? "—"}
              </span>
            </div>
            <button
              onClick={handleCopyUid}
              disabled={!authUser?.uid}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0 ml-3 disabled:opacity-40"
              style={{
                background: uidCopied ? "#2D8A3E" : "#1877F2",
                color: "white",
                minWidth: 80,
                justifyContent: "center",
              }}
            >
              {uidCopied ? "✓ تم النسخ" : "نسخ UID"}
            </button>
          </div>
          {authUser?.authMode === "guest" && (
            <div
              className="mx-4 mb-3 px-3 py-2 rounded-xl text-xs"
              style={{ background: "rgba(99,102,241,0.08)", color: "#4f46e5", border: "1px solid rgba(99,102,241,0.15)" }}
            >
              🔒 وضع الضيف — UID مؤقت، لا يتم حفظه
            </div>
          )}
        </motion.div>

        {/* ── GENERAL ───────────────────────────────────────── */}
        <SectionLabel>عام</SectionLabel>
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} style={CARD}>
          <Link href="/profile-settings">
            <Row label="تعديل الملف الشخصي" sub="الصورة والغلاف والسيرة الذاتية" />
          </Link>
          <div>
            <Row
              label="تغيير اسم المستخدم"
              sub={"@" + username}
              onClick={() => setShowUsernameEdit(v => !v)}
              last={!showUsernameEdit}
            />
            {showUsernameEdit && (
              <div className="px-4 pb-4 space-y-2" style={{ borderBottom: "none" }}>
                <div className="flex gap-2">
                  <input
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    maxLength={20}
                    placeholder="اسم المستخدم الجديد"
                    className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                    style={{ background: "#F0F2F5", border: "1px solid #E4E6EB", color: "#050505" }}
                  />
                  <button
                    onClick={handleSaveUsername}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors"
                    style={{ background: usernameSaved ? "#2D8A3E" : "#1877F2" }}
                  >
                    {usernameSaved ? "✓" : "حفظ"}
                  </button>
                </div>
                {nameError && <p className="text-xs" style={{ color: "#E41E3F" }}>{nameError}</p>}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── APPEARANCE ────────────────────────────────────── */}
        <SectionLabel>المظهر</SectionLabel>
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={CARD}>
          {/* Dark / Light toggle */}
          <Row
            label={theme === "dark" ? "الوضع الداكن" : "الوضع الفاتح"}
            sub={theme === "dark" ? "انقر للتبديل إلى الفاتح" : "انقر للتبديل إلى الداكن"}
            right={<Toggle value={theme === "dark"} onChange={handleThemeToggle} />}
            onClick={handleThemeToggle}
          />

          {/* Language */}
          <div>
            <Row
              label="اللغة"
              sub={currentLang ? currentLang.native + " — " + currentLang.label : language}
              onClick={() => setShowLangPicker(v => !v)}
              last={!showLangPicker}
            />
            {showLangPicker && (
              <div className="pb-2" style={{ borderTop: "1px solid #E4E6EB" }}>
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => { setLanguage(lang.code as Language); setShowLangPicker(false); }}
                    className="w-full flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-gray-50 active:bg-gray-100"
                  >
                    <span className="text-sm font-semibold" style={{ color: lang.code === language ? "#1877F2" : "#050505" }}>
                      {lang.native}
                    </span>
                    <span className="text-xs" style={{ color: "#65676B" }}>{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── PRIVATE / PRIVACY ─────────────────────────────── */}
        <SectionLabel>الخصوصية</SectionLabel>
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={CARD}>
          <Row
            label="حساب خاص"
            sub="فقط المتابعون يمكنهم رؤية ملفك"
            right={
              <Toggle
                value={privacy.privateAccount}
                onChange={v => handlePrivacyChange("privateAccount", v)}
              />
            }
            onClick={() => handlePrivacyChange("privateAccount", !privacy.privateAccount)}
          />
          <Row
            label="إظهار حالة النشاط"
            sub="يمكن للآخرين رؤية متى كنت نشطاً"
            right={
              <Toggle
                value={privacy.showActivity}
                onChange={v => handlePrivacyChange("showActivity", v)}
              />
            }
            onClick={() => handlePrivacyChange("showActivity", !privacy.showActivity)}
            last
          />
        </motion.div>

        {/* ── DATA ──────────────────────────────────────────── */}
        <SectionLabel>البيانات</SectionLabel>
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={CARD}>
          <Row
            label={cacheCleared ? "تم المسح ✓" : "مسح ذاكرة التخزين المؤقت"}
            sub="يمسح البيانات المؤقتة فقط — لا يؤثر على تقدمك"
            onClick={handleClearCache}
          />
          <div
            className="flex items-center justify-between px-4 py-3.5"
          >
            <span className="text-sm" style={{ color: "#65676B" }}>إصدار التطبيق</span>
            <span className="text-sm font-semibold" style={{ color: "#050505" }}>{APP_VERSION}</span>
          </div>
        </motion.div>

        {/* ── SUPPORT ───────────────────────────────────────── */}
        <SectionLabel>الدعم</SectionLabel>
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={CARD}>
          <Link href="/privacy">
            <Row label="سياسة الخصوصية" />
          </Link>
          <Link href="/terms">
            <Row label="شروط الخدمة" last />
          </Link>
        </motion.div>

        {/* ── LOGOUT ────────────────────────────────────────── */}
        <div className="mt-5">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={CARD}>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-red-50 active:bg-red-100"
            >
              <LogOut className="w-4 h-4 shrink-0" style={{ color: "#E41E3F" }} />
              <span className="text-sm font-bold" style={{ color: "#E41E3F" }}>تسجيل الخروج</span>
            </button>
          </motion.div>
        </div>

        <p className="text-center text-xs mt-6 pb-6" style={{ color: "#BEC3C9" }}>
          S.S.C v{APP_VERSION}
        </p>

      </div>
    </div>
  );
}
