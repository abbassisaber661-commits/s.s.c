import { Router } from "express";
import { eq, desc, and, gte, count, ilike, or, sql } from "drizzle-orm";
import {
  db,
  postsTable,
  postLikesTable,
  postCommentsTable,
  playersTable,
  followersTable,
  notificationsTable,
} from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";

const router = Router();

// ─── helper: extract hashtags from text ──────────────────────────────────────
function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w\u0600-\u06FF]+/g) ?? [];
  return [...new Set(matches.map(t => t.toLowerCase()))];
}

// ─── helper: window start ────────────────────────────────────────────────────
function windowStart(window: string): Date {
  const now = Date.now();
  if (window === "7d")  return new Date(now - 7  * 86_400_000);
  if (window === "30d") return new Date(now - 30 * 86_400_000);
  return new Date(now - 24 * 3_600_000); // default 24h
}

// ─── helper: create notification (fire-and-forget) ───────────────────────────
async function createNotif(
  playerId: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
) {
  await db.insert(notificationsTable).values({
    id: nanoid(),
    playerId,
    type,
    title,
    body,
    data,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — SEARCH
// GET /social/search?q=&type=all|users|posts|hashtags&sort=recent|engagement|relevant
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/social/search", async (req, res) => {
  try {
    const q    = String(req.query.q ?? "").trim();
    const type = String(req.query.type  ?? "all");
    const sort = String(req.query.sort  ?? "relevant");

    if (!q || q.length < 1) {
      res.json({ users: [], posts: [], hashtags: [] });
      return;
    }

    const results: { users: unknown[]; posts: unknown[]; hashtags: unknown[] } = {
      users: [], posts: [], hashtags: [],
    };

    // ── Users ──────────────────────────────────────────────────────────
    if (type === "all" || type === "users") {
      const users = await db
        .select({
          id: playersTable.id,
          username: playersTable.username,
          avatar: playersTable.avatar,
          level: playersTable.level,
          elo: playersTable.elo,
          verificationStatus: playersTable.verificationStatus,
          lastActiveAt: playersTable.lastActiveAt,
        })
        .from(playersTable)
        .where(ilike(playersTable.username, `%${q}%`))
        .orderBy(desc(playersTable.elo))
        .limit(10);
      results.users = users;
    }

    // ── Posts ──────────────────────────────────────────────────────────
    if (type === "all" || type === "posts" || type === "hashtags") {
      const searchPattern = type === "hashtags" ? `%#${q}%` : `%${q}%`;

      let postsQuery = db
        .select({
          id: postsTable.id,
          authorId: postsTable.authorId,
          username: postsTable.username,
          level: postsTable.level,
          content: postsTable.content,
          likes: postsTable.likes,
          replies: postsTable.replies,
          createdAt: postsTable.createdAt,
        })
        .from(postsTable)
        .where(ilike(postsTable.content, searchPattern));

      const rawPosts = await postsQuery.limit(20);

      let sorted = rawPosts;
      if (sort === "engagement") {
        sorted = [...rawPosts].sort((a, b) => (b.likes + b.replies * 2) - (a.likes + a.replies * 2));
      } else if (sort === "recent") {
        sorted = [...rawPosts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      if (type === "hashtags") {
        results.hashtags = sorted;
      } else {
        results.posts = sorted;
      }
    }

    // ── Hashtags ───────────────────────────────────────────────────────
    if (type === "all") {
      const allPosts = await db
        .select({ content: postsTable.content })
        .from(postsTable)
        .where(ilike(postsTable.content, `%#%`))
        .limit(200);

      const tagCounts: Record<string, number> = {};
      for (const p of allPosts) {
        for (const tag of extractHashtags(p.content)) {
          if (tag.includes(q.toLowerCase())) {
            tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
          }
        }
      }
      results.hashtags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));
    }

    res.json(results);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 4 — HASHTAGS
// GET /social/hashtags/trending
// GET /social/posts/hashtag/:tag
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/social/hashtags/trending", async (req, res) => {
  try {
    const window = String(req.query.window ?? "24h");
    const since  = windowStart(window);

    const posts = await db
      .select({ content: postsTable.content, likes: postsTable.likes, createdAt: postsTable.createdAt })
      .from(postsTable)
      .where(gte(postsTable.createdAt, since))
      .limit(500);

    const tagStats: Record<string, { count: number; likes: number }> = {};
    for (const p of posts) {
      for (const tag of extractHashtags(p.content)) {
        if (!tagStats[tag]) tagStats[tag] = { count: 0, likes: 0 };
        tagStats[tag].count++;
        tagStats[tag].likes += p.likes;
      }
    }

    const trending = Object.entries(tagStats)
      .map(([tag, s]) => ({ tag, postCount: s.count, totalLikes: s.likes, score: s.count * 2 + s.likes }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    res.json({ window, trending });
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.get("/social/posts/hashtag/:tag", async (req, res) => {
  try {
    const tag   = decodeURIComponent(req.params.tag).toLowerCase().replace(/^#?/, "#");
    const limit = Math.min(Number(req.query.limit) || 30, 100);

    const posts = await db
      .select()
      .from(postsTable)
      .where(ilike(postsTable.content, `%${tag}%`))
      .orderBy(desc(postsTable.createdAt))
      .limit(limit);

    const filtered = posts.filter(p => extractHashtags(p.content).includes(tag));
    res.json(filtered);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 5 — TRENDING SYSTEM
// GET /social/trending?window=24h|7d|30d
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/social/trending", async (req, res) => {
  try {
    const window = String(req.query.window ?? "24h");
    const since  = windowStart(window);

    // Trending posts (by engagement score)
    const trendingPosts = await db
      .select({
        id: postsTable.id,
        authorId: postsTable.authorId,
        username: postsTable.username,
        level: postsTable.level,
        content: postsTable.content,
        likes: postsTable.likes,
        replies: postsTable.replies,
        createdAt: postsTable.createdAt,
      })
      .from(postsTable)
      .where(gte(postsTable.createdAt, since))
      .orderBy(
        desc(sql`${postsTable.likes} * 2 + ${postsTable.replies}`)
      )
      .limit(10);

    // Most liked posts
    const mostLikedPosts = await db
      .select({
        id: postsTable.id,
        username: postsTable.username,
        content: postsTable.content,
        likes: postsTable.likes,
        replies: postsTable.replies,
        createdAt: postsTable.createdAt,
      })
      .from(postsTable)
      .where(gte(postsTable.createdAt, since))
      .orderBy(desc(postsTable.likes))
      .limit(10);

    // Most commented posts
    const mostCommentedPosts = await db
      .select({
        id: postsTable.id,
        username: postsTable.username,
        content: postsTable.content,
        likes: postsTable.likes,
        replies: postsTable.replies,
        createdAt: postsTable.createdAt,
      })
      .from(postsTable)
      .where(gte(postsTable.createdAt, since))
      .orderBy(desc(postsTable.replies))
      .limit(10);

    // Most active users (by post count)
    const postCountRows = await db
      .select({
        authorId: postsTable.authorId,
        username: postsTable.username,
        postCount: count(postsTable.id),
      })
      .from(postsTable)
      .where(gte(postsTable.createdAt, since))
      .groupBy(postsTable.authorId, postsTable.username)
      .orderBy(desc(count(postsTable.id)))
      .limit(10);

    // Enrich active users with player info
    const activeUsers = await Promise.all(
      postCountRows.map(async row => {
        const [player] = await db
          .select({ level: playersTable.level, elo: playersTable.elo, verificationStatus: playersTable.verificationStatus })
          .from(playersTable)
          .where(eq(playersTable.id, row.authorId))
          .limit(1);
        return { ...row, ...player };
      })
    );

    // Trending hashtags
    const allWindowPosts = await db
      .select({ content: postsTable.content, likes: postsTable.likes })
      .from(postsTable)
      .where(and(gte(postsTable.createdAt, since), ilike(postsTable.content, "%#%")))
      .limit(500);

    const tagStats: Record<string, { count: number; likes: number }> = {};
    for (const p of allWindowPosts) {
      for (const tag of extractHashtags(p.content)) {
        if (!tagStats[tag]) tagStats[tag] = { count: 0, likes: 0 };
        tagStats[tag].count++;
        tagStats[tag].likes += p.likes;
      }
    }
    const trendingHashtags = Object.entries(tagStats)
      .map(([tag, s]) => ({ tag, postCount: s.count, totalLikes: s.likes }))
      .sort((a, b) => (b.postCount * 2 + b.totalLikes) - (a.postCount * 2 + a.totalLikes))
      .slice(0, 10);

    res.json({
      window,
      trendingPosts,
      mostLikedPosts,
      mostCommentedPosts,
      mostActiveUsers: activeUsers,
      trendingHashtags,
    });
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 6 — ENHANCED PROFILE STATS
// GET /social/profile/:id
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/social/profile/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Posts by this player
    const playerPostRows = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.authorId, id))
      .orderBy(desc(postsTable.createdAt));

    const postsCount       = playerPostRows.length;
    const likesReceived    = playerPostRows.reduce((s, p) => s + (p.likes ?? 0), 0);
    const commentsReceived = playerPostRows.reduce((s, p) => s + (p.replies ?? 0), 0);
    const lastPostAt       = playerPostRows[0]?.createdAt ?? null;

    // Followers / following
    const [followerRow] = await db
      .select({ cnt: count() })
      .from(followersTable)
      .where(eq(followersTable.followingId, id));
    const [followingRow] = await db
      .select({ cnt: count() })
      .from(followersTable)
      .where(eq(followersTable.followerId, id));

    // Player base info
    const [player] = await db
      .select({
        id:                 playersTable.id,
        username:           playersTable.username,
        level:              playersTable.level,
        xp:                 playersTable.xp,
        coins:              playersTable.coins,
        elo:                playersTable.elo,
        fame:               playersTable.fame,
        language:           playersTable.language,
        avatar:             playersTable.avatar,
        bio:                playersTable.bio,
        cover:              playersTable.cover,
        createdAt:          playersTable.createdAt,
        lastActiveAt:       playersTable.lastActiveAt,
        verified:           playersTable.verified,
        verificationStatus: playersTable.verificationStatus,
      })
      .from(playersTable)
      .where(eq(playersTable.id, id))
      .limit(1);

    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    const followersCount = followerRow?.cnt ?? 0;
    const followingCount = followingRow?.cnt ?? 0;

    // Map posts to ApiPost shape
    const posts = playerPostRows.slice(0, 20).map(p => ({
      id:        p.id,
      authorId:  p.authorId,
      username:  p.username,
      level:     p.level ?? 1,
      content:   p.content ?? "",
      imageUrl:  p.imageUrl,
      type:      p.type ?? "text",
      createdAt: p.createdAt,
      likes:     p.likes ?? 0,
      replies:   p.replies ?? 0,
      likedByMe: false,
    }));

    // Return in expected shape: { player, followers, following, posts }
    // AND flat stats for backward compatibility
    res.json({
      // ── New shape (expected by useProfileData hook) ──
      player: {
        id:                 player.id,
        username:           player.username ?? "",
        level:              player.level ?? 1,
        xp:                 player.xp    ?? 0,
        coins:              player.coins ?? 0,
        elo:                player.elo   ?? 0,
        fame:               player.fame  ?? 0,
        language:           player.language ?? "en",
        avatar:             player.avatar ?? null,
        bio:                player.bio   ?? null,
        cover:              player.cover ?? null,
        verified:           player.verified ?? false,
        verificationStatus: player.verificationStatus ?? "none",
      },
      followers: followersCount,
      following: followingCount,
      posts,
      // ── Flat stats (backward compatibility) ──
      playerId:          id,
      username:          player.username ?? "",
      level:             player.level    ?? 1,
      postsCount,
      likesReceived,
      commentsReceived,
      followersCount,
      followingCount,
      lastPostAt,
      lastActiveAt:      player.lastActiveAt ?? null,
      joinedAt:          player.createdAt    ?? null,
    });
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 7 — SOCIAL ANALYTICS
// GET /social/analytics
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/social/analytics", async (req, res) => {
  try {
    const since24h  = new Date(Date.now() - 24 * 3_600_000);
    const since7d   = new Date(Date.now() - 7  * 86_400_000);

    const [postsTotal]    = await db.select({ cnt: count() }).from(postsTable);
    const [commentsTotal] = await db.select({ cnt: count() }).from(postCommentsTable);
    const [likesTotal]    = await db.select({ cnt: count() }).from(postLikesTable);
    const storiesTotal  = { cnt: 0 }; // stories are client-side

    const [posts24h]   = await db.select({ cnt: count() }).from(postsTable).where(gte(postsTable.createdAt, since24h));
    const [players24h] = await db
      .select({ cnt: count() })
      .from(playersTable)
      .where(gte(playersTable.lastActiveAt, since24h));

    // Top users by combined social engagement
    const topByPosts = await db
      .select({
        authorId: postsTable.authorId,
        username: postsTable.username,
        postCount: count(postsTable.id),
        totalLikes: sql<number>`sum(${postsTable.likes})`,
        totalReplies: sql<number>`sum(${postsTable.replies})`,
      })
      .from(postsTable)
      .groupBy(postsTable.authorId, postsTable.username)
      .orderBy(desc(sql`sum(${postsTable.likes}) + sum(${postsTable.replies}) * 2 + count(${postsTable.id})`))
      .limit(10);

    // Trending posts (all time top engagement)
    const trendingPosts = await db
      .select({
        id: postsTable.id,
        username: postsTable.username,
        content: postsTable.content,
        likes: postsTable.likes,
        replies: postsTable.replies,
        createdAt: postsTable.createdAt,
      })
      .from(postsTable)
      .orderBy(desc(sql`${postsTable.likes} * 2 + ${postsTable.replies}`))
      .limit(5);

    // Shares are client-side (localStorage), not tracked in DB
    res.json({
      postsCount:     postsTotal?.cnt      ?? 0,
      commentsCount:  commentsTotal?.cnt   ?? 0,
      likesCount:     likesTotal?.cnt      ?? 0,
      sharesCount:    0,  // client-side
      storiesCount:   0,  // client-side
      activeUsers:    players24h?.cnt      ?? 0,
      postsLast24h:   posts24h?.cnt        ?? 0,
      topUsers:       topByPosts,
      trendingPosts,
    });
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

export { createNotif };
export default router;
