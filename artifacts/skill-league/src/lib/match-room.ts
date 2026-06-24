// ─────────────────────────────────────────────
// 🎮 SkillLeague Match Room
// ─────────────────────────────────────────────

import type { PlayerProfile } from "@/lib/player-profile-system";

// ─────────────────────────────────────────────
// 🧠 TYPES
// ─────────────────────────────────────────────

export interface MatchPlayer {
  id: string;
  username: string;
  score: number;
  answers: number;
}

export interface MatchRoomState {
  roomId: string;
  started: boolean;
  finished: boolean;
  currentQuestion: number;
  totalQuestions: number;
  players: MatchPlayer[];
  winnerId?: string;
}

// ─────────────────────────────────────────────
// 🎯 ROOM ENGINE
// ─────────────────────────────────────────────

export class MatchRoom {
  private state: MatchRoomState;

  constructor(
    roomId: string,
    player1: PlayerProfile,
    player2: PlayerProfile,
    totalQuestions = 10
  ) {
    this.state = {
      roomId,
      started: false,
      finished: false,
      currentQuestion: 0,
      totalQuestions,
      players: [
        {
          id: player1.id,
          username: player1.username,
          score: 0,
          answers: 0,
        },
        {
          id: player2.id,
          username: player2.username,
          score: 0,
          answers: 0,
        },
      ],
    };
  }

  start() {
    this.state.started = true;
  }

  answer(playerId: string, correct: boolean) {
    const player = this.state.players.find(
      (p) => p.id === playerId
    );

    if (!player) return;

    player.answers++;

    if (correct) {
      player.score++;
    }
  }

  nextQuestion() {
    this.state.currentQuestion++;

    if (
      this.state.currentQuestion >=
      this.state.totalQuestions
    ) {
      this.finish();
    }
  }

  finish() {
    this.state.finished = true;

    const sorted = [...this.state.players].sort(
      (a, b) => b.score - a.score
    );

    this.state.winnerId = sorted[0]?.id;
  }

  getState() {
    return this.state;
  }
}