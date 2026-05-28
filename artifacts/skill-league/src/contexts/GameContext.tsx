import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { PlayerData, LeaderboardEntry, storage } from '../lib/storage';
import { PiUser, getCurrentUser, loginWithPi, logoutPi } from '../lib/pi-auth';
import { Language, isRTL } from '../lib/i18n';
import { LEAGUES, LeagueId, calculateReward } from '../lib/game-engine';
import { addLeaderboardEntry } from '../lib/progression';

interface GameState extends PlayerData {
  // Auth
  user: PiUser | null;
  login: () => Promise<void>;
  logout: () => void;
  // Settings
  setLanguage: (lang: Language) => void;
  updateUsername: (name: string) => void;
  // Progression
  recordMatch: (leagueId: string, score: number, accuracy: number, streak: number, correct: number) => void;
  unlockLeagueWithCoins: (leagueId: string) => boolean;
  // Last match (for Results screen)
  lastScore: number;
  lastAccuracy: number;
  lastCoinsEarned: number;
  lastStreak: number;
  lastCorrect: number;
  lastUnlockedLeague: string | null;
}

const GameContext = createContext<GameState | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PlayerData>(storage.get());
  const [user, setUser] = useState<PiUser | null>(getCurrentUser());

  const [lastScore,          setLScore]    = useState(0);
  const [lastAccuracy,       setLAccuracy] = useState(0);
  const [lastCoinsEarned,    setLCoins]    = useState(0);
  const [lastStreak,         setLStreak]   = useState(0);
  const [lastCorrect,        setLCorrect]  = useState(0);
  const [lastUnlockedLeague, setLUnlocked] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.dir  = isRTL(data.language) ? 'rtl' : 'ltr';
    document.documentElement.lang = data.language;
  }, [data.language]);

  useEffect(() => {
    loginWithPi().then(u => { if (u) setUser(u); });
  }, []);

  const persist = (newData: PlayerData) => { setData(newData); storage.save(newData); };

  const login  = async () => { const u = await loginWithPi(); if (u) setUser(u); };
  const logout = () => { logoutPi(); setUser(null); };

  const setLanguage    = (lang: Language) => persist({ ...data, language: lang });
  const updateUsername = (name: string)   => persist({ ...data, username: name.trim().slice(0, 20) || data.username });

  const recordMatch = (
    leagueId: string,
    score: number,
    accuracy: number,
    streak: number,
    correct: number,
  ) => {
    const config = LEAGUES[leagueId as LeagueId];
    if (!config) return;

    const earned  = calculateReward(config, score);
    const net     = earned - config.entryCost;

    const entry: LeaderboardEntry = {
      score, correct, streak, accuracy,
      date: new Date().toISOString(),
    };

    let newUnlocked = [...data.unlockedLeagues];
    let unlockedLeague: string | null = null;

    if (config.nextLeague) {
      const nextCfg = LEAGUES[config.nextLeague];
      if (score >= nextCfg.unlockScore && !newUnlocked.includes(config.nextLeague)) {
        newUnlocked = [...newUnlocked, config.nextLeague];
        unlockedLeague = config.nextLeague;
      }
    }

    const newData: PlayerData = {
      ...data,
      coins:          Math.max(0, data.coins + net),
      matchesPlayed:  data.matchesPlayed + 1,
      matchesWon:     data.matchesWon + (score > 0 ? 1 : 0),
      bestStreak:     Math.max(data.bestStreak, streak),
      highScores: {
        ...data.highScores,
        [leagueId]: Math.max(data.highScores[leagueId] ?? 0, score),
      },
      leaderboard:     addLeaderboardEntry(data.leaderboard, leagueId, entry),
      unlockedLeagues: newUnlocked,
    };

    persist(newData);
    setLScore(score);
    setLAccuracy(accuracy);
    setLCoins(earned);
    setLStreak(streak);
    setLCorrect(correct);
    setLUnlocked(unlockedLeague);
  };

  const unlockLeagueWithCoins = (leagueId: string): boolean => {
    const config = LEAGUES[leagueId as LeagueId];
    if (!config || config.unlockCoinsCost === 0) return false;
    if (data.coins < config.unlockCoinsCost) return false;
    if (data.unlockedLeagues.includes(leagueId)) return true;
    persist({
      ...data,
      coins: data.coins - config.unlockCoinsCost,
      unlockedLeagues: [...data.unlockedLeagues, leagueId],
    });
    return true;
  };

  return (
    <GameContext.Provider value={{
      ...data,
      user, login, logout,
      setLanguage, updateUsername,
      recordMatch, unlockLeagueWithCoins,
      lastScore, lastAccuracy, lastCoinsEarned,
      lastStreak, lastCorrect, lastUnlockedLeague,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
