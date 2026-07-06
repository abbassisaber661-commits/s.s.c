/**
 * economy-stabilizer.ts
 * ──────────────────────
 * Economy Stabilization Layer — sits on top of all reward systems.
 *
 * ❌ Does NOT modify any core service, DB schema, or business logic.
 * ✔  Pure wrapper: call these helpers before crediting rewards.
 *
 * Modules:
 *   1. HARD_CAPS          — absolute per-user-per-day/season limits
 *   2. normalizeReward()  — single entry-point for every reward calculation
 *   3. Anti-Exploit       — duplicate & farming detection (in-memory + DB-backed)
 *   4. stabilityScore()   — 0–100 economy health score
 *   5. getStabilityReport()— full diagnostic for the dashboard
 */

import { db, walletTransactionsTable, coinTransactionsTable, playersTable, userDailyEconomyTable } from '@workspace/db';
import { eq, and, gte, lte, count, sum, desc } from 'drizzle-orm';

// ── 1. Hard Caps ──────────────────────────────────────────────────────────────

export const HARD_CAPS = {
  /** Maximum coins a single user may earn in one calendar day (all sources combined). */
  maxCoinsPerUserPerDay: 50,

  /** Maximum coins awarded per single reward event (one match, one post, etc.). */
  maxCoinsPerEvent: 10,

  /** Maximum gems a single user may accumulate in one season. */
  maxGemsPerSeason: 20,

  /** Maximum login-reward coins per day (always 1, immune to inflation scaling). */
  maxLoginCoinsPerDay: 1,

  /** Maximum interactions (likes+comments) counted toward rewards per day. */
  maxInteractionsPerDay: 10,

  /** Minimum seconds between two reward-eligible events of the same type for one user. */
  minSecondsBetweenSameEvents: 30,

  /** Maximum number of reward-earning matches per user per hour. */
  maxMatchesPerHour: 10,
} as const;

// ── 2. Reward Normalization Layer ─────────────────────────────────────────────

export type RewardSource =
  | 'match_result'
  | 'daily_login'
  | 'daily_post'
  | 'daily_match'
  | 'daily_interaction'
  | 'promotion'
  | 'season_end'
  | 'shop_refund'
  | 'manual';

export interface NormalizeInput {
  playerId:  string;
  amount:    number;          // raw proposed reward
  source:    RewardSource;
  dailyTotal?: number;        // optional: caller-supplied daily total so far
}

export interface NormalizeResult {
  allowed:       boolean;
  finalAmount:   number;      // capped, possibly 0
  cappedBy:      string | null;
  reason:        string;
}

/**
 * Normalize a reward through all caps.
 * Call this BEFORE crediting any coins to a user.
 *
 * Example:
 *   const { allowed, finalAmount } = await normalizeReward({ playerId, amount: 6, source: 'match_result' });
 *   if (allowed) await awardCoins(playerId, finalAmount, ...);
 */
export async function normalizeReward(input: NormalizeInput): Promise<NormalizeResult> {
  const { playerId, amount, source } = input;

  // Login reward: always fixed, skip further caps
  if (source === 'daily_login') {
    const final = Math.min(amount, HARD_CAPS.maxLoginCoinsPerDay);
    return { allowed: true, finalAmount: final, cappedBy: null, reason: 'Login reward — fixed' };
  }

  // Per-event cap
  const perEventCapped = Math.min(amount, HARD_CAPS.maxCoinsPerEvent);
  if (perEventCapped !== amount) {
    // Soft cap applied — still allowed but reduced
  }

  // Daily total cap — query today's earned coins from DB
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86_400_000);

  let dailyEarned = input.dailyTotal ?? 0;
  if (input.dailyTotal === undefined) {
    try {
      const rows = await db
        .select({ total: sum(walletTransactionsTable.amount) })
        .from(walletTransactionsTable)
        .where(
          and(
            eq(walletTransactionsTable.playerId, playerId),
            eq(walletTransactionsTable.type, 'earn'),
            gte(walletTransactionsTable.createdAt, today),
            lte(walletTransactionsTable.createdAt, tomorrow),
          ),
        );
      dailyEarned = Number(rows[0]?.total ?? 0);
    } catch {
      dailyEarned = 0;
    }
  }

  const remaining = Math.max(0, HARD_CAPS.maxCoinsPerUserPerDay - dailyEarned);

  if (remaining === 0) {
    return {
      allowed:     false,
      finalAmount: 0,
      cappedBy:    'maxCoinsPerUserPerDay',
      reason:      `Daily cap reached (${HARD_CAPS.maxCoinsPerUserPerDay} coins/day)`,
    };
  }

  const finalAmount = Math.min(perEventCapped, remaining);

  return {
    allowed:     true,
    finalAmount,
    cappedBy:    finalAmount < amount ? (perEventCapped < amount ? 'maxCoinsPerEvent' : 'maxCoinsPerUserPerDay') : null,
    reason:      finalAmount < amount
      ? `Capped from ${amount} → ${finalAmount}`
      : 'Within all limits',
  };
}

// ── 3. Anti-Exploit ───────────────────────────────────────────────────────────

/** In-memory cooldown map: `${playerId}:${source}` → last-event timestamp (ms). */
const _cooldowns = new Map<string, number>();

export interface ExploitCheckResult {
  clean:   boolean;
  reason?: string;
}

/**
 * Check whether a reward event is potentially an exploit attempt.
 * Returns `{ clean: false }` if the event should be blocked.
 *
 * Checks:
 *   a) Same-event cooldown (in-memory — fast)
 *   b) Matches-per-hour rate limit
 */
export async function checkExploit(
  playerId: string,
  source:   RewardSource,
): Promise<ExploitCheckResult> {
  const key = `${playerId}:${source}`;
  const now = Date.now();
  const last = _cooldowns.get(key) ?? 0;

  // a) Cooldown check
  const elapsed = (now - last) / 1000;
  if (elapsed < HARD_CAPS.minSecondsBetweenSameEvents && source !== 'daily_login') {
    return {
      clean:  false,
      reason: `Too fast: ${source} repeated in ${elapsed.toFixed(1)}s (min ${HARD_CAPS.minSecondsBetweenSameEvents}s)`,
    };
  }

  // b) Match farming: count match rewards in last hour
  if (source === 'match_result') {
    try {
      const oneHourAgo = new Date(now - 3_600_000);
      const rows = await db
        .select({ cnt: count() })
        .from(coinTransactionsTable)
        .where(
          and(
            eq(coinTransactionsTable.playerId, playerId),
            eq(coinTransactionsTable.source, 'match_result'),
            gte(coinTransactionsTable.createdAt, oneHourAgo),
          ),
        );
      const matchesThisHour = Number(rows[0]?.cnt ?? 0);
      if (matchesThisHour >= HARD_CAPS.maxMatchesPerHour) {
        return {
          clean:  false,
          reason: `Match farming: ${matchesThisHour} match rewards in the last hour (max ${HARD_CAPS.maxMatchesPerHour})`,
        };
      }
    } catch { /* non-critical — allow */ }
  }

  // All clear — update cooldown
  _cooldowns.set(key, now);

  // Prune old entries (>1h) to prevent memory leak
  if (_cooldowns.size > 10_000) {
    const cutoff = now - 3_600_000;
    for (const [k, v] of _cooldowns) {
      if (v < cutoff) _cooldowns.delete(k);
    }
  }

  return { clean: true };
}

// ── 4. Economy Stability Score (0–100) ───────────────────────────────────────

export interface StabilityComponents {
  inflationScore:  number;   // 0–30: penalises high coins/user/day
  spendScore:      number;   // 0–25: rewards healthy coin velocity (spend / earn)
  gemScore:        number;   // 0–20: rewards balanced gem distribution
  exploitScore:    number;   // 0–15: penalises recent suspicious events
  activityScore:   number;   // 0–10: rewards active player base
  total:           number;   // 0–100
}

export interface StabilityReport {
  score:          number;
  grade:          'A' | 'B' | 'C' | 'D' | 'F';
  label:          string;
  components:     StabilityComponents;
  coinsPerUserPerDay: number;
  totalPlayers:   number;
  spendRatio:     number;     // coinsSpent / coinsEarned (0–1+)
  recentExploitFlags: number;
  recommendation: string;
  calculatedAt:   string;
}

function grade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function gradeLabel(g: string): string {
  const map: Record<string, string> = {
    A: 'اقتصاد متوازن ممتاز 🏆',
    B: 'اقتصاد جيد 👍',
    C: 'يحتاج مراقبة ⚠️',
    D: 'خلل اقتصادي 🔶',
    F: 'خطر اقتصادي 🔴',
  };
  return map[g] ?? '—';
}

export async function getStabilityReport(): Promise<StabilityReport> {
  const since7d = new Date(Date.now() - 7 * 86_400_000);
  const now     = new Date();

  // Parallel data fetch
  const [earnRows, spendRows, playerRows, exploitRows] = await Promise.all([
    db.select({ total: sum(walletTransactionsTable.amount) })
      .from(walletTransactionsTable)
      .where(and(
        eq(walletTransactionsTable.type, 'earn'),
        gte(walletTransactionsTable.createdAt, since7d),
      )),

    db.select({ total: sum(walletTransactionsTable.amount) })
      .from(walletTransactionsTable)
      .where(and(
        eq(walletTransactionsTable.type, 'spend'),
        gte(walletTransactionsTable.createdAt, since7d),
      )),

    db.select({ id: playersTable.id })
      .from(playersTable),

    // Count suspicious/exploit-flagged transactions (very large single amounts)
    db.select({ cnt: count() })
      .from(walletTransactionsTable)
      .where(and(
        gte(walletTransactionsTable.amount, HARD_CAPS.maxCoinsPerEvent * 3),
        gte(walletTransactionsTable.createdAt, since7d),
      )),
  ]);

  const totalEarned = Number(earnRows[0]?.total ?? 0);
  const totalSpent  = Number(spendRows[0]?.total ?? 0);
  const totalPlayers = Math.max(playerRows.length, 1);
  const exploitFlags = Number(exploitRows[0]?.cnt ?? 0);

  const coinsPerUserPerDay = (totalEarned / totalPlayers) / 7;
  const spendRatio = totalEarned > 0 ? totalSpent / totalEarned : 0;

  // ── Inflation score (0–30) ─────────────────────────────────────────────────
  // Perfect: 2–7 coins/user/day → 30 pts
  // HIGH inflation (>10) or ZERO → penalised
  let inflationScore: number;
  if (coinsPerUserPerDay === 0)                inflationScore = 10; // no activity
  else if (coinsPerUserPerDay <= 7)            inflationScore = 30;
  else if (coinsPerUserPerDay <= 10)           inflationScore = 22;
  else if (coinsPerUserPerDay <= 15)           inflationScore = 12;
  else                                         inflationScore = 5;

  // ── Spend score (0–25) ────────────────────────────────────────────────────
  // Healthy spend ratio: 0.3–0.7 → full 25 pts
  let spendScore: number;
  if (spendRatio >= 0.3 && spendRatio <= 0.7) spendScore = 25;
  else if (spendRatio > 0.7 && spendRatio <= 1.0) spendScore = 18;
  else if (spendRatio > 0.1 && spendRatio < 0.3)  spendScore = 15;
  else if (spendRatio > 1.0)                       spendScore = 8;  // deflation
  else                                             spendScore = 5;  // no spending

  // ── DN$ velocity score (0–20) — replaces legacy gem score ───────────────
  // Gems are removed; award neutral mid-range points since we no longer track per-player gem balance.
  const gemScore = 10; // neutral — kept in StabilityComponents for API compat

  // ── Exploit score (0–15) ─────────────────────────────────────────────────
  let exploitScore: number;
  if (exploitFlags === 0)              exploitScore = 15;
  else if (exploitFlags <= 5)          exploitScore = 10;
  else if (exploitFlags <= 20)         exploitScore = 5;
  else                                 exploitScore = 0;

  // ── Activity score (0–10) ─────────────────────────────────────────────────
  let activityScore: number;
  if (totalPlayers >= 100)             activityScore = 10;
  else if (totalPlayers >= 30)         activityScore = 7;
  else if (totalPlayers >= 10)         activityScore = 5;
  else                                 activityScore = 2;

  const total = Math.round(Math.min(100,
    inflationScore + spendScore + gemScore + exploitScore + activityScore
  ));
  const g = grade(total);

  // Recommendation
  let recommendation = gradeLabel(g);
  if (coinsPerUserPerDay > 10)
    recommendation += ' — خفّض مكافآت المباريات والمنشورات';
  else if (spendRatio < 0.2)
    recommendation += ' — خفّض أسعار المتجر لتحفيز الإنفاق';
  else if (exploitFlags > 20)
    recommendation += ' — ارفع حساسية مكافحة الاستغلال';

  return {
    score:              total,
    grade:              g,
    label:              gradeLabel(g),
    components: {
      inflationScore,
      spendScore,
      gemScore,
      exploitScore,
      activityScore,
      total,
    },
    coinsPerUserPerDay: Math.round(coinsPerUserPerDay * 100) / 100,
    totalPlayers,
    spendRatio:         Math.round(spendRatio * 1000) / 1000,
    recentExploitFlags: exploitFlags,
    recommendation,
    calculatedAt:       now.toISOString(),
  };
}

// ── 5. Convenience: combined normalize + exploit check ────────────────────────

export interface SafeRewardResult {
  granted:     boolean;
  finalAmount: number;
  blockedBy:   'exploit' | 'cap' | null;
  reason:      string;
}

/**
 * Full safety gate: run exploit check then normalize.
 * Use this as the single entry point before awarding any coins.
 *
 * Example:
 *   const result = await safeReward({ playerId, amount: 6, source: 'match_result' });
 *   if (result.granted) await awardCoins(playerId, result.finalAmount, ...);
 */
export async function safeReward(input: NormalizeInput): Promise<SafeRewardResult> {
  const exploit = await checkExploit(input.playerId, input.source);
  if (!exploit.clean) {
    return { granted: false, finalAmount: 0, blockedBy: 'exploit', reason: exploit.reason! };
  }

  const norm = await normalizeReward(input);
  return {
    granted:     norm.allowed,
    finalAmount: norm.finalAmount,
    blockedBy:   norm.allowed ? null : 'cap',
    reason:      norm.reason,
  };
}
