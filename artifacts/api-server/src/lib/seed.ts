import { eq, count } from 'drizzle-orm';
import { db, playersTable, tournamentsTable } from '@workspace/db';
import { logger } from './logger.js';

export const FIXED_BOTS = [
  {
    id: "sl_bot_01", username: "NeonRacer", avatar: "⚡",
    elo: 1920, lp: 680, coins: 15600, xp: 14200, level: 28, leagueDivision: "champion",
    pvpWins: 187, pvpLosses: 43, pvpWinStreak: 5, bestPvpStreak: 18,
    matchesPlayed: 235, matchesWon: 192, bestStreak: 18,
    skillSpeed: 89, skillAccuracy: 91, skillMemory: 85, verificationStatus: "verified",
  },
  {
    id: "sl_bot_02", username: "ByteWolf", avatar: "🐺",
    elo: 1780, lp: 620, coins: 11200, xp: 10800, level: 22, leagueDivision: "champion",
    pvpWins: 143, pvpLosses: 58, pvpWinStreak: 3, bestPvpStreak: 13,
    matchesPlayed: 203, matchesWon: 148, bestStreak: 13,
    skillSpeed: 82, skillAccuracy: 84, skillMemory: 78, verificationStatus: "verified",
  },
  {
    id: "sl_bot_03", username: "StarKnight", avatar: "⭐",
    elo: 2100, lp: 780, coins: 24000, xp: 21000, level: 42, leagueDivision: "champion",
    pvpWins: 311, pvpLosses: 29, pvpWinStreak: 12, bestPvpStreak: 27,
    matchesPlayed: 344, matchesWon: 318, bestStreak: 27,
    skillSpeed: 96, skillAccuracy: 97, skillMemory: 94, verificationStatus: "verified",
  },
  {
    id: "sl_bot_04", username: "CosmicAce", avatar: "🌌",
    elo: 1850, lp: 560, coins: 18500, xp: 16000, level: 33, leagueDivision: "champion",
    pvpWins: 220, pvpLosses: 51, pvpWinStreak: 7, bestPvpStreak: 21,
    matchesPlayed: 278, matchesWon: 224, bestStreak: 21,
    skillSpeed: 91, skillAccuracy: 93, skillMemory: 88, verificationStatus: "verified",
  },
  {
    id: "sl_bot_05", username: "QuantumK", avatar: "⚛️",
    elo: 1760, lp: 530, coins: 13400, xp: 12100, level: 26, leagueDivision: "champion",
    pvpWins: 172, pvpLosses: 62, pvpWinStreak: 4, bestPvpStreak: 16,
    matchesPlayed: 241, matchesWon: 177, bestStreak: 16,
    skillSpeed: 85, skillAccuracy: 87, skillMemory: 82, verificationStatus: "verified",
  },

  // ── Pro tier (300-499 LP) ───────────────────────────────────────────────
  {
    id: "sl_bot_03", username: "PixelFox",    avatar: "🦊",
    elo: 1650, lp: 480, coins: 8900,  xp: 8500,  level: 18, leagueDivision: "pro",
    pvpWins: 112, pvpLosses: 71, pvpWinStreak: 2,  bestPvpStreak: 10,
    matchesPlayed: 184, matchesWon: 116, bestStreak: 10,
    skillSpeed: 75, skillAccuracy: 79, skillMemory: 72, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_04", username: "SwiftArrow",  avatar: "🏹",
    elo: 1540, lp: 420, coins: 7200,  xp: 6900,  level: 15, leagueDivision: "pro",
    pvpWins: 98,  pvpLosses: 84, pvpWinStreak: 1,  bestPvpStreak: 8,
    matchesPlayed: 184, matchesWon: 101, bestStreak: 8,
    skillSpeed: 70, skillAccuracy: 73, skillMemory: 67, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_05", username: "DataStrike",  avatar: "💥",
    elo: 1420, lp: 360, coins: 5800,  xp: 5400,  level: 12, leagueDivision: "pro",
    pvpWins: 76,  pvpLosses: 89, pvpWinStreak: 0,  bestPvpStreak: 7,
    matchesPlayed: 167, matchesWon: 79,  bestStreak: 7,
    skillSpeed: 63, skillAccuracy: 68, skillMemory: 61, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_13", username: "IronFox",     avatar: "🦾",
    elo: 1490, lp: 445, coins: 6500,  xp: 7200,  level: 16, leagueDivision: "pro",
    pvpWins: 108, pvpLosses: 77, pvpWinStreak: 2,  bestPvpStreak: 9,
    matchesPlayed: 192, matchesWon: 112, bestStreak: 9,
    skillSpeed: 72, skillAccuracy: 76, skillMemory: 69, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_14", username: "SkyKing",     avatar: "🦅",
    elo: 1380, lp: 315, coins: 4900,  xp: 4600,  level: 11, leagueDivision: "pro",
    pvpWins: 65,  pvpLosses: 92, pvpWinStreak: 0,  bestPvpStreak: 6,
    matchesPlayed: 159, matchesWon: 68,  bestStreak: 6,
    skillSpeed: 60, skillAccuracy: 64, skillMemory: 57, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_15", username: "BrainWave",   avatar: "🧠",
    elo: 1555, lp: 395, coins: 7800,  xp: 7100,  level: 17, leagueDivision: "pro",
    pvpWins: 121, pvpLosses: 68, pvpWinStreak: 3,  bestPvpStreak: 11,
    matchesPlayed: 197, matchesWon: 125, bestStreak: 11,
    skillSpeed: 76, skillAccuracy: 80, skillMemory: 73, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_16", username: "GridHawk",    avatar: "🦜",
    elo: 1460, lp: 340, coins: 5200,  xp: 5000,  level: 13, leagueDivision: "pro",
    pvpWins: 83,  pvpLosses: 88, pvpWinStreak: 1,  bestPvpStreak: 7,
    matchesPlayed: 173, matchesWon: 87,  bestStreak: 7,
    skillSpeed: 65, skillAccuracy: 69, skillMemory: 62, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_17", username: "NeonPulse",   avatar: "💜",
    elo: 1610, lp: 465, coins: 9200,  xp: 8800,  level: 19, leagueDivision: "pro",
    pvpWins: 132, pvpLosses: 59, pvpWinStreak: 4,  bestPvpStreak: 12,
    matchesPlayed: 199, matchesWon: 136, bestStreak: 12,
    skillSpeed: 78, skillAccuracy: 82, skillMemory: 75, verificationStatus: "unverified",
  },

  // ── Coin/Div2 tier (100-299 LP) ────────────────────────────────────────
  {
    id: "sl_bot_06", username: "QuickByte",   avatar: "⚡",
    elo: 1310, lp: 280, coins: 4500,  xp: 4000,  level: 9,  leagueDivision: "coin",
    pvpWins: 54,  pvpLosses: 78, pvpWinStreak: 2,  bestPvpStreak: 6,
    matchesPlayed: 134, matchesWon: 57,  bestStreak: 6,
    skillSpeed: 58, skillAccuracy: 61, skillMemory: 54, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_07", username: "CodeSniper",  avatar: "🎯",
    elo: 1200, lp: 175, coins: 3200,  xp: 2800,  level: 7,  leagueDivision: "coin",
    pvpWins: 38,  pvpLosses: 67, pvpWinStreak: 0,  bestPvpStreak: 5,
    matchesPlayed: 107, matchesWon: 41,  bestStreak: 5,
    skillSpeed: 52, skillAccuracy: 55, skillMemory: 49, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_18", username: "LightSpeed",  avatar: "💨",
    elo: 1260, lp: 240, coins: 3800,  xp: 3500,  level: 8,  leagueDivision: "coin",
    pvpWins: 47,  pvpLosses: 72, pvpWinStreak: 1,  bestPvpStreak: 5,
    matchesPlayed: 121, matchesWon: 50,  bestStreak: 5,
    skillSpeed: 55, skillAccuracy: 58, skillMemory: 51, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_19", username: "TopTier",     avatar: "🔝",
    elo: 1350, lp: 295, coins: 4200,  xp: 3900,  level: 9,  leagueDivision: "coin",
    pvpWins: 58,  pvpLosses: 74, pvpWinStreak: 2,  bestPvpStreak: 6,
    matchesPlayed: 138, matchesWon: 62,  bestStreak: 6,
    skillSpeed: 59, skillAccuracy: 62, skillMemory: 55, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_20", username: "FastHand",    avatar: "🤚",
    elo: 1180, lp: 145, coins: 2700,  xp: 2300,  level: 6,  leagueDivision: "coin",
    pvpWins: 32,  pvpLosses: 60, pvpWinStreak: 0,  bestPvpStreak: 4,
    matchesPlayed: 94,  matchesWon: 35,  bestStreak: 4,
    skillSpeed: 49, skillAccuracy: 52, skillMemory: 46, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_21", username: "DataDash",    avatar: "📊",
    elo: 1290, lp: 215, coins: 3600,  xp: 3200,  level: 8,  leagueDivision: "coin",
    pvpWins: 44,  pvpLosses: 69, pvpWinStreak: 1,  bestPvpStreak: 5,
    matchesPlayed: 115, matchesWon: 47,  bestStreak: 5,
    skillSpeed: 54, skillAccuracy: 57, skillMemory: 50, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_22", username: "KiwiBot",     avatar: "🥝",
    elo: 1225, lp: 165, coins: 2900,  xp: 2600,  level: 7,  leagueDivision: "coin",
    pvpWins: 36,  pvpLosses: 64, pvpWinStreak: 0,  bestPvpStreak: 4,
    matchesPlayed: 102, matchesWon: 39,  bestStreak: 4,
    skillSpeed: 51, skillAccuracy: 53, skillMemory: 47, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_23", username: "CobraK",      avatar: "🐍",
    elo: 1320, lp: 260, coins: 4100,  xp: 3700,  level: 9,  leagueDivision: "coin",
    pvpWins: 51,  pvpLosses: 76, pvpWinStreak: 1,  bestPvpStreak: 6,
    matchesPlayed: 129, matchesWon: 54,  bestStreak: 6,
    skillSpeed: 57, skillAccuracy: 60, skillMemory: 53, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_24", username: "ZetaBot",     avatar: "🤖",
    elo: 1165, lp: 120, coins: 2400,  xp: 1900,  level: 6,  leagueDivision: "coin",
    pvpWins: 28,  pvpLosses: 56, pvpWinStreak: 0,  bestPvpStreak: 4,
    matchesPlayed: 86,  matchesWon: 30,  bestStreak: 4,
    skillSpeed: 47, skillAccuracy: 50, skillMemory: 44, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_25", username: "StarQ",       avatar: "🌠",
    elo: 1245, lp: 195, coins: 3300,  xp: 3000,  level: 7,  leagueDivision: "coin",
    pvpWins: 41,  pvpLosses: 66, pvpWinStreak: 1,  bestPvpStreak: 5,
    matchesPlayed: 109, matchesWon: 44,  bestStreak: 5,
    skillSpeed: 53, skillAccuracy: 56, skillMemory: 49, verificationStatus: "unverified",
  },

  // ── Training tier (0-99 LP) ────────────────────────────────────────────
  {
    id: "sl_bot_08", username: "NetRunner",   avatar: "🌐",
    elo: 1100, lp: 85, coins: 2100,  xp: 1800,  level: 5,  leagueDivision: "training",
    pvpWins: 22,  pvpLosses: 51, pvpWinStreak: 1,  bestPvpStreak: 4,
    matchesPlayed: 75,  matchesWon: 24,  bestStreak: 4,
    skillSpeed: 47, skillAccuracy: 49, skillMemory: 44, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_09", username: "FlashMind",   avatar: "🧠",
    elo: 1020, lp: 45, coins: 1400,  xp: 900,   level: 3,  leagueDivision: "training",
    pvpWins: 11,  pvpLosses: 38, pvpWinStreak: 0,  bestPvpStreak: 3,
    matchesPlayed: 51,  matchesWon: 13,  bestStreak: 3,
    skillSpeed: 42, skillAccuracy: 44, skillMemory: 39, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_26", username: "BlazeFire",   avatar: "🔥",
    elo: 1050, lp: 65, coins: 1700,  xp: 1400,  level: 4,  leagueDivision: "training",
    pvpWins: 15,  pvpLosses: 43, pvpWinStreak: 0,  bestPvpStreak: 3,
    matchesPlayed: 60,  matchesWon: 17,  bestStreak: 3,
    skillSpeed: 44, skillAccuracy: 46, skillMemory: 41, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_27", username: "NovaX",       avatar: "🌟",
    elo: 1010, lp: 30, coins: 1100,  xp: 700,   level: 2,  leagueDivision: "training",
    pvpWins: 8,   pvpLosses: 32, pvpWinStreak: 0,  bestPvpStreak: 2,
    matchesPlayed: 42,  matchesWon: 9,   bestStreak: 2,
    skillSpeed: 40, skillAccuracy: 42, skillMemory: 37, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_28", username: "PiMaster",    avatar: "π",
    elo: 1080, lp: 78, coins: 1900,  xp: 1600,  level: 4,  leagueDivision: "training",
    pvpWins: 18,  pvpLosses: 46, pvpWinStreak: 1,  bestPvpStreak: 3,
    matchesPlayed: 66,  matchesWon: 20,  bestStreak: 3,
    skillSpeed: 45, skillAccuracy: 47, skillMemory: 43, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_29", username: "CodeStrike",  avatar: "🎮",
    elo: 1035, lp: 15, coins: 900,   xp: 500,   level: 2,  leagueDivision: "training",
    pvpWins: 6,   pvpLosses: 28, pvpWinStreak: 0,  bestPvpStreak: 2,
    matchesPlayed: 36,  matchesWon: 7,   bestStreak: 2,
    skillSpeed: 39, skillAccuracy: 41, skillMemory: 36, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_30", username: "WildCard",    avatar: "🃏",
    elo: 1060, lp: 55, coins: 1600,  xp: 1200,  level: 3,  leagueDivision: "training",
    pvpWins: 13,  pvpLosses: 41, pvpWinStreak: 0,  bestPvpStreak: 3,
    matchesPlayed: 56,  matchesWon: 15,  bestStreak: 3,
    skillSpeed: 43, skillAccuracy: 45, skillMemory: 40, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_31", username: "RedAlert",    avatar: "🚨",
    elo: 1015, lp: 8, coins: 800,    xp: 400,   level: 1,  leagueDivision: "training",
    pvpWins: 4,   pvpLosses: 25, pvpWinStreak: 0,  bestPvpStreak: 2,
    matchesPlayed: 31,  matchesWon: 5,   bestStreak: 2,
    skillSpeed: 38, skillAccuracy: 40, skillMemory: 35, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_32", username: "BlueStar",    avatar: "🌀",
    elo: 1045, lp: 38, coins: 1300,  xp: 1000,  level: 3,  leagueDivision: "training",
    pvpWins: 10,  pvpLosses: 36, pvpWinStreak: 0,  bestPvpStreak: 3,
    matchesPlayed: 48,  matchesWon: 12,  bestStreak: 3,
    skillSpeed: 41, skillAccuracy: 43, skillMemory: 38, verificationStatus: "unverified",
  },
  {
    id: "sl_bot_33", username: "DarkMatter",  avatar: "🌑",
    elo: 1090, lp: 92, coins: 2000,  xp: 1700,  level: 5,  leagueDivision: "training",
    pvpWins: 20,  pvpLosses: 49, pvpWinStreak: 1,  bestPvpStreak: 4,
    matchesPlayed: 71,  matchesWon: 22,  bestStreak: 4,
    skillSpeed: 46, skillAccuracy: 48, skillMemory: 43, verificationStatus: "unverified",
  },
];

// ── Tournaments ───────────────────────────────────────────────────────────────

function nextMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const daysUntilMonday = (8 - day) % 7 || 7;
  d.setDate(d.getDate() + daysUntilMonday);
  d.setHours(18, 0, 0, 0);
  return d;
}

function nextSunday(): Date {
  const d = new Date();
  const day = d.getDay();
  const daysUntilSunday = (7 - day) || 7;
  d.setDate(d.getDate() + daysUntilSunday);
  d.setHours(20, 0, 0, 0);
  return d;
}

const TOURNAMENTS = [
  {
    id: "daily_open_01",
    name: "Daily Open",
    type: "daily",
    status: "open",
    size: 16,
    rewardCoins: 500,
    rewardXp: 300,
    participants: [] as string[],
    startAt: (() => { const d = new Date(); d.setHours(d.getHours() + 2, 0, 0, 0); return d; })(),
    endAt:   (() => { const d = new Date(); d.setHours(d.getHours() + 4, 0, 0, 0); return d; })(),
  },
  {
    id: "weekly_cup_01",
    name: "Weekly Cup",
    type: "weekly",
    status: "open",
    size: 32,
    rewardCoins: 2000,
    rewardXp: 1000,
    participants: [] as string[],
    startAt: nextMonday(),
    endAt:   (() => { const d = nextMonday(); d.setDate(d.getDate() + 1); return d; })(),
  },
  {
    id: "pro_invitational_01",
    name: "Pro Invitational",
    type: "invite",
    status: "open",
    size: 8,
    rewardCoins: 5000,
    rewardXp: 2500,
    participants: [] as string[],
    startAt: nextSunday(),
    endAt:   (() => { const d = nextSunday(); d.setDate(d.getDate() + 1); return d; })(),
  },
];

// ── Runner ────────────────────────────────────────────────────────────────────

export async function runSeed(): Promise<void> {
  try {
    // ── Seed players ──────────────────────────────────────────────────────
    const [{ value: pCount }] = await db
      .select({ value: count() })
      .from(playersTable);

    if (Number(pCount) < 20) {
      await db.insert(playersTable).values(FIXED_BOTS).onConflictDoNothing();
      logger.info({ count: FIXED_BOTS.length }, "Seeded bot players");
    } else {
      // Update LP for existing bots to ensure they have proper values
      const updatePromises = FIXED_BOTS.slice(0, 10).map(bot =>
        db.update(playersTable)
          .set({ lp: bot.lp, leagueDivision: bot.leagueDivision, updatedAt: new Date() })
          .where(eq(playersTable.id, bot.id))
          .catch(() => {})
      );
      await Promise.all(updatePromises);
      logger.info({ existing: Number(pCount) }, "Players already seeded — updated LP values");
    }

    // ── Seed tournaments ──────────────────────────────────────────────────
    const [{ value: tCount }] = await db
      .select({ value: count() })
      .from(tournamentsTable);

    if (Number(tCount) < 2) {
      await db.insert(tournamentsTable).values(TOURNAMENTS).onConflictDoNothing();
      logger.info({ count: TOURNAMENTS.length }, "Seeded tournaments");
    } else {
      logger.info({ existing: Number(tCount) }, "Tournaments already seeded — skipping");
    }

    // ── Refresh expired daily tournament ──────────────────────────────────
    await refreshDailyTournament();
  } catch (err) {
    logger.error({ err }, "Seed error — continuing without seed data");
  }
}

// ── Daily Tournament Auto-Refresh ─────────────────────────────────────────────

export async function refreshDailyTournament(): Promise<void> {
  try {
    const now = new Date();
    const [existing] = await db
      .select({ id: tournamentsTable.id, endAt: tournamentsTable.endAt, status: tournamentsTable.status })
      .from(tournamentsTable)
      .where(eq(tournamentsTable.id, "daily_open_01"))
      .limit(1);

    const isExpired = existing && existing.endAt != null && existing.endAt < now;
    const isMissing = !existing;

    if (isExpired || isMissing) {
      const startAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const endAt   = new Date(now.getTime() + 4 * 60 * 60 * 1000);

      if (isMissing) {
        await db.insert(tournamentsTable).values({
          id:           "daily_open_01",
          name:         "Daily Open",
          type:         "daily",
          status:       "open",
          size:         16,
          rewardCoins:  500,
          rewardXp:     300,
          participants: [],
          startAt,
          endAt,
        });
      } else {
        await db.update(tournamentsTable)
          .set({ status: "open", participants: [], startAt, endAt })
          .where(eq(tournamentsTable.id, "daily_open_01"));
      }
      logger.info({ startAt, endAt }, "Daily tournament refreshed");
    }
  } catch (err) {
    logger.error({ err }, "refreshDailyTournament error");
  }
}

// Schedule daily tournament refresh check every hour
let _dailyRefreshInterval: ReturnType<typeof setInterval> | null = null;
export function startDailyTournamentScheduler(): void {
  if (_dailyRefreshInterval) return;
  _dailyRefreshInterval = setInterval(() => refreshDailyTournament(), 60 * 60 * 1000);
  logger.info("Daily tournament scheduler started");
}
