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

// ─────────────────────────────────────────────
// 🏆 LEAGUE SYSTEM
// ─────────────────────────────────────────────

export type LeagueId = 'training' | 'bronze' | 'silver' | 'elite';

export const LEAGUE_ORDER: LeagueId[] = ['training', 'bronze', 'silver', 'elite'];

export interface LeagueConfig {
  name: string;
  color: string;
  difficulty: number;
  prevLeague: LeagueId | null;
  unlockScore: number;
  unlockCoinsCost: number;
  entryCost: number;
}

export const LEAGUES: Record<LeagueId, LeagueConfig> = {
  training: { name: 'Training', color: '#6b7280', difficulty: 1, prevLeague: null,       unlockScore: 0,  unlockCoinsCost: 0,    entryCost: 0   },
  bronze:   { name: 'Bronze',   color: '#cd7f32', difficulty: 2, prevLeague: 'training', unlockScore: 60, unlockCoinsCost: 200,  entryCost: 20  },
  silver:   { name: 'Silver',   color: '#a8a9ad', difficulty: 3, prevLeague: 'bronze',   unlockScore: 70, unlockCoinsCost: 500,  entryCost: 50  },
  elite:    { name: 'Elite',    color: '#ffd700', difficulty: 4, prevLeague: 'silver',   unlockScore: 80, unlockCoinsCost: 1000, entryCost: 100 },
};

// ─────────────────────────────────────────────
// 🎯 CHALLENGE TYPE
// ─────────────────────────────────────────────

export interface Challenge {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  type: 'trivia' | 'memory' | 'speed';
  timeoutMs: number;
}

let _cid = 0;
export function generateChallenge(leagueId: LeagueId = 'training'): Challenge {
  const timeouts: Record<LeagueId, number> = {
    training: 15000, bronze: 12000, silver: 10000, elite: 8000,
  };
  return {
    id: `ch_${++_cid}_${Date.now()}`,
    question: '',
    options: [],
    correctIndex: 0,
    type: 'trivia',
    timeoutMs: timeouts[leagueId] ?? 12000,
  };
}

// ─────────────────────────────────────────────
// 🎨 COLORS
// ─────────────────────────────────────────────

export const COLORS: { id: string; hex: string }[] = [
  { id: 'red',    hex: '#ef4444' },
  { id: 'blue',   hex: '#3b82f6' },
  { id: 'green',  hex: '#22c55e' },
  { id: 'yellow', hex: '#eab308' },
  { id: 'purple', hex: '#a855f7' },
];