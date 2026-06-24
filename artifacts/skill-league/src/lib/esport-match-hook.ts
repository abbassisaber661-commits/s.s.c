// ─────────────────────────────────────────────
// 🎮 SkillLeague React Hook (ESPORT MATCH CONTROL)
// ─────────────────────────────────────────────

import { useState, useCallback } from "react";
import { gameEngine } from "@/lib/game-engine";
import {
  calculateXP,
  calculatePoints,
  getTierFromPoints,
} from "@/lib/game-config";

import type { PlayerProfile } from "@/lib/player-profile-system";

// ─────────────────────────────────────────────
// 🎯 HOOK
// ─────────────────────────────────────────────

export function useEsportMatch() {
  const [session, setSession] = useState<any>(null);
  const [finished, setFinished] = useState(false);

  const startMatch = useCallback((player: PlayerProfile, count = 10) => {
    const newSession = gameEngine.start(player, count);
    setSession({ ...newSession });
    setFinished(false);
  }, []);

  const answer = useCallback((index: number) => {
    const updated = gameEngine.answer(index);
    if (!updated) return;

    setSession({ ...updated });

    if (updated.finished) {
      setFinished(true);
    }
  }, []);

  const finishMatch = useCallback(() => {
    const result = gameEngine.finish();
    if (!result || !session) return null;

    const points = calculatePoints(session.score);
    const xp = calculateXP(session.score, session.score >= 7);
    const newTier = getTierFromPoints(points);

    setSession(null);
    setFinished(true);

    return {
      ...result,
      points,
      xp,
      newTier,
    };
  }, [session]);

  const isFinished = session?.finished ?? finished;

  return {
    session,
    startMatch,
    answer,
    finishMatch,
    isFinished,
  };
}