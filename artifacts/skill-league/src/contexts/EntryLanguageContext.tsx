/**
 * Entry-flow language context.
 * Wraps IntroPage + SubscriptionPage so they share a single language state
 * that persists to localStorage and updates all text instantly.
 */
import { createContext, useContext, useState, ReactNode } from "react";
import { Language, LANGUAGES } from "@/lib/i18n";

const STORAGE_KEY = "sl_entry_lang";

interface EntryLanguageCtx {
  language: Language;
  setLanguage: (l: Language) => void;
  isRTL: boolean;
}

const Ctx = createContext<EntryLanguageCtx>({
  language: "en",
  setLanguage: () => {},
  isRTL: false,
});

function loadSaved(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (saved && LANGUAGES.some((l) => l.code === saved)) return saved;
  } catch {}
  return "en";
}

export function EntryLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLangState] = useState<Language>(loadSaved);

  const setLanguage = (l: Language) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  };

  return (
    <Ctx.Provider value={{ language, setLanguage, isRTL: language === "ar" }}>
      {children}
    </Ctx.Provider>
  );
}

export function useEntryLanguage(): EntryLanguageCtx {
  return useContext(Ctx);
}
