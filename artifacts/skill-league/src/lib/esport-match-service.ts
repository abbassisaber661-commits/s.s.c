// ─────────────────────────────────────────────
// 🎮 SkillLeague Esport Match Service (CORE BRAIN)
// ─────────────────────────────────────────────

import { gameEngine } from "@/lib/esport-game-engine";
import type { PlayerProfile } from "@/lib/player-profile-system";
import type { MatchResult } from "@/lib/match-result-handler";

import { finalizeMatch } from "@/lib/match-finalizer";

// ─────────────────────────────────────────────
// 🎯 SERVICE CLASS
// ─────────────────────────────────────────────

class EsportMatchService {
  private player: PlayerProfile | null = null;

  // =========================
  // START MATCH
  // =========================
  startMatch(player: PlayerProfile, questionCount = 10) {
    this.player = player;
    return gameEngine.start(player, questionCount);
  }

  // =========================
  // ANSWER QUESTION
  // =========================
  answer(index: number) {
    return gameEngine.answer(index);
  }

  // =========================
  // FINISH MATCH (FULL PIPELINE)
  // =========================
  finishMatch(): any {
    if (!this.player) return null;

    const session = gameEngine.finish();
    if (!session) return null;

    const result: MatchResult = {
      score: session.score,
      total: session.total,
      win: session.score >= 7,
    };

    const final = finalizeMatch(this.player, result);

    this.player = final.player;

    return final;
  }

  // =========================
  // GET STATUS
  // =========================
  getSession() {
    return gameEngine.getState();
  }
}

// singleton
export const esportMatchService = new EsportMatchService();