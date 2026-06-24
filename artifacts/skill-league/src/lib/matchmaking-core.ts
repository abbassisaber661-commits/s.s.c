// ─────────────────────────────────────────────
// 🎮 SkillLeague Matchmaking Core (SOLO MODE)
// ─────────────────────────────────────────────

import { generateMatchQuestions } from '@/lib/esport-question-engine';
import {
  PlayerProfile,
  updateMatchResult,
  syncTier,
} from '@/lib/player-profile-system';

// ─────────────────────────────────────────────
// 🎯 MATCH TYPES
// ─────────────────────────────────────────────

export interface SoloMatchSession {
  id: string;
  player: PlayerProfile;
  tier: string;
  questions: any[];
  currentIndex: number;
  score: number;
  startedAt: number;
  finished: boolean;
}

// ─────────────────────────────────────────────
// 🚀 CREATE SOLO MATCH
// ─────────────────────────────────────────────

export function createSoloMatch(
  player: PlayerProfile,
  questionCount = 10,
): SoloMatchSession {
  const tier = player.tier;

  const questions = generateMatchQuestions(
    questionCount,
    tier,
    1,
    Date.now(),
  );

  return {
    id: `match_${player.id}_${Date.now()}`,
    player,
    tier,
    questions,
    currentIndex: 0,
    score: 0,
    startedAt: Date.now(),
    finished: false,
  };
}

// ─────────────────────────────────────────────
// 🎯 ANSWER QUESTION
// ─────────────────────────────────────────────

export function answerSoloQuestion(
  session: SoloMatchSession,
  selectedIndex: number,
): SoloMatchSession {
  const current = session.questions[session.currentIndex];

  if (!current || session.finished) return session;

  const isCorrect = current.correctIndex === selectedIndex;

  const newScore = isCorrect ? session.score + 1 : session.score;

  const nextIndex = session.currentIndex + 1;

  return {
    ...session,
    score: newScore,
    currentIndex: nextIndex,
    finished: nextIndex >= session.questions.length,
  };
}

// ─────────────────────────────────────────────
// 🏆 FINISH MATCH + UPDATE PLAYER
// ─────────────────────────────────────────────

export function finishSoloMatch(session: SoloMatchSession) {
  const total = session.questions.length;

  const percent = Math.round((session.score / total) * 100);

  const xpEarned = session.score * 20;
  const pointsEarned = session.score * 10;

  const win = percent >= 60;

  const updatedPlayer = syncTier(
    updateMatchResult(
      session.player,
      win,
      pointsEarned,
      xpEarned,
    ),
  );

  return {
    score: session.score,
    total,
    percent,
    xpEarned,
    pointsEarned,
    rank:
      percent >= 90 ? 'S' :
      percent >= 75 ? 'A' :
      percent >= 50 ? 'B' : 'C',
    updatedPlayer,
  };
}