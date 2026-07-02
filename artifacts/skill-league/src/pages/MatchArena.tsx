import { useState, useEffect, useRef, useMemo, type CSSProperties } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import {
  playCorrect, playWrong, playStreak, playStreak3, playStreak5, playPerfect,
  playTap, playWin, playLose, playPromotion, playWhoosh, playPuzzleSnap, playPauseChime,
} from '@/lib/sounds';
import { MATCH_BOTS, getMatchBots, simulateBotQuestion, type MatchBot } from '@/lib/match-engine';
import {
  loadLeagueStats, calcLpChange, applyLpChange, saveLeagueStats,
  getTier, type LpChange,
} from '@/lib/league-progression';
import {
  generateMatchSession, getPlayerSession, prepareSessionForDisplay,
  loadRecentQuestionIds, saveRecentQuestionIds,
  CORRECT_POINTS, type DisplayQuestion,
} from '@/lib/question-session';
import type { DivisionTier, PoolQuestion, PuzzleAssemblyQuestion } from '@/lib/question-pool';
import { getLang } from '@/lib/question-pool';
import type { Language } from '@/lib/i18n';
import {
  calcMatchEconomy, leagueTierToEconomyTier,
  loadLocalGems, saveLocalGems, economyApi,
  type EconomyResult,
} from '@/lib/economy';
import { api, type DailyStatus } from '@/lib/apiClient';

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_Q            = 10;
const TICK_MS            = 50;
const FB_MS              = 1100; // feedback shown briefly after timeout
const QUESTION_DISPLAY_MS = 5000; // fixed 5 s visible per question

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'searching' | 'found' | 'countdown' | 'puzzle_intro' | 'question' | 'feedback' | 'results';

interface AnswerRecord {
  correct:        boolean;
  points:         number;
  timeLeftMs:     number;
  timeLimitMs:    number;
  category:       string;
  reactionTimeMs: number; // ms from question appear → player click
}

interface PlayerRow {
  id:       string;
  name:     string;
  avatar:   string;
  score:    number;
  isPlayer: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDivisionTier(tier: string): DivisionTier {
  const m: Record<string, DivisionTier> = {
    training: 'div3',
    coin:     'div2',
    pro:      'pro',
    champion: 'champions',
  };
  return m[tier] ?? 'div3';
}

// ─── Category UI config ───────────────────────────────────────────────────────

const CAT_CFG: Record<string, { icon: string; color: string; label: string }> = {
  sports:           { icon: '⚽', color: '#FF8C42', label: 'Sports'       },
  culture:          { icon: '🎨', color: '#B44FFF', label: 'Culture'      },
  geography:        { icon: '🌍', color: '#3AB4FF', label: 'Geography'    },
  history:          { icon: '📜', color: '#FFD93D', label: 'History'      },
  philosophy:       { icon: '🤔', color: '#7DFFB3', label: 'Philosophy'   },
  religious:        { icon: '🕌', color: '#FF6EB4', label: 'Religious'    },
  visual_attention: { icon: '👁️', color: '#00E5FF', label: 'Visual'       },
  puzzle_assembly:  { icon: '🧩', color: '#FF3A5E', label: 'Puzzle'       },
  famous_people:    { icon: '🌟', color: '#FFD700', label: 'Famous'       },
};

// ─── Esports VFX Components ───────────────────────────────────────────────────

type StreakMilestone = '3' | '5' | 'perfect';

function StreakMilestoneBanner({ milestone }: { milestone: StreakMilestone | null }) {
  const cfg = milestone === '3'
    ? { icon: '🔥', label: 'ON FIRE!',      color: '#FF8C42', glow: '#FF8C42' }
    : milestone === '5'
    ? { icon: '⚡', label: 'UNSTOPPABLE!',  color: '#3AB4FF', glow: '#3AB4FF' }
    : milestone === 'perfect'
    ? { icon: '🌟', label: 'PERFECT RUN!',  color: '#FFD93D', glow: '#FFD93D' }
    : null;

  return (
    <AnimatePresence>
      {cfg && (
        <motion.div
          key={milestone}
          initial={{ opacity: 0, scale: 0.5, y: -30 }}
          animate={{ opacity: 1, scale: 1,   y: 0 }}
          exit={{   opacity: 0, scale: 1.2,  y: -20 }}
          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
          className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center gap-1"
          style={{ filter: `drop-shadow(0 0 24px ${cfg.glow}88)` }}>
          <motion.div
            animate={{ rotate: [0, -6, 6, -4, 4, 0] }}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
            className="text-5xl">
            {cfg.icon}
          </motion.div>
          <div
            className="text-2xl font-black tracking-widest uppercase px-5 py-1.5 rounded-2xl"
            style={{
              color: cfg.color,
              background: cfg.color + '22',
              border: `2px solid ${cfg.color}55`,
              textShadow: `0 0 20px ${cfg.glow}`,
            }}>
            {cfg.label}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AnswerFlash({ result }: { result: 'correct' | 'wrong' | null }) {
  return (
    <AnimatePresence>
      {result && (
        <motion.div
          key={result + Date.now()}
          initial={{ opacity: result === 'correct' ? 0.45 : 0.55 }}
          animate={{ opacity: 0 }}
          transition={{ duration: result === 'correct' ? 0.55 : 0.48, ease: 'easeOut' }}
          className="fixed inset-0 z-40 pointer-events-none"
          style={{
            background: result === 'correct'
              ? 'radial-gradient(ellipse at center, rgba(46,232,122,0.35) 0%, rgba(46,232,122,0.06) 70%, transparent 100%)'
              : 'radial-gradient(ellipse at center, rgba(255,58,94,0.40) 0%, rgba(255,58,94,0.08) 70%, transparent 100%)',
          }}
        />
      )}
    </AnimatePresence>
  );
}

// ─── Motivational Messages ────────────────────────────────────────────────────

const CORRECT_MSGS = ['أحسنت 👏', 'استمر 🔥', 'رد ممتاز ✨', 'رائع! 💪', 'ممتاز 🎯'];
const WRONG_MSGS   = ['لا بأس 💪', 'ستتحسن 📈', 'واصل اللعب 🏃', 'حاول مجدداً 💡'];
const STREAK_MSGS  = ['أنت في الطريق الصحيح 🏔️', 'قريب من القمة ⚡', 'أداء أسطوري 🌟', 'لا يُوقفك شيء 🔥'];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function MotivationalMessage({ result, streak }: { result: 'correct' | 'wrong' | null; streak: number }) {
  const msg = result === 'correct'
    ? streak >= 3 ? pickRandom(STREAK_MSGS) : pickRandom(CORRECT_MSGS)
    : result === 'wrong' ? pickRandom(WRONG_MSGS)
    : null;

  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          key={msg + Date.now()}
          initial={{ opacity: 0, y: 12, scale: 0.88 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-5 py-2.5 rounded-2xl text-sm font-black whitespace-nowrap"
          style={{
            background: result === 'correct'
              ? 'rgba(46,232,122,0.18)'
              : 'rgba(255,90,90,0.18)',
            border: result === 'correct'
              ? '1.5px solid rgba(46,232,122,0.4)'
              : '1.5px solid rgba(255,90,90,0.35)',
            color: result === 'correct' ? '#2EE87A' : '#FF8080',
            backdropFilter: 'blur(8px)',
            boxShadow: result === 'correct'
              ? '0 4px 24px rgba(46,232,122,0.2)'
              : '0 4px 24px rgba(255,90,90,0.18)',
          }}>
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Pause Break overlay ──────────────────────────────────────────────────────

const PAUSE_MSGS_STRONG  = ['أنت تقترب من القمة 🔥', 'أداء قوي جداً ⚡', 'لا يُوقفك شيء 💥'];
const PAUSE_MSGS_MED     = ['جيد 👏 استمر', 'تقدم رائع 📈', 'أنت في المسار الصحيح 🎯'];
const PAUSE_MSGS_LOW     = ['لا تقلق 💪 ما زال أمامك وقت للتطور', 'كل سؤال يُعلّمك شيئاً 💡', 'واصل وستتحسن 🏃'];

function PauseBreak({ correctPct, onResume }: { correctPct: number; onResume: () => void }) {
  const [countdown, setCountdown] = useState(6);
  const msg = correctPct >= 0.7
    ? pickRandom(PAUSE_MSGS_STRONG)
    : correctPct >= 0.45
    ? pickRandom(PAUSE_MSGS_MED)
    : pickRandom(PAUSE_MSGS_LOW);

  useEffect(() => {
    playPauseChime();
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); onResume(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-8"
      style={{ background: 'rgba(7,7,26,0.97)', backdropFilter: 'blur(12px)' }}>
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        className="text-7xl">
        ☕
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-center space-y-2">
        <p className="text-[11px] font-black text-white/35 uppercase tracking-widest">استراحة قصيرة</p>
        <p className="text-xl font-black text-white leading-snug text-center">{msg}</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black"
        style={{ border: '3px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.45)' }}>
        {countdown}
      </motion.div>
    </motion.div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  const cfg = CAT_CFG[category] ?? { icon: '❓', color: '#ffffff60', label: category };
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      key={category}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black"
      style={{ background: cfg.color + '1A', border: `1px solid ${cfg.color}45`, color: cfg.color }}>
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </motion.div>
  );
}

function DifficultyPips({ difficulty }: { difficulty: number }) {
  const color =
    difficulty === 1 ? '#2EE87A' :
    difficulty === 2 ? '#FFD93D' :
    difficulty === 3 ? '#FF8C42' : '#FF3A5E';
  return (
    <div className="flex gap-0.5 items-center" title={`Difficulty ${difficulty}/4`}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="w-1.5 h-1.5 rounded-full transition-all"
          style={{ background: i <= difficulty ? color : 'rgba(255,255,255,0.15)' }} />
      ))}
    </div>
  );
}

function TimerBar({ timeLeft, timeLimit }: { timeLeft: number; timeLimit: number }) {
  const frac  = Math.max(0, Math.min(1, timeLeft / timeLimit));
  const secs  = Math.ceil(timeLeft / 1000);
  const color =
    frac > 0.55 ? '#2EE87A' :
    frac > 0.28 ? '#FFD93D' : '#FF3A5E';
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center px-0.5">
        <span className="text-[10px] font-black text-white/35 uppercase tracking-widest">Time</span>
        <motion.span
          key={secs}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="text-sm font-black tabular-nums"
          style={{ color }}>
          {secs}s
        </motion.span>
      </div>
      <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 10px ${color}70` }}
          animate={{ width: `${frac * 100}%` }}
          transition={{ duration: TICK_MS / 1000, ease: 'linear' }}
        />
      </div>
    </div>
  );
}

function RankStrip({ rows }: { rows: PlayerRow[] }) {
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
      {sorted.map((p, rank) => (
        <motion.div
          key={p.id}
          layout
          className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl shrink-0"
          style={p.isPlayer
            ? { background: 'rgba(59,130,246,0.18)', border: '1.5px solid rgba(59,130,246,0.4)' }
            : { background: 'rgba(255,255,255,0.05)', border: '1.5px solid transparent' }}>
          <span className="text-base leading-none">{p.avatar}</span>
          <span className="text-[9px] font-black leading-none"
            style={{ color: rank === 0 ? '#FFD93D' : 'rgba(255,255,255,0.45)' }}>
            #{rank + 1}
          </span>
          <span className="text-[9px] tabular-nums font-bold text-white/40 leading-none">
            {p.score > 0 ? p.score : '—'}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function RoundProgress({ current, total, answers }: {
  current: number; total: number; answers: AnswerRecord[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-black text-white/45 whitespace-nowrap tabular-nums">
        {current + 1} / {total}
      </span>
      <div className="flex gap-1 flex-1">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-300"
            style={{
              background:
                i < current
                  ? (answers[i]?.correct ? '#2EE87A' : '#FF3A5E')
                  : i === current
                  ? 'rgba(255,255,255,0.55)'
                  : 'rgba(255,255,255,0.1)',
            }} />
        ))}
      </div>
    </div>
  );
}

// ─── Option buttons ───────────────────────────────────────────────────────────

type BtnState = 'idle' | 'correct' | 'wrong' | 'disabled';

function TextOptionBtn({
  text, index, state, onClick,
}: { text: string; index: number; state: BtnState; onClick: () => void }) {
  const bg =
    state === 'correct'  ? 'rgba(46,232,122,0.2)'  :
    state === 'wrong'    ? 'rgba(255,58,94,0.2)'   :
    state === 'disabled' ? 'rgba(255,255,255,0.03)' :
                           'rgba(255,255,255,0.07)';
  const border =
    state === 'correct'  ? '2px solid #2EE87A' :
    state === 'wrong'    ? '2px solid #FF3A5E' :
    state === 'disabled' ? '2px solid rgba(255,255,255,0.07)' :
                           '2px solid rgba(255,255,255,0.12)';
  const shadow =
    state === 'correct' ? '0 0 26px rgba(46,232,122,0.45)' :
    state === 'wrong'   ? '0 0 20px rgba(255,58,94,0.35)'  : 'none';
  const letter = String.fromCharCode(65 + index);
  return (
    <motion.button
      whileHover={state === 'idle' ? { scale: 1.02, boxShadow: '0 0 18px rgba(255,255,255,0.1)' } : {}}
      whileTap={{ scale: state === 'idle' ? 0.96 : 1 }}
      animate={state === 'correct'
        ? { scale: [1, 1.05, 0.98, 1.02, 1], transition: { duration: 0.4 } }
        : state === 'wrong'
        ? { x: [0, -8, 8, -5, 5, -3, 0], transition: { duration: 0.36 } }
        : {}}
      onClick={onClick}
      disabled={state !== 'idle'}
      className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left select-none transition-colors"
      style={{ background: bg, border, boxShadow: shadow, cursor: state === 'idle' ? 'pointer' : 'default' }}>
      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0"
        style={{
          background:
            state === 'correct' ? '#2EE87A' :
            state === 'wrong'   ? '#FF3A5E' : 'rgba(255,255,255,0.1)',
          color:
            state === 'correct' || state === 'wrong' ? '#fff' : 'rgba(255,255,255,0.5)',
        }}>
        {state === 'correct' ? '✓' : state === 'wrong' ? '✗' : letter}
      </span>
      <span className={`text-sm font-bold leading-snug ${state === 'disabled' ? 'text-white/30' : 'text-white/90'}`}>
        {text}
      </span>
    </motion.button>
  );
}

function EmojiOptionBtn({
  text, state, onClick,
}: { text: string; state: BtnState; onClick: () => void }) {
  const border =
    state === 'correct'  ? '2px solid #2EE87A' :
    state === 'wrong'    ? '2px solid #FF3A5E' :
    state === 'disabled' ? '2px solid rgba(255,255,255,0.07)' :
                           '2px solid rgba(255,255,255,0.12)';
  const bg =
    state === 'correct'  ? 'rgba(46,232,122,0.18)' :
    state === 'wrong'    ? 'rgba(255,58,94,0.18)'  :
    state === 'disabled' ? 'rgba(255,255,255,0.02)' :
                           'rgba(255,255,255,0.07)';
  return (
    <motion.button
      whileHover={state === 'idle' ? { scale: 1.04, boxShadow: '0 0 18px rgba(255,255,255,0.12)' } : {}}
      whileTap={{ scale: state === 'idle' ? 0.91 : 1 }}
      animate={state === 'correct'
        ? { scale: [1, 1.08, 0.97, 1.04, 1], transition: { duration: 0.4 } }
        : state === 'wrong'
        ? { x: [0, -7, 7, -4, 4, 0], transition: { duration: 0.34 } }
        : {}}
      onClick={onClick}
      disabled={state !== 'idle'}
      className="relative flex flex-col items-center justify-center gap-1 rounded-2xl py-4 select-none transition-colors"
      style={{ background: bg, border, cursor: state === 'idle' ? 'pointer' : 'default' }}>
      {state === 'correct' && (
        <span className="absolute top-1.5 right-2 text-green-400 text-xs font-black">✓</span>
      )}
      {state === 'wrong' && (
        <span className="absolute top-1.5 right-2 text-red-400 text-xs font-black">✗</span>
      )}
      <span className="text-[2.4rem] leading-none">{text}</span>
    </motion.button>
  );
}

// ─── Shuffle utility ──────────────────────────────────────────────────────────

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Real Image Puzzle Assembly ─────────────────────────────────────────────────
// Slices a REAL photo into grid pieces using CSS background-image technique.
// Supports HTML5 Drag & Drop + tap-to-select / tap-to-place fallback.
// Live per-piece colour feedback on every placement:
//   🟢 correct   = piece.row AND piece.col both match the slot
//   🟡 misplaced = piece.row OR piece.col matches (close but wrong)
//   🔴 wrong     = completely different row AND column
// ──────────────────────────────────────────────────────────────────────────────

const PUZZLE_IMAGE_POOL = [
  { seed: 'lion-pride-savanna',     label: { ar: 'أسد في السافانا',    en: 'Lion'         } },
  { seed: 'eagle-flight-sky',       label: { ar: 'نسر في السماء',      en: 'Eagle'        } },
  { seed: 'waterfall-jungle',       label: { ar: 'شلال في الغابة',     en: 'Waterfall'    } },
  { seed: 'tiger-jungle-hunt',      label: { ar: 'نمر في الغابة',      en: 'Tiger'        } },
  { seed: 'city-night-lights',      label: { ar: 'مدينة ليلية',        en: 'City Night'   } },
  { seed: 'ocean-waves-sunset',     label: { ar: 'أمواج المحيط',       en: 'Ocean Waves'  } },
  { seed: 'mountain-snow-peak',     label: { ar: 'قمة جبلية ثلجية',   en: 'Snowy Peak'   } },
  { seed: 'parrot-tropical-bird',   label: { ar: 'ببغاء استوائي',      en: 'Parrot'       } },
  { seed: 'camel-desert-dunes',     label: { ar: 'جمل في الصحراء',     en: 'Desert Camel' } },
  { seed: 'deer-forest-sunrise',    label: { ar: 'غزال في الغابة',     en: 'Deer'         } },
  { seed: 'dolphin-ocean-jump',     label: { ar: 'دلفين في المحيط',    en: 'Dolphin'      } },
  { seed: 'leopard-tree-africa',    label: { ar: 'فهد على شجرة',       en: 'Leopard'      } },
  { seed: 'aurora-borealis-night',  label: { ar: 'الشفق القطبي',       en: 'Aurora'       } },
  { seed: 'volcano-eruption-lava',  label: { ar: 'بركان ثائر',         en: 'Volcano'      } },
  { seed: 'elephant-herd-africa',   label: { ar: 'قطيع فيلة',         en: 'Elephants'    } },
  { seed: 'formula-car-race-track', label: { ar: 'سيارة سباق',         en: 'Race Car'     } },
  { seed: 'commercial-airplane-sky',label: { ar: 'طائرة في السماء',    en: 'Airplane'     } },
  { seed: 'skyscraper-glass-city',  label: { ar: 'ناطحة سحاب',         en: 'Skyscraper'   } },
  { seed: 'soccer-player-stadium',  label: { ar: 'لاعب كرة قدم',       en: 'Football'     } },
  { seed: 'polar-bear-arctic-snow', label: { ar: 'دب قطبي',            en: 'Polar Bear'   } },
];

function getGridDims(pieceCount: number): { cols: number; rows: number } {
  if (pieceCount <= 10) return { cols: 5, rows: 2 };
  if (pieceCount <= 15) return { cols: 5, rows: 3 };
  if (pieceCount <= 20) return { cols: 5, rows: 4 };
  return { cols: 5, rows: 5 };
}

interface ImgPiece { id: string; correctSlot: number; col: number; row: number; }
type SlotFeedback = 'correct' | 'misplaced' | 'wrong' | null;

// ─── Smart derangement shuffle — no piece sits at its own bank-index ─────────
function derangementShuffle<T>(arr: T[]): T[] {
  for (let attempt = 0; attempt < 40; attempt++) {
    const a = shuffleArr([...arr]);
    if (a.every((_, i) => a[i] !== arr[i])) return a;
  }
  return shuffleArr([...arr]);
}

// ─── Grade calculator ─────────────────────────────────────────────────────────
function calcPuzzleGrade(correctPct: number, hintsUsed: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  const score = Math.max(0, correctPct * 100 - hintsUsed * 5);
  if (score >= 95) return 'S';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

const GRADE_CFG = {
  S: { color: '#FFD93D', glow: 'rgba(255,217,61,0.6)',  label: 'PERFECT'   },
  A: { color: '#2EE87A', glow: 'rgba(46,232,122,0.55)', label: 'GREAT'     },
  B: { color: '#3AB4FF', glow: 'rgba(58,180,255,0.5)',  label: 'GOOD'      },
  C: { color: '#FF8C42', glow: 'rgba(255,140,66,0.45)', label: 'OK'        },
  D: { color: '#FF3A5E', glow: 'rgba(255,58,94,0.45)',  label: 'TRY AGAIN' },
};

// ─── Real Image Puzzle (Professional Edition) ────────────────────────────────

function RealImagePuzzle({
  pz,
  lang,
  onAnswer,
}: {
  pz:       PuzzleAssemblyQuestion;
  lang:     Language;
  onAnswer: (idx: number) => void;
}) {
  const { cols, rows } = useMemo(() => getGridDims(pz.pieceCount), [pz.pieceCount]);
  const totalPieces    = cols * rows;

  const imgEntry = useMemo(() => {
    const hash = pz.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return PUZZLE_IMAGE_POOL[Math.abs(hash) % PUZZLE_IMAGE_POOL.length];
  }, [pz.id]);

  const imageUrl = `https://picsum.photos/seed/${imgEntry.seed}/600/600`;

  const allPieces = useMemo<ImgPiece[]>(() => {
    const pieces: ImgPiece[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const slot = r * cols + c;
        pieces.push({ id: `piece_${pz.id}_${slot}`, correctSlot: slot, col: c, row: r });
      }
    return pieces;
  }, [pz.id, cols, rows]);

  // ── Core state ────────────────────────────────────────────────────────────
  const [board,      setBoard]      = useState<(ImgPiece | null)[]>(() => Array(totalPieces).fill(null));
  const [bank,       setBank]       = useState<ImgPiece[]>(() => derangementShuffle([...allPieces]));
  const [feedback,   setFeedback]   = useState<SlotFeedback[]>(() => Array(totalPieces).fill(null));
  const [submitted,  setSubmitted]  = useState(false);
  const [imgLoaded,  setImgLoaded]  = useState(false);
  const [selBankIdx, setSelBankIdx] = useState<number | null>(null);
  const [dragOver,   setDragOver]   = useState<number | null>(null);

  // ── Animation state ───────────────────────────────────────────────────────
  const [snapSlot,   setSnapSlot]   = useState<number | null>(null);  // green bounce
  const [wrongSlot,  setWrongSlot]  = useState<number | null>(null);  // red shake
  const [dragPiece,  setDragPiece]  = useState<ImgPiece | null>(null); // ghost preview

  // ── Hint system ───────────────────────────────────────────────────────────
  const [hintSlot,     setHintSlot]     = useState<number | null>(null);
  const [hintCooldown, setHintCooldown] = useState(0);
  const [hintsUsed,    setHintsUsed]    = useState(0);

  // ── Reference image modal ─────────────────────────────────────────────────
  const [showRefModal, setShowRefModal] = useState(false);

  // ── Hidden ascending timer ────────────────────────────────────────────────
  const startTimeRef = useRef<number>(Date.now());
  const [elapsedMs,  setElapsedMs]  = useState(0);

  // ── Wrong placement counter (for grade) ──────────────────────────────────
  const wrongPlacementsRef = useRef(0);

  // Ref to track drag source without re-renders
  type DragSrc = { from: 'bank'; idx: number } | { from: 'board'; slotIdx: number };
  const dragSrcRef = useRef<DragSrc | null>(null);

  // Reset on new puzzle
  useEffect(() => {
    setBoard(Array(totalPieces).fill(null));
    setBank(derangementShuffle([...allPieces]));
    setFeedback(Array(totalPieces).fill(null));
    setSelBankIdx(null);
    setSubmitted(false);
    setImgLoaded(false);
    setSnapSlot(null);
    setWrongSlot(null);
    setHintSlot(null);
    setHintCooldown(0);
    setHintsUsed(0);
    wrongPlacementsRef.current = 0;
    startTimeRef.current = Date.now();
    setElapsedMs(0);
  }, [pz.id]); // eslint-disable-line

  // Ascending timer
  useEffect(() => {
    startTimeRef.current = Date.now();
    const tick = setInterval(() => {
      if (!submitted) setElapsedMs(Date.now() - startTimeRef.current);
    }, 1000);
    return () => clearInterval(tick);
  }, [pz.id]); // eslint-disable-line

  // Hint cooldown countdown
  useEffect(() => {
    if (hintCooldown <= 0) return;
    const t = setInterval(() => setHintCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [hintCooldown]);

  // Layout constants
  const PIECE_W = 28;
  const PIECE_H = 28;
  const boardW  = cols * PIECE_W + (cols - 1) * 2;
  const boardH  = rows * PIECE_H + (rows - 1) * 2;

  // ── Evaluation helpers ────────────────────────────────────────────────────
  function evalPiece(piece: ImgPiece, slotIdx: number): SlotFeedback {
    if (piece.correctSlot === slotIdx) return 'correct';
    const slotRow = Math.floor(slotIdx / cols);
    const slotCol = slotIdx % cols;
    return (piece.row === slotRow || piece.col === slotCol) ? 'misplaced' : 'wrong';
  }

  function buildFeedback(brd: (ImgPiece | null)[]): SlotFeedback[] {
    return brd.map((p, i) => (p ? evalPiece(p, i) : null));
  }

  function finalizeBoard(brd: (ImgPiece | null)[]) {
    const fb = buildFeedback(brd);
    setFeedback(fb);
    setSubmitted(true);
    const allCorrect = fb.every(f => f === 'correct');
    setTimeout(() => onAnswer(allCorrect ? pz.c : (pz.c === 0 ? 1 : 0)), 2200);
  }

  function commitPlace(
    piece:    ImgPiece,
    slotIdx:  number,
    newBank:  ImgPiece[],
    newBoard: (ImgPiece | null)[],
  ) {
    if (newBoard[slotIdx] !== null) newBank.push(newBoard[slotIdx]!);
    newBoard[slotIdx] = piece;

    // Per-placement animation + audio feedback
    const fb = evalPiece(piece, slotIdx);
    if (fb === 'correct') {
      playPuzzleSnap();
      setSnapSlot(slotIdx);
      setTimeout(() => setSnapSlot(null), 500);
    } else {
      playWrong();
      wrongPlacementsRef.current += 1;
      setWrongSlot(slotIdx);
      setTimeout(() => setWrongSlot(null), 380);
    }

    if (newBank.length === 0) {
      setBoard([...newBoard]);
      setBank([]);
      finalizeBoard(newBoard);
    } else {
      setBoard([...newBoard]);
      setBank([...newBank]);
      setFeedback(buildFeedback(newBoard));
    }
  }

  // ── Hint ──────────────────────────────────────────────────────────────────
  function fireHint() {
    if (hintCooldown > 0 || submitted || bank.length === 0) return;
    const piece = bank[Math.floor(Math.random() * bank.length)];
    setHintSlot(piece.correctSlot);
    setHintsUsed(h => h + 1);
    setHintCooldown(10);
    setTimeout(() => setHintSlot(null), 1300);
  }

  // ── Drag & Drop handlers ──────────────────────────────────────────────────
  function onBankDragStart(idx: number, piece: ImgPiece) {
    dragSrcRef.current = { from: 'bank', idx };
    setDragPiece(piece);
    setSelBankIdx(null);
  }

  function onBoardPieceDragStart(slotIdx: number) {
    dragSrcRef.current = { from: 'board', slotIdx };
    setDragPiece(board[slotIdx]);
    setSelBankIdx(null);
  }

  function onDragEnd() {
    setDragPiece(null);
    setDragOver(null);
  }

  function onSlotDragOver(e: React.DragEvent, slotIdx: number) {
    e.preventDefault();
    if (dragOver !== slotIdx) setDragOver(slotIdx);
  }

  function onSlotDrop(e: React.DragEvent, slotIdx: number) {
    e.preventDefault();
    setDragOver(null);
    setDragPiece(null);
    const src = dragSrcRef.current;
    dragSrcRef.current = null;
    if (!src || submitted) return;

    const newBoard = [...board];
    const newBank  = [...bank];

    if (src.from === 'bank') {
      const piece = newBank.splice(src.idx, 1)[0];
      commitPlace(piece, slotIdx, newBank, newBoard);
    } else {
      const srcSlot = src.slotIdx;
      if (srcSlot === slotIdx) return;
      const piece = newBoard[srcSlot]!;
      newBoard[srcSlot] = null;
      setFeedback(buildFeedback(newBoard));
      commitPlace(piece, slotIdx, newBank, newBoard);
    }
  }

  function onBankAreaDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragPiece(null);
    const src = dragSrcRef.current;
    dragSrcRef.current = null;
    if (!src || src.from !== 'board' || submitted) return;
    const piece = board[src.slotIdx];
    if (!piece) return;
    const newBoard = [...board];
    newBoard[src.slotIdx] = null;
    const newFb = [...feedback]; newFb[src.slotIdx] = null;
    setBoard(newBoard); setBank(prev => [...prev, piece]); setFeedback(newFb);
  }

  // ── Tap handlers ─────────────────────────────────────────────────────────
  function handleBankTap(idx: number) {
    if (submitted) return;
    setSelBankIdx(prev => (prev === idx ? null : idx));
  }

  function handleSlotTap(slotIdx: number) {
    if (submitted) return;
    if (selBankIdx !== null) {
      const newBank  = [...bank];
      const piece    = newBank.splice(selBankIdx, 1)[0];
      setSelBankIdx(null);
      commitPlace(piece, slotIdx, newBank, [...board]);
    } else if (board[slotIdx] !== null) {
      const piece = board[slotIdx]!;
      const newBoard = [...board]; newBoard[slotIdx] = null;
      const newFb    = [...feedback]; newFb[slotIdx] = null;
      setBoard(newBoard); setBank(prev => [...prev, piece]); setFeedback(newFb);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const filledCount    = board.filter(Boolean).length;
  const progressPct    = (filledCount / totalPieces) * 100;
  const correctCount   = feedback.filter(f => f === 'correct').length;
  const misplacedCount = feedback.filter(f => f === 'misplaced').length;
  const wrongCount     = feedback.filter(f => f === 'wrong').length;
  const label          = lang === 'ar' ? imgEntry.label.ar : imgEntry.label.en;
  const elapsedS       = Math.floor(elapsedMs / 1000);
  const grade          = submitted ? calcPuzzleGrade(correctCount / totalPieces, hintsUsed) : null;
  const gradeCfg       = grade ? GRADE_CFG[grade] : null;

  // ── Border / glow helpers ─────────────────────────────────────────────────
  function slotBorderColor(fb: SlotFeedback, occupied: boolean, hovered: boolean, isHint: boolean): string {
    if (isHint)            return '#FFD93D';
    if (hovered)           return '#3AB4FF';
    if (fb === 'correct')  return '#2EE87A';
    if (fb === 'misplaced')return '#FFD93D';
    if (fb === 'wrong')    return '#FF3A5E';
    return occupied ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.1)';
  }

  function slotGlow(fb: SlotFeedback, hovered: boolean, isHint: boolean): string {
    if (isHint)            return '0 0 18px rgba(255,217,61,0.9)';
    if (hovered)           return '0 0 14px rgba(59,180,255,0.55)';
    if (fb === 'correct')  return '0 0 12px rgba(46,232,122,0.6)';
    if (fb === 'misplaced')return '0 0 10px rgba(255,217,61,0.55)';
    if (fb === 'wrong')    return '0 0 10px rgba(255,58,94,0.55)';
    return 'none';
  }

  // ── Piece renderer (CSS background-image slicing) ─────────────────────────
  function PieceDiv({ piece, w, h, opacity = 1 }: { piece: ImgPiece; w: number; h: number; opacity?: number }) {
    return (
      <div style={{
        width:              w,
        height:             h,
        opacity,
        backgroundImage:    `url(${imageUrl})`,
        backgroundSize:     `${cols * w}px ${rows * h}px`,
        backgroundPosition: `${-piece.col * w}px ${-piece.row * h}px`,
        backgroundRepeat:   'no-repeat',
      }} />
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3 w-full select-none">

      {/* ══ QUESTION HEADER ══════════════════════════════════════════════════ */}
      <div className="rounded-2xl px-4 py-3 border text-center"
        style={{ background: 'rgba(255,58,94,0.07)', borderColor: 'rgba(255,58,94,0.3)' }}>
        <p className="text-[13px] font-black text-white/90 leading-snug">
          🧩 {lang === 'ar' ? 'ركّب الصورة الحقيقية' : 'Assemble the real image'}
        </p>
        <p className="text-[10px] text-white/40 mt-0.5">{label} — {cols}×{rows}</p>
        {filledCount > 0 && (
          <div className="flex gap-2 justify-center mt-1.5 flex-wrap">
            {correctCount   > 0 && <span className="text-[9px] px-1.5 py-px rounded-full font-bold" style={{ background: 'rgba(46,232,122,0.15)',  color: '#2EE87A' }}>🟢 {correctCount}</span>}
            {misplacedCount > 0 && <span className="text-[9px] px-1.5 py-px rounded-full font-bold" style={{ background: 'rgba(255,217,61,0.12)',  color: '#FFD93D' }}>🟡 {misplacedCount}</span>}
            {wrongCount     > 0 && <span className="text-[9px] px-1.5 py-px rounded-full font-bold" style={{ background: 'rgba(255,58,94,0.12)',   color: '#FF3A5E' }}>🔴 {wrongCount}</span>}
          </div>
        )}
        {/* Progress bar */}
        <div className="h-1 rounded-full overflow-hidden mt-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <motion.div className="h-full rounded-full" style={{ background: '#FF3A5E' }}
            animate={{ width: `${progressPct}%` }} transition={{ duration: 0.2 }} />
        </div>
      </div>

      {/* ══ REFERENCE IMAGE  +  PUZZLE BOARD  (side-by-side) ════════════════ */}
      <div className="flex gap-2 items-start">

        {/* ── Left: Reference image (glass frame + hover zoom + view toggle) */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">
              {lang === 'ar' ? 'الأصل' : 'Ref'}
            </p>
            <button
              onClick={() => setShowRefModal(true)}
              className="text-[8px] px-1.5 py-px rounded-full font-bold transition-all"
              style={{ background: 'rgba(255,58,94,0.15)', color: 'rgba(255,58,94,0.7)', border: '1px solid rgba(255,58,94,0.25)' }}>
              {lang === 'ar' ? '👁 عرض' : '👁 View'}
            </button>
          </div>
          <motion.div
            whileHover={{ scale: 1.04 }}
            transition={{ duration: 0.18 }}
            className="rounded-xl overflow-hidden relative cursor-pointer"
            style={{
              borderRadius: 10,
              border: '2px solid rgba(255,58,94,0.4)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
              width: boardW, height: boardH,
              backdropFilter: 'blur(1px)',
            }}
            onClick={() => setShowRefModal(true)}>
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                <span className="text-white/30 text-xs animate-pulse">⏳</span>
              </div>
            )}
            <img src={imageUrl} alt={label} className="w-full h-full object-cover"
              loading="eager" onLoad={() => setImgLoaded(true)}
              style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s' }} />
            {/* Glass sheen overlay */}
            <div className="absolute inset-0 pointer-events-none rounded-xl"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 60%)' }} />
          </motion.div>
        </div>

        {/* ── Right: Assembly board ─────────────────────────────────────── */}
        <div className="flex flex-col gap-1 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">
              {lang === 'ar' ? 'اسحب أو اضغط' : 'Board'}
            </p>
            {/* Hint button */}
            {!submitted && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={fireHint}
                className="text-[8px] px-2 py-px rounded-full font-bold flex items-center gap-1 transition-all"
                style={{
                  background: hintCooldown > 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,217,61,0.12)',
                  border:     hintCooldown > 0 ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,217,61,0.3)',
                  color:      hintCooldown > 0 ? 'rgba(255,255,255,0.2)' : '#FFD93D',
                  cursor:     hintCooldown > 0 ? 'default' : 'pointer',
                }}>
                💡 {hintCooldown > 0 ? `${hintCooldown}s` : (lang === 'ar' ? 'تلميح' : 'Hint')}
              </motion.button>
            )}
          </div>

          <div
            className="inline-grid"
            style={{ gridTemplateColumns: `repeat(${cols}, ${PIECE_W}px)`, gap: 2 }}>
            {board.map((piece, slotIdx) => {
              const fb       = feedback[slotIdx];
              const hovered  = dragOver === slotIdx;
              const isHint   = hintSlot === slotIdx;
              const isSnap   = snapSlot === slotIdx;
              const isShake  = wrongSlot === slotIdx;
              // Show ghost only if slot is empty and we're hovering with a drag
              const showGhost = hovered && !piece && dragPiece !== null;

              return (
                <motion.div
                  key={slotIdx}
                  // Snap bounce: scale 1 → 0.92 → 1 on correct placement
                  animate={
                    isSnap  ? { scale: [1, 0.88, 1.06, 1] } :
                    isShake ? { x: [0, -5, 5, -4, 4, -2, 2, 0] } :
                    isHint  ? { scale: [1, 1.06, 1], boxShadow: ['0 0 18px rgba(255,217,61,0.9)', '0 0 28px rgba(255,217,61,1)', '0 0 18px rgba(255,217,61,0.9)'] } :
                    { scale: 1, x: 0 }
                  }
                  transition={
                    isSnap  ? { duration: 0.32, ease: 'easeOut' } :
                    isShake ? { duration: 0.35, ease: 'easeInOut' } :
                    isHint  ? { duration: 0.55, repeat: 1, repeatType: 'reverse' } :
                    { duration: 0.15 }
                  }
                  whileTap={{ scale: 0.91 }}
                  onClick={() => handleSlotTap(slotIdx)}
                  onDragOver={e => onSlotDragOver(e, slotIdx)}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => onSlotDrop(e, slotIdx)}
                  className="rounded-sm overflow-hidden cursor-pointer relative"
                  style={{
                    width:      PIECE_W,
                    height:     PIECE_H,
                    border:     `2px solid ${slotBorderColor(fb, !!piece, hovered, isHint)}`,
                    background: piece ? undefined : hovered ? 'rgba(59,180,255,0.09)' : 'rgba(255,255,255,0.03)',
                    boxShadow:  slotGlow(fb, hovered, isHint),
                    transition: 'border-color 0.18s, box-shadow 0.18s, background 0.12s',
                  }}>

                  {/* Ghost preview (semi-transparent piece when dragging over empty slot) */}
                  {showGhost && (
                    <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.45 }}>
                      <PieceDiv piece={dragPiece} w={PIECE_W} h={PIECE_H} />
                    </div>
                  )}

                  {piece ? (
                    <div
                      draggable={!submitted}
                      onDragStart={() => onBoardPieceDragStart(slotIdx)}
                      onDragEnd={onDragEnd}
                      style={{ width: '100%', height: '100%', cursor: submitted ? 'default' : 'grab' }}>
                      <PieceDiv piece={piece} w={PIECE_W} h={PIECE_H} />
                      {/* Correct overlay — green glow pulse */}
                      {fb === 'correct' && (
                        <motion.div
                          className="absolute inset-0 pointer-events-none"
                          animate={{ opacity: [0.5, 0.15, 0.5] }}
                          transition={{ duration: 1.8, repeat: Infinity }}
                          style={{ background: 'rgba(46,232,122,0.18)', borderRadius: 2 }}>
                          <div className="absolute bottom-0.5 right-0.5 text-[8px] font-black"
                            style={{ color: '#2EE87A', textShadow: '0 0 5px #2EE87A' }}>✓</div>
                        </motion.div>
                      )}
                      {fb === 'misplaced' && (
                        <div className="absolute inset-0 flex items-end justify-end pointer-events-none pb-0.5 pr-0.5">
                          <span className="text-[8px] font-black" style={{ color: '#FFD93D', textShadow: '0 0 5px #FFD93D' }}>!</span>
                        </div>
                      )}
                      {fb === 'wrong' && (
                        <div className="absolute inset-0 flex items-end justify-end pointer-events-none pb-0.5 pr-0.5">
                          <span className="text-[8px] font-black" style={{ color: '#FF3A5E', textShadow: '0 0 5px #FF3A5E' }}>✕</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[5px] font-black text-white/10">{slotIdx + 1}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══ PIECES BANK ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {!submitted && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
            onDragOver={e => e.preventDefault()}
            onDrop={onBankAreaDrop}>
            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1.5">
              {lang === 'ar' ? 'القطع — اسحب أو اضغط ثم اضغط خانة' : 'Pieces — drag or tap then tap a slot'}
            </p>
            <div className="flex flex-wrap gap-1.5 min-h-[36px]">
              <AnimatePresence mode="popLayout">
                {bank.map((piece, i) => {
                  const isSel = selBankIdx === i;
                  return (
                    <motion.div
                      key={piece.id}
                      layout
                      initial={{ scale: 0.55, opacity: 0 }}
                      animate={{ scale: isSel ? 1.1 : 1, opacity: 1 }}
                      exit={{ scale: 0.45, opacity: 0, transition: { duration: 0.12 } }}
                      whileHover={{ scale: isSel ? 1.1 : 1.06, zIndex: 5 }}
                      whileTap={{ scale: 0.85 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                      draggable
                      onDragStart={() => onBankDragStart(i, piece)}
                      onDragEnd={onDragEnd}
                      onClick={() => handleBankTap(i)}
                      className="rounded-sm overflow-hidden relative"
                      style={{
                        width:     PIECE_W,
                        height:    PIECE_H,
                        border:    isSel ? '2px solid #FF3A5E' : '2px solid rgba(255,255,255,0.18)',
                        boxShadow: isSel
                          ? '0 0 16px rgba(255,58,94,0.75), 0 4px 12px rgba(0,0,0,0.4)'
                          : '0 2px 6px rgba(0,0,0,0.3)',
                        cursor:    'grab',
                        zIndex:    isSel ? 10 : 1,
                      }}>
                      <PieceDiv piece={piece} w={PIECE_W} h={PIECE_H} />
                      {isSel && (
                        <div className="absolute inset-0 pointer-events-none"
                          style={{ background: 'rgba(255,58,94,0.22)', borderRadius: 2 }} />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {bank.length === 0 && !submitted && (
                <p className="text-[11px] text-white/20 italic self-center animate-pulse">
                  {lang === 'ar' ? 'جاري التقييم…' : 'Evaluating…'}
                </p>
              )}
            </div>

            {/* Colour legend + hint info */}
            <div className="flex gap-2 flex-wrap mt-2 items-center">
              <span className="text-[8px] px-1.5 py-px rounded-full" style={{ background: 'rgba(46,232,122,0.08)', color: 'rgba(46,232,122,0.55)', border: '1px solid rgba(46,232,122,0.2)' }}>🟢 {lang === 'ar' ? 'صحيح' : 'Correct'}</span>
              <span className="text-[8px] px-1.5 py-px rounded-full" style={{ background: 'rgba(255,217,61,0.07)', color: 'rgba(255,217,61,0.55)', border: '1px solid rgba(255,217,61,0.18)' }}>🟡 {lang === 'ar' ? 'جزئي' : 'Partial'}</span>
              <span className="text-[8px] px-1.5 py-px rounded-full" style={{ background: 'rgba(255,58,94,0.07)',  color: 'rgba(255,58,94,0.55)',  border: '1px solid rgba(255,58,94,0.18)'  }}>🔴 {lang === 'ar' ? 'خاطئ' : 'Wrong'}</span>
              {hintsUsed > 0 && (
                <span className="text-[8px] px-1.5 py-px rounded-full ml-auto" style={{ background: 'rgba(255,217,61,0.07)', color: 'rgba(255,217,61,0.5)', border: '1px solid rgba(255,217,61,0.15)' }}>
                  💡 ×{hintsUsed}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ FINAL RESULT BANNER ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {submitted && grade && gradeCfg && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.92 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="rounded-2xl px-4 py-4 text-center overflow-hidden relative"
            style={{
              background: `${gradeCfg.color}0D`,
              border: `1.5px solid ${gradeCfg.color}40`,
            }}>

            {/* Ambient glow */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at 50% 0%, ${gradeCfg.glow} 0%, transparent 70%)`, opacity: 0.35 }} />

            {/* Grade badge */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.1 }}
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-2 text-3xl font-black"
              style={{
                background: `${gradeCfg.color}20`,
                border: `2px solid ${gradeCfg.color}55`,
                color: gradeCfg.color,
                textShadow: `0 0 20px ${gradeCfg.glow}`,
                boxShadow: `0 0 24px ${gradeCfg.glow}`,
              }}>
              {grade}
            </motion.div>

            <p className="font-black text-sm tracking-widest uppercase mb-2"
              style={{ color: gradeCfg.color }}>{gradeCfg.label}</p>

            {/* Score breakdown */}
            <div className="flex justify-center gap-2 flex-wrap mb-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(46,232,122,0.15)', color: '#2EE87A' }}>
                🟢 {correctCount}/{totalPieces}
              </span>
              {misplacedCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(255,217,61,0.15)', color: '#FFD93D' }}>
                  🟡 {misplacedCount}
                </span>
              )}
              {wrongCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(255,58,94,0.15)', color: '#FF3A5E' }}>
                  🔴 {wrongCount}
                </span>
              )}
            </div>

            <div className="flex justify-center gap-3 text-[9px] text-white/30">
              <span>⏱ {elapsedS}s</span>
              {wrongPlacementsRef.current > 0 && <span>❌ {wrongPlacementsRef.current} {lang === 'ar' ? 'خطأ' : 'errors'}</span>}
              {hintsUsed > 0 && <span>💡 {hintsUsed} {lang === 'ar' ? 'تلميح' : 'hint'}{hintsUsed > 1 ? 's' : ''}</span>}
              <span>🎯 {Math.round((correctCount / totalPieces) * 100)}%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ REFERENCE IMAGE MODAL ════════════════════════════════════════════ */}
      <AnimatePresence>
        {showRefModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowRefModal(false)}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              className="relative rounded-2xl overflow-hidden"
              style={{
                boxShadow: '0 0 60px rgba(255,58,94,0.4), 0 20px 60px rgba(0,0,0,0.6)',
                border: '2px solid rgba(255,58,94,0.4)',
                maxWidth: 320, maxHeight: 320, width: '100%', height: '100%',
              }}
              onClick={e => e.stopPropagation()}>
              <img src={imageUrl} alt={label}
                className="w-full h-full object-cover"
                style={{ display: 'block' }} />
              <div className="absolute top-2 right-2">
                <button
                  onClick={() => setShowRefModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm"
                  style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  ✕
                </button>
              </div>
              <div className="absolute bottom-0 inset-x-0 px-3 py-2"
                style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                <p className="text-sm font-black text-white">{label}</p>
                <p className="text-[10px] text-white/50">{cols}×{rows} — {totalPieces} pieces</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Question Renderer ────────────────────────────────────────────────────────

function QuestionRenderer({
  dq, phase, selIdx, onAnswer, lang,
}: {
  dq: DisplayQuestion;
  phase: Phase;
  selIdx: number | null;
  onAnswer: (idx: number) => void;
  lang: Language;
}) {
  const src  = dq.source;
  const type = src.type;

  function optState(i: number): BtnState {
    if (phase !== 'feedback') return 'idle';
    if (i === dq.correctIndex) return 'correct';
    if (i === selIdx)          return 'wrong';
    return 'disabled';
  }

  function handleClick(i: number) {
    if (phase === 'question') { playTap(); onAnswer(i); }
  }

  // ── Visual Attention: big emoji display + instruction ──────────────────────
  if (type === 'visual_attention') {
    const va = src as Extract<PoolQuestion, { type: 'visual_attention' }>;
    return (
      <div className="flex flex-col gap-5 w-full">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-2xl px-6 py-4 border flex items-center justify-center"
            style={{ background: 'rgba(0,229,255,0.07)', borderColor: 'rgba(0,229,255,0.2)' }}>
            <span className="text-5xl leading-none tracking-wider">{va.display}</span>
          </div>
          <div className="rounded-2xl px-4 py-3 border text-center"
            style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">
              Find it!
            </p>
            <p className="text-sm font-black text-white/90 leading-snug">{dq.text}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {dq.options.map((opt, i) => (
            <EmojiOptionBtn key={i} text={opt} state={optState(i)} onClick={() => handleClick(i)} />
          ))}
        </div>
      </div>
    );
  }

  // ── Puzzle Assembly: real image slicing + tap-to-place ───────────────────
  if (type === 'puzzle_assembly') {
    const pz = src as PuzzleAssemblyQuestion;
    return (
      <RealImagePuzzle
        key={pz.id}
        pz={pz}
        lang={lang}
        onAnswer={onAnswer}
      />
    );
  }

  // ── Knowledge (default): question text + 4 answer buttons ─────────────────
  const staggerContainer = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
  };
  const staggerItem = {
    hidden: { opacity: 0, y: 14, scale: 0.96 },
    show:   { opacity: 1, y: 0,  scale: 1,    transition: { type: 'spring' as const, stiffness: 340, damping: 26 } },
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <motion.div
        key={dq.source.id + '_q'}
        initial={{ opacity: 0, y: -10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,   scale: 1    }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="rounded-2xl px-4 py-4 border min-h-[76px] flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 24px rgba(0,0,0,0.25)' }}>
        <p className="text-[15px] font-bold text-white/92 text-center leading-relaxed">{dq.text}</p>
      </motion.div>
      <motion.div
        key={dq.source.id + '_opts'}
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-2.5">
        {dq.options.map((opt, i) => (
          <motion.div key={i} variants={staggerItem}>
            <TextOptionBtn text={opt} index={i} state={optState(i)} onClick={() => handleClick(i)} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MatchArena() {
  const [, setLocation] = useLocation();
  const game            = useGame();
  const { authUser }    = game;
  const playerName      = authUser?.username ?? 'You';
  const playerId        = authUser?.uid ?? 'guest_local';
  const language        = game.language ?? 'ar';

  const [phase,     setPhase]     = useState<Phase>('idle');
  const [cdNum,     setCdNum]     = useState(3);
  const [qIndex,    setQIndex]    = useState(0);
  const [currentDQ, setCurrentDQ] = useState<DisplayQuestion | null>(null);
  const [timeLeft,  setTimeLeft]  = useState(0);
  const [score,     setScore]     = useState(0);
  const [streak,    setStreak]    = useState(0);
  const [selIdx,    setSelIdx]    = useState<number | null>(null);
  const [lastPts,   setLastPts]   = useState(0);
  const [botScores, setBotScores] = useState<number[]>([]);
  const [answers,   setAnswers]   = useState<AnswerRecord[]>([]);
  const [finalRows, setFinalRows] = useState<PlayerRow[]>([]);
  const [lpChange,          setLpChange]          = useState<LpChange | null>(null);
  const [matchTier,         setMatchTier]         = useState('training');
  const [economyResult,     setEconomyResult]     = useState<EconomyResult | null>(null);
  const [streakMilestone,   setStreakMilestone]   = useState<StreakMilestone | null>(null);
  const [answerFlash,       setAnswerFlash]       = useState<'correct' | 'wrong' | null>(null);
  const [shakeQ,            setShakeQ]            = useState(false);
  const [motivMsg,          setMotivMsg]          = useState<'correct' | 'wrong' | null>(null);
  const [pauseActive,       setPauseActive]       = useState(false);
  const questionsSincePauseRef = useRef(0);
  const questionStartRef       = useRef<number>(0);
  const playerAnsweredRef      = useRef<boolean>(false);

  const questionsRef  = useRef<DisplayQuestion[]>([]);
  const qIndexRef     = useRef(0);
  const scoreRef      = useRef(0);
  const streakRef     = useRef(0);
  const timeLeftRef   = useRef(0);
  const matchBotsRef  = useRef<MatchBot[]>(MATCH_BOTS.slice(0, 4));
  const botScoresRef  = useRef<number[]>([0, 0, 0, 0]);
  const botStreaksRef = useRef<number[]>([0, 0, 0, 0]);
  const phaseRef      = useRef<Phase>('idle');
  const matchTierRef  = useRef('training');
  const divTierRef    = useRef<DivisionTier>('div3');
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const botTimersRef  = useRef<ReturnType<typeof setTimeout>[]>([]);
  const answersRef    = useRef<AnswerRecord[]>([]);

  const [dailyStatus,        setDailyStatus]        = useState<DailyStatus | null>(null);
  const [nextMatchCountdown, setNextMatchCountdown] = useState<string>('');

  useEffect(() => {
    api.matches.dailyStatus(playerId !== 'guest_local' ? playerId : undefined)
      .then(s => setDailyStatus(s))
      .catch(() => setDailyStatus({ canPlay: true, nextMatchAt: null, matchesPlayedToday: 0 }));
  }, [playerId]);

  useEffect(() => {
    if (!dailyStatus?.nextMatchAt) return;
    function tick() {
      const diff = new Date(dailyStatus!.nextMatchAt!).getTime() - Date.now();
      if (diff <= 0) {
        setDailyStatus(s => s ? { ...s, canPlay: true, nextMatchAt: null } : s);
        setNextMatchCountdown('');
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setNextMatchCountdown(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`,
      );
    }
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [dailyStatus?.nextMatchAt]);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => () => clearAllTimers(), []); // eslint-disable-line

  function clearAllTimers() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    botTimersRef.current.forEach(clearTimeout);
    botTimersRef.current = [];
  }

  // ── Finish match ────────────────────────────────────────────────────────────
  function finishMatch() {
    clearAllTimers();

    // Persist the IDs of every question shown this match so they are
    // deprioritised in the next match (duplicate prevention).
    const shownIds = questionsRef.current.map(dq => dq.source.id).filter(Boolean);
    if (shownIds.length > 0) saveRecentQuestionIds(shownIds, divTierRef.current);

    const rows: PlayerRow[] = [
      { id: 'player', name: playerName, avatar: '👤', score: scoreRef.current, isPlayer: true },
      ...matchBotsRef.current.map((b, i) => ({
        id: b.id, name: b.name, avatar: b.avatar,
        score: botScoresRef.current[i] ?? 0, isPlayer: false,
      })),
    ];
    setFinalRows(rows);
    const sorted = [...rows].sort((a, b) => b.score - a.score);
    const rankPos = sorted.findIndex(r => r.isPlayer);
    const rec      = answersRef.current;
    const isPerfect = rec.length > 0 && rec.every(a => a.correct);
    if (isPerfect) {
      playPerfect();
      setTimeout(() => {
        setStreakMilestone('perfect');
        setTimeout(() => setStreakMilestone(null), 2400);
      }, 600);
    } else if (rankPos === 0) {
      playWin();
    } else {
      playLose();
    }

    let s = 0, bst = 0;
    for (const a of rec) { s = a.correct ? s + 1 : 0; bst = Math.max(bst, s); }

    const correctPct = rec.length > 0 ? rec.filter(a => a.correct).length / rec.length : 0;
    const rank       = rankPos + 1;

    const matchResult = {
      score:      scoreRef.current,
      rank,
      bestStreak: bst,
      correctPct,
    };

    const prevStats = loadLeagueStats();
    const change    = calcLpChange(prevStats, matchResult);
    const nextStats = applyLpChange(prevStats, change, matchResult);
    saveLeagueStats(nextStats);
    setLpChange(change);

    // ── Economy Engine ─────────────────────────────────────────────────────
    // Calculate rewards immediately (local) for instant display
    const currentTier = matchTierRef.current;
    const economyTier = leagueTierToEconomyTier(currentTier);
    const localGems   = loadLocalGems();
    const econResult  = calcMatchEconomy(
      { rank, accuracyPct: correctPct, tier: economyTier },
      0,       // coins: server handles persisting actual balance
      localGems,
    );
    // Persist gems locally for instant UI
    saveLocalGems(econResult.newGems);
    setEconomyResult(econResult);

    // Persist server-side (non-blocking — UI already shows local result)
    economyApi.reportMatchResult({
      playerId:   playerId,
      playerName: playerName,
      rank,
      accuracyPct: correctPct,
      tier:        currentTier,
    }).then(serverResult => {
      saveLocalGems(serverResult.newGems);
    }).catch(() => { /* non-critical */ });

    // ── Save match to server → persists LP / XP / Coins in DB ─────────────
    if (playerId !== 'guest_local') {
      const botId = matchBotsRef.current[0]?.id ?? 'bot_1';
      api.matches.create({
        playerAId:    playerId,
        playerBId:    botId,
        leagueId:     matchTierRef.current,
        playerAScore: scoreRef.current,
        playerBScore: botScoresRef.current[0] ?? 0,
        duration:     30,
        accuracy:     correctPct,
        bestStreak:   bst,
        rounds:       [],
      }).then(serverMatch => {
        if (serverMatch?.rewards) {
          const { lp: lpR, coins: coinsR } = serverMatch.rewards;
          // Sync authoritative LP from server into localStorage
          const stored = loadLeagueStats();
          stored.lp = lpR.newLp;
          saveLeagueStats(stored);
          // Update in-memory LP display with server-confirmed value
          setLpChange(prev => prev
            ? { ...prev, newLp: lpR.newLp, oldLp: lpR.oldLp, delta: lpR.delta,
                oldTier: lpR.oldTier as typeof prev.oldTier,
                newTier: lpR.newTier as typeof prev.newTier }
            : prev,
          );
          // Sync server-awarded coins into GameContext / localStorage so that
          // useDbSync won't overwrite the DB with a stale pre-match balance.
          if (coinsR?.earned && coinsR.earned > 0) {
            game.addCoins(coinsR.earned);
          }
          // Mark daily match used (next UTC midnight)
          const tomorrow = new Date(); tomorrow.setUTCHours(0,0,0,0); tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
          setDailyStatus({ canPlay: false, nextMatchAt: tomorrow.toISOString(), matchesPlayedToday: 1 });
        }
      }).catch(() => { /* non-critical — local display already correct */ });
    } else {
      // Guest: mark daily match used in local state so the session is consistent
      setDailyStatus(s => s ? { ...s, canPlay: false, matchesPlayedToday: 1 } : s);
    }

    setPhase('results');
    phaseRef.current = 'results';
  }

  // ── Advance to next question ────────────────────────────────────────────────
  function advanceQuestion() {
    const next = qIndexRef.current + 1;
    if (next >= TOTAL_Q || next >= questionsRef.current.length) {
      finishMatch();
      return;
    }

    questionsSincePauseRef.current += 1;

    // Pause break every 5 questions
    if (questionsSincePauseRef.current >= 5) {
      questionsSincePauseRef.current = 0;
      setPauseActive(true);
      // PauseBreak component will call onResume automatically after countdown
      return;
    }

    qIndexRef.current = next;
    setQIndex(next);
    loadQuestion(next);
  }

  function resumeAfterPause() {
    setPauseActive(false);
    const next = qIndexRef.current + 1;
    qIndexRef.current = next;
    setQIndex(next);
    loadQuestion(next);
  }

  // ── Handle player answer ────────────────────────────────────────────────────
  function handleAnswer(optIdx: number, timedOut = false) {
    if (phaseRef.current !== 'question') return;

    const reactionTimeMs = timedOut
      ? QUESTION_DISPLAY_MS
      : Math.max(0, Date.now() - questionStartRef.current);

    if (timedOut) {
      // Countdown already hit 0 — timer cleared itself; only clear bot timers
      botTimersRef.current.forEach(clearTimeout);
      botTimersRef.current = [];
    } else {
      // Player answered before time ran out — lock input but keep countdown running
      playerAnsweredRef.current = true;
      botTimersRef.current.forEach(clearTimeout);
      botTimersRef.current = [];
    }

    phaseRef.current = 'feedback';
    setPhase('feedback');

    const dq = questionsRef.current[qIndexRef.current];
    if (!dq) return;

    const correct   = !timedOut && optIdx === dq.correctIndex;
    const newStreak = correct ? streakRef.current + 1 : 0;
    const pts       = correct ? CORRECT_POINTS : 0;
    const newScore  = scoreRef.current + pts;

    scoreRef.current  = newScore;
    streakRef.current = newStreak;
    answersRef.current.push({
      correct, points: pts,
      timeLeftMs:     timeLeftRef.current,
      timeLimitMs:    dq.timeLimitMs,
      category:       dq.category,
      reactionTimeMs,
    });

    setSelIdx(timedOut ? null : optIdx);
    setLastPts(pts);
    setScore(newScore);
    setStreak(newStreak);
    setAnswers([...answersRef.current]);

    if (!timedOut) {
      if (correct) {
        playCorrect();
        setAnswerFlash('correct');
        setMotivMsg('correct');
        setTimeout(() => setAnswerFlash(null), 600);
        setTimeout(() => setMotivMsg(null), 3000);

        // Streak milestone banners
        if (newStreak === 5) {
          playStreak5();
          setStreakMilestone('5');
          setTimeout(() => setStreakMilestone(null), 1600);
        } else if (newStreak === 3) {
          playStreak3();
          setStreakMilestone('3');
          setTimeout(() => setStreakMilestone(null), 1500);
        } else if (newStreak > 5) {
          playStreak(newStreak);
        }
      } else {
        playWrong();
        setAnswerFlash('wrong');
        setMotivMsg('wrong');
        setTimeout(() => setAnswerFlash(null), 500);
        setTimeout(() => setMotivMsg(null), 3000);
        setShakeQ(true);
        setTimeout(() => setShakeQ(false), 450);
      }
      // ⬆ Countdown timer will fire advanceQuestion() when it reaches 0
      // Exception: puzzle questions have NO countdown timer — advance manually.
      if (dq.source.type === 'puzzle_assembly') {
        setTimeout(advanceQuestion, 800);
      }
    } else {
      // Timed-out: timer is already at 0, advance after brief feedback moment
      setTimeout(advanceQuestion, FB_MS);
    }
  }

  // ── Load question ───────────────────────────────────────────────────────────
  function loadQuestion(idx: number) {
    const dq = questionsRef.current[idx];
    if (!dq) return;

    setCurrentDQ(dq);
    setTimeLeft(dq.timeLimitMs);
    setSelIdx(null);
    setLastPts(0);

    // ── Puzzle Assembly gets a 2-second intro announcement ──────────────────
    // This ensures the player can NEVER miss a puzzle — a full-screen overlay
    // announces the upcoming puzzle round before the timer starts.
    if (dq.source.type === 'puzzle_assembly') {
      phaseRef.current = 'puzzle_intro';
      setPhase('puzzle_intro');
      const introTimer = setTimeout(() => {
        startQuestionTimer(dq);
      }, 2000);
      botTimersRef.current.push(introTimer);
      return;
    }

    startQuestionTimer(dq);
  }

  // ── Actually start a question with its countdown timer ──────────────────────
  function startQuestionTimer(dq: DisplayQuestion) {
    // Fixed 5-second display per question; bots still use the question's own timeLimitMs
    playerAnsweredRef.current = false;
    questionStartRef.current  = Date.now();
    timeLeftRef.current       = QUESTION_DISPLAY_MS;
    setTimeLeft(QUESTION_DISPLAY_MS);
    phaseRef.current = 'question';
    setPhase('question');
    playWhoosh();

    // Simulate bots answering (based on question's native limit, not the fixed display time)
    matchBotsRef.current.forEach((bot, bi) => {
      const res  = simulateBotQuestion(bot, dq.timeLimitMs, botStreaksRef.current[bi] ?? 0);
      const bPts = res.correct ? CORRECT_POINTS : 0;
      const t    = setTimeout(() => {
        botScoresRef.current[bi]  = (botScoresRef.current[bi] ?? 0) + bPts;
        botStreaksRef.current[bi] = res.correct ? (botStreaksRef.current[bi] ?? 0) + 1 : 0;
        setBotScores([...botScoresRef.current]);
      }, res.timeMs);
      botTimersRef.current.push(t);
    });

    // Puzzle assembly uses a hidden ascending timer — player completes it manually.
    if (dq.source.type === 'puzzle_assembly') return;

    // Fixed 5-second countdown
    timerRef.current = setInterval(() => {
      timeLeftRef.current -= TICK_MS;
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        if (playerAnsweredRef.current) {
          // Player already answered — just advance (feedback was shown while timer ran)
          advanceQuestion();
        } else {
          // Player ran out of time — show timeout feedback then advance
          handleAnswer(-1, true);
        }
      }
    }, TICK_MS);
  }

  // ── Enter match ─────────────────────────────────────────────────────────────
  function enterMatch() {
    playTap();
    clearAllTimers();

    const stats   = loadLeagueStats();
    const tier    = getTier(stats.lp);
    const divTier = toDivisionTier(tier);
    const matchId = `${tier}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const recentIds  = loadRecentQuestionIds(divTier);
    const session    = generateMatchSession(matchId, divTier, recentIds);
    const playerSess = getPlayerSession(session, playerId);
    const allQs      = prepareSessionForDisplay(playerSess, language);
    const questions  = allQs.slice(0, TOTAL_Q);

    const matchBots = getMatchBots(divTier);
    matchBotsRef.current  = matchBots;

    questionsRef.current  = questions;
    qIndexRef.current     = 0;
    scoreRef.current      = 0;
    streakRef.current     = 0;
    answersRef.current    = [];
    botScoresRef.current  = matchBots.map(() => 0);
    botStreaksRef.current = matchBots.map(() => 0);

    setScore(0); setStreak(0); setQIndex(0); setAnswers([]);
    setBotScores(matchBots.map(() => 0));
    setMatchTier(tier);
    matchTierRef.current = tier;
    divTierRef.current   = divTier;
    setEconomyResult(null);
    questionsSincePauseRef.current = 0;
    playerAnsweredRef.current      = false;
    questionStartRef.current       = 0;
    setPauseActive(false);
    setMotivMsg(null);
    setPhase('searching');
    phaseRef.current = 'searching';
  }

  // ── Phase transitions ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'searching') {
      const t = setTimeout(() => setPhase('found'), 1800);
      return () => clearTimeout(t);
    }
    if (phase === 'found') {
      const t = setTimeout(() => setPhase('countdown'), 2400);
      return () => clearTimeout(t);
    }
    if (phase === 'countdown') {
      setCdNum(3);
      const t1 = setTimeout(() => setCdNum(2), 900);
      const t2 = setTimeout(() => setCdNum(1), 1800);
      const t3 = setTimeout(() => loadQuestion(0), 2700);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
    return undefined;
  }, [phase]); // eslint-disable-line

  // ── Live rankings ────────────────────────────────────────────────────────────
  const liveRows: PlayerRow[] = [
    { id: 'player', name: playerName, avatar: '👤', score, isPlayer: true },
    ...matchBotsRef.current.map((b, i) => ({
      id: b.id, name: b.name, avatar: b.avatar,
      score: botScores[i] ?? 0, isPlayer: false,
    })),
  ];
  const playerRank = [...liveRows].sort((a, b) => b.score - a.score).findIndex(r => r.isPlayer) + 1;

  const BG: CSSProperties = {
    minHeight: '100dvh',
    background: 'linear-gradient(160deg,#07071A 0%,#0F0B2A 50%,#07071A 100%)',
    color: '#fff',
  };

  // ══════════════════════════════════════════════════════════════
  // IDLE
  // ══════════════════════════════════════════════════════════════
  if (phase === 'idle') {
    const stats = loadLeagueStats();
    const tier  = getTier(stats.lp);
    const TIER_CFG: Record<string, { label: string; color: string; icon: string }> = {
      training: { label: 'Training',  color: '#2EE87A', icon: '🌱' },
      coin:     { label: 'Coin',      color: '#FFD93D', icon: '🪙' },
      pro:      { label: 'Pro',       color: '#3AB4FF', icon: '⚡' },
      champion: { label: 'Champion',  color: '#B44FFF', icon: '👑' },
    };
    const tc = TIER_CFG[tier] ?? TIER_CFG.training;

    return (
      <div style={BG} className="flex flex-col items-center justify-center px-5 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          className="flex flex-col items-center gap-6 w-full max-w-sm">

          {/* Title */}
          <div className="relative flex flex-col items-center gap-3 pt-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
              className="absolute -inset-8 rounded-full border-2 border-dashed border-purple-500/20"
            />
            <div className="text-7xl">⚔️</div>
            <div className="text-center">
              <h1 className="text-3xl font-black tracking-tight">Match Arena</h1>
              <p className="text-sm text-white/45 mt-0.5">{TOTAL_Q} rounds · Knowledge &amp; Skill</p>
            </div>
          </div>

          {/* Current division */}
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl w-full"
            style={{ background: tc.color + '12', border: `1px solid ${tc.color}30` }}>
            <span className="text-2xl">{tc.icon}</span>
            <div className="flex-1">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-wider">Your Division</p>
              <p className="text-sm font-black" style={{ color: tc.color }}>{tc.label} League</p>
            </div>
            <DifficultyPips difficulty={
              tier === 'training' ? 1 : tier === 'coin' ? 2 : tier === 'pro' ? 3 : 4
            } />
          </div>

          {/* Category grid */}
          <div className="w-full rounded-2xl p-4 border border-white/6"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-[10px] font-black text-white/35 uppercase tracking-widest mb-3">
              Question Categories
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {Object.entries(CAT_CFG).map(([cat, cfg]) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-base">{cfg.icon}</span>
                  <span className="text-xs font-bold text-white/55">{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Opponents */}
          <div className="w-full rounded-2xl p-4 border border-white/6"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-[10px] font-black text-white/35 uppercase tracking-widest mb-3">
              Opponents <span className="text-white/20 font-normal normal-case">({getMatchBots(toDivisionTier(tier)).length} players)</span>
            </p>
            {getMatchBots(toDivisionTier(tier)).slice(0, 4).map(b => (
              <div key={b.id} className="flex items-center gap-3 py-1.5">
                <span className="text-xl">{b.avatar}</span>
                <span className="text-sm font-bold flex-1 text-white/75">{b.name}</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full"
                      style={{ background: i < Math.round(b.skill * 5) ? '#B44FFF' : 'rgba(255,255,255,0.1)' }} />
                  ))}
                </div>
              </div>
            ))}
            {getMatchBots(toDivisionTier(tier)).length > 4 && (
              <div className="text-[10px] text-white/30 text-center pt-1">
                +{getMatchBots(toDivisionTier(tier)).length - 4} more opponents
              </div>
            )}
          </div>

          {/* Rules */}
          <div className="w-full grid grid-cols-3 gap-2.5">
            {[
              { icon: '✅', label: 'Correct', sub: `+${CORRECT_POINTS} pts` },
              { icon: '⏱️', label: 'Fast',    sub: 'answer quickly' },
              { icon: '🔥', label: 'Streak',  sub: 'keep going!' },
            ].map(r => (
              <div key={r.label}
                className="flex flex-col items-center gap-1 rounded-2xl py-3.5 px-2 border border-white/6"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <span className="text-2xl">{r.icon}</span>
                <span className="text-[11px] font-black">{r.label}</span>
                <span className="text-[9px] text-white/35 text-center">{r.sub}</span>
              </div>
            ))}
          </div>

          {/* CTA — blocked when daily limit reached */}
          {dailyStatus?.canPlay === false ? (
            <div className="w-full flex flex-col items-center gap-3">
              <div className="w-full py-4 rounded-2xl text-center border border-white/10"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <p className="text-[11px] font-black text-white/40 uppercase tracking-widest mb-1">Next Match In</p>
                <p className="text-3xl font-black tabular-nums"
                  style={{ color: '#B44FFF', textShadow: '0 0 30px rgba(180,79,255,0.5)' }}>
                  {nextMatchCountdown || '…'}
                </p>
                <p className="text-[11px] text-white/30 mt-1">You have already played today's match ✅</p>
              </div>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
              onClick={enterMatch}
              className="w-full py-5 rounded-2xl text-xl font-black tracking-wide relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#B44FFF,#3AB4FF)', boxShadow: '0 0 40px rgba(180,79,255,0.45)' }}>
              <motion.div
                animate={{ x: ['0%', '230%'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none"
                style={{ left: '-25%' }}
              />
              ⚔️ ENTER MATCH
            </motion.button>
          )}

          <button
            onClick={() => setLocation('/league-select')}
            className="text-sm text-white/30 hover:text-white/60 transition-colors">
            ← Back to Leagues
          </button>
        </motion.div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // SEARCHING
  // ══════════════════════════════════════════════════════════════
  if (phase === 'searching') return (
    <div style={BG} className="flex flex-col items-center justify-center gap-8">
      <div className="relative flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.14, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="w-24 h-24 rounded-full border-4 border-purple-500/50 flex items-center justify-center text-4xl">
          🔍
        </motion.div>
        {[0, 1, 2].map(i => (
          <motion.div key={i}
            className="absolute inset-0 rounded-full border-2 border-purple-500/20"
            animate={{ scale: [1, 2.8], opacity: [0.4, 0] }}
            transition={{ duration: 1.6, delay: i * 0.5, repeat: Infinity }} />
        ))}
      </div>
      <div className="text-center space-y-2">
        <div className="text-xl font-black">Finding opponents…</div>
        <div className="flex gap-1.5 justify-center">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-2 h-2 rounded-full bg-purple-400"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -5, 0] }}
              transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }} />
          ))}
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  // FOUND
  // ══════════════════════════════════════════════════════════════
  if (phase === 'found') return (
    <div style={BG} className="flex flex-col items-center justify-center gap-8 px-6">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
        <div className="text-4xl font-black text-center"
          style={{ background: 'linear-gradient(135deg,#FFD93D,#FF8C42)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          MATCH FOUND!
        </div>
        <div className="text-sm text-white/40 mt-1 text-center">Get ready to compete</div>
      </motion.div>
      <div className="w-full max-w-xs space-y-3">
        <motion.div
          initial={{ x: -60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
          <span className="text-2xl">👤</span>
          <span className="font-black flex-1">{playerName}</span>
          <span className="text-[11px] text-blue-300 font-black px-2 py-0.5 bg-blue-500/20 rounded-full">YOU</span>
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.35 }}
            className="text-green-400 text-xl">✓</motion.span>
        </motion.div>
        {MATCH_BOTS.map((b, i) => (
          <motion.div key={b.id}
            initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.15 }}
            className="flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="text-2xl">{b.avatar}</span>
            <span className="font-bold flex-1 text-white/80">{b.name}</span>
            <div className="h-1 w-14 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <motion.div className="h-full rounded-full" style={{ background: 'rgba(255,255,255,0.4)' }}
                initial={{ width: '0%' }} animate={{ width: '100%' }}
                transition={{ duration: 1.2 + i * 0.18, delay: 0.3 + i * 0.1 }} />
            </div>
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 1.5 + i * 0.15 }} className="text-green-400 text-xl">✓</motion.span>
          </motion.div>
        ))}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  // COUNTDOWN
  // ══════════════════════════════════════════════════════════════
  if (phase === 'countdown') return (
    <div style={BG} className="flex flex-col items-center justify-center gap-5">
      <div className="text-sm text-white/40 uppercase tracking-widest">Get ready…</div>
      <AnimatePresence mode="wait">
        <motion.div key={cdNum}
          initial={{ scale: 2.2, opacity: 0 }}
          animate={{ scale: 1,   opacity: 1 }}
          exit={{ scale: 0.5,    opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 26 }}
          className="text-[120px] font-black leading-none tabular-nums"
          style={{
            color: cdNum === 1 ? '#2EE87A' : '#fff',
            textShadow: `0 0 80px ${cdNum === 1 ? '#2EE87A80' : '#ffffff50'}`,
          }}>
          {cdNum}
        </motion.div>
      </AnimatePresence>
      <div className="text-white/30 text-sm font-medium">
        {cdNum === 3 ? '🏁 Match starting…' : cdNum === 2 ? '🎯 Focus!' : '⚡ GO!'}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  // PUZZLE INTRO — full-screen 2-second announcement before puzzle
  // ══════════════════════════════════════════════════════════════
  if (phase === 'puzzle_intro') return (
    <div style={BG} className="flex flex-col items-center justify-center gap-0 px-6">
      <motion.div
        initial={{ scale: 0.3, opacity: 0, rotate: -15 }}
        animate={{ scale: 1,   opacity: 1, rotate: 0   }}
        transition={{ type: 'spring', stiffness: 320, damping: 20 }}
        className="text-[110px] leading-none mb-4"
        style={{ filter: 'drop-shadow(0 0 40px rgba(255,58,94,0.7))' }}>
        🧩
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, type: 'spring', stiffness: 260, damping: 22 }}>
        <div className="text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] mb-2"
            style={{ color: 'rgba(255,58,94,0.7)' }}>
            Puzzle Round
          </p>
          <h2 className="text-3xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg,#FF3A5E,#FF8C42)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
            PUZZLE ASSEMBLY
          </h2>
          <p className="text-sm text-white/45 mt-2 leading-relaxed">
            رتّب القطع بالترتيب الصحيح
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-7 px-7 py-3.5 rounded-2xl border"
        style={{
          background: 'rgba(255,58,94,0.1)',
          borderColor: 'rgba(255,58,94,0.3)',
        }}>
        <p className="text-xs font-bold text-white/60 text-center leading-relaxed">
          اضغط على القطع لترتيبها<br />
          <span className="text-white/35">ستبدأ المؤقت بعد لحظة…</span>
        </p>
      </motion.div>

      {/* Pulsing ring */}
      {[0, 1, 2].map(i => (
        <motion.div key={i}
          className="absolute rounded-full border-2 pointer-events-none"
          style={{ borderColor: 'rgba(255,58,94,0.25)', width: 200 + i * 80, height: 200 + i * 80 }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.15, 0.5] }}
          transition={{ duration: 1.4, delay: i * 0.32, repeat: Infinity }}
        />
      ))}
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  // QUESTION / FEEDBACK
  // ══════════════════════════════════════════════════════════════
  if ((phase === 'question' || phase === 'feedback') && currentDQ) {
    const isCorrectAnswer = selIdx !== null && selIdx === currentDQ.correctIndex;

    return (
      <div style={{ ...BG, display: 'flex', flexDirection: 'column' }}>

        {/* ── Global VFX overlays ─────────────────────────────────────────── */}
        <AnswerFlash result={answerFlash} />
        <StreakMilestoneBanner milestone={streakMilestone} />
        <MotivationalMessage result={motivMsg} streak={streak} />
        <AnimatePresence>
          {pauseActive && (
            <PauseBreak
              correctPct={answersRef.current.length > 0
                ? answersRef.current.filter(a => a.correct).length / answersRef.current.length
                : 0.5}
              onResume={resumeAfterPause}
            />
          )}
        </AnimatePresence>

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-4 pt-5 pb-2.5">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xl">👤</span>
            <span className="text-sm font-black truncate max-w-[68px]">{playerName}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
            style={{ background: 'rgba(255,255,255,0.1)' }}>
            <span className="text-yellow-400 font-black text-sm">⚡</span>
            <motion.span
              key={score}
              initial={{ scale: 1.4, color: '#FFD93D' }}
              animate={{ scale: 1,   color: '#ffffff' }}
              className="font-black text-sm tabular-nums">
              {score}
            </motion.span>
          </div>
          <AnimatePresence>
            {streak >= 2 && (
              <motion.div
                key={streak}
                initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                className="flex items-center gap-1 rounded-xl px-2.5 py-1.5"
                style={{
                  background: streak >= 5
                    ? 'rgba(58,180,255,0.25)'
                    : streak >= 3
                    ? 'rgba(255,140,66,0.25)'
                    : 'rgba(249,115,22,0.18)',
                  border: streak >= 5
                    ? '1.5px solid rgba(58,180,255,0.5)'
                    : streak >= 3
                    ? '1.5px solid rgba(255,140,66,0.5)'
                    : '1px solid rgba(249,115,22,0.35)',
                  boxShadow: streak >= 5
                    ? '0 0 12px rgba(58,180,255,0.3)'
                    : streak >= 3
                    ? '0 0 10px rgba(255,140,66,0.25)'
                    : 'none',
                }}>
                <span className="text-sm">
                  {streak >= 5 ? '⚡' : '🔥'}
                </span>
                <span className="font-black text-sm"
                  style={{ color: streak >= 5 ? '#3AB4FF' : '#FF8C42' }}>
                  ×{streak}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-1 rounded-xl px-2.5 py-1.5"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <span className="text-[10px] text-white/50">🏆</span>
            <span className="font-black text-sm">#{playerRank}</span>
          </div>
        </div>

        {/* ── Live rank strip ──────────────────────────────────────────────── */}
        <div className="px-4 pb-2">
          <RankStrip rows={liveRows} />
        </div>

        {/* ── Round progress ───────────────────────────────────────────────── */}
        <div className="px-4 pb-2.5">
          <RoundProgress current={qIndex} total={TOTAL_Q} answers={answers} />
        </div>

        {/* ── Category + difficulty ────────────────────────────────────────── */}
        <div className="px-4 pb-3 flex items-center justify-between">
          <CategoryBadge category={currentDQ.category} />
          <DifficultyPips difficulty={currentDQ.difficulty} />
        </div>

        {/* ── Question body ────────────────────────────────────────────────── */}
        <div className="flex-1 px-4 pb-2 overflow-y-auto flex flex-col justify-center relative">
          {/* Correct / wrong tint overlay */}
          <AnimatePresence>
            {phase === 'feedback' && (
              <motion.div
                key="overlay"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none rounded-2xl"
                style={{
                  background: isCorrectAnswer
                    ? 'rgba(46,232,122,0.05)'
                    : 'rgba(255,58,94,0.06)',
                }}
              />
            )}
          </AnimatePresence>

          {/* Points popup */}
          <AnimatePresence>
            {phase === 'feedback' && lastPts > 0 && (
              <motion.div
                key="pts"
                initial={{ opacity: 0, y: 8, scale: 0.85 }}
                animate={{ opacity: 1, y: -22, scale: 1.2 }}
                exit={{ opacity: 0, y: -55, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="absolute top-2 right-4 font-black text-2xl text-yellow-400 pointer-events-none z-10"
                style={{ textShadow: '0 0 24px rgba(255,215,0,1)' }}>
                +{lastPts}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Wrong indicator */}
          <AnimatePresence>
            {phase === 'feedback' && selIdx !== null && !isCorrectAnswer && (
              <motion.div
                key="wrong-x"
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                className="absolute top-2 right-4 font-black text-2xl text-red-400 pointer-events-none z-10"
                style={{ textShadow: '0 0 18px rgba(255,58,94,0.9)' }}>
                ✗
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentDQ.source.id}
              initial={{ opacity: 0, x: 32, scale: 0.97 }}
              animate={shakeQ
                ? { opacity: 1, x: [0, -10, 9, -7, 5, -3, 0], scale: 1 }
                : { opacity: 1, x: 0, scale: 1 }
              }
              exit={{ opacity: 0, x: -32, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}>
              <QuestionRenderer
                dq={currentDQ}
                phase={phase}
                selIdx={selIdx}
                onAnswer={handleAnswer}
                lang={language as Language}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Timer bar — hidden for puzzle (uses internal ascending timer) ── */}
        {currentDQ.source.type !== 'puzzle_assembly' && (
          <div className="px-4 pb-7 pt-3">
            <TimerBar
              timeLeft={phase === 'feedback' ? 0 : timeLeft}
              timeLimit={currentDQ.timeLimitMs}
            />
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // RESULTS
  // ══════════════════════════════════════════════════════════════
  if (phase === 'results') {
    const sorted     = [...finalRows].sort((a, b) => b.score - a.score);
    const rank       = sorted.findIndex(r => r.isPlayer) + 1;
    const isWinner   = rank === 1;
    const isPerfectResult = answers.length > 0 && answers.every(a => a.correct);
    const correctCnt = answers.filter(a => a.correct).length;
    const accuracy   = answers.length > 0
      ? Math.round((correctCnt / answers.length) * 100) : 0;
    let s2 = 0, bst2 = 0;
    for (const a of answers) { s2 = a.correct ? s2 + 1 : 0; bst2 = Math.max(bst2, s2); }

    // Per-category accuracy
    const catMap: Record<string, { c: number; t: number }> = {};
    answers.forEach((a, i) => {
      const cat = questionsRef.current[i]?.category ?? '?';
      if (!catMap[cat]) catMap[cat] = { c: 0, t: 0 };
      catMap[cat].t++;
      if (a.correct) catMap[cat].c++;
    });

    return (
      <div style={{ ...BG, display: 'flex', flexDirection: 'column', paddingBottom: 40 }}>

        {/* Perfect run VFX overlay on results */}
        <StreakMilestoneBanner milestone={streakMilestone} />

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 pt-10 pb-5 px-6">
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
            className="text-7xl">
            {isPerfectResult ? '🌟' : isWinner ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🎯'}
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-center">
            <div className="text-3xl font-black"
              style={{ color: isPerfectResult ? '#FFD93D' : isWinner ? '#FFD93D' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#fff' }}>
              {isPerfectResult ? 'PERFECT RUN!' : isWinner ? 'WINNER!' : rank === 2 ? '2nd Place' : rank === 3 ? '3rd Place' : `#${rank} Place`}
            </div>
            <div className="text-sm text-white/50 mt-1">
              {isPerfectResult ? '10/10 — Flawless victory!' : isWinner ? 'You dominated the match!' : rank <= 2 ? 'Great performance!' : 'Keep training — you\'ll get there!'}
            </div>
          </motion.div>
        </motion.div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="mx-4 rounded-2xl p-4 mb-3 border border-white/8"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] font-black text-white/35 uppercase tracking-widest mb-3">
            Final Standings
          </p>
          {sorted.map((row, i) => (
            <div key={row.id}
              className="flex items-center gap-3 py-2 border-b last:border-0"
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <span className="text-sm font-black w-5 text-center"
                style={{ color: i === 0 ? '#FFD93D' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'rgba(255,255,255,0.35)' }}>
                #{i + 1}
              </span>
              <span className="text-lg">{row.avatar}</span>
              <span className={`flex-1 text-sm font-bold ${row.isPlayer ? 'text-blue-300' : 'text-white/70'}`}>
                {row.name}
                {row.isPlayer && (
                  <span className="ml-1 text-[10px] text-blue-300 bg-blue-500/20 px-1.5 py-0.5 rounded-full">YOU</span>
                )}
              </span>
              <span className="text-sm font-black tabular-nums">{row.score}</span>
            </div>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
          className="mx-4 rounded-2xl p-4 mb-3 border border-white/8"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-white/60">Total Score</span>
            <span className="text-2xl font-black text-yellow-400">{score}</span>
          </div>
          <div className="h-px mb-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
          {[
            { icon: '✅', label: 'Correct answers', value: `${correctCnt} / ${answers.length}` },
            { icon: '🎯', label: 'Accuracy',        value: `${accuracy}%`                      },
            { icon: '🔥', label: 'Best streak',      value: `${bst2}×`                         },
          ].map(r => (
            <div key={r.label} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <span>{r.icon}</span>
                <span className="text-sm text-white/55">{r.label}</span>
              </div>
              <span className="text-sm font-black">{r.value}</span>
            </div>
          ))}
        </motion.div>

        {/* Answer timeline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
          className="mx-4 mb-3">
          <p className="text-[10px] font-black text-white/35 uppercase tracking-widest mb-2">
            Answer History
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {answers.map((a, i) => {
              const cat = questionsRef.current[i]?.category ?? '';
              const cfg = CAT_CFG[cat];
              return (
                <div key={i}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black"
                  title={`Q${i + 1}: ${a.correct ? '✓' : '✗'} ${cfg?.label ?? cat}`}
                  style={{
                    background: a.correct ? 'rgba(46,232,122,0.18)' : 'rgba(255,58,94,0.18)',
                    border: `1.5px solid ${a.correct ? '#2EE87A45' : '#FF3A5E45'}`,
                    color:  a.correct ? '#2EE87A' : '#FF3A5E',
                  }}>
                  {a.correct ? '✓' : '✗'}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Category breakdown */}
        {Object.keys(catMap).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}
            className="mx-4 rounded-2xl p-4 mb-3 border border-white/8"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-[10px] font-black text-white/35 uppercase tracking-widest mb-3">
              By Category
            </p>
            {Object.entries(catMap).map(([cat, { c, t }]) => {
              const cfg = CAT_CFG[cat] ?? { icon: '❓', color: '#ffffff50', label: cat };
              const pct = Math.round((c / t) * 100);
              return (
                <div key={cat} className="mb-2 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{cfg.icon}</span>
                      <span className="text-xs font-bold text-white/60">{cfg.label}</span>
                    </div>
                    <span className="text-xs font-black" style={{ color: cfg.color }}>{c}/{t}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: cfg.color }} />
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Economy rewards */}
        {economyResult && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.50, type: 'spring', stiffness: 220, damping: 22 }}
            className="mx-4 mb-3 rounded-2xl border overflow-hidden"
            style={{ background: 'rgba(255,215,0,0.06)', borderColor: 'rgba(255,215,0,0.25)' }}>
            <div className="px-4 py-3">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">
                Match Rewards
              </p>
              <div className="flex gap-3">
                {/* Coins */}
                <div className="flex-1 flex flex-col items-center gap-1.5 rounded-xl py-3"
                  style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)' }}>
                  <span className="text-2xl">🪙</span>
                  <span className="text-xl font-black text-yellow-400">+{economyResult.coinsEarned}</span>
                  <span className="text-[10px] font-bold text-white/40">Coins</span>
                </div>
                {/* Gems */}
                <div className="flex-1 flex flex-col items-center gap-1.5 rounded-xl py-3"
                  style={{ background: 'rgba(147,51,234,0.1)', border: '1px solid rgba(147,51,234,0.2)' }}>
                  <span className="text-2xl">💎</span>
                  <span className="text-xl font-black"
                    style={{ color: economyResult.gemsEarned > 0 ? '#a855f7' : 'rgba(255,255,255,0.3)' }}>
                    {economyResult.gemsEarned > 0 ? `+${economyResult.gemsEarned}` : '—'}
                  </span>
                  <span className="text-[10px] font-bold text-white/40">Gems</span>
                </div>
              </div>
              {/* Coin breakdown */}
              <div className="mt-3 space-y-1">
                {economyResult.coinBreakdown.base > 0 && (
                  <div className="flex justify-between text-xs text-white/45">
                    <span>Participation</span>
                    <span className="text-yellow-400/70">+{economyResult.coinBreakdown.base} 🪙</span>
                  </div>
                )}
                {economyResult.coinBreakdown.rankBonus > 0 && (
                  <div className="flex justify-between text-xs text-white/45">
                    <span>{rank === 1 ? '1st place' : rank === 2 ? '2nd place' : '3rd place'} bonus</span>
                    <span className="text-yellow-400/70">+{economyResult.coinBreakdown.rankBonus} 🪙</span>
                  </div>
                )}
                {economyResult.coinBreakdown.accuracyBonus > 0 && (
                  <div className="flex justify-between text-xs text-white/45">
                    <span>Accuracy bonus ({accuracy}%)</span>
                    <span className="text-yellow-400/70">+{economyResult.coinBreakdown.accuracyBonus} 🪙</span>
                  </div>
                )}
                {economyResult.gemsEarned > 0 && (
                  <div className="flex justify-between text-xs text-white/45">
                    <span>{economyResult.gemBreakdown.reason}</span>
                    <span className="text-purple-400/80">+{economyResult.gemsEarned} 💎</span>
                  </div>
                )}
              </div>
              {/* Total gems balance */}
              <div className="mt-3 pt-2.5 border-t border-white/8 flex justify-between items-center">
                <span className="text-xs text-white/40">Total Gems</span>
                <span className="text-sm font-black text-purple-400">{economyResult.newGems} 💎</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* LP change */}
        {lpChange && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.55, type: 'spring', stiffness: 220, damping: 22 }}
            className="mx-4 mb-4 rounded-2xl border overflow-hidden"
            style={{
              background: lpChange.delta >= 0 ? 'rgba(46,232,122,0.07)' : 'rgba(255,58,94,0.07)',
              borderColor: lpChange.delta >= 0 ? 'rgba(46,232,122,0.28)' : 'rgba(255,58,94,0.28)',
            }}>
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">League Points</p>
                <p className="text-sm font-black text-white/80 mt-0.5">
                  {lpChange.oldTier !== lpChange.newTier
                    ? `${lpChange.oldTier} → ${lpChange.newTier} 🎉`
                    : lpChange.oldTier}
                </p>
              </div>
              <span className="text-2xl font-black"
                style={{ color: lpChange.delta >= 0 ? '#2EE87A' : '#FF3A5E' }}>
                {lpChange.delta >= 0 ? '+' : ''}{lpChange.delta} LP
              </span>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <div className="mx-4 flex flex-col gap-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            onClick={enterMatch}
            className="w-full py-4 rounded-2xl text-lg font-black relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#B44FFF,#3AB4FF)', boxShadow: '0 0 30px rgba(180,79,255,0.4)' }}>
            <motion.div
              animate={{ x: ['0%', '230%'] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
              style={{ left: '-25%' }}
            />
            ⚔️ Play Again
          </motion.button>
          <button
            onClick={() => setLocation('/')}
            className="w-full py-3 rounded-2xl text-sm font-bold text-white/50 border border-white/8"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            🏠 Back to Home
          </button>
        </div>
      </div>
    );
  }

  return null;
}
