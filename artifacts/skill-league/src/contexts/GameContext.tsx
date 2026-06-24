import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import { useDbSync } from "../lib/useDbSync";
import { PlayerData, storage } from "../lib/storage";

import {
  PiUser,
  getCachedPiUser,
  loginWithPi,
  cachePiUser,
} from "../lib/pi-auth";

import {
  AuthUser,
  loadAuthUser,
  isGuestUser,
  saveAuthUser,
  clearAuthUser,
  createGoogleUser,
  createGuestUser,
  createPiUser,
} from "../lib/auth";

import { Language } from "../lib/i18n";

import { startSession, endSession, trackPageView } from "../lib/sessionTracker";

// 🟢 ADD THESE IMPORTS (IMPORTANT FIX)
import { leaderboard } from "@/lib/leaderboard";
import { seasonManager } from "@/lib/seasons";
import { updateMatchResult } from "@/lib/player-profile-system";

interface GameState extends PlayerData {
  user: PiUser | null;
  authUser: AuthUser | null;
  isGuest: boolean;
  isAuthenticated: boolean;

  login: () => Promise<void>;
  logout: () => void;
  loginWithGoogle: (name: string, email: string) => Promise<void>;
  loginWithPiNetwork: () => Promise<void>;
  loginAsGuest: () => void;

  setLanguage: (lang: Language) => void;
  updateUsername: (name: string) => void;

  setGameMode: (mode: "questions" | "puzzle" | "result") => void;
  resetMatch: () => void;

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

  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;

  toggleSound: () => void;
  toggleVibration: () => void;

  currentQuestionSet: string[];
  usedQuestions: string[];
}

const GameContext = createContext<GameState | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PlayerData>(storage.get());
  const [user, setUser] = useState<PiUser | null>(getCachedPiUser());
  const [authUser, setAuthUser] = useState<AuthUser | null>(loadAuthUser());

  const [gameMode, setGameMode] =
    useState<"questions" | "puzzle" | "result">("questions");

  const [usedQuestions, setUsedQuestions] = useState<string[]>([]);
  const [currentQuestionSet, setCurrentQuestionSet] = useState<string[]>([]);

  const persist = (d: PlayerData) => {
    setData(d);
    storage.save(d);
  };

  // =========================
  // RESET MATCH
  // =========================
  const resetMatch = () => {
    setGameMode("questions");
    setUsedQuestions([]);
    setCurrentQuestionSet([]);
  };

  // =========================
  // COINS SAFE FIX
  // =========================
  const addCoins = (amount: number) => {
    persist({
      ...data,
      coins: (data.coins ?? 0) + amount,
    });
  };

  const spendCoins = (amount: number) => {
    if ((data.coins ?? 0) < amount) return false;

    persist({
      ...data,
      coins: (data.coins ?? 0) - amount,
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
  // USERNAME
  // =========================
  const updateUsername = (name: string) => {
    persist({
      ...data,
      username: name?.trim() || "Player",
    });
  };

  // =========================
  // 🔥 FIXED MATCH SYSTEM (IMPORTANT)
  // =========================
  const recordMatch = (
    leagueId: string,
    score: number,
    accuracy: number,
    streak: number,
    correct: number
  ) => {
    const win = score > 50;

    // 🟢 update player profile system
    const updatedProfile = updateMatchResult(
      {
        id: authUser?.uid ?? "guest",
        username: data.username,
        points: data.points ?? 0,
        xp: data.xp ?? 0,
        level: data.level ?? 1,
        tier: data.tier ?? "training",
        gamesPlayed: data.gamesPlayed ?? 0,
        wins: data.wins ?? 0,
        losses: data.losses ?? 0,
      },
      win,
      score,
      score
    );

    // 🟢 sync leaderboard
    leaderboard.upsert(updatedProfile);

    // 🟢 sync seasons
    seasonManager.updateStats(
      updatedProfile.id,
      score,
      win
    );

    persist({
      ...data,
      lastScore: score,
      lastAccuracy: accuracy,
      lastStreak: streak,
      xp: updatedProfile.xp,
      points: updatedProfile.points,
      level: updatedProfile.level,
      tier: updatedProfile.tier,
    });

    setUsedQuestions((prev) => [...prev, leagueId]);
  };

  // =========================
  // PVP FIXED
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
      coins: (data.coins ?? 0) + coinsEarned,
      xp: (data.xp ?? 0) + xpGain,
      elo: (data.elo ?? 0) + (eloChange ?? (won ? 10 : -5)),
    });
  };

  // =========================
  // AUTH (UNCHANGED SAFE)
  // =========================
  const login = async () => {};

  const loginWithGoogle = async (name: string, email: string) => {
    const u = createGoogleUser(name, email);
    saveAuthUser(u);
    setAuthUser(u);
  };

  const loginWithPiNetwork = async () => {
    const result = await loginWithPi();
    if (result?.user) {
      cachePiUser(result.user);
      setUser(result.user);
      const authU = createPiUser(
        result.user.uid,
        result.user.username
      );
      saveAuthUser(authU);
      setAuthUser(authU);
    }
  };

  const loginAsGuest = () => {
    const u = createGuestUser();
    saveAuthUser(u);
    setAuthUser(u);
  };

  const logout = () => {
    clearAuthUser();
    setAuthUser(null);
    setUser(null);
  };

  const isGuest = isGuestUser(authUser);
  const isAuthenticated = !!authUser;

  useDbSync(data, authUser);

  useEffect(() => {
    startSession();
    return () => endSession(authUser?.uid ?? null);
  }, []);

  useEffect(() => {
    if (authUser?.uid) {
      trackPageView(authUser.uid, "app_open");
    }
  }, [authUser?.uid]);

  return (
    <GameContext.Provider
      value={{
        ...data,
        user,
        authUser,
        isGuest,
        isAuthenticated,

        login,
        logout,
        loginWithGoogle,
        loginWithPiNetwork,
        loginAsGuest,

        setGameMode,
        resetMatch,

        recordMatch,
        recordPvpResult,

        addCoins,
        spendCoins,

        updateUsername,
        setLanguage,

        toggleSound: () => {},
        toggleVibration: () => {},

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