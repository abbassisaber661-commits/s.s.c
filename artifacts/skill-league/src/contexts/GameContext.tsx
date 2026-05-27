import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { PlayerData, storage } from '../lib/storage';
import { PiUser, getCurrentUser, loginWithPi, logoutPi } from '../lib/pi-auth';
import { Language } from '../lib/i18n';

interface GameState extends PlayerData {
  user: PiUser | null;
  login: () => Promise<void>;
  logout: () => void;
  setLanguage: (lang: Language) => void;
  updateCurrency: (coins: number, tokens: number) => void;
  updateHighScore: (league: string, score: number) => void;
  lastScore: number;
  lastAccuracy: number;
  lastCoinsEarned: number;
  lastTokensEarned: number;
  setLastResult: (score: number, accuracy: number, coins: number, tokens: number) => void;
}

const GameContext = createContext<GameState | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PlayerData>(storage.get());
  const [user, setUser] = useState<PiUser | null>(getCurrentUser());
  
  const [lastScore, setScore] = useState(0);
  const [lastAccuracy, setAccuracy] = useState(0);
  const [lastCoinsEarned, setCoinsEarned] = useState(0);
  const [lastTokensEarned, setTokensEarned] = useState(0);

  useEffect(() => {
    document.documentElement.dir = data.language === 'ar' ? 'rtl' : 'ltr';
  }, [data.language]);

  useEffect(() => {
    loginWithPi().then((u) => {
      if (u) setUser(u);
    });
  }, []);

  const login = async () => {
    const user = await loginWithPi();
    if (user) setUser(user);
  };

  const logout = () => {
    logoutPi();
    setUser(null);
  };

  const setLanguage = (lang: Language) => {
    const newData = { ...data, language: lang };
    setData(newData);
    storage.save(newData);
  };

  const updateCurrency = (coins: number, tokens: number) => {
    const newData = { 
      ...data, 
      trainingCoins: Math.max(0, data.trainingCoins + coins), 
      entryTokens: Math.max(0, data.entryTokens + tokens) 
    };
    setData(newData);
    storage.save(newData);
  };

  const updateHighScore = (league: string, score: number) => {
    if ((data.highScores[league] || 0) < score) {
      const newData = { ...data, highScores: { ...data.highScores, [league]: score } };
      setData(newData);
      storage.save(newData);
    }
  };

  const setLastResult = (score: number, accuracy: number, coins: number, tokens: number) => {
    setScore(score);
    setAccuracy(accuracy);
    setCoinsEarned(coins);
    setTokensEarned(tokens);
  };

  return (
    <GameContext.Provider value={{ 
      ...data, 
      user, 
      login, 
      logout, 
      setLanguage, 
      updateCurrency, 
      updateHighScore,
      lastScore,
      lastAccuracy,
      lastCoinsEarned,
      lastTokensEarned,
      setLastResult
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}
