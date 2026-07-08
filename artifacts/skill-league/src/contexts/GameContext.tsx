import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useDbSync } from "../lib/useDbSync";
import { PlayerData, storage } from "../lib/storage";
import { PiUser, getCachedPiUser, loginWithPi, cachePiUser, cachePiAccountName } from "../lib/pi-auth";
import { validateUsername } from "../lib/anti-cheat";
import {
  AuthUser, loadAuthUser, isGuestUser,
  saveAuthUser, clearAuthUser,
  createGoogleUser, createGuestUser, createPiUser, createDevUser,
} from "../lib/auth";
import { Language } from "../lib/i18n";
import { getActiveLockTier } from "../lib/pi-lock";
import { startSession, endSession, trackPageView } from "../lib/sessionTracker";
import { api, setToken, setStoredPlayerId } from "../lib/apiClient";
import { IS_DEV_MODE, DEV_USER_ID, DEV_USERNAME } from "../lib/devMode";

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
  /** Set Pi auth state directly (used after subscription payment completes). */
  setAuthFromPi: (uid: string, username: string) => void;

  setLanguage: (lang: Language) => void;
  /**
   * The single canonical username-edit path (rule: exactly ONE editable
   * username field app-wide). Validates the format, persists to the backend
   * (source of truth), then updates both the local player cache and the
   * auth user so every consumer stays in sync.
   */
  updateUsername: (name: string) => Promise<{ success: boolean; reason?: string }>;

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
  // USERNAME (single canonical edit path — see GameState.updateUsername doc)
  // =========================
  const updateUsername = async (name: string): Promise<{ success: boolean; reason?: string }> => {
    const { valid, reason } = validateUsername(name || "");
    if (!valid) return { success: false, reason };

    const finalName = name.trim();
    const playerId = authUser?.uid;

    if (playerId) {
      try {
        await api.players.sync(playerId, { username: finalName });
      } catch (err: any) {
        const reason = err?.message || "Failed to update username";
        return { success: false, reason };
      }
    }

    persist({ ...data, username: finalName });
    if (authUser) {
      const updatedAuth = { ...authUser, username: finalName };
      saveAuthUser(updatedAuth);
      setAuthUser(updatedAuth);
    }
    return { success: true };
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
    persist({ ...data, username: user.username });
  };

  /**
   * Full server-authoritative Pi authentication flow:
   *
   *  1. ensurePiInitialized() — awaits Pi.init() (shared promise, no-op if
   *     already done via startPiAutoInit() at boot).
   *  2. Pi.authenticate(["username"]) — opens Pi wallet dialog (or silently
   *     resolves in Pi Browser when permissions were already granted).
   *     Scope: "username" only — no payments scope needed here.
   *  3. POST /api/auth/pi { accessToken }
   *     Backend verifies by calling:
   *       GET https://api.minepi.com/v2/me
   *       Authorization: Bearer <accessToken>
   *     Only data returned by the server is trusted — frontend user data
   *     from Pi SDK is NEVER used as the authoritative identity.
   *  4. Backend creates/gets player, signs JWT, returns { token, player }.
   *  5. JWT + playerId stored locally; auth state set from backend record.
   *
   * No Pi Network API key is required for this flow.
   *
   * Throws on SDK failure, user cancellation, or backend verification error
   * so callers (auto-auth, manual button) can handle each case.
   */
  const loginWithPiNetwork = async () => {
    // Step 1 + 2: SDK init is already underway (startPiAutoInit at boot);
    //             loginWithPi() awaits ensurePiInitialized() then calls
    //             Pi.authenticate(["username"]).
    //             loginWithPi() throws (never returns null) with a typed
    //             PiAuthErrorCode message: pi_sdk_unavailable, pi_auth_cancelled,
    //             or pi_auth_timeout — let it propagate to the caller.
    const result = await loginWithPi();

    // Step 3: forward token to backend for server-side /v2/me verification.
    // IMPORTANT: we do NOT use result.user.uid / result.user.username here —
    // those come from the frontend (Pi SDK) and are untrusted. The backend
    // derives the authoritative uid/username from /v2/me independently.
    let authResp: { token: string; player: { id: string; username: string; piUid?: string }; piUsername?: string };
    try {
      authResp = await api.auth.pi(result.accessToken);
    } catch (err) {
      console.error("[Pi] Backend token verification failed", err);
      throw new Error("pi_verify_failed");
    }

    // Step 4: store JWT + internal player ID for authenticated API calls.
    setToken(authResp.token);
    setStoredPlayerId(authResp.player.id);

    // Step 5: set auth state using ONLY backend-verified data.
    //
    // SECURITY: we MUST use the piUid returned by the backend, which derived
    // it exclusively from GET /v2/me using the access token.  We must NOT
    // fall back to result.user.uid from the Pi SDK (frontend-supplied).
    // If the backend doesn't return piUid, the verification chain is broken —
    // abort rather than silently degrade to unverified frontend data.
    const verifiedPiUid = authResp.player.piUid;
    if (!verifiedPiUid) {
      console.error("[Pi] Backend did not return piUid — aborting to preserve server-authoritative identity");
      throw new Error("pi_verify_failed");
    }
    const verifiedUsername = authResp.player.username;

    const piUser: PiUser = { uid: verifiedPiUid, username: verifiedUsername };
    cachePiUser(piUser);
    setUser(piUser);

    const authU = createPiUser(verifiedPiUid, verifiedUsername);
    saveAuthUser(authU);
    setAuthUser(authU);

    // Public identity (`data.username`, denormalized into posts/comments at
    // write-time) must match the backend's `player.username` — which is
    // either the persisted custom username or, on first registration, the
    // Pi name. It is never re-derived from the live Pi account name here.
    persist({ ...data, username: verifiedUsername });

    // Cache the LIVE Pi account name separately, purely for read-only
    // display in the owner's own profile info (never public identity).
    if (authResp.piUsername) {
      cachePiAccountName(verifiedPiUid, authResp.piUsername);
    }
  };

  /**
   * Set Pi auth state directly — called by SubscriptionPage after a payment
   * completes. The Pi access token has already been validated by the backend
   * and the JWT is already stored in localStorage. This just updates React state.
   */
  const setAuthFromPi = (uid: string, username: string) => {
    const piUser: PiUser = { uid, username };
    cachePiUser(piUser);
    setUser(piUser);
    const authU = createPiUser(uid, username);
    saveAuthUser(authU);
    setAuthUser(authU);
    persist({ ...data, username });
  };

  const loginAsGuest = () => {
    const user = createGuestUser();
    saveAuthUser(user);
    setAuthUser(user);
    persist({ ...data, username: user.username });
  };

  /**
   * Replit Development Mode ONLY (see `lib/devMode.ts` — gated by
   * `import.meta.env.DEV`, which is permanently false in production
   * builds). Auto-signs-in a temporary local player by reusing the
   * existing `/api/auth/guest` backend route — no new backend surface,
   * no change to Pi auth, payments, subscriptions, DB, OWNER_UID, or
   * JWT_SECRET. Marks the resulting session with authMode 'dev' so
   * AppRoot can skip the subscription gate ONLY while IS_DEV_MODE is true.
   */
  const loginAsDevUser = async () => {
    try {
      const authResp = await api.auth.guest(DEV_USER_ID, DEV_USERNAME);
      setToken(authResp.token);
      setStoredPlayerId(authResp.player.id);
      const authU = createDevUser(authResp.player.id, authResp.player.username);
      saveAuthUser(authU);
      setAuthUser(authU);
      persist({ ...data, username: authResp.player.username });
    } catch (err) {
      console.error("[DevMode] auto sign-in failed", err);
    }
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

  // ── Auto Pi authentication — DISABLED ────────────────────────────────────
  // Previously this effect fired Pi.authenticate() automatically on mount,
  // with no user gesture. Pi Browser's native bridge does not reliably
  // resolve/reject an authenticate() call that wasn't triggered by a real
  // tap — it can hang indefinitely. Because loginWithPi() shares a single
  // in-flight promise across all callers (by design, to prevent duplicate
  // concurrent SDK calls), a hung gesture-less auto attempt would also
  // block/starve a subsequent manual "Sign in with Pi" tap, since the
  // manual click would just await the same stuck promise instead of
  // starting its own gesture-backed call. That was the root cause of the
  // "Authentication timed out" errors.
  //
  // Fix: auto sign-in is disabled. The manual "Sign in with Pi" button
  // (a genuine user gesture) is now the sole entry point for Pi
  // authentication, guaranteeing only one, gesture-backed request is ever
  // active. The ref flag / effect are kept as an inert hook so this can be
  // safely re-enabled later behind a gesture-aware guard if needed.
  const autoAuthAttempted = useRef(false);

  useEffect(() => {
    autoAuthAttempted.current = true; // no-op: auto-auth intentionally disabled
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — must run once on mount only

  // ── Development Mode auto sign-in — Replit dev environment ONLY ─────────
  // IS_DEV_MODE is baked to `false` in every production build (see
  // `lib/devMode.ts`), so this effect is fully inert outside the Replit
  // dev workflow. It never runs if the user already has any session
  // (Pi, guest, or a previously-created dev session).
  const devAutoLoginAttempted = useRef(false);

  useEffect(() => {
    if (!IS_DEV_MODE) return;
    if (authUser) return;
    if (devAutoLoginAttempted.current) return;
    devAutoLoginAttempted.current = true;
    loginAsDevUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]);

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
        setAuthFromPi,

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
