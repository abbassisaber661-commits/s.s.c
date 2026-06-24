// ─────────────────────────────────────────────
// 🎮 SkillLeague Match Session (SOLO MODE)
// ─────────────────────────────────────────────

import { generateMatchQuestions } from '@/lib/esport-question-engine';
import type { PlayerRank } from '@/lib/ranked-system';

// ─────────────────────────────────────────────
// 🎯 MATCH SESSION TYPES
// ─────────────────────────────────────────────

export interface MatchSession {
  id: string;
  playerId: string;

  questions: any[];

  currentIndex: number;

  score: number;

  startedAt: number;

  finished: boolean;
}

// ─────────────────────────────────────────────
// 🚀 CREATE SOLO MATCH
// ─────────────────────────────────────────────

export function createMatchSession(
  player: PlayerRank,
  tier: string,
  questionCount = 10,
): MatchSession {
  const questions = generateMatchQuestions(
    questionCount,
    tier,
    1,
    Date.now(),
  );

  return {
    id: `session_${player.id}_${Date.now()}`,
    playerId: player.id,

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

export function answerQuestion(
  session: MatchSession,
  selectedIndex: number,
): MatchSession {
  const current = session.questions[session.currentIndex];

  if (!current || session.finished) return session;

  const isCorrect = current.correctIndex === selectedIndex;

  const updatedScore = isCorrect ? session.score + 1 : session.score;

  const nextIndex = session.currentIndex + 1;

  return {
    ...session,
    score: updatedScore,
    currentIndex: nextIndex,
    finished: nextIndex >= session.questions.length,
  };
}

// ─────────────────────────────────────────────
// 🏆 FINAL RESULT + POINTS INTEGRATION
// ─────────────────────────────────────────────

export function finishSession(session: MatchSession) {
  const total = session.questions.length;

  const percent = Math.round((session.score / total) * 100);

  // 🏆 points reward system (core progression)
  const basePoints = session.score * 10;

  const bonus =
    percent >= 90 ? 50 :
    percent >= 75 ? 30 :
    percent >= 50 ? 10 : 0;

  const totalPointsEarned = basePoints + bonus;

  return {
    score: session.score,
    total,
    percent,

    rank:
      percent >= 90 ? 'S' :
      percent >= 75 ? 'A' :
      percent >= 50 ? 'B' : 'C',

    // 🔥 NEW: progression system output
    pointsEarned: totalPointsEarned,
  };
}