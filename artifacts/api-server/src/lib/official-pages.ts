/**
 * official-pages.ts
 * ──────────────────
 * "Official SkillLeague Pages System" — a layer of system-owned content
 * pages (not real player accounts) that post curated content and interact
 * with real users' posts, making the social feed feel like a living network.
 *
 * These pages are implemented as regular `players` rows (id prefixed with
 * "sl_page_") so they slot into the EXISTING posts/likes/comments tables
 * and routes with zero structural changes. Their "official" identity is
 * derived purely from the id prefix in community.ts (mapPost) — no schema
 * changes required.
 *
 * PROTECTED: does not touch posts/likes/comments schemas, matches, economy,
 * or existing bot-simulator logic. Purely additive.
 */

import { db, playersTable, postsTable, postLikesTable, postCommentsTable } from "@workspace/db";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { logger } from "./logger.js";
import { getOfficialPagesSettings, getSocialSettings } from "./settings-service.js";

// ── Page identity ─────────────────────────────────────────────────────────

export interface OfficialPageDef {
  id: string;
  category: "wisdom" | "motivation" | "health" | "faith" | "explore";
  name: string;
  avatar: string;
  bio: string;
}

export const OFFICIAL_PAGES: OfficialPageDef[] = [
  {
    id: "sl_page_wisdom",
    category: "wisdom",
    name: "🛡️ SkillLeague Wisdom",
    avatar: "🧠",
    bio: "حكم وأقوال الفلاسفة، اقتباسات قصيرة، محتوى فلسفي وثقافي — صفحة SkillLeague الرسمية",
  },
  {
    id: "sl_page_motivation",
    category: "motivation",
    name: "🛡️ SkillLeague Motivation",
    avatar: "💪",
    bio: "تحفيز ونجاح وتطوير ذات، عبارات إيجابية، نصائح للانضباط والعمل — صفحة SkillLeague الرسمية",
  },
  {
    id: "sl_page_health",
    category: "health",
    name: "🛡️ SkillLeague Health",
    avatar: "🏥",
    bio: "نصائح صحية عامة، تغذية ونوم ورياضة، معلومات طبية مبسطة — صفحة SkillLeague الرسمية",
  },
  {
    id: "sl_page_faith",
    category: "faith",
    name: "🛡️ SkillLeague Faith",
    avatar: "🕌",
    bio: "آيات قرآنية، أحاديث نبوية صحيحة قصيرة، قيم وأخلاق وتذكير ديني — صفحة SkillLeague الرسمية",
  },
  {
    id: "sl_page_explore",
    category: "explore",
    name: "🛡️ SkillLeague Explore",
    avatar: "🌍",
    bio: "سفر وطبيعة ومدن، صور أماكن جميلة، معلومات عن دول وثقافات — صفحة SkillLeague الرسمية",
  },
];

const OFFICIAL_PAGE_IDS = new Set(OFFICIAL_PAGES.map(p => p.id));

// ── Content templates per category ───────────────────────────────────────

type ContentItem = { text: string; imageUrl?: string };

const WISDOM_CONTENT: ContentItem[] = [
  { text: "\"من عرف نفسه عرف ربه\" — حكمة قديمة تدعونا للتأمل الداخلي 🌿" },
  { text: "\"الصبر مفتاح الفرج\" — لا تستعجل الثمار قبل أن تُكمل الزرع 🌱" },
  { text: "\"العقل السليم في الجسم السليم\" — اهتم بجسدك كما تهتم بعقلك" },
  { text: "قال أرسطو: \"نحن ما نكرره باستمرار، لذا فإن التميز ليس فعلاً بل عادة\" 📖" },
  { text: "\"من جدّ وجد، ومن زرع حصد\" — النجاح رحلة لا وجهة 🎯" },
  { text: "\"الحكمة ضالة المؤمن، أنّى وجدها فهو أحق بها\" 🕊️" },
  { text: "\"لا تؤجل عمل اليوم إلى الغد\" — كل لحظة فرصة لا تعوض ⏳" },
  { text: "\"أعظم الحكمة معرفة الذات\" — سقراط" },
];

const MOTIVATION_CONTENT: ContentItem[] = [
  { text: "لا تقارن نفسك بالآخرين، قارن نفسك بمن كنت عليه بالأمس 💪🔥" },
  { text: "كل خطوة صغيرة تقربك من هدفك الكبير، استمر ولا تتوقف 🚀" },
  { text: "الفشل ليس نهاية الطريق، بل جزء من رحلة النجاح 🌟" },
  { text: "انضباطك اليوم هو حريتك غداً — التزم بخطتك 📈" },
  { text: "لا أحد يصل للقمة براحة، ابدأ الآن وأنت أقوى مما تتخيل 🏔️" },
  { text: "النجاح يبدأ بقرار واحد: ألا تستسلم 🔥" },
  { text: "ثق بالعملية، النتائج تأتي لمن يصبر ويعمل بذكاء ✨" },
  { text: "كل يوم فرصة جديدة لتصبح نسخة أفضل من نفسك 💫" },
];

const HEALTH_CONTENT: ContentItem[] = [
  { text: "شرب 8 أكواب ماء يومياً يحسّن تركيزك وطاقتك خلال اليوم 💧" },
  { text: "النوم الجيد لمدة 7-8 ساعات ضروري لصحة الجسم والعقل 😴" },
  { text: "20 دقيقة مشي يومياً تقلل التوتر وتحسّن الدورة الدموية 🚶" },
  { text: "تناول الخضار والفواكه يومياً يعزز مناعتك الطبيعية 🥗" },
  { text: "خذ استراحة قصيرة كل ساعة أمام الشاشة لراحة عينيك 👀" },
  { text: "التنفس العميق لدقائق يومياً يقلل التوتر ويحسّن المزاج 🌬️" },
  { text: "تذكير: تناول الإفطار يمنحك طاقة أفضل لبقية يومك 🍳" },
];

const FAITH_CONTENT: ContentItem[] = [
  { text: "\"وَبَشِّرِ الصَّابِرِينَ\" — البقرة: 155 🕊️" },
  { text: "\"إِنَّ مَعَ الْعُسْرِ يُسْرًا\" — الشرح: 6 🌿" },
  { text: "قال ﷺ: \"من سلك طريقاً يلتمس فيه علماً سهّل الله له طريقاً إلى الجنة\" 📿" },
  { text: "\"وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ\" — الطلاق: 3 🤲" },
  { text: "قال ﷺ: \"الكلمة الطيبة صدقة\" — لنحرص على طيب الكلام دائماً 💬" },
  { text: "\"رَبِّ زِدْنِي عِلْمًا\" — دعاء جميل نبدأ به يومنا 🌙" },
  { text: "الصدق والأمانة من أعظم القيم التي حثّنا عليها ديننا الحنيف ☪️" },
];

const EXPLORE_CONTENT: ContentItem[] = [
  { text: "هل تعلم أن اليابان لديها أكثر من 6800 جزيرة؟ 🗾🌊", imageUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800" },
  { text: "جبال الألب تمتد عبر 8 دول أوروبية بمناظر خلابة ⛰️", imageUrl: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800" },
  { text: "الصحراء الكبرى تغطي مساحة تقارب مساحة الصين بأكملها 🏜️", imageUrl: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800" },
  { text: "مدينة البندقية مبنية على أكثر من 100 جزيرة صغيرة 🚤", imageUrl: "https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=800" },
  { text: "شلالات فيكتوريا من أعظم عجائب الطبيعة في أفريقيا 💦", imageUrl: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800" },
  { text: "غابات الأمازون تنتج 20% من أكسجين الأرض 🌳", imageUrl: "https://images.unsplash.com/photo-1440581572325-0bea30075d9d?w=800" },
];

const CATEGORY_CONTENT: Record<OfficialPageDef["category"], ContentItem[]> = {
  wisdom: WISDOM_CONTENT,
  motivation: MOTIVATION_CONTENT,
  health: HEALTH_CONTENT,
  faith: FAITH_CONTENT,
  explore: EXPLORE_CONTENT,
};

// ── Comment templates per category (used when engaging with user posts) ──

const CATEGORY_COMMENTS: Record<OfficialPageDef["category"], string[]> = {
  wisdom: ["اقتباس رائع 👏", "حكمة جميلة جدًا", "كلام له معنى عميق ✨"],
  motivation: ["استمر، أنت قادر 💪", "كلام محفز جدًا 🔥", "أحسنت، واصل التقدم 🚀"],
  health: ["معلومة مفيدة 👍", "نصيحة مهمة للصحة", "شكراً على التذكير الصحي 🌿"],
  faith: ["بارك الله فيك 🤲", "تذكير جميل، جزاك الله خيراً", "كلام طيب ونافع 🕊️"],
  explore: ["مكان جميل جدًا 😍", "أريد زيارة هذا المكان", "منظر خلاب حقاً 🌍"],
};

// ── Random helpers ────────────────────────────────────────────────────────

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

// ── Seeding — idempotent, never overwrites an already-seeded page ────────

export async function seedOfficialPages(): Promise<void> {
  try {
    const existing = await db
      .select({ id: playersTable.id })
      .from(playersTable)
      .where(inArray(playersTable.id, OFFICIAL_PAGES.map(p => p.id)));
    const existingIds = new Set(existing.map(e => e.id));

    const toInsert = OFFICIAL_PAGES.filter(p => !existingIds.has(p.id)).map(p => ({
      id: p.id,
      username: p.name,
      avatar: p.avatar,
      bio: p.bio,
      level: 50,
      elo: 1000,
      coins: 0,
      xp: 0,
      verificationStatus: "official",
      verified: true,
    }));

    if (toInsert.length > 0) {
      await db.insert(playersTable).values(toInsert).onConflictDoNothing();
      logger.info({ count: toInsert.length }, "Official SkillLeague pages seeded");
    }
  } catch (err) {
    logger.error({ err }, "official-pages: seeding error");
  }
}

// ── Live in-memory stats (also drives the Owner Tools panel) ─────────────

interface PageRuntimeStats {
  lastPostAt: number;
  postsCount: number;
  likesGiven: number;
  commentsGiven: number;
}

const runtimeStats = new Map<string, PageRuntimeStats>(
  OFFICIAL_PAGES.map(p => [p.id, { lastPostAt: 0, postsCount: 0, likesGiven: 0, commentsGiven: 0 }]),
);
let lastEngagementAt = 0;

export function getOfficialPagesRuntimeStats() {
  return OFFICIAL_PAGES.map(p => ({
    id: p.id,
    category: p.category,
    name: p.name,
    ...(runtimeStats.get(p.id) ?? { lastPostAt: 0, postsCount: 0, likesGiven: 0, commentsGiven: 0 }),
  }));
}

// ── Posting: each official page occasionally publishes curated content ───

async function simulateOfficialPosting(): Promise<void> {
  try {
    const settings = await getOfficialPagesSettings();
    if (!settings.enabled) return;
    const intervalMs = Math.max(1, settings.postingIntervalMinutes) * 60 * 1000;
    const now = Date.now();

    for (const page of OFFICIAL_PAGES) {
      if (settings.pages[page.id]?.enabled === false) continue;
      const stats = runtimeStats.get(page.id)!;
      if (now - stats.lastPostAt < intervalMs) continue;

      // ~65% chance to skip this tick per page — keeps a natural, non-fixed cadence
      if (Math.random() < 0.65) continue;

      const pool = CATEGORY_CONTENT[page.category];
      const item = pick(pool);

      // Decide format: text, image, or text+image (image-only pages like
      // Explore lean more visual; others mostly text).
      const hasImage = !!item.imageUrl && Math.random() < 0.8;

      await db.insert(postsTable).values({
        id: randomUUID(),
        authorId: page.id,
        username: page.name,
        level: 50,
        content: item.text,
        imageUrl: hasImage ? item.imageUrl : null,
        type: hasImage ? "image" : "text",
        meta: { isOfficialPage: true, category: page.category },
      });

      stats.lastPostAt = now;
      stats.postsCount += 1;
    }
  } catch (err) {
    logger.error({ err }, "official-pages: posting tick error");
  }
}

// ── Engagement: pages like + comment on real users' posts by specialty ───

async function simulateOfficialEngagement(): Promise<void> {
  try {
    const settings = await getOfficialPagesSettings();
    const socialSettings = await getSocialSettings();
    if (!settings.enabled) return;
    const intervalMs = Math.max(1, settings.engagementIntervalMinutes) * 60 * 1000;
    const now = Date.now();
    if (now - lastEngagementAt < intervalMs) return;
    lastEngagementAt = now;

    const enabledPages = OFFICIAL_PAGES.filter(p => settings.pages[p.id]?.enabled !== false);
    if (enabledPages.length === 0) return;

    const recentPosts = await db
      .select({ id: postsTable.id, authorId: postsTable.authorId })
      .from(postsTable)
      .orderBy(desc(postsTable.createdAt))
      .limit(20);

    // Only engage with real users' posts — never other bots or official pages
    const realPosts = recentPosts.filter(
      p => !p.authorId.startsWith("sl_bot_") && !p.authorId.startsWith("sl_page_"),
    );
    if (realPosts.length === 0) return;

    const shuffled = [...realPosts].sort(() => Math.random() - 0.5);
    const targetPosts = shuffled.slice(0, 1 + randInt(0, 2));

    for (const post of targetPosts) {
      // A random subset of pages notices this post — not all pages react to everything
      const reactingPages = [...enabledPages]
        .sort(() => Math.random() - 0.5)
        .slice(0, randInt(0, 2));

      for (const page of reactingPages) {
        const stats = runtimeStats.get(page.id)!;

        // ~55% chance to like
        if (socialSettings.likesEnabled !== false && Math.random() < 0.55) {
          const likeId = `like_${page.id}_${post.id}`;
          try {
            await db.insert(postLikesTable).values({
              id: likeId,
              postId: post.id,
              playerId: page.id,
            }).onConflictDoNothing();
            await db.update(postsTable)
              .set({ likes: sql`${postsTable.likes} + 1` })
              .where(eq(postsTable.id, post.id));
            stats.likesGiven += 1;
          } catch {
            // Non-critical
          }
        }

        // ~30% chance to also leave a short specialty comment
        if (socialSettings.commentsEnabled !== false && Math.random() < 0.3) {
          try {
            await db.insert(postCommentsTable).values({
              id: randomUUID(),
              postId: post.id,
              authorId: page.id,
              username: page.name,
              content: pick(CATEGORY_COMMENTS[page.category]),
            });
            await db.update(postsTable)
              .set({ replies: sql`${postsTable.replies} + 1` })
              .where(eq(postsTable.id, post.id));
            stats.commentsGiven += 1;
          } catch {
            // Non-critical
          }
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "official-pages: engagement tick error");
  }
}

// ── Scheduler ──────────────────────────────────────────────────────────────
// A single lightweight base tick checks (per-page/global) elapsed time
// against the configured intervals, so the Owner Tools panel can change
// posting/engagement speed live without restarting the process.

let _baseTick: ReturnType<typeof setInterval> | null = null;
const BASE_TICK_MS = 2 * 60 * 1000;

export function startOfficialPagesSystem(): void {
  if (_baseTick) return;

  seedOfficialPages().catch(() => {});

  // First base tick after 90s, then every 2 minutes. Each tick independently
  // decides whether enough time has passed (per the live-configurable
  // intervals) to run a posting and/or engagement pass.
  setTimeout(() => {
    simulateOfficialPosting().catch(() => {});
    simulateOfficialEngagement().catch(() => {});
    _baseTick = setInterval(() => {
      simulateOfficialPosting().catch(() => {});
      simulateOfficialEngagement().catch(() => {});
    }, BASE_TICK_MS);
  }, 90_000);

  logger.info({ pages: OFFICIAL_PAGES.length }, "Official SkillLeague Pages system started");
}

export function stopOfficialPagesSystem(): void {
  if (_baseTick) {
    clearInterval(_baseTick);
    _baseTick = null;
  }
}

export function isOfficialPageId(id: string): boolean {
  return OFFICIAL_PAGE_IDS.has(id);
}
