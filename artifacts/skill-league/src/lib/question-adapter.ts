// ─────────────────────────────────────────────
// 🎮 SkillLeague Question Adapter
// يحوّل TriviaQ → Question (Engine Format)
// ─────────────────────────────────────────────

import {
  SPORTS_BANK,
  CULTURE_BANK,
  PHILOSOPHY_BANK,
  RELIGION_BANK,
  VISUAL_BANK,
  type TriviaQ,
} from '@/lib/question-bank';

import type { Question } from '@/lib/esport-question-engine';

// ─────────────────────────────────────────────
// 🔥 CATEGORY MAPPER
// ─────────────────────────────────────────────

function mapCategory(
  category: 'sports' | 'culture' | 'philosophy' | 'religion' | 'visual'
): 'sports' | 'culture' | 'philosophy' | 'religion' | 'visual' {
  return category;
}

// ─────────────────────────────────────────────
// 🔄 CONVERT SINGLE QUESTION
// ─────────────────────────────────────────────

function convert(
  q: TriviaQ,
  category: Question['category'],
  difficulty: Question['difficulty']
): Question {
  return {
    id: q.id,
    q: q.q,
    correct: q.correct,
    opts: q.opts,
    category,
    difficulty,
  };
}

// ─────────────────────────────────────────────
// 🎯 BUILD FULL QUESTION LIST
// ─────────────────────────────────────────────

export function buildQuestionDatabase(): Question[] {
  const questions: Question[] = [];

  // SPORTS
  questions.push(
    ...SPORTS_BANK.easy.map(q => convert(q, 'sports', 2)),
    ...SPORTS_BANK.medium.map(q => convert(q, 'sports', 4)),
    ...SPORTS_BANK.hard.map(q => convert(q, 'sports', 5)),
  );

  // CULTURE
  questions.push(
    ...CULTURE_BANK.easy.map(q => convert(q, 'culture', 2)),
    ...CULTURE_BANK.medium.map(q => convert(q, 'culture', 4)),
    ...CULTURE_BANK.hard.map(q => convert(q, 'culture', 5)),
  );

  // PHILOSOPHY
  questions.push(
    ...PHILOSOPHY_BANK.easy.map(q => convert(q, 'philosophy', 2)),
    ...PHILOSOPHY_BANK.medium.map(q => convert(q, 'philosophy', 4)),
    ...PHILOSOPHY_BANK.hard.map(q => convert(q, 'philosophy', 5)),
  );

  // RELIGION
  questions.push(
    ...RELIGION_BANK.easy.map(q => convert(q, 'religion', 2)),
    ...RELIGION_BANK.medium.map(q => convert(q, 'religion', 4)),
    ...RELIGION_BANK.hard.map(q => convert(q, 'religion', 5)),
  );

  // VISUAL
  questions.push(
    ...VISUAL_BANK.easy.map(q => convert(q, 'visual', 2)),
    ...VISUAL_BANK.medium.map(q => convert(q, 'visual', 4)),
    ...VISUAL_BANK.hard.map(q => convert(q, 'visual', 5)),
  );

  return questions;
}