/**
 * daily-rewards.ts
 * ─────────────────
 * Daily Tasks Service — tracks progress and manages Coin rewards.
 * All tasks reset each UTC day (one row per player per calendar day).
 *
 * Tasks:
 *   1. Daily Login     → 5 Coins (claim from Daily Tasks page)
 *   2. Social Activity → 10 Coins (5 likes GIVEN + 5 comments GIVEN)
 *   3. Create Content  → 10 Coins (1 post + 1 story)
 *   4. Play Match      → 10 Coins (complete 1 full match)
 */

import { eq, and } from 'drizzle-orm';
import {
  db,
  playersTable,
  coinTransactionsTable,
  userDailyEconomyTable,
} from '@workspace/db';
import { nanoid } from './nanoid.js';

// ── Constants ──────────────────────────────────────────────────────────────

const TASK_COINS = {
  login:   5,
  social:  10,
  content: 10,
  match:   10,
} as const;

export type DailyTask = keyof typeof TASK_COINS;

// ── Helpers ────────────────────────────────────────────────────────────────

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

async function awardCoins(
  playerId: string,
  amount: number,
  source: string,
  description: string,
): Promise<{ newBalance: number }> {
  const [player] = await db
    .select({ coins: playersTable.coins })
    .from(playersTable)
    .where(eq(playersTable.id, playerId))
    .limit(1);

  if (!player) throw new Error(`Player not found: ${playerId}`);

  const newBalance = player.coins + amount;

  await db
    .update(playersTable)
    .set({ coins: newBalance, updatedAt: new Date() })
    .where(eq(playersTable.id, playerId));

  await db.insert(coinTransactionsTable).values({
    id: nanoid(),
    playerId,
    amount,
    type: 'earn',
    source,
    description,
    balanceAfter: newBalance,
  });

  return { newBalance };
}

async function getOrCreateDailyRecord(playerId: string) {
  const today = todayUTC();

  const [existing] = await db
    .select()
    .from(userDailyEconomyTable)
    .where(
      and(
        eq(userDailyEconomyTable.playerId, playerId),
        eq(userDailyEconomyTable.date, today),
      ),
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(userDailyEconomyTable)
    .values({ id: nanoid(), playerId, date: today })
    .returning();

  return created;
}

// ── Public API ────────────────────────────────────────────────────────────

export type RewardResult =
  | { awarded: true; coins: number; newBalance: number; reason: string }
  | { awarded: false; reason: string };

// ── Task 1: Daily Login ────────────────────────────────────────────────────

/**
 * Claim the daily login reward (5 Coins, once per day).
 * Called when user visits the Daily Tasks page.
 */
export async function claimLoginReward(playerId: string): Promise<RewardResult> {
  const record = await getOrCreateDailyRecord(playerId);

  if (record.loginClaimed) {
    return { awarded: false, reason: 'Login reward already claimed today' };
  }

  await db
    .update(userDailyEconomyTable)
    .set({ loginClaimed: true, updatedAt: new Date() })
    .where(eq(userDailyEconomyTable.id, record.id));

  const { newBalance } = await awardCoins(
    playerId,
    TASK_COINS.login,
    'daily_login',
    'Daily Login task reward',
  );

  return { awarded: true, coins: TASK_COINS.login, newBalance, reason: 'Daily Login reward' };
}

// ── Task 2: Social Activity ────────────────────────────────────────────────

/**
 * Record a LIKE given by a player (not received).
 * Tracked for the "Social Activity" daily task.
 */
export async function recordLikeGiven(playerId: string): Promise<void> {
  const record = await getOrCreateDailyRecord(playerId);
  if (record.likesGiven >= 5) return;

  await db
    .update(userDailyEconomyTable)
    .set({ likesGiven: record.likesGiven + 1, updatedAt: new Date() })
    .where(eq(userDailyEconomyTable.id, record.id));
}

/**
 * Record a COMMENT given by a player (not received).
 * Tracked for the "Social Activity" daily task.
 */
export async function recordCommentGiven(playerId: string): Promise<void> {
  const record = await getOrCreateDailyRecord(playerId);
  if (record.commentsGiven >= 5) return;

  await db
    .update(userDailyEconomyTable)
    .set({ commentsGiven: record.commentsGiven + 1, updatedAt: new Date() })
    .where(eq(userDailyEconomyTable.id, record.id));
}

/**
 * Claim the Social Activity reward (10 Coins).
 * Requires: 5 likes given + 5 comments given today.
 */
export async function claimSocialReward(playerId: string): Promise<RewardResult> {
  const record = await getOrCreateDailyRecord(playerId);

  if (record.socialRewardClaimed) {
    return { awarded: false, reason: 'Social Activity reward already claimed today' };
  }

  if (record.likesGiven < 5 || record.commentsGiven < 5) {
    return {
      awarded: false,
      reason: `Incomplete: ${record.likesGiven}/5 likes, ${record.commentsGiven}/5 comments given`,
    };
  }

  await db
    .update(userDailyEconomyTable)
    .set({ socialRewardClaimed: true, updatedAt: new Date() })
    .where(eq(userDailyEconomyTable.id, record.id));

  const { newBalance } = await awardCoins(
    playerId,
    TASK_COINS.social,
    'daily_social',
    'Social Activity task: 5 likes + 5 comments given',
  );

  return { awarded: true, coins: TASK_COINS.social, newBalance, reason: 'Social Activity reward' };
}

// ── Task 3: Create Content ────────────────────────────────────────────────

/**
 * Record a post created by the player.
 * Tracked for the "Create Content" daily task.
 */
export async function recordPost(playerId: string): Promise<RewardResult> {
  const record = await getOrCreateDailyRecord(playerId);

  await db
    .update(userDailyEconomyTable)
    .set({
      postsCount: Math.min(record.postsCount + 1, 1),
      updatedAt: new Date(),
    })
    .where(eq(userDailyEconomyTable.id, record.id));

  return { awarded: false, reason: 'Post recorded (1/1) — also post a story to complete the task' };
}

/**
 * Record a story created by the player.
 * Tracked for the "Create Content" daily task.
 */
export async function recordStory(playerId: string): Promise<void> {
  const record = await getOrCreateDailyRecord(playerId);
  if (record.storiesCount >= 1) return;

  await db
    .update(userDailyEconomyTable)
    .set({ storiesCount: 1, updatedAt: new Date() })
    .where(eq(userDailyEconomyTable.id, record.id));
}

/**
 * Claim the Create Content reward (10 Coins).
 * Requires: 1 post + 1 story today.
 */
export async function claimContentReward(playerId: string): Promise<RewardResult> {
  const record = await getOrCreateDailyRecord(playerId);

  if (record.contentRewardClaimed) {
    return { awarded: false, reason: 'Create Content reward already claimed today' };
  }

  if (record.postsCount < 1 || record.storiesCount < 1) {
    return {
      awarded: false,
      reason: `Incomplete: ${record.postsCount}/1 post, ${record.storiesCount}/1 story`,
    };
  }

  await db
    .update(userDailyEconomyTable)
    .set({ contentRewardClaimed: true, updatedAt: new Date() })
    .where(eq(userDailyEconomyTable.id, record.id));

  const { newBalance } = await awardCoins(
    playerId,
    TASK_COINS.content,
    'daily_content',
    'Create Content task: 1 post + 1 story',
  );

  return { awarded: true, coins: TASK_COINS.content, newBalance, reason: 'Create Content reward' };
}

// ── Task 4: Play Match ────────────────────────────────────────────────────

/**
 * Record that the player completed a match.
 * Called by the game engine when a full match finishes.
 */
export async function recordMatchPlayed(playerId: string): Promise<void> {
  const record = await getOrCreateDailyRecord(playerId);
  if (record.matchPlayed) return;

  await db
    .update(userDailyEconomyTable)
    .set({ matchPlayed: true, updatedAt: new Date() })
    .where(eq(userDailyEconomyTable.id, record.id));
}

/**
 * Claim the Play Match reward (10 Coins).
 * Requires: 1 full match played today.
 */
export async function claimMatchReward(playerId: string): Promise<RewardResult> {
  const record = await getOrCreateDailyRecord(playerId);

  if (record.matchPlayedClaimed) {
    return { awarded: false, reason: 'Match reward already claimed today' };
  }

  if (!record.matchPlayed) {
    return { awarded: false, reason: 'No match played yet today' };
  }

  await db
    .update(userDailyEconomyTable)
    .set({ matchPlayedClaimed: true, updatedAt: new Date() })
    .where(eq(userDailyEconomyTable.id, record.id));

  const { newBalance } = await awardCoins(
    playerId,
    TASK_COINS.match,
    'daily_match',
    'Play Match task: 1 full match completed',
  );

  return { awarded: true, coins: TASK_COINS.match, newBalance, reason: 'Play Match reward' };
}

// ── Status ────────────────────────────────────────────────────────────────

export async function getDailyStatus(playerId: string) {
  const today  = todayUTC();
  const record = await getOrCreateDailyRecord(playerId);

  return {
    date: today,

    // Task 1
    loginClaimed:          record.loginClaimed,

    // Task 2
    likesGiven:            record.likesGiven,
    commentsGiven:         record.commentsGiven,
    socialRewardClaimed:   record.socialRewardClaimed,
    socialComplete:        record.likesGiven >= 5 && record.commentsGiven >= 5,

    // Task 3
    postsCount:            record.postsCount,
    storiesCount:          record.storiesCount,
    contentRewardClaimed:  record.contentRewardClaimed,
    contentComplete:       record.postsCount >= 1 && record.storiesCount >= 1,

    // Task 4
    matchPlayed:           record.matchPlayed,
    matchPlayedClaimed:    record.matchPlayedClaimed,
  };
}
