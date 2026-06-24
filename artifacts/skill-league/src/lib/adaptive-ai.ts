import type { Question } from "@/lib/esport-question-engine";

// ─────────────────────────────────────────────
// 🧠 SkillLeague Adaptive AI System
// ─────────────────────────────────────────────

export function selectSmartQuestion(
  pool: Question[],
  streak: number
): Question {
  // 🎯 رفع الذكاء حسب الأداء
  const difficultyBoost = streak >= 3 ? 1.5 : 1;

  const weighted = pool
    .map((q) => ({
      ...q,
      weight: q.difficulty * difficultyBoost,
    }))
    .sort((a, b) => a.weight - b.weight);

  const randomIndex = Math.floor(Math.random() * weighted.length);

  return weighted[randomIndex];
}

// ─────────────────────────────────────────────
// 📈 Dynamic Difficulty Adjuster
// ─────────────────────────────────────────────

export function adjustDifficulty(streak: number) {
  if (streak >= 6) return 5; // insane level
  if (streak >= 4) return 4;
  if (streak >= 2) return 3;
  return 2;
}