export type Question = {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  category?: string;
  difficulty?: 1 | 2 | 3;
  translations?: Record<string, string>;
};

type EngineState = {
  allQuestions: Question[];
  usedQuestionIds: Set<string>;
};

class QuestionEngine {
  private state: EngineState = {
    allQuestions: [],
    usedQuestionIds: new Set(),
  };

  // =========================
  // LOAD QUESTIONS (SAFE COPY)
  // =========================
  load(questions: Question[]) {
    this.state.allQuestions = [...questions];
  }

  // =========================
  // RESET SESSION (NEW MATCH)
  // =========================
  reset() {
    this.state.usedQuestionIds = new Set();
  }

  // =========================
  // BUILD POOL
  // =========================
  private buildPool(category?: string): Question[] {
    return this.state.allQuestions.filter(q => {
      if (category && q.category !== category) return false;
      return !this.state.usedQuestionIds.has(q.id);
    });
  }

  // =========================
  // GET QUESTIONS (NO REPEAT GUARANTEED)
  // =========================
  getQuestions(count: number, category?: string): Question[] {
    const pool = this.buildPool(category);

    const result: Question[] = [];

    const available = [...pool];

    for (let i = 0; i < count; i++) {
      if (available.length === 0) {
        // 🔥 إعادة تعبئة آمنة (بدون recursion)
        this.reset();
        available.push(...this.buildPool(category));
      }

      const index = Math.floor(Math.random() * available.length);
      const q = available.splice(index, 1)[0];

      if (!q) break;

      result.push(q);
      this.state.usedQuestionIds.add(q.id);
    }

    return result;
  }

  // =========================
  // TRANSLATION SAFE
  // =========================
  translate(question: Question, lang: string): Question {
    const translated = question.translations?.[lang];

    if (!translated) return question;

    return {
      ...question,
      text: translated,
    };
  }

  // =========================
  // ANSWER CHECK
  // =========================
  checkAnswer(question: Question, answerIndex: number): boolean {
    return question.correctAnswer === answerIndex;
  }

  // =========================
  // DEBUG (IMPORTANT FOR BUG FIXING)
  // =========================
  debug() {
    return {
      totalQuestions: this.state.allQuestions.length,
      used: this.state.usedQuestionIds.size,
    };
  }
}

// singleton
export const questionEngine = new QuestionEngine();