// ─────────────────────────────────────────────
// 🎮 SkillLeague Esport Question Engine
// ─────────────────────────────────────────────

import type { TriviaQ } from "@/lib/question-bank";

export type Tier = "div3" | "div2" | "pro" | "champ";

export interface Question extends TriviaQ {
  id: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  category: "sports" | "culture" | "philosophy" | "religion" | "visual";
}

// ─────────────────────────────────────────────
// 🔥 GENERATE MATCH QUESTIONS (re-export adapter)
// ─────────────────────────────────────────────

export { generateMatchQuestions } from '@/lib/match-engine';

// ─────────────────────────────────────────────
// 🔥 TIER DIFFICULTY SYSTEM
// ─────────────────────────────────────────────

function getDifficultyRange(tier: Tier): [number, number] {
  switch (tier) {
    case "div3":
      return [1, 2];
    case "div2":
      return [2, 3];
    case "pro":
      return [3, 4];
    case "champ":
      return [4, 5];
  }
}

// ─────────────────────────────────────────────
// 🎯 ENGINE CORE
// ─────────────────────────────────────────────

export class EsportQuestionEngine {
  private usedQuestions = new Set<string>();

  constructor(private questions: Question[]) {}

  reset() {
    this.usedQuestions.clear();
  }

  private buildPool(tier: Tier, category?: string) {
    const [min, max] = getDifficultyRange(tier);

    return this.questions.filter((q) => {
      if (this.usedQuestions.has(q.id)) return false;
      if (category && q.category !== category) return false;
      return q.difficulty >= min && q.difficulty <= max;
    });
  }

  getMatchQuestions(count: number, tier: Tier, category?: string) {
    let pool = this.buildPool(tier, category);
    const result: Question[] = [];

    for (let i = 0; i < count; i++) {
      if (pool.length === 0) {
        this.reset();
        pool = this.buildPool(tier, category);
      }

      const index = Math.floor(Math.random() * pool.length);
      const q = pool.splice(index, 1)[0];

      if (!q) break;

      result.push(q);
      this.usedQuestions.add(q.id);
    }

    return result;
  }

  adaptTier(current: Tier, streak: number): Tier {
    if (current === "div3" && streak >= 3) return "div2";
    if (current === "div2" && streak >= 4) return "pro";
    if (current === "pro" && streak >= 5) return "champ";
    return current;
  }
}