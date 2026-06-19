import type { Language } from "@/lib/i18n";

export async function translateBatch(texts: string[], _targetLang: Language): Promise<string[]> {
  return texts;
}

class TranslationService {
  async translate(text: string, _targetLang: Language): Promise<string> {
    return text;
  }

  async translateBatch(texts: string[], _targetLang: Language): Promise<string[]> {
    return texts;
  }
}

export const translationService = new TranslationService();
