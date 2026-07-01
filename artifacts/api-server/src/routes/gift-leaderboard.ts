// routes/gift-leaderboard.ts — DN Leaderboards + Trending Posts
import { Router } from "express";
import { eq, desc, sql, and, gte, isNotNull } from "drizzle-orm";
import { db, giftLedgerTable, playersTable, postsTable } from "@workspace/db";

const router = Router();

/* ─── GET /leaderboard/top-earners ──────────────────────────────────────── */
router.get("/leaderboard/top-earners", async (req, res) => {
  try {
    const limit = Math.min(50, Number(req.query.limit) || 20);

    const rows = await db
      .select({
        receiverId:      giftLedgerTable.receiverId,
        username:        playersTable.username,
        totalReceivedDN: sql<number>`sum(${giftLedgerTable.amount})`,
        totalReceived:   sql<number>`count(*)`,
      })
      .from(giftLedgerTable)
      .innerJoin(playersTable, eq(playersTable.id, giftLedgerTable.receiverId))
      .groupBy(giftLedgerTable.receiverId, playersTable.username)
      .orderBy(desc(sql`sum(${giftLedgerTable.amount})`))
      .limit(limit);

    res.json(rows.map((r) => ({
      playerId:        r.receiverId,
      username:        r.username,
      totalReceivedDN: Number(r.totalReceivedDN),
      totalReceived:   Number(r.totalReceived),
    })));
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

/* ─── GET /leaderboard/top-supporters ───────────────────────────────────── */
router.get("/leaderboard/top-supporters", async (req, res) => {
  try {
    const limit = Math.min(50, Number(req.query.limit) || 20);

    const rows = await db
      .select({
        senderId:    giftLedgerTable.senderId,
        username:    playersTable.username,
        totalSentDN: sql<number>`sum(${giftLedgerTable.amount})`,
        totalSent:   sql<number>`count(*)`,
      })
      .from(giftLedgerTable)
      .innerJoin(playersTable, eq(playersTable.id, giftLedgerTable.senderId))
      .groupBy(giftLedgerTable.senderId, playersTable.username)
      .orderBy(desc(sql`sum(${giftLedgerTable.amount})`))
      .limit(limit);

    res.json(rows.map((r) => ({
      playerId:    r.senderId,
      username:    r.username,
      totalSentDN: Number(r.totalSentDN),
      totalSent:   Number(r.totalSent),
    })));
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

/* ─── GET /leaderboard/top-posts ─────────────────────────────────────────── */
router.get("/leaderboard/top-posts", async (req, res) => {
  try {
    const limit = Math.min(50, Number(req.query.limit) || 20);

    const rows = await db
      .select({
        postId:          giftLedgerTable.postId,
        authorUsername:  postsTable.username,
        authorId:        postsTable.authorId,
        content:         postsTable.content,
        imageUrl:        postsTable.imageUrl,
        totalGiftAmount: sql<number>`sum(${giftLedgerTable.amount})`,
        totalGiftCount:  sql<number>`count(*)`,
        lastGiftTime:    sql<string>`max(${giftLedgerTable.createdAt})`,
      })
      .from(giftLedgerTable)
      .innerJoin(postsTable, eq(postsTable.id, giftLedgerTable.postId))
      .where(isNotNull(giftLedgerTable.postId))
      .groupBy(
        giftLedgerTable.postId,
        postsTable.username,
        postsTable.authorId,
        postsTable.content,
        postsTable.imageUrl,
      )
      .orderBy(desc(sql`sum(${giftLedgerTable.amount})`))
      .limit(limit);

    res.json(rows.map((r) => ({
      postId:          r.postId,
      authorUsername:  r.authorUsername,
      authorId:        r.authorId,
      content:         r.content,
      imageUrl:        r.imageUrl,
      totalGiftAmount: Number(r.totalGiftAmount),
      totalGiftCount:  Number(r.totalGiftCount),
      lastGiftTime:    r.lastGiftTime,
    })));
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

/* ─── GET /trending/posts ────────────────────────────────────────────────── */
// Score = (allTimeAmount × 0.4) + (giftCount × 5) + (last24hAmount × 1.8)
router.get("/trending/posts", async (req, res) => {
  try {
    const limit = Math.min(20, Number(req.query.limit) || 10);
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        postId:          giftLedgerTable.postId,
        authorUsername:  postsTable.username,
        authorId:        postsTable.authorId,
        content:         postsTable.content,
        imageUrl:        postsTable.imageUrl,
        createdAt:       postsTable.createdAt,
        totalGiftAmount: sql<number>`sum(${giftLedgerTable.amount})`,
        totalGiftCount:  sql<number>`count(*)`,
        last24hAmount:   sql<number>`
          coalesce(sum(case when ${giftLedgerTable.createdAt} >= ${cutoff.toISOString()} 
            then ${giftLedgerTable.amount} else 0 end), 0)
        `,
        trendScore: sql<number>`
          (sum(${giftLedgerTable.amount}) * 0.4)
          + (count(*) * 5)
          + (coalesce(sum(case when ${giftLedgerTable.createdAt} >= ${cutoff.toISOString()}
              then ${giftLedgerTable.amount} else 0 end), 0) * 1.8)
        `,
      })
      .from(giftLedgerTable)
      .innerJoin(postsTable, eq(postsTable.id, giftLedgerTable.postId))
      .where(isNotNull(giftLedgerTable.postId))
      .groupBy(
        giftLedgerTable.postId,
        postsTable.username,
        postsTable.authorId,
        postsTable.content,
        postsTable.imageUrl,
        postsTable.createdAt,
      )
      .orderBy(desc(sql`
        (sum(${giftLedgerTable.amount}) * 0.4)
        + (count(*) * 5)
        + (coalesce(sum(case when ${giftLedgerTable.createdAt} >= ${cutoff.toISOString()}
            then ${giftLedgerTable.amount} else 0 end), 0) * 1.8)
      `))
      .limit(limit);

    res.json(rows.map((r) => ({
      postId:          r.postId,
      authorUsername:  r.authorUsername,
      authorId:        r.authorId,
      content:         r.content,
      imageUrl:        r.imageUrl,
      createdAt:       r.createdAt,
      totalGiftAmount: Number(r.totalGiftAmount),
      totalGiftCount:  Number(r.totalGiftCount),
      last24hAmount:   Number(r.last24hAmount),
      trendScore:      Number(r.trendScore),
    })));
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

export default router;
