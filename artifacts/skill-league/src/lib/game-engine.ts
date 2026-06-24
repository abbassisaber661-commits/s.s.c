// ─────────────────────────────────────────────
// 🎮 SkillLeague Game Engine (CORE ORCHESTRATOR)
// ─────────────────────────────────────────────

import {
  createSoloMatch,
  answerSoloQuestion,
  finishSoloMatch,
  SoloMatchSession,
} from "@/lib/matchmaking-core";

import type { PlayerProfile } from "@/lib/player-profile-system";
import {
  calculatePoints,
  calculateXP,
} from "@/lib/game-config";

// ─────────────────────────────────────────────
// 🎯 GAME STATE
// ─────────────────────────────────────────────

export interface GameState {
  session: SoloMatchSession | null;
  player: PlayerProfile | null;
}

// ─────────────────────────────────────────────
// 🚀 ENGINE CLASS
// ─────────────────────────────────────────────

class GameEngine {
  private state: GameState = {
    session: null,
    player: null,
  };

  start(player: PlayerProfile, questionCount = 10) {
    this.state.player = player;
    this.state.session = createSoloMatch(player, questionCount);

    return this.state.session;
  }

  answer(selectedIndex: number) {
    if (!this.state.session) return null;

    this.state.session = answerSoloQuestion(
      this.state.session,
      selectedIndex
    );

    return this.state.session;
  }

  isFinished() {
    return this.state.session?.finished ?? true;
  }

  finish() {
    if (!this.state.session || !this.state.player) return null;

    const session = this.state.session;

    const result = finishSoloMatch(session);

    const points = calculatePoints(session.score);
    const xp = calculateXP(session.score, result.score >= 7);

    this.state.session = null;

    return {
      ...result,
      points,
      xp,
    };
  }

  getState() {
    return this.state.session;
  }
}

// singleton
export const gameEngine = new GameEngine();