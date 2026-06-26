/**
 * GlobalTranslationButton
 * ───────────────────────
 * Single global 🌐 button for app-wide language switching.
 * Place once in the top-level layout — NOT inside posts or comments.
 * Uses existing i18n system from lib/i18n.ts.
 */
import React, { memo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGame } from "@/contexts/GameContext";

interface Language {
  code:   string;
  label:  string;
  native: string;
  dir:    "ltr" | "rtl";
  flag:   string;
}

const LANGUAGES: Language[] = [
  { code: "en",    label: "English",    native: "English",   dir: "ltr", flag: "🇺🇸" },
  { code: "ar",    label: "Arabic",     native: "العربية",   dir: "rtl", flag: "🇸🇦" },
  { code: "fr",    label: "French",     native: "Français",  dir: "ltr", flag: "🇫🇷" },
  { code: "es",    label: "Spanish",    native: "Español",   dir: "ltr", flag: "🇪🇸" },
  { code: "de",    label: "German",     native: "Deutsch",   dir: "ltr", flag: "🇩🇪" },
  { code: "pt",    label: "Portuguese", native: "Português", dir: "ltr", flag: "🇧🇷" },
  { code: "tr",    label: "Turkish",    native: "Türkçe",    dir: "ltr", flag: "🇹🇷" },
  { code: "zh",    label: "Chinese",    native: "中文",       dir: "ltr", flag: "🇨🇳" },
  { code: "ja",    label: "Japanese",   native: "日本語",     dir: "ltr", flag: "🇯🇵" },
  { code: "ko",    label: "Korean",     native: "한국어",     dir: "ltr", flag: "🇰🇷" },
  { code: "ru",    label: "Russian",    native: "Русский",   dir: "ltr", flag: "🇷🇺" },
  { code: "hi",    label: "Hindi",      native: "हिंदी",      dir: "ltr", flag: "🇮🇳" },
];

interface GlobalTranslationButtonProps {
  variant?: "icon" | "pill";
  className?: string;
}

export const GlobalTranslationButton = memo(({ variant = "icon", className }: GlobalTranslationButtonProps) => {
  const [open, setOpen]   = useState(false);
  const ctx = useGame() as any;
  const { language } = ctx;
  const setLanguage = ctx.setLanguage as ((lang: string) => void) | undefined;
  const ref = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === (language ?? "en")) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (lang: Language) => {
    setLanguage?.(lang.code as any);
    // Also update html dir for RTL support
    document.documentElement.dir  = lang.dir;
    document.documentElement.lang = lang.code;
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)} ref={ref}>
      {/* Trigger */}
      {variant === "pill" ? (
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold",
            "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
            "hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          )}
        >
          <Globe size={13} />
          <span>{currentLang.flag} {currentLang.native}</span>
        </button>
      ) : (
        <button
          onClick={() => setOpen((v) => !v)}
          title="Change language"
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
            "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
            "hover:bg-gray-100 dark:hover:bg-gray-800",
            open && "bg-blue-50 dark:bg-blue-900/20 text-blue-500"
          )}
        >
          <Globe size={18} />
        </button>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -6 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute right-0 top-full mt-2 z-[999] w-52",
              "bg-white dark:bg-gray-900 rounded-2xl shadow-2xl",
              "border border-gray-100 dark:border-gray-800 overflow-hidden",
              "max-h-80 overflow-y-auto"
            )}
          >
            <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Language
              </p>
            </div>
            {LANGUAGES.map((lang) => {
              const active = currentLang.code === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
                >
                  <span className="text-base">{lang.flag}</span>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm">{lang.native}</p>
                    <p className="text-[10px] text-gray-400">{lang.label}</p>
                  </div>
                  {active && <Check size={14} className="flex-shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

GlobalTranslationButton.displayName = "GlobalTranslationButton";
export default GlobalTranslationButton;
