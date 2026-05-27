export interface PlayerData {
  trainingCoins: number;
  entryTokens: number;
  highScores: Record<string, number>;
  language: 'en' | 'ar';
}

const DEFAULT_DATA: PlayerData = {
  trainingCoins: 500,
  entryTokens: 20,
  highScores: {},
  language: 'en'
};

export const storage = {
  get: (): PlayerData => {
    try {
      const data = localStorage.getItem('player_data');
      if (data) return { ...DEFAULT_DATA, ...JSON.parse(data) };
    } catch(e) {}
    return DEFAULT_DATA;
  },
  save: (data: PlayerData) => {
    localStorage.setItem('player_data', JSON.stringify(data));
  }
};
