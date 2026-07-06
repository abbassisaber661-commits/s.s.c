/**
 * economy-engine.ts
 * ─────────────────
 * Economy Engine — pure constants and helpers for the DN$/Pi dual-currency system.
 *
 * 🟣 Pi  = real payment currency (gifts, paid league entry)
 * 🟢 DN$ = internal gamification points (rewards, shop, daily tasks, in-game help)
 *
 * Division tier mapping:
 *   training  → div3
 *   coin      → div2  (legacy internal ID)
 *   pro       → pro
 *   champion  → champions
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type EconomyTier = 'div3' | 'div2' | 'pro' | 'champions';

// ── Pi entry costs (real currency — for paid leagues) ─────────────────────────
//   Training   → free (0 π)
//   Division 2 → 0.2 π
//   Pro League → 0.5 π
//   Champions  → 1.0 π

export const PI_ENTRY_COST: Record<EconomyTier, number> = {
  div3:      0,
  div2:      0.2,
  pro:       0.5,
  champions: 1.0,
};

// ── Season-end DN$ reward table ───────────────────────────────────────────────
//
//  Position → DN$ per league tier
//
//  Rank  | div3 | div2 | pro  | champions
//  ──────+──────+──────+──────+──────────
//  1st   |  5   |  10  |  15  |  20
//  2nd   |  4   |   8  |  12  |  15
//  3rd   |  3   |   5  |   8  |  10
//  4th   |  2   |   3  |   5  |   8
//  Rest  |  1   |   2  |   3  |   4

export const SEASON_END_DN_TABLE: Record<EconomyTier, Record<number, number>> = {
  div3: {
    1: 5, 2: 4, 3: 3, 4: 2,
  },
  div2: {
    1: 10, 2: 8, 3: 5, 4: 3,
  },
  pro: {
    1: 15, 2: 12, 3: 8, 4: 5,
  },
  champions: {
    1: 20, 2: 15, 3: 10, 4: 8,
  },
};

/** DN$ for participants outside the top-4 (by league tier). */
export const SEASON_END_DN_PARTICIPANT: Record<EconomyTier, number> = {
  div3:      1,
  div2:      2,
  pro:       3,
  champions: 4,
};

// ── DN$ activity rewards ─────────────────────────────────────────────────────

export const ACTIVITY_DN = {
  dailyLogin:    1,   // تسجيل الدخول اليومي
  matchJoin:     1,   // المشاركة في مباراة
  matchPlay:     1,   // لعب مباراة
  accuracy100:   1,   // دقة 100%
  socialActivity: 3,  // 5 إعجابات + 5 تعليقات
  createContent:  1,  // منشور + ستوري
  inviteFriend:  10,  // دعوة صديق جديد
} as const;

// ── In-game help cost ─────────────────────────────────────────────────────────

/** Cost to eliminate one wrong answer during a match. */
export const GAME_ASSIST_COST_DN = 2;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Map a league tier string (frontend/DB ID) to an EconomyTier. */
export function leagueTierToEconomyTier(tier: string): EconomyTier {
  const map: Record<string, EconomyTier> = {
    training:  'div3',
    coins:     'div3',
    coin:      'div2',
    dv2:       'div2',
    pro:       'pro',
    elite:     'pro',
    champion:  'champions',
    champions: 'champions',
  };
  return map[tier] ?? 'div3';
}

/** Pi entry cost for a league tier. */
export function getPiEntryCost(tier: EconomyTier): number {
  return PI_ENTRY_COST[tier];
}

/** Season-end DN$ for a given rank and tier. Falls back to participant reward. */
export function getSeasonEndDN(tier: EconomyTier, rank: number): number {
  return SEASON_END_DN_TABLE[tier]?.[rank] ?? SEASON_END_DN_PARTICIPANT[tier];
}
