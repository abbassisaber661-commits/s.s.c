// ─────────────────────────────────────────────
// 🎮 SkillLeague React Hook (MATCH SESSION CONTROL)
// ─────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { matchSessionManager } from '@/lib/match-session-manager';
import type { PlayerProfile } from '@/lib/player-profile-system';

// ─────────────────────────────────────────────
// 🎯 HOOK STATE
// ─────────────────────────────────────────────

export function useMatchSession() {
  const [session, setSession] = useState<any>(null);
  const [finished, setFinished] = useState(false);

  // ─────────────────────────────
  // 🚀 START MATCH
  // ─────────────────────────────
  const startMatch = useCallback((player: PlayerProfile, count = 10) => {
    const s = matchSessionManager.start(player, count);
    setSession({ ...s });
    setFinished(false);
  }, []);

  // ─────────────────────────────
  // 🎯 ANSWER QUESTION
  // ─────────────────────────────
  const answer = useCallback((index: number) => {
    const updated = matchSessionManager.answer(index);

    if (!updated) return;

    setSession({ ...updated });

    if (updated.finished) {
      setFinished(true);
    }
  }, []);

  // ─────────────────────────────
  // 🏁 FINISH MATCH
  // ─────────────────────────────
  const finishMatch = useCallback(() => {
    const result = matchSessionManager.finish();

    if (!result) return null;

    setSession(null);
    setFinished(true);

    return result;
  }, []);

  // ─────────────────────────────
  // 🔎 STATUS
  // ─────────────────────────────
  return {
    session,
    startMatch,
    answer,
    finishMatch,
    isFinished: finished,
  };
}