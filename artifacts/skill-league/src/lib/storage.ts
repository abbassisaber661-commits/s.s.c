import type { Language } from './i18n';
import { detectBrowserLanguage } from './i18n';

export interface PlayerData {
  trainingCoins: number;
  entryTokens: number;
  highScores: Record<string, number>;
  language: Language;
}

function getDefaultLanguage(): Language {
  try {
    const data = localStorage.getItem('player_data');
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.language) return parsed.language as Language;
    }
  } catch {
    // ignore
  }
  return detectBrowserLanguage();
}

const BASE_DEFAULTS: Omit<PlayerData, 'language'> = {
  trainingCoins: 500,
  entryTokens: 20,
  highScores: {},
};

export const storage = {
  get: (): PlayerData => {
    try {
      const data = localStorage.getItem('player_data');
      if (data) {
        return {
          ...BASE_DEFAULTS,
          language: getDefaultLanguage(),
          ...JSON.parse(data),
        };
      }
    } catch {
      // ignore
    }
    return { ...BASE_DEFAULTS, language: getDefaultLanguage() };
  },
  save: (data: PlayerData) => {
    localStorage.setItem('player_data', JSON.stringify(data));
  },
};
