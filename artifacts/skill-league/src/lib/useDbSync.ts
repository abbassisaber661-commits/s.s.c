import { useEffect, useRef, useCallback } from 'react';
import { api } from './apiClient';
import type { PlayerData } from './storage';
import type { AuthUser } from './auth';

const SYNC_DELAY = 4000;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

function mapToApiPayload(d: PlayerData, uid: string) {
  return {
    coins:          d.coins,
    xp:             d.xp,
    level:          d.level,
    elo:            d.elo,
    fame:           d.fame ?? 0,
    leagueDivision: d.unlockedLeagues[d.unlockedLeagues.length - 1] ?? 'training',
    unlockedLeagues:d.unlockedLeagues,
    ownedItems:     d.ownedItems ?? [],
    xpBoostUntil:   d.xpBoostUntil ? new Date(d.xpBoostUntil).toISOString() : null,
    highScores:     d.highScores,
    achievements:   d.achievements,
    trophies:       (d.trophies ?? []).map(t => (typeof t === 'string' ? t : (t as any).id)),
    matchesPlayed:  d.matchesPlayed,
    matchesWon:     d.matchesWon,
    pvpWins:        d.pvpWins ?? 0,
    pvpLosses:      d.pvpLosses ?? 0,
    pvpWinStreak:   d.pvpWinStreak ?? 0,
    bestPvpStreak:  d.bestPvpStreak ?? 0,
    tournamentWins: d.tournamentWins ?? 0,
    bestStreak:     d.bestStreak,
    skillSpeed:     d.skillSpeed,
    skillAccuracy:  d.skillAccuracy,
    skillMemory:    d.skillMemory,
    language:       d.language,
  };
}

export function useDbSync(
  data: PlayerData,
  authUser: AuthUser | null,
) {
  const syncedRef  = useRef(false);
  const dataRef    = useRef(data);
  dataRef.current  = data;

  const uid = authUser?.uid ?? null;
  const uidRef = useRef(uid);
  uidRef.current = uid;

  const doSync = useCallback(async (d: PlayerData, id: string) => {
    try {
      await api.players.sync(id, mapToApiPayload(d, id));
    } catch {}
  }, []);

  const ensurePlayer = useCallback(async (d: PlayerData, id: string, username: string) => {
    try {
      await api.players.create({
        id,
        username: username || d.username || 'Player',
        language: d.language,
        avatar: '🎮',
      });
      syncedRef.current = true;
    } catch {}
  }, []);

  useEffect(() => {
    if (!uid) return;
    const d = dataRef.current;
    ensurePlayer(d, uid, authUser?.username || d.username || 'Player');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      doSync(dataRef.current, uid);
    }, SYNC_DELAY);
    return () => { if (syncTimer) clearTimeout(syncTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, uid]);
}
