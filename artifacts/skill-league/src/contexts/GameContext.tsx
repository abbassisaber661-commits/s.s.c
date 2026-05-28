import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { PlayerData, AchievementUnlock, LeaderboardEntry, storage } from '../lib/storage';
import { PiUser, getCurrentUser, loginWithPi, logoutPi } from '../lib/pi-auth';
import { Language, isRTL } from '../lib/i18n';
import { LEAGUES, LeagueId, calculateReward } from '../lib/game-engine';
import { addLeaderboardEntry } from '../lib/progression';
import { calculateEloChange } from '../lib/elo';
import { checkNewAchievements, AchievementDef } from '../lib/achievements';
import { getDailyChallenges, isChallengeComplete, todayString } from '../lib/challenges';

interface GameState extends PlayerData {
  user: PiUser | null;
  login: () => Promise<void>;
  logout: () => void;
  setLanguage: (lang: Language) => void;
  updateUsername: (name: string) => void;
  recordMatch: (leagueId: string, score: number, accuracy: number, streak: number, correct: number) => void;
  unlockLeagueWithCoins: (leagueId: string) => boolean;
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
}

const GameContext = createContext<GameState | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PlayerData>(storage.get());
  const [user, setUser] = useState<PiUser | null>(getCurrentUser());

  const [lastScore,              setLScore]      = useState(0);
  const [lastAccuracy,           setLAccuracy]   = useState(0);
  const [lastCoinsEarned,        setLCoins]      = useState(0);
  const [lastStreak,             setLStreak]     = useState(0);
  const [lastCorrect,            setLCorrect]    = useState(0);
  const [lastUnlockedLeague,     setLUnlocked]   = useState<string | null>(null);
  const [lastEloChange,          setLElo]        = useState(0);
  const [lastNewAchievements,    setLAchieves]   = useState<AchievementDef[]>([]);
  const [lastChallengesCompleted,setLChallenges] = useState<string[]>([]);

  useEffect(() => {
    document.documentElement.dir  = isRTL(data.language) ? 'rtl' : 'ltr';
    document.documentElement.lang = data.language;
  }, [data.language]);

  useEffect(() => { loginWithPi().then(u => { if (u) setUser(u); }); }, []);

  const persist = (d: PlayerData) => { setData(d); storage.save(d); };
  const login   = async () => { const u = await loginWithPi(); if (u) setUser(u); };
  const logout  = () => { logoutPi(); setUser(null); };

  const setLanguage    = (lang: Language) => persist({ ...data, language: lang });
  const updateUsername = (name: string)   => persist({ ...data, username: name.trim().slice(0, 20) || data.username });

  const recordMatch = (
    leagueId: string, score: number, accuracy: number, streak: number, correct: number,
  ) => {
    const config = LEAGUES[leagueId as LeagueId];
    if (!config) return;

    const earned  = calculateReward(config, score);
    const net     = earned - config.entryCost;
    const eloChange = calculateEloChange(leagueId, score);

    // Skill metrics (EMA, α = 0.15)
    const α = 0.15;
    const newSkillSpeed    = Math.min(100, Math.round((1-α)*data.skillSpeed    + α*Math.min(100, score/3)));
    const newSkillAccuracy = Math.min(100, Math.round((1-α)*data.skillAccuracy + α*accuracy));
    const memW = leagueId === 'training' ? 0.5 : 1.0;
    const newSkillMemory   = Math.min(100, Math.round((1-α*memW)*data.skillMemory + α*memW*accuracy));

    // League unlock
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

    // Intermediate data (before achievements + challenges rewards)
    let mid: PlayerData = {
      ...data,
      coins:          Math.max(0, data.coins + net),
      matchesPlayed:  data.matchesPlayed + 1,
      matchesWon:     data.matchesWon + (score > 0 ? 1 : 0),
      bestStreak:     Math.max(data.bestStreak, streak),
      highScores:     { ...data.highScores, [leagueId]: Math.max(data.highScores[leagueId] ?? 0, score) },
      leaderboard:    addLeaderboardEntry(data.leaderboard, leagueId, entry),
      unlockedLeagues: newUnlocked,
      elo:            Math.max(0, data.elo + eloChange),
      skillSpeed:     newSkillSpeed,
      skillAccuracy:  newSkillAccuracy,
      skillMemory:    newSkillMemory,
    };

    // ── Achievements ──────────────────────────────────────────────────────────
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
      elo:   Math.max(0, mid.elo   + achElo),
    };

    // ── Daily Challenges ──────────────────────────────────────────────────────
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
      dailyChallenge:          { date: today, completed: newCompleted },
      dailyChallengesCompleted: mid.dailyChallengesCompleted + completedNow.length,
      coins: Math.max(0, mid.coins + chalCoins),
      elo:   Math.max(0, mid.elo   + chalElo),
    };

    persist(mid);

    const totalElo = eloChange + achElo + chalElo;
    setLScore(score);
    setLAccuracy(accuracy);
    setLCoins(earned + achCoins + chalCoins);
    setLStreak(streak);
    setLCorrect(correct);
    setLUnlocked(unlockedLeague);
    setLElo(totalElo);
    setLAchieves(newAchieves);
    setLChallenges(completedNow);
  };

  const unlockLeagueWithCoins = (leagueId: string): boolean => {
    const config = LEAGUES[leagueId as LeagueId];
    if (!config || config.unlockCoinsCost === 0) return false;
    if (data.coins < config.unlockCoinsCost) return false;
    if (data.unlockedLeagues.includes(leagueId)) return true;
    persist({ ...data, coins: data.coins - config.unlockCoinsCost, unlockedLeagues: [...data.unlockedLeagues, leagueId] });
    return true;
  };

  return (
    <GameContext.Provider value={{
      ...data, user, login, logout,
      setLanguage, updateUsername,
      recordMatch, unlockLeagueWithCoins,
      lastScore, lastAccuracy, lastCoinsEarned,
      lastStreak, lastCorrect, lastUnlockedLeague,
      lastEloChange, lastNewAchievements, lastChallengesCompleted,
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
