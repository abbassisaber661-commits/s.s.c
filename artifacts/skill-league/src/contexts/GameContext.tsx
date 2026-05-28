import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { PlayerData, AchievementUnlock, LeaderboardEntry, TrophyUnlock, storage } from '../lib/storage';
import { PiUser, getCurrentUser, loginWithPi, logoutPi } from '../lib/pi-auth';
import { AuthUser, loadAuthUser, saveAuthUser, clearAuthUser, createGoogleUser, createGuestUser, createPiUser, isGuestUser } from '../lib/auth';
import { Language, isRTL } from '../lib/i18n';
import { LEAGUES, LeagueId, calculateReward } from '../lib/game-engine';
import { addLeaderboardEntry } from '../lib/progression';
import { calculateEloChange } from '../lib/elo';
import { checkNewAchievements, AchievementDef } from '../lib/achievements';
import { getDailyChallenges, isChallengeComplete, todayString } from '../lib/challenges';
import { xpForMatch, xpForPvpWin, levelFromXp, checkNewTrophies, TrophyStats } from '../lib/xp';
import {
  getWeekString, getWeeklyMissions, checkWeeklyCompletions,
  WeeklyChallengeState, WeeklyMissionType,
} from '../lib/weekly-challenges';
import { fameForPvpWin, fameForTournamentPlace, fameForLevelUp } from '../lib/fame';
import { getCurrentSeason } from '../lib/seasons';
import { recordSubmission, isScorePlausible, checkRateLimit } from '../lib/anti-cheat';
import { STORE_ITEMS, type StoreItem } from '../lib/store';
import type { PiLockTier } from '../lib/pi-lock';
import { checkVerification } from '../lib/verified';
import { addNotification, createLevelUpNotif, createTrophyNotif } from '../lib/messages';
import { addTransaction } from '../lib/wallet';
import type { VerificationLevel } from '../lib/verified';

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
  recordMatch: (leagueId: string, score: number, accuracy: number, streak: number, correct: number) => void;
  recordPvpResult: (won: boolean, opponentLevel: number, coinsEarned: number) => void;
  recordTournamentWin: (place: number, coinsReward: number, xpReward: number) => void;
  spendCoins: (amount: number) => boolean;
  addCoins: (amount: number) => void;
  unlockLeagueWithCoins: (leagueId: string) => boolean;
  addFame: (amount: number) => void;
  setLastPostTime: (ts: number) => void;
  purchaseItem: (item: StoreItem) => Promise<boolean>;
  activatePiLock: (tier: PiLockTier) => Promise<boolean>;
  isXpBoosted: () => boolean;
  toggleNotif: (type: 'match' | 'community' | 'trophy') => void;
  toggleSound: () => void;
  toggleVibration: () => void;
  setAvatarTheme: (id: string) => void;
  // Last match results
  lastScore: number;
  lastAccuracy: number;
  lastCoinsEarned: number;
  lastStreak: number;
  lastCorrect: number;
  lastUnlockedLeague: string | null;
  lastEloChange: number;
  lastNewAchievements: AchievementDef[];
  lastChallengesCompleted: string[];
  lastXpEarned: number;
  lastLevelUp: boolean;
  lastNewTrophies: TrophyUnlock[];
  lastWeeklyCompleted: string[];
}

const GameContext = createContext<GameState | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PlayerData>(storage.get());
  const [user, setUser] = useState<PiUser | null>(getCurrentUser());
  const [authUser, setAuthUser] = useState<AuthUser | null>(loadAuthUser());

  const [lastScore,               setLScore]     = useState(0);
  const [lastAccuracy,            setLAccuracy]  = useState(0);
  const [lastCoinsEarned,         setLCoins]     = useState(0);
  const [lastStreak,              setLStreak]    = useState(0);
  const [lastCorrect,             setLCorrect]   = useState(0);
  const [lastUnlockedLeague,      setLUnlocked]  = useState<string | null>(null);
  const [lastEloChange,           setLElo]       = useState(0);
  const [lastNewAchievements,     setLAchieves]  = useState<AchievementDef[]>([]);
  const [lastChallengesCompleted, setLChallenges]= useState<string[]>([]);
  const [lastXpEarned,            setLXp]        = useState(0);
  const [lastLevelUp,             setLLevelUp]   = useState(false);
  const [lastNewTrophies,         setLTrophies]  = useState<TrophyUnlock[]>([]);
  const [lastWeeklyCompleted,     setLWeekly]    = useState<string[]>([]);

  useEffect(() => {
    document.documentElement.dir  = isRTL(data.language) ? 'rtl' : 'ltr';
    document.documentElement.lang = data.language;
  }, [data.language]);

  // Remove auto Pi login on mount — auth is now handled by AuthScreen

  useEffect(() => {
    const season = getCurrentSeason();
    let updated = { ...data };
    let changed = false;

    if (data.currentSeasonNumber !== 0 && data.currentSeasonNumber !== season.number) {
      import('../lib/seasons').then(({ getSeasonTier }) => {
        const t = getSeasonTier(data.elo);
        const record = {
          seasonNumber: data.currentSeasonNumber,
          seasonName: `Season ${data.currentSeasonNumber}`,
          finalElo: data.elo,
          rank: t.rank,
          rankColor: t.color,
          coinsEarned: t.endRewardCoins,
          xpEarned: t.endRewardXp,
        };
        persist({
          ...data,
          seasonHistory: [...(data.seasonHistory || []), record],
          currentSeasonNumber: season.number,
          coins: data.coins + t.endRewardCoins,
          xp: data.xp + t.endRewardXp,
          totalCoinsEarned: data.totalCoinsEarned + t.endRewardCoins,
        });
        addNotification({
          type: 'season_reward', icon: '🌀',
          title: `Season ${data.currentSeasonNumber} ended!`,
          body: `You finished as ${t.rank}. Claimed ${t.endRewardCoins} coins + ${t.endRewardXp} XP.`,
          actionUrl: '/seasons',
        });
      });
      return;
    }
    if (data.currentSeasonNumber === 0) {
      updated = { ...updated, currentSeasonNumber: season.number };
      changed = true;
    }

    const newVerifLevel = checkVerification(
      !!user, data.level, data.matchesPlayed,
      !!(data.piLockTierId && data.piLockExpiry && data.piLockExpiry > Date.now()),
      (data.verificationLevel ?? 0) as VerificationLevel,
    );
    if (newVerifLevel !== (data.verificationLevel ?? 0)) {
      updated = { ...updated, verificationLevel: newVerifLevel };
      changed = true;
      if (newVerifLevel >= 1) {
        addNotification({
          type: 'verified', icon: '✓',
          title: newVerifLevel === 2 ? 'Pro Verified ⭐' : 'Pi Verified ✓',
          body: newVerifLevel === 2 ? 'You earned the Pro Verified badge!' : 'Your account is now verified via Pi Network.',
          actionUrl: '/profile',
        });
      }
    }

    if (changed) persist(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const persist = (d: PlayerData) => { setData(d); storage.save(d); };
  const login   = async () => { const u = await loginWithPi(); if (u) setUser(u); };
  const logout  = () => {
    logoutPi();
    clearAuthUser();
    setUser(null);
    setAuthUser(null);
  };

  const loginWithGoogle = async (name: string, email: string) => {
    const au = createGoogleUser(name, email);
    saveAuthUser(au);
    setAuthUser(au);
    persist({ ...data, username: name.trim().slice(0, 20) || data.username });
  };

  const loginWithPiNetwork = async () => {
    const u = await loginWithPi();
    if (u) {
      setUser(u);
      const au = createPiUser(u.uid, u.username);
      saveAuthUser(au);
      setAuthUser(au);
      persist({ ...data, username: u.username || data.username });
    }
  };

  const loginAsGuest = () => {
    const au = createGuestUser();
    saveAuthUser(au);
    setAuthUser(au);
  };

  const setLanguage    = (lang: Language) => persist({ ...data, language: lang });
  const updateUsername = (name: string)   => persist({ ...data, username: name.trim().slice(0, 20) || data.username });
  const setAvatarTheme = (id: string)     => persist({ ...data, avatarThemeId: id });

  const toggleNotif = (type: 'match' | 'community' | 'trophy') => {
    if (type === 'match')     persist({ ...data, notifPushMatch: !data.notifPushMatch });
    if (type === 'community') persist({ ...data, notifPushCommunity: !data.notifPushCommunity });
    if (type === 'trophy')    persist({ ...data, notifPushTrophy: !data.notifPushTrophy });
  };
  const toggleSound     = () => persist({ ...data, soundEnabled: !data.soundEnabled });
  const toggleVibration = () => persist({ ...data, vibrationEnabled: !data.vibrationEnabled });

  const spendCoins = (amount: number): boolean => {
    if (data.coins < amount) return false;
    persist({ ...data, coins: data.coins - amount, totalCoinsSpent: data.totalCoinsSpent + amount });
    addTransaction({ type: 'spend_store', amount: -amount, label: 'Store purchase' });
    return true;
  };

  const addCoins = (amount: number) => {
    persist({ ...data, coins: data.coins + amount, totalCoinsEarned: data.totalCoinsEarned + amount });
    addTransaction({ type: 'earn_match', amount, label: 'Referral reward' });
  };

  const addFame        = (amount: number) => persist({ ...data, fame: (data.fame || 0) + amount });
  const setLastPostTime = (ts: number)   => persist({ ...data, lastPostTime: ts });

  const isXpBoosted = (): boolean =>
    data.xpBoostUntil !== null && (data.xpBoostUntil ?? 0) > Date.now();

  const getCoinMultiplier = (): number => {
    if (!data.piLockTierId || !data.piLockExpiry || data.piLockExpiry < Date.now()) return 1;
    const { getActiveLockTier } = require('../lib/pi-lock');
    const tier = getActiveLockTier(data.piLockTierId, data.piLockExpiry);
    return tier ? 1 + tier.coinBonus / 100 : 1;
  };

  // ─── Store purchase ────────────────────────────────────────────────────────

  const purchaseItem = async (item: StoreItem): Promise<boolean> => {
    try {
      const Pi = (window as any).Pi;
      if (!Pi) throw new Error('no Pi SDK');
      return await new Promise<boolean>(resolve => {
        Pi.createPayment({
          amount: item.piPrice,
          memo: `SkillLeague — ${item.name}`,
          metadata: { itemId: item.id },
        }, {
          onReadyForServerApproval: () => {},
          onReadyForServerCompletion: () => { applyPurchase(item); resolve(true); },
          onCancel: () => resolve(false),
          onError: () => resolve(false),
        });
      });
    } catch {
      applyPurchase(item);
      return true;
    }
  };

  const applyPurchase = (item: StoreItem) => {
    const updates: Partial<PlayerData> = {};
    if (item.coinValue) {
      updates.coins            = data.coins + item.coinValue;
      updates.totalCoinsEarned = data.totalCoinsEarned + item.coinValue;
      addTransaction({ type: 'purchase_coins', amount: item.coinValue, label: `Bought ${item.name}` });
    }
    if (item.xpBoostHours) {
      const now     = Date.now();
      const current = (data.xpBoostUntil ?? 0) > now ? data.xpBoostUntil! : now;
      updates.xpBoostUntil = current + item.xpBoostHours * 3_600_000;
    }
    if (item.id === 'vip_avatar') updates.vipAvatar = true;
    if (item.oneTimePurchase) updates.ownedItems = [...(data.ownedItems || []), item.id];
    if (item.id === 'elite_pass') {
      updates.unlockedLeagues = [...data.unlockedLeagues.filter(l => l !== 'elite'), 'elite'];
    }
    persist({ ...data, ...updates });
  };

  // ─── Pi Lock ─────────────────────────────────────────────────────────────

  const activatePiLock = async (tier: PiLockTier): Promise<boolean> => {
    try {
      const Pi = (window as any).Pi;
      if (!Pi) throw new Error('no Pi SDK');
      return await new Promise<boolean>(resolve => {
        Pi.createPayment({
          amount: tier.piAmount,
          memo: `SkillLeague Pi Lock — ${tier.name}`,
          metadata: { lockTierId: tier.id },
        }, {
          onReadyForServerApproval: () => {},
          onReadyForServerCompletion: () => { applyPiLock(tier); resolve(true); },
          onCancel: () => resolve(false),
          onError: () => resolve(false),
        });
      });
    } catch {
      applyPiLock(tier);
      return true;
    }
  };

  const applyPiLock = (tier: PiLockTier) => {
    const expiry = Date.now() + tier.durationDays * 86_400_000;
    const newLevel = checkVerification(!!user, data.level, data.matchesPlayed, true,
      (data.verificationLevel ?? 0) as VerificationLevel);
    persist({
      ...data,
      piLockTierId:      tier.id,
      piLockExpiry:      expiry,
      piTotalLocked:     (data.piTotalLocked || 0) + tier.piAmount,
      verificationLevel: newLevel,
      xpBoostUntil:      tier.xpBonus > 0
        ? (Date.now() + tier.durationDays * 86_400_000)
        : data.xpBoostUntil,
    });
    addNotification({
      type: 'verified', icon: tier.icon,
      title: `${tier.name} activated!`,
      body: `Enjoy +${tier.coinBonus}% coins${tier.xpBonus > 0 ? ` and +${tier.xpBonus}% XP` : ''} for ${tier.durationDays} days.`,
      actionUrl: '/pi-lock',
    });
  };

  // ─── Weekly helpers ──────────────────────────────────────────────────────

  function ensureWeekState(wc: WeeklyChallengeState): WeeklyChallengeState {
    const thisWeek = getWeekString();
    if (wc.week === thisWeek) return wc;
    return { week: thisWeek, completedIds: [], progress: {} };
  }

  function updateWeeklyProgress(
    wc: WeeklyChallengeState,
    updates: Partial<Record<WeeklyMissionType, number>>,
    absolute = false,
  ): { state: WeeklyChallengeState; newlyCompleted: string[]; coinsReward: number; xpReward: number } {
    const missions    = getWeeklyMissions(wc.week);
    const newProgress = { ...wc.progress };
    for (const [type, val] of Object.entries(updates) as [WeeklyMissionType, number][]) {
      newProgress[type] = absolute
        ? Math.max(newProgress[type] ?? 0, val)
        : (newProgress[type] ?? 0) + val;
    }
    const updatedState: WeeklyChallengeState = { ...wc, progress: newProgress };
    const { newlyCompleted, coinsReward, xpReward } = checkWeeklyCompletions(updatedState, missions);
    return {
      state: { ...updatedState, completedIds: [...wc.completedIds, ...newlyCompleted.map(m => m.id)] },
      newlyCompleted: newlyCompleted.map(m => m.id),
      coinsReward,
      xpReward,
    };
  }

  // ─── Trophy helper ───────────────────────────────────────────────────────

  const applyTrophyChecks = (mid: PlayerData, extra?: Partial<TrophyStats>) => {
    const stats: TrophyStats = {
      pvpWins: mid.pvpWins, pvpWinStreak: mid.pvpWinStreak,
      level: mid.level, tournamentWins: mid.tournamentWins, coins: mid.coins, ...extra,
    };
    const earnedIds = mid.trophies.map(t => t.id);
    const newDefs   = checkNewTrophies(stats, earnedIds);
    if (!newDefs.length) return { updated: mid, newTrophies: [] as TrophyUnlock[] };
    const newUnlocks = newDefs.map(t => ({ id: t.id, date: new Date().toISOString() }));
    const coins = newDefs.length * 50;
    newDefs.forEach(t => {
      addTransaction({ type: 'earn_trophy', amount: 50, label: `Trophy: ${t.name}` });
      addNotification(createTrophyNotif(t.name));
    });
    return {
      updated: { ...mid, trophies: [...mid.trophies, ...newUnlocks], coins: mid.coins + coins, totalCoinsEarned: mid.totalCoinsEarned + coins },
      newTrophies: newUnlocks,
    };
  };

  // ─── recordMatch ─────────────────────────────────────────────────────────

  const recordMatch = (leagueId: string, score: number, accuracy: number, streak: number, correct: number) => {
    const config = LEAGUES[leagueId as LeagueId];
    if (!config) return;
    if (!checkRateLimit().allowed) return;
    if (!isScorePlausible(score, accuracy)) return;
    recordSubmission(score);

    const coinMult  = getCoinMultiplier();
    const earned    = Math.round(calculateReward(config, score) * coinMult);
    const net       = earned - config.entryCost;
    const eloChange = calculateEloChange(leagueId, score);
    const α = 0.15;
    const newSkillSpeed    = Math.min(100, Math.round((1-α)*data.skillSpeed    + α*Math.min(100, score/3)));
    const newSkillAccuracy = Math.min(100, Math.round((1-α)*data.skillAccuracy + α*accuracy));
    const memW = leagueId === 'training' ? 0.5 : 1.0;
    const newSkillMemory   = Math.min(100, Math.round((1-α*memW)*data.skillMemory + α*memW*accuracy));

    let newUnlocked = [...data.unlockedLeagues];
    let unlockedLeague: string | null = null;
    if (config.nextLeague) {
      const nextCfg = LEAGUES[config.nextLeague];
      if (score >= nextCfg.unlockScore && !newUnlocked.includes(config.nextLeague)) {
        newUnlocked = [...newUnlocked, config.nextLeague];
        unlockedLeague = config.nextLeague;
      }
    }

    const entry: LeaderboardEntry = { score, correct, streak, accuracy, date: new Date().toISOString() };
    const isWin    = score > 0;
    const baseXp   = xpForMatch(score, accuracy, isWin, streak);
    const xpEarned = isXpBoosted() ? baseXp * 2 : baseXp;
    const oldLevel = data.level;
    const newXp    = data.xp + xpEarned;
    const newLevel = Math.min(100, levelFromXp(newXp));
    const didLevelUp = newLevel > oldLevel;

    addTransaction({ type: 'earn_match', amount: Math.max(0, net), label: `${leagueId} match` });

    let mid: PlayerData = {
      ...data,
      coins:            Math.max(0, data.coins + net),
      totalCoinsEarned: data.totalCoinsEarned + Math.max(0, earned),
      totalCoinsSpent:  data.totalCoinsSpent + config.entryCost,
      matchesPlayed:    data.matchesPlayed + 1,
      matchesWon:       data.matchesWon + (isWin ? 1 : 0),
      bestStreak:       Math.max(data.bestStreak, streak),
      highScores:       { ...data.highScores, [leagueId]: Math.max(data.highScores[leagueId] ?? 0, score) },
      leaderboard:      addLeaderboardEntry(data.leaderboard, leagueId, entry),
      unlockedLeagues:  newUnlocked,
      elo:              Math.max(0, data.elo + eloChange),
      skillSpeed: newSkillSpeed, skillAccuracy: newSkillAccuracy, skillMemory: newSkillMemory,
      xp: newXp, level: newLevel,
    };

    const newAchieves = checkNewAchievements(data, mid);
    let achCoins = 0, achElo = 0;
    newAchieves.forEach(a => { achCoins += a.rewardCoins; achElo += a.rewardElo; });
    mid = {
      ...mid,
      achievements: [...mid.achievements, ...newAchieves.map(a => ({ id: a.id, date: new Date().toISOString() } as AchievementUnlock))],
      coins: Math.max(0, mid.coins + achCoins), totalCoinsEarned: mid.totalCoinsEarned + achCoins, elo: Math.max(0, mid.elo + achElo),
    };

    const today = todayString();
    const todayChallenges = getDailyChallenges(today);
    const prevCompleted   = data.dailyChallenge.date === today ? data.dailyChallenge.completed : [];
    const newCompleted    = [...prevCompleted];
    const completedNow: string[] = [];
    let chalCoins = 0, chalElo = 0;
    for (const c of todayChallenges) {
      if (prevCompleted.includes(c.id)) continue;
      if (isChallengeComplete(c, leagueId, score, accuracy, streak)) {
        newCompleted.push(c.id); completedNow.push(c.id);
        chalCoins += c.rewardCoins; chalElo += c.rewardElo;
      }
    }
    if (chalCoins > 0) addTransaction({ type: 'earn_challenge', amount: chalCoins, label: 'Daily challenge' });
    mid = {
      ...mid,
      dailyChallenge: { date: today, completed: newCompleted },
      dailyChallengesCompleted: mid.dailyChallengesCompleted + completedNow.length,
      coins: Math.max(0, mid.coins + chalCoins), totalCoinsEarned: mid.totalCoinsEarned + chalCoins, elo: Math.max(0, mid.elo + chalElo),
    };

    const wc = ensureWeekState(data.weeklyChallenge);
    const coinsThisMatch = Math.max(0, earned + achCoins + chalCoins);
    const { state: wc1, newlyCompleted: weeklyDone, coinsReward: weekCoins, xpReward: weekXp } =
      updateWeeklyProgress(wc, { play_matches: 1, earn_coins: coinsThisMatch });
    const { state: finalWc } = updateWeeklyProgress(wc1, { reach_streak: streak, achieve_accuracy: accuracy }, true);
    if (weekCoins > 0) addTransaction({ type: 'earn_weekly', amount: weekCoins, label: 'Weekly mission' });
    mid = {
      ...mid, weeklyChallenge: finalWc,
      coins: Math.max(0, mid.coins + weekCoins), totalCoinsEarned: mid.totalCoinsEarned + weekCoins,
      xp: mid.xp + weekXp, level: Math.min(100, levelFromXp(mid.xp + weekXp)),
    };

    if (didLevelUp) {
      mid = { ...mid, fame: (mid.fame || 0) + fameForLevelUp(newLevel) };
      if (data.notifPushTrophy !== false) addNotification(createLevelUpNotif(newLevel, mid.level.toString()));
    }

    const { updated: finalMid, newTrophies } = applyTrophyChecks(mid);
    persist(finalMid);

    setLScore(score); setLAccuracy(accuracy);
    setLCoins(earned + achCoins + chalCoins + weekCoins);
    setLStreak(streak); setLCorrect(correct); setLUnlocked(unlockedLeague);
    setLElo(eloChange + achElo + chalElo); setLAchieves(newAchieves);
    setLChallenges(completedNow); setLXp(xpEarned + weekXp);
    setLLevelUp(didLevelUp); setLTrophies(newTrophies); setLWeekly(weeklyDone);
  };

  // ─── recordPvpResult ─────────────────────────────────────────────────────

  const recordPvpResult = (won: boolean, opponentLevel: number, coinsEarned: number) => {
    const coinMult     = getCoinMultiplier();
    const boostedCoins = Math.round(coinsEarned * coinMult);
    const baseXp       = won ? xpForPvpWin(opponentLevel, data.level) : 20;
    const xpEarned     = isXpBoosted() ? baseXp * 2 : baseXp;
    const newXp        = data.xp + xpEarned;
    const newLevel     = Math.min(100, levelFromXp(newXp));
    const didLevelUp   = newLevel > data.level;
    const newPvpWins   = data.pvpWins + (won ? 1 : 0);
    const newWinStreak = won ? data.pvpWinStreak + 1 : 0;
    const fameGain     = won ? fameForPvpWin(newWinStreak) : 0;

    if (boostedCoins > 0) addTransaction({ type: 'earn_pvp', amount: boostedCoins, label: won ? 'PvP win' : 'PvP reward' });

    let mid: PlayerData = {
      ...data,
      pvpWins: newPvpWins, pvpLosses: data.pvpLosses + (won ? 0 : 1),
      pvpWinStreak: newWinStreak, bestPvpStreak: Math.max(data.bestPvpStreak, newWinStreak),
      coins: data.coins + boostedCoins, totalCoinsEarned: data.totalCoinsEarned + boostedCoins,
      xp: newXp, level: newLevel, fame: (data.fame || 0) + fameGain + (didLevelUp ? fameForLevelUp(newLevel) : 0),
    };

    const wc = ensureWeekState(data.weeklyChallenge);
    const { state: newWc, newlyCompleted: weeklyDone, coinsReward: weekCoins, xpReward: weekXp } =
      updateWeeklyProgress(wc, { win_pvp: won ? 1 : 0, earn_coins: boostedCoins });
    if (weekCoins > 0) addTransaction({ type: 'earn_weekly', amount: weekCoins, label: 'Weekly mission' });
    mid = {
      ...mid, weeklyChallenge: newWc,
      coins: mid.coins + weekCoins, totalCoinsEarned: mid.totalCoinsEarned + weekCoins,
      xp: mid.xp + weekXp, level: Math.min(100, levelFromXp(mid.xp + weekXp)),
    };

    if (didLevelUp && data.notifPushTrophy !== false) addNotification(createLevelUpNotif(newLevel, ''));
    const { updated, newTrophies } = applyTrophyChecks(mid, { pvpWins: newPvpWins, pvpWinStreak: newWinStreak, level: newLevel });
    persist(updated);
    setLXp(xpEarned + weekXp); setLLevelUp(didLevelUp); setLTrophies(newTrophies);
    setLCoins(boostedCoins + weekCoins); setLWeekly(weeklyDone);
  };

  // ─── recordTournamentWin ─────────────────────────────────────────────────

  const recordTournamentWin = (place: number, coinsReward: number, xpReward: number) => {
    const coinMult          = getCoinMultiplier();
    const boostedCoins      = Math.round(coinsReward * coinMult);
    const newTournamentWins = place === 1 ? data.tournamentWins + 1 : data.tournamentWins;
    const xpEarned          = isXpBoosted() ? xpReward * 2 : xpReward;
    const newXp             = data.xp + xpEarned;
    const newLevel          = Math.min(100, levelFromXp(newXp));
    const didLevelUp        = newLevel > data.level;
    const fameGain          = fameForTournamentPlace(place);

    if (boostedCoins > 0) addTransaction({ type: 'earn_tournament', amount: boostedCoins, label: `Tournament ${place === 1 ? '1st place' : `top ${place}`}` });

    let mid: PlayerData = {
      ...data,
      tournamentWins: newTournamentWins,
      coins: data.coins + boostedCoins, totalCoinsEarned: data.totalCoinsEarned + boostedCoins,
      xp: newXp, level: newLevel, fame: (data.fame || 0) + fameGain,
    };

    const wc = ensureWeekState(data.weeklyChallenge);
    const { state: newWc, newlyCompleted: weeklyDone, coinsReward: weekCoins, xpReward: weekXp } =
      updateWeeklyProgress(wc, { win_pvp: place === 1 ? 1 : 0, earn_coins: boostedCoins, win_tournament: place === 1 ? 1 : 0 });
    if (weekCoins > 0) addTransaction({ type: 'earn_weekly', amount: weekCoins, label: 'Weekly mission' });
    mid = {
      ...mid, weeklyChallenge: newWc,
      coins: mid.coins + weekCoins, totalCoinsEarned: mid.totalCoinsEarned + weekCoins,
      xp: mid.xp + weekXp, level: Math.min(100, levelFromXp(mid.xp + weekXp)),
    };

    if (didLevelUp && data.notifPushTrophy !== false) addNotification(createLevelUpNotif(newLevel, ''));
    const { updated, newTrophies } = applyTrophyChecks(mid, { tournamentWins: newTournamentWins, level: newLevel });
    persist(updated);
    setLXp(xpEarned + weekXp); setLLevelUp(didLevelUp); setLTrophies(newTrophies);
    setLCoins(boostedCoins + weekCoins); setLWeekly(weeklyDone);
  };

  const unlockLeagueWithCoins = (leagueId: string): boolean => {
    const config = LEAGUES[leagueId as LeagueId];
    if (!config || config.unlockCoinsCost === 0) return false;
    if (data.coins < config.unlockCoinsCost) return false;
    if (data.unlockedLeagues.includes(leagueId)) return true;
    addTransaction({ type: 'spend_store', amount: -config.unlockCoinsCost, label: `Unlock ${leagueId}` });
    persist({ ...data, coins: data.coins - config.unlockCoinsCost, totalCoinsSpent: data.totalCoinsSpent + config.unlockCoinsCost, unlockedLeagues: [...data.unlockedLeagues, leagueId] });
    return true;
  };

  const isGuest = isGuestUser(authUser);
  const isAuthenticated = authUser !== null;

  return (
    <GameContext.Provider value={{
      ...data, user, authUser, isGuest, isAuthenticated,
      login, logout, loginWithGoogle, loginWithPiNetwork, loginAsGuest,
      setLanguage, updateUsername, setAvatarTheme,
      recordMatch, recordPvpResult, recordTournamentWin,
      spendCoins, addCoins, unlockLeagueWithCoins,
      addFame, setLastPostTime, purchaseItem, activatePiLock, isXpBoosted,
      toggleNotif, toggleSound, toggleVibration,
      lastScore, lastAccuracy, lastCoinsEarned,
      lastStreak, lastCorrect, lastUnlockedLeague,
      lastEloChange, lastNewAchievements, lastChallengesCompleted,
      lastXpEarned, lastLevelUp, lastNewTrophies, lastWeeklyCompleted,
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
