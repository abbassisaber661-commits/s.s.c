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
    dnEarned: number,
    eloChange?: number,
    xpOverride?: number
  ) => void;

  // Economy (DN$ — internal gamification currency)
  addDN: (amount: number) => void;
  spendDN: (amount: number) => boolean;
  /** @deprecated use addDN */
  addCoins: (amount: number) => void;
  /** @deprecated use spendDN */
  spendCoins: (amount: number) => boolean;
  addFame: (amount: number) => void;
  setLastPostTime: (t: number) => void;
  unlockLeagueWithCoins: (leagueId: string) => boolean;

  // Store
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  purchaseItem: (item: any) => Promise<boolean>;

  // PiLock
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activatePiLock: (tier: any) => Promise<boolean>;

  // UI
  toggleSound: () => void;
  toggleVibration: () => void;

  // Tournament
  recordTournamentWin: (place: number, dn: number, xp: number) => void;

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
  // ADD DN$ / SPEND DN$
  // =========================
  const addDN = (amount: number) => {
    persist({ ...data, dnBalance: (data.dnBalance || 0) + amount });
  };
  const addCoins = addDN; // backward-compat alias

  const addFame = (amount: number) => {
    persist({ ...data, fame: (data.fame || 0) + amount });
  };

  const setLastPostTime = (t: number) => {
    persist({ ...data, lastPostTime: t });
  };

  const spendDN = (amount: number) => {
    if ((data.dnBalance || 0) < amount) return false;
    persist({ ...data, dnBalance: (data.dnBalance || 0) - amount });
    return true;
  };
  const spendCoins = spendDN; // backward-compat alias

  const LEAGUE_UNLOCK_COSTS: Record<string, number> = {
    coin: 50,
    pro: 200,
    champions: 500,
  };

  const purchaseItem = async (item: { id: string; name: string; price: number; [key: string]: unknown }): Promise<boolean> => {
    if ((data.dnBalance || 0) < item.price) return false;
    const already = data.ownedItems || [];
    if (already.includes(item.id)) return true;
    persist({ ...data, dnBalance: (data.dnBalance || 0) - item.price, ownedItems: [...already, item.id] });
    return true;
  };

  const activatePiLock = async (_tier: unknown): Promise<boolean> => {
    return false;
  };

  const recordTournamentWin = (place: number, dn: number, xp: number) => {
    persist({
      ...data,
      dnBalance: (data.dnBalance || 0) + dn,
      xp: (data.xp || 0) + xp,
      fame: (data.fame || 0) + Math.max(0, 3 - place),
    });
  };

  const unlockLeagueWithCoins = (leagueId: string): boolean => {
    // Leagues now unlocked via Pi payment — this is a legacy no-op stub
    const already = data.unlockedLeagues || ['training'];
    if (already.includes(leagueId)) return true;
    persist({ ...data, unlockedLeagues: [...already, leagueId] });
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
      bestStreak: Math.max(data.bestStreak || 0, streak),
    });

    setUsedQuestions(newUsed);
  };

  // =========================
  // PVP RESULT FIXED
  // =========================
  const recordPvpResult = (
    won: boolean,
    opponentLevel: number,
    dnEarned: number,
    eloChange?: number,
    xpOverride?: number
  ) => {
    const xpGain = xpOverride ?? (won ? 50 : 10);
    persist({
      ...data,
      dnBalance: (data.dnBalance || 0) + dnEarned,
      xp: (data.xp || 0) + xpGain,
      elo: (data.elo || 0) + (eloChange ?? (won ? 10 : -5)),
    });
  };

  // =========================
  // TOGGLES
  // =========================
  const toggleSound = () => {
    persist({ ...data, soundEnabled: !data.soundEnabled });
  };

  const toggleVibration = () => {
    persist({ ...data, vibrationEnabled: !data.vibrationEnabled });
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

        // Economy (DN$)
        addDN,
        spendDN,
        addCoins,
        spendCoins,
        addFame,
        setLastPostTime,
        unlockLeagueWithCoins,
        purchaseItem,
        activatePiLock,
        recordTournamentWin,

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