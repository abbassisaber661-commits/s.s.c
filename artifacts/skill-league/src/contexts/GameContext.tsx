import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { PlayerData, AchievementUnlock, LeaderboardEntry, TrophyUnlock, storage } from '../lib/storage';
import { PiUser, getCurrentUser, loginWithPi, logoutPi } from '../lib/pi-auth';
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

interface GameState extends PlayerData {
  user: PiUser | null;
  login: () => Promise<void>;
  logout: () => void;
  setLanguage: (lang: Language) => void;
  updateUsername: (name: string) => void;
  recordMatch: (leagueId: string, score: number, accuracy: number, streak: number, correct: number) => void;
  recordPvpResult: (won: boolean, opponentLevel: number, coinsEarned: number) => void;
  recordTournamentWin: (place: number, coinsReward: number, xpReward: number) => void;
  spendCoins: (amount: number) => boolean;
  unlockLeagueWithCoins: (leagueId: string) => boolean;
  addFame: (amount: number) => void;
  setLastPostTime: (ts: number) => void;
  purchaseItem: (item: StoreItem) => Promise<boolean>;
  isXpBoosted: () => boolean;
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

  useEffect(() => { loginWithPi().then(u => { if (u) setUser(u); }); }, []);

  // Season tracking — if season changed, log old season and reset ELO baseline
  useEffect(() => {
    const season = getCurrentSeason();
    if (data.currentSeasonNumber !== 0 && data.currentSeasonNumber !== season.number) {
      const tier = (async () => {
        const { getSeasonTier } = await import('../lib/seasons');
        return getSeasonTier(data.elo);
      })();
      tier.then(t => {
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
      });
    } else if (data.currentSeasonNumber === 0) {
      persist({ ...data, currentSeasonNumber: season.number });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (d: PlayerData) => { setData(d); storage.save(d); };
  const login   = async () => { const u = await loginWithPi(); if (u) setUser(u); };
  const logout  = () => { logoutPi(); setUser(null); };

  const setLanguage    = (lang: Language) => persist({ ...data, language: lang });
  const updateUsername = (name: string)   => persist({ ...data, username: name.trim().slice(0, 20) || data.username });

  const spendCoins = (amount: number): boolean => {
    if (data.coins < amount) return false;
    persist({ ...data, coins: data.coins - amount, totalCoinsSpent: data.totalCoinsSpent + amount });
    return true;
  };

  const addFame = (amount: number) => {
    persist({ ...data, fame: (data.fame || 0) + amount });
  };

  const setLastPostTime = (ts: number) => {
    persist({ ...data, lastPostTime: ts });
  };

  const isXpBoosted = (): boolean => {
    return data.xpBoostUntil !== null && data.xpBoostUntil > Date.now();
  };

  const purchaseItem = async (item: StoreItem): Promise<boolean> => {
    try {
      const Pi = (window as any).Pi;
      if (!Pi) throw new Error('Pi SDK not available');

      return await new Promise<boolean>((resolve) => {
        Pi.createPayment({
          amount: item.piPrice,
          memo: `SkillLeague — ${item.name}`,
          metadata: { itemId: item.id },
        }, {
          onReadyForServerApproval: (_paymentId: string) => { /* server approve */ },
          onReadyForServerCompletion: (_paymentId: string, _txid: string) => {
            applyPurchase(item);
            resolve(true);
          },
          onCancel: () => resolve(false),
          onError: () => resolve(false),
        });
      });
    } catch {
      // Dev environment fallback — apply purchase directly
      applyPurchase(item);
      return true;
    }
  };

  const applyPurchase = (item: StoreItem) => {
    const updates: Partial<PlayerData> = {};
    if (item.coinValue) {
      updates.coins = data.coins + item.coinValue;
      updates.totalCoinsEarned = data.totalCoinsEarned + item.coinValue;
    }
    if (item.xpBoostHours) {
      const now = Date.now();
      const current = data.xpBoostUntil && data.xpBoostUntil > now ? data.xpBoostUntil : now;
      updates.xpBoostUntil = current + item.xpBoostHours * 3_600_000;
    }
    if (item.id === 'vip_avatar') updates.vipAvatar = true;
    if (item.oneTimePurchase) {
      updates.ownedItems = [...(data.ownedItems || []), item.id];
    }
    if (item.id === 'elite_pass') {
      updates.unlockedLeagues = [...data.unlockedLeagues.filter(l => l !== 'elite'), 'elite'];
    }
    persist({ ...data, ...updates });
  };

  // ─── Weekly challenge helpers ─────────────────────────────────────────────

  function ensureWeekState(current: WeeklyChallengeState): WeeklyChallengeState {
    const thisWeek = getWeekString();
    if (current.week === thisWeek) return current;
    return { week: thisWeek, completedIds: [], progress: {} };
  }

  function updateWeeklyProgress(
    wc: WeeklyChallengeState,
    updates: Partial<Record<WeeklyMissionType, number>>,
    absolute = false,
  ): { state: WeeklyChallengeState; newlyCompleted: string[]; coinsReward: number; xpReward: number } {
    const missions = getWeeklyMissions(wc.week);
    const newProgress = { ...wc.progress };

    for (const [type, val] of Object.entries(updates) as [WeeklyMissionType, number][]) {
      if (absolute) {
        newProgress[type] = Math.max(newProgress[type] ?? 0, val);
      } else {
        newProgress[type] = (newProgress[type] ?? 0) + val;
      }
    }

    const updatedState: WeeklyChallengeState = { ...wc, progress: newProgress };
    const { newlyCompleted, coinsReward, xpReward } = checkWeeklyCompletions(updatedState, missions);
    const completedIds = [...wc.completedIds, ...newlyCompleted.map(m => m.id)];

    return {
      state: { ...updatedState, completedIds },
      newlyCompleted: newlyCompleted.map(m => m.id),
      coinsReward,
      xpReward,
    };
  }

  // ─── Trophy helper ────────────────────────────────────────────────────────

  const applyTrophyChecks = (
    mid: PlayerData,
    extra?: Partial<TrophyStats>,
  ): { updated: PlayerData; newTrophies: TrophyUnlock[] } => {
    const stats: TrophyStats = {
      pvpWins: mid.pvpWins,
      pvpWinStreak: mid.pvpWinStreak,
      level: mid.level,
      tournamentWins: mid.tournamentWins,
      coins: mid.coins,
      ...extra,
    };
    const earnedIds = mid.trophies.map(t => t.id);
    const newDefs = checkNewTrophies(stats, earnedIds);
    if (newDefs.length === 0) return { updated: mid, newTrophies: [] };
    const newUnlocks = newDefs.map(t => ({ id: t.id, date: new Date().toISOString() }));
    const trophyCoins = newDefs.length * 50;
    return {
      updated: { ...mid, trophies: [...mid.trophies, ...newUnlocks], coins: mid.coins + trophyCoins, totalCoinsEarned: mid.totalCoinsEarned + trophyCoins },
      newTrophies: newUnlocks,
    };
  };

  // ─── recordMatch ──────────────────────────────────────────────────────────

  const recordMatch = (
    leagueId: string, score: number, accuracy: number, streak: number, correct: number,
  ) => {
    const config = LEAGUES[leagueId as LeagueId];
    if (!config) return;

    // Anti-cheat
    const rateOk = checkRateLimit();
    if (!rateOk.allowed) return;
    if (!isScorePlausible(score, accuracy)) return;
    recordSubmission(score);

    const earned    = calculateReward(config, score);
    const net       = earned - config.entryCost;
    const eloChange = calculateEloChange(leagueId, score);

    const α = 0.15;
    const newSkillSpeed    = Math.min(100, Math.round((1-α)*data.skillSpeed    + α*Math.min(100, score/3)));
    const newSkillAccuracy = Math.min(100, Math.round((1-α)*data.skillAccuracy + α*accuracy));
    const memW = leagueId === 'training' ? 0.5 : 1.0;
    const newSkillMemory   = Math.min(100, Math.round((1-α*memW)*data.skillMemory + α*memW*accuracy));

    let newUnlocked    = [...data.unlockedLeagues];
    let unlockedLeague: string | null = null;
    if (config.nextLeague) {
      const nextCfg = LEAGUES[config.nextLeague];
      if (score >= nextCfg.unlockScore && !newUnlocked.includes(config.nextLeague)) {
        newUnlocked = [...newUnlocked, config.nextLeague];
        unlockedLeague = config.nextLeague;
      }
    }

    const entry: LeaderboardEntry = { score, correct, streak, accuracy, date: new Date().toISOString() };

    const isWin = score > 0;
    const baseXp  = xpForMatch(score, accuracy, isWin, streak);
    const xpEarned = isXpBoosted() ? baseXp * 2 : baseXp;
    const newXp   = data.xp + xpEarned;
    const oldLevel = data.level;
    const newLevel = Math.min(100, levelFromXp(newXp));
    const didLevelUp = newLevel > oldLevel;

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
      skillSpeed:       newSkillSpeed,
      skillAccuracy:    newSkillAccuracy,
      skillMemory:      newSkillMemory,
      xp:               newXp,
      level:            newLevel,
    };

    const newAchieves = checkNewAchievements(data, mid);
    let achCoins = 0, achElo = 0;
    newAchieves.forEach(a => { achCoins += a.rewardCoins; achElo += a.rewardElo; });
    mid = {
      ...mid,
      achievements: [
        ...mid.achievements,
        ...newAchieves.map(a => ({ id: a.id, date: new Date().toISOString() } as AchievementUnlock)),
      ],
      coins: Math.max(0, mid.coins + achCoins),
      totalCoinsEarned: mid.totalCoinsEarned + achCoins,
      elo:   Math.max(0, mid.elo + achElo),
    };

    const today            = todayString();
    const todayChallenges  = getDailyChallenges(today);
    const prevCompleted    = data.dailyChallenge.date === today ? data.dailyChallenge.completed : [];
    const newCompleted     = [...prevCompleted];
    const completedNow: string[] = [];
    let chalCoins = 0, chalElo = 0;

    for (const c of todayChallenges) {
      if (prevCompleted.includes(c.id)) continue;
      if (isChallengeComplete(c, leagueId, score, accuracy, streak)) {
        newCompleted.push(c.id);
        completedNow.push(c.id);
        chalCoins += c.rewardCoins;
        chalElo   += c.rewardElo;
      }
    }

    mid = {
      ...mid,
      dailyChallenge:           { date: today, completed: newCompleted },
      dailyChallengesCompleted: mid.dailyChallengesCompleted + completedNow.length,
      coins: Math.max(0, mid.coins + chalCoins),
      totalCoinsEarned: mid.totalCoinsEarned + chalCoins,
      elo:   Math.max(0, mid.elo + chalElo),
    };

    // Weekly challenge progress
    const wc = ensureWeekState(data.weeklyChallenge);
    const coinsEarnedThisMatch = Math.max(0, earned + achCoins + chalCoins);
    const { state: newWc, newlyCompleted: weeklyDone, coinsReward: weekCoins, xpReward: weekXp } = updateWeeklyProgress(wc, {
      play_matches:     1,
      earn_coins:       coinsEarnedThisMatch,
      reach_streak:     streak,
      achieve_accuracy: accuracy,
    }, false);
    // For reach_streak and achieve_accuracy use max (absolute)
    const { state: finalWc } = updateWeeklyProgress(newWc, {
      reach_streak:     streak,
      achieve_accuracy: accuracy,
    }, true);

    mid = {
      ...mid,
      weeklyChallenge: finalWc,
      coins:           Math.max(0, mid.coins + weekCoins),
      totalCoinsEarned: mid.totalCoinsEarned + weekCoins,
      xp:              mid.xp + weekXp,
      level:           Math.min(100, levelFromXp(mid.xp + weekXp)),
    };

    // Fame for level up
    if (didLevelUp) {
      mid = { ...mid, fame: (mid.fame || 0) + fameForLevelUp(newLevel) };
    }

    const { updated: finalMid, newTrophies } = applyTrophyChecks(mid);
    persist(finalMid);

    const totalElo = eloChange + achElo + chalElo;
    setLScore(score);
    setLAccuracy(accuracy);
    setLCoins(earned + achCoins + chalCoins + weekCoins);
    setLStreak(streak);
    setLCorrect(correct);
    setLUnlocked(unlockedLeague);
    setLElo(totalElo);
    setLAchieves(newAchieves);
    setLChallenges(completedNow);
    setLXp(xpEarned + weekXp);
    setLLevelUp(didLevelUp);
    setLTrophies(newTrophies);
    setLWeekly(weeklyDone);
  };

  // ─── recordPvpResult ──────────────────────────────────────────────────────

  const recordPvpResult = (won: boolean, opponentLevel: number, coinsEarned: number) => {
    const baseXp  = won ? xpForPvpWin(opponentLevel, data.level) : 20;
    const xpEarned = isXpBoosted() ? baseXp * 2 : baseXp;
    const newXp   = data.xp + xpEarned;
    const newLevel = Math.min(100, levelFromXp(newXp));
    const didLevelUp = newLevel > data.level;

    const newPvpWins    = data.pvpWins + (won ? 1 : 0);
    const newPvpLosses  = data.pvpLosses + (won ? 0 : 1);
    const newWinStreak  = won ? data.pvpWinStreak + 1 : 0;
    const newBestStreak = Math.max(data.bestPvpStreak, newWinStreak);
    const fameGain      = won ? fameForPvpWin(newWinStreak) : 0;
    const levelFame     = didLevelUp ? fameForLevelUp(newLevel) : 0;

    let mid: PlayerData = {
      ...data,
      pvpWins:          newPvpWins,
      pvpLosses:        newPvpLosses,
      pvpWinStreak:     newWinStreak,
      bestPvpStreak:    newBestStreak,
      coins:            data.coins + coinsEarned,
      totalCoinsEarned: data.totalCoinsEarned + coinsEarned,
      xp:               newXp,
      level:            newLevel,
      fame:             (data.fame || 0) + fameGain + levelFame,
    };

    // Weekly challenge progress
    const wc = ensureWeekState(data.weeklyChallenge);
    const { state: newWc, newlyCompleted: weeklyDone, coinsReward: weekCoins, xpReward: weekXp } = updateWeeklyProgress(wc, {
      win_pvp:    won ? 1 : 0,
      earn_coins: coinsEarned,
    });

    mid = {
      ...mid,
      weeklyChallenge:  newWc,
      coins:            mid.coins + weekCoins,
      totalCoinsEarned: mid.totalCoinsEarned + weekCoins,
      xp:               mid.xp + weekXp,
      level:            Math.min(100, levelFromXp(mid.xp + weekXp)),
    };

    const { updated, newTrophies } = applyTrophyChecks(mid, {
      pvpWins: newPvpWins,
      pvpWinStreak: newWinStreak,
      level: newLevel,
    });

    persist(updated);
    setLXp(xpEarned + weekXp);
    setLLevelUp(didLevelUp);
    setLTrophies(newTrophies);
    setLCoins(coinsEarned + weekCoins);
    setLWeekly(weeklyDone);
  };

  // ─── recordTournamentWin ──────────────────────────────────────────────────

  const recordTournamentWin = (place: number, coinsReward: number, xpReward: number) => {
    const newTournamentWins = place === 1 ? data.tournamentWins + 1 : data.tournamentWins;
    const baseXp = xpReward;
    const boosted = isXpBoosted() ? baseXp * 2 : baseXp;
    const newXp   = data.xp + boosted;
    const newLevel = Math.min(100, levelFromXp(newXp));
    const didLevelUp = newLevel > data.level;
    const fameGain = fameForTournamentPlace(place);

    let mid: PlayerData = {
      ...data,
      tournamentWins:   newTournamentWins,
      coins:            data.coins + coinsReward,
      totalCoinsEarned: data.totalCoinsEarned + coinsReward,
      xp:               newXp,
      level:            newLevel,
      fame:             (data.fame || 0) + fameGain,
    };

    // Weekly challenge
    const wc = ensureWeekState(data.weeklyChallenge);
    const { state: newWc, newlyCompleted: weeklyDone, coinsReward: weekCoins, xpReward: weekXp } = updateWeeklyProgress(wc, {
      win_pvp:         place === 1 ? 1 : 0,
      earn_coins:      coinsReward,
      win_tournament:  place === 1 ? 1 : 0,
    });

    mid = {
      ...mid,
      weeklyChallenge:  newWc,
      coins:            mid.coins + weekCoins,
      totalCoinsEarned: mid.totalCoinsEarned + weekCoins,
      xp:               mid.xp + weekXp,
      level:            Math.min(100, levelFromXp(mid.xp + weekXp)),
    };

    const { updated, newTrophies } = applyTrophyChecks(mid, {
      tournamentWins: newTournamentWins,
      level: newLevel,
    });

    persist(updated);
    setLXp(boosted + weekXp);
    setLLevelUp(didLevelUp);
    setLTrophies(newTrophies);
    setLCoins(coinsReward + weekCoins);
    setLWeekly(weeklyDone);
  };

  const unlockLeagueWithCoins = (leagueId: string): boolean => {
    const config = LEAGUES[leagueId as LeagueId];
    if (!config || config.unlockCoinsCost === 0) return false;
    if (data.coins < config.unlockCoinsCost) return false;
    if (data.unlockedLeagues.includes(leagueId)) return true;
    persist({ ...data, coins: data.coins - config.unlockCoinsCost, totalCoinsSpent: data.totalCoinsSpent + config.unlockCoinsCost, unlockedLeagues: [...data.unlockedLeagues, leagueId] });
    return true;
  };

  return (
    <GameContext.Provider value={{
      ...data, user, login, logout,
      setLanguage, updateUsername,
      recordMatch, recordPvpResult, recordTournamentWin,
      spendCoins, unlockLeagueWithCoins,
      addFame, setLastPostTime, purchaseItem, isXpBoosted,
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
