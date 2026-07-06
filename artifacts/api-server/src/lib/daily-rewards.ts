/**
 * daily-rewards.ts
 * ─────────────────
 * Daily Tasks Service — tracks progress and manages DN$ rewards.
 * All tasks reset each UTC day (one row per player per calendar day).
 *
 * Tasks & DN$ rewards:
 *   1. Daily Login      → +1 DN$   (claim from Daily Tasks page)
 *   2. Social Activity  → +3 DN$   (5 likes GIVEN + 5 comments GIVEN)
 *   3. Create Content   → +1 DN$   (1 post + 1 story)
 *   4. Play Match       → +1 DN$   (complete 1 full match)
 */

import { eq, and } from 'drizzle-orm';
import {
  db,
  userDailyEconomyTable,
} from '@workspace/db';
import { nanoid } from './nanoid.js';
import { awardDN } from './dn-service.js';

// ── Constants ──────────────────────────────────────────────────────────────

const TASK_DN = {
  login:   1,
  social:  3,
  content: 1,
  match:   1,
} as const;

export type DailyTask = keyof typeof TASK_DN;

// ── Helpers ────────────────────────────────────────────────────────────────

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
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
  | { awarded: true; dn: number; newBalance: number; reason: string }
  | { awarded: false; reason: string };

// ── Task 1: Daily Login ────────────────────────────────────────────────────

export async function claimLoginReward(playerId: string): Promise<RewardResult> {
  const record = await getOrCreateDailyRecord(playerId);

  if (record.loginClaimed) {
    return { awarded: false, reason: 'Login reward already claimed today' };
  }

  await db
    .update(userDailyEconomyTable)
    .set({ loginClaimed: true, updatedAt: new Date() })
    .where(eq(userDailyEconomyTable.id, record.id));

  const { newBalance } = await awardDN(
    playerId,
    TASK_DN.login,
    'daily_login',
    'Daily Login task reward',
  );

  return { awarded: true, dn: TASK_DN.login, newBalance, reason: 'Daily Login reward' };
}

// ── Task 2: Social Activity ────────────────────────────────────────────────

export async function recordLikeGiven(playerId: string): Promise<void> {
  const record = await getOrCreateDailyRecord(playerId);
  if (record.likesGiven >= 5) return;

  await db
    .update(userDailyEconomyTable)
    .set({ likesGiven: record.likesGiven + 1, updatedAt: new Date() })
    .where(eq(userDailyEconomyTable.id, record.id));
}

export async function recordCommentGiven(playerId: string): Promise<void> {
  const record = await getOrCreateDailyRecord(playerId);
  if (record.commentsGiven >= 5) return;

  await db
    .update(userDailyEconomyTable)
    .set({ commentsGiven: record.commentsGiven + 1, updatedAt: new Date() })
    .where(eq(userDailyEconomyTable.id, record.id));
}

export async function claimSocialReward(playerId: string): Promise<RewardResult> {
  const record = await getOrCreateDailyRecord(playerId);

  if (record.socialRewardClaimed) {
    return { awarded: false, reason: 'Social reward already claimed today' };
  }
  if (record.likesGiven < 5 || record.commentsGiven < 5) {
    return { awarded: false, reason: `Need 5 likes + 5 comments. Have: ${record.likesGiven} likes, ${record.commentsGiven} comments` };
  }

  await db
    .update(userDailyEconomyTable)
    .set({ socialRewardClaimed: true, updatedAt: new Date() })
    .where(eq(userDailyEconomyTable.id, record.id));

  const { newBalance } = await awardDN(
    playerId,
    TASK_DN.social,
    'daily_social',
    'Social Activity task: 5 likes + 5 comments given',
  );

  return { awarded: true, dn: TASK_DN.social, newBalance, reason: 'Social Activity reward' };
}

// ── Task 3: Create Content ─────────────────────────────────────────────────

export async function recordPostCreated(playerId: string): Promise<void> {
  const record = await getOrCreateDailyRecord(playerId);

  await db
    .update(userDailyEconomyTable)
    .set({ postsCount: record.postsCount + 1, updatedAt: new Date() })
    .where(eq(userDailyEconomyTable.id, record.id));
}

export async function recordStory(playerId: string): Promise<void> {
  const record = await getOrCreateDailyRecord(playerId);
  if (record.storiesCount >= 1) return;

  await db
    .update(userDailyEconomyTable)
    .set({ storiesCount: record.storiesCount + 1, updatedAt: new Date() })
    .where(eq(userDailyEconomyTable.id, record.id));
}

export async function claimContentReward(playerId: string): Promise<RewardResult> {
  const record = await getOrCreateDailyRecord(playerId);

  if (record.contentRewardClaimed) {
    return { awarded: false, reason: 'Content reward already claimed today' };
  }
  if (record.postsCount < 1 || record.storiesCount < 1) {
    return { awarded: false, reason: `Need 1 post + 1 story. Have: ${record.postsCount} posts, ${record.storiesCount} stories` };
  }

  await db
    .update(userDailyEconomyTable)
    .set({ contentRewardClaimed: true, updatedAt: new Date() })
    .where(eq(userDailyEconomyTable.id, record.id));

  const { newBalance } = await awardDN(
    playerId,
    TASK_DN.content,
    'daily_content',
    'Create Content task: 1 post + 1 story',
  );

  return { awarded: true, dn: TASK_DN.content, newBalance, reason: 'Create Content reward' };
}

// ── Task 4: Play Match ─────────────────────────────────────────────────────

export async function recordMatchPlayed(playerId: string): Promise<void> {
  const record = await getOrCreateDailyRecord(playerId);
  if (record.matchPlayed) return;

  await db
    .update(userDailyEconomyTable)
    .set({ matchPlayed: true, updatedAt: new Date() })
    .where(eq(userDailyEconomyTable.id, record.id));
}

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

  const { newBalance } = await awardDN(
    playerId,
    TASK_DN.match,
    'daily_match',
    'Play Match task: 1 full match completed',
  );

  return { awarded: true, dn: TASK_DN.match, newBalance, reason: 'Play Match reward' };
}

// ── Status ────────────────────────────────────────────────────────────────

export async function getDailyStatus(playerId: string) {
  const today  = todayUTC();
  const record = await getOrCreateDailyRecord(playerId);

  return {
    date: today,

    // Task 1
    loginClaimed:          record.loginClaimed,
    loginReward:           TASK_DN.login,

    // Task 2
    likesGiven:            record.likesGiven,
    commentsGiven:         record.commentsGiven,
    socialRewardClaimed:   record.socialRewardClaimed,
    socialComplete:        record.likesGiven >= 5 && record.commentsGiven >= 5,
    socialReward:          TASK_DN.social,

    // Task 3
    postsCount:            record.postsCount,
    storiesCount:          record.storiesCount,
    contentRewardClaimed:  record.contentRewardClaimed,
    contentComplete:       record.postsCount >= 1 && record.storiesCount >= 1,
    contentReward:         TASK_DN.content,

    // Task 4
    matchPlayed:           record.matchPlayed,
    matchPlayedClaimed:    record.matchPlayedClaimed,
    matchReward:           TASK_DN.match,
  };
}
