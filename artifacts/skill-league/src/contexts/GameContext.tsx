import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useDbSync } from "../lib/useDbSync";
import { PlayerData, storage } from "../lib/storage";
import { PiUser, getCachedPiUser, loginWithPi, cachePiUser } from "../lib/pi-auth";
import {
  AuthUser, loadAuthUser, isGuestUser,
  saveAuthUser, clearAuthUser,
  createGoogleUser, createGuestUser, createPiUser,
} from "../lib/auth";
import { Language } from "../lib/i18n";
import { getActiveLockTier } from "../lib/pi-lock";
import { startSession, endSession, trackPageView } from "../lib/sessionTracker";

interface GameState extends PlayerData {
  user: PiUser | null;
  authUser: AuthUser | null;
  isGuest: boolean;
  isAuthenticated: boolean;

  // Core Actions
  login: () => Promise<void>;
  logout: () => void;
  loginWithGoogle: (name: string, email: string) => Promise<void>;
  loginWithPiNetwork: () => Promise<void>;
  loginAsGuest: () => void;

  setLanguage: (lang: Language) => void;
  updateUsername: (name: string) => void;

  // Game Flow (IMPORTANT FIX)
  setGameMode: (mode: "questions" | "puzzle" | "result") => void;
  resetMatch: () => void;

  // Match System (FIXED)
  recordMatch: (
    leagueId: string,
    score: number,
    accuracy: number,
    streak: number,
    correct: number
  ) => void;

  recordPvpResult: (
    won: boolean,
    opponentLevel: number,
    coinsEarned: number,
    eloChange?: number,
    xpOverride?: number
  ) => void;

  // Economy
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;

  // UI
  toggleSound: () => void;
  toggleVibration: () => void;

  // State safety
  currentQuestionSet: string[];
  usedQuestions: string[];
}

const GameContext = createContext<GameState | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PlayerData>(storage.get());
  const [user, setUser] = useState<PiUser | null>(getCachedPiUser());
  const [authUser, setAuthUser] = useState<AuthUser | null>(loadAuthUser());

  // =========================
  // GAME FLOW STATE (FIX #1)
  // =========================
  const [gameMode, setGameMode] = useState<"questions" | "puzzle" | "result">("questions");

  // =========================
  // QUESTION SYSTEM (FIX #2)
  // =========================
  const [usedQuestions, setUsedQuestions] = useState<string[]>([]);
  const [currentQuestionSet, setCurrentQuestionSet] = useState<string[]>([]);

  const persist = (d: PlayerData) => {
    setData(d);
    storage.save(d);
  };

  // =========================
  // RESET MATCH (FIX FLOW)
  // =========================
  const resetMatch = () => {
    setGameMode("questions"); // 🔥 يبدأ دائماً بالأسئلة
    setUsedQuestions([]);
    setCurrentQuestionSet([]);
  };

  // =========================
  // ADD COINS
  // =========================
  const addCoins = (amount: number) => {
    persist({
      ...data,
      coins: (data.coins || 0) + amount,
    });
  };

  // =========================
  // SPEND COINS
  // =========================
  const spendCoins = (amount: number) => {
    if ((data.coins || 0) < amount) return false;

    persist({
      ...data,
      coins: data.coins - amount,
    });

    return true;
  };

  // =========================
  // LANGUAGE
  // =========================
  const setLanguage = (lang: Language) => {
    persist({ ...data, language: lang });
  };

  // =========================
  // USERNAME FIX (LEADERBOARD FIX)
  // =========================
  const updateUsername = (name: string) => {
    const finalName = name?.trim() || "Player";

    persist({
      ...data,
      username: finalName,
    });
  };

  // =========================
  // MATCH SYSTEM FIXED
  // =========================
  const recordMatch = (
    leagueId: string,
    score: number,
    accuracy: number,
    streak: number,
    correct: number
  ) => {
    // ❗ IMPORTANT: لا إعادة للأسئلة
    const newUsed = [...usedQuestions];

    persist({
      ...data,
      lastScore: score,
      lastAccuracy: accuracy,
      lastStreak: streak,
    });

    setUsedQuestions(newUsed);
  };

  // =========================
  // PVP RESULT FIXED
  // =========================
  const recordPvpResult = (
    won: boolean,
    opponentLevel: number,
    coinsEarned: number,
    eloChange?: number,
    xpOverride?: number
  ) => {
    const xpGain = xpOverride ?? (won ? 50 : 10);

    persist({
      ...data,
      coins: data.coins + coinsEarned,
      xp: (data.xp || 0) + xpGain,
      elo: (data.elo || 0) + (eloChange ?? (won ? 10 : -5)),
    });
  };

  // =========================
  // TOGGLES
  // =========================
  const toggleSound = () => {
    persist({ ...data, sound: !data.sound });
  };

  const toggleVibration = () => {
    persist({ ...data, vibration: !data.vibration });
  };

  // =========================
  // AUTH FUNCTIONS
  // =========================
  const login = async () => {
    // legacy stub — does nothing on its own
  };

  const loginWithGoogle = async (name: string, email: string) => {
    const user = createGoogleUser(name, email);
    saveAuthUser(user);
    setAuthUser(user);
  };

  const loginWithPiNetwork = async () => {
    const result = await loginWithPi();
    if (result?.user) {
      cachePiUser(result.user);
      setUser(result.user);
      const authU = createPiUser(result.user.uid, result.user.username);
      saveAuthUser(authU);
      setAuthUser(authU);
    }
  };

  const loginAsGuest = () => {
    const user = createGuestUser();
    saveAuthUser(user);
    setAuthUser(user);
  };

  const logout = () => {
    clearAuthUser();
    setAuthUser(null);
    setUser(null);
  };

  // =========================
  // AUTH STATE
  // =========================
  const isGuest = isGuestUser(authUser);
  const isAuthenticated = !!authUser;

  useDbSync(data, authUser);

  useEffect(() => {
    startSession();
    return () => endSession(authUser?.uid ?? null);
  }, []);

  useEffect(() => {
    if (authUser?.uid) trackPageView(authUser.uid, "app_open");
  }, [authUser?.uid]);

  return (
    <GameContext.Provider
      value={{
        ...data,
        user,
        authUser,
        isGuest,
        isAuthenticated,

        // Auth
        login,
        logout,
        loginWithGoogle,
        loginWithPiNetwork,
        loginAsGuest,

        // Game Flow FIX
        setGameMode,
        resetMatch,

        // Match
        recordMatch,
        recordPvpResult,

        // Economy
        addCoins,
        spendCoins,

        // Profile
        updateUsername,
        setLanguage,

        // UI
        toggleSound,
        toggleVibration,

        // Questions FIX
        currentQuestionSet,
        usedQuestions,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}