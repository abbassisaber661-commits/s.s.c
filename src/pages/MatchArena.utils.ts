// عدد الأسئلة في المباراة
export const TOTAL_Q = 10;

// سرعة التحديث (1000ms = 1 ثانية)
export const TICK_MS = 1000;

// وقت الفلاش بعد الإجابة
export const FB_MS = 1200;

// مدة عرض السؤال الافتراضية
export const QUESTION_DISPLAY_MS = 5000;

// مراحل اللعبة
export type Phase =
  | 'idle'
  | 'searching'
  | 'found'
  | 'countdown'
  | 'puzzle_intro'
  | 'question'
  | 'feedback'
  | 'results';

// سجل الإجابة
export type AnswerRecord = {
  correct: boolean;
  points: number;
  timeLeftMs: number;
  timeLimitMs: number;
  category: string;
  reactionTimeMs: number;
};

// صف لاعب في النتائج
export type PlayerRow = {
  id: string;
  name: string;
  avatar: string;
  score: number;
  isPlayer: boolean;
};

// milestones (streak)
export type StreakMilestone = '3' | '5' | 'perfect' | null;

// إعدادات التصنيفات
export const CAT_CFG: Record<string, { label: string; icon: string }> = {
  math: { label: 'Math', icon: '🔢' },
  science: { label: 'Science', icon: '🧪' },
  history: { label: 'History', icon: '📜' },
  sports: { label: 'Sports', icon: '⚽' },
  geography: { label: 'Geography', icon: '🌍' },
};

// تحويل التير إلى division
export function toDivisionTier(tier: string) {
  switch (tier) {
    case 'training':
      return 'div3';
    case 'coin':
      return 'div2';
    case 'pro':
      return 'div1';
    case 'champion':
      return 'elite';
    default:
      return 'div3';
  }
}