// src/hooks/useTranslation.ts
// ============================================================
// Hook مخصص للترجمة – يدمج الترجمة الثابتة (i18n) والديناميكية (API)
// ============================================================

import { useCallback, useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { getTranslation, type TranslationKey, type Language, isRTL, LANGUAGES } from "@/lib/i18n";
import { translationService } from "@/services/translate.service";

interface UseTranslationReturn {
  /** اللغة الحالية */
  currentLanguage: Language;
  /** تغيير اللغة */
  changeLanguage: (lang: Language) => void;
  /** ترجمة مفتاح ثابت (من ملف i18n) */
  t: (key: TranslationKey) => string;
  /** ترجمة نص ديناميكي (محتوى المستخدم) مع Cache */
  translate: (text: string, targetLang?: Language) => Promise<string>;
  /** ترجمة مجموعة نصوص دفعة واحدة مع Cache */
  translateBatch: (texts: string[], targetLang?: Language) => Promise<string[]>;
  /** هل اللغة RTL */
  isRTL: boolean;
  /** قائمة اللغات المدعومة */
  languages: typeof LANGUAGES;
}

/**
 * Hook رئيسي للترجمة في التطبيق
 * يستخدم اللغة من GameContext ويدمج الترجمة الثابتة والديناميكية
 */
export function useTranslation(): UseTranslationReturn {
  const { language, setLanguage } = useGame();

  // ===== اللغة الحالية =====
  const currentLanguage = language as Language;

  // ===== تغيير اللغة =====
  const changeLanguage = useCallback(
    (lang: Language) => {
      setLanguage(lang);
      // يمكن إضافة أي تأثيرات جانبية مثل إعادة تحميل المحتوى
    },
    [setLanguage]
  );

  // ===== ترجمة النصوص الثابتة =====
  const t = useCallback(
    (key: TranslationKey): string => {
      return getTranslation(currentLanguage, key);
    },
    [currentLanguage]
  );

  // ===== ترجمة نص ديناميكي (مع Cache) =====
  const translate = useCallback(
    async (text: string, targetLang: Language = currentLanguage): Promise<string> => {
      if (!text) return text;
      if (targetLang === 'en') return text; // الإنجليزية هي اللغة الأساسية

      // استخدام الخدمة مع Cache داخلي
      return translationService.translate(text, targetLang);
    },
    [currentLanguage]
  );

  // ===== ترجمة دفعة من النصوص (مع Cache) =====
  const translateBatch = useCallback(
    async (texts: string[], targetLang: Language = currentLanguage): Promise<string[]> => {
      if (!texts || texts.length === 0) return texts;
      if (targetLang === 'en') return texts;

      return translationService.translateBatch(texts, targetLang);
    },
    [currentLanguage]
  );

  // ===== هل اللغة RTL =====
  const rtl = useMemo(() => isRTL(currentLanguage), [currentLanguage]);

  // ===== قائمة اللغات =====
  const languages = useMemo(() => LANGUAGES, []);

  return {
    currentLanguage,
    changeLanguage,
    t,
    translate,
    translateBatch,
    isRTL: rtl,
    languages,
  };
}

/**
 * Hook مختصر للترجمة الثابتة فقط (للأداء عندما لا نحتاج الترجمة الديناميكية)
 */
export const useAppTranslation = useTranslation;

export function useStaticTranslation() {
  const { language } = useGame();
  const currentLanguage = language as Language;
  const t = useCallback(
    (key: TranslationKey) => getTranslation(currentLanguage, key),
    [currentLanguage]
  );
  return { t, currentLanguage };
}