import { LeagueId, LEAGUES, LEAGUE_ORDER } from './game-engine';
import type { PlayerData } from './storage';

export function isUnlocked(id: LeagueId, data: PlayerData): boolean {
  return id === 'training' || data.unlockedLeagues.includes(id);
}

export function meetsScoreRequirement(id: LeagueId, data: PlayerData): boolean {
  const cfg = LEAGUES[id];
  if (!cfg.prevLeague) return true;
  return (data.highScores[cfg.prevLeague] ?? 0) >= cfg.unlockScore;
}

export function canAffordCoinUnlock(id: LeagueId, data: PlayerData): boolean {
  const cfg = LEAGUES[id];
  return cfg.unlockCoinsCost > 0 && (data.dnBalance ?? 0) >= cfg.unlockCoinsCost;
}

export function canAffordEntry(id: LeagueId, data: PlayerData): boolean {
  return (data.dnBalance ?? 0) >= LEAGUES[id].entryCost;
}

export function getCurrentLeague(data: PlayerData): LeagueId {
  const unlocked = LEAGUE_ORDER.filter(l => data.unlockedLeagues.includes(l));
  return unlocked[unlocked.length - 1] ?? 'training';
}

export function addLeaderboardEntry(
  leaderboard: Record<string, import('./storage').LeaderboardEntry[]>,
  leagueId: string,
  entry: import('./storage').LeaderboardEntry,
): Record<string, import('./storage').LeaderboardEntry[]> {
  const existing = leaderboard[leagueId] ?? [];
  const updated = [...existing, entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  return { ...leaderboard, [leagueId]: updated };
}
