// routes/gift-ledger.ts — Gift Analytics & Ledger
import { Router } from "express";
import { eq, desc, sum, count, max, and, sql } from "drizzle-orm";
import { db, giftLedgerTable, playersTable } from "@workspace/db";

const router = Router();

/* ─── GET /gifts/post/:postId/stats ─────────────────────────────────────── */
router.get("/gifts/post/:postId/stats", async (req, res) => {
  try {
    const { postId } = req.params;

    const [agg] = await db
      .select({
        totalGiftAmount: sql<number>`coalesce(sum(${giftLedgerTable.amount}), 0)`,
        totalGiftCount:  sql<number>`coalesce(count(*), 0)`,
        lastGiftTime:    max(giftLedgerTable.createdAt),
      })
      .from(giftLedgerTable)
      .where(eq(giftLedgerTable.postId, postId));

    // top 3 senders by amount
    const topSenders = await db
      .select({
        senderId:    giftLedgerTable.senderId,
        totalAmount: sql<number>`sum(${giftLedgerTable.amount})`,
        giftCount:   sql<number>`count(*)`,
      })
      .from(giftLedgerTable)
      .where(eq(giftLedgerTable.postId, postId))
      .groupBy(giftLedgerTable.senderId)
      .orderBy(desc(sql`sum(${giftLedgerTable.amount})`))
      .limit(3);

    // enrich with usernames
    const enriched = await Promise.all(
      topSenders.map(async (s) => {
        const [p] = await db
          .select({ username: playersTable.username })
          .from(playersTable)
          .where(eq(playersTable.id, s.senderId))
          .limit(1);
        return {
          senderId:    s.senderId,
          username:    p?.username ?? "مجهول",
          totalAmount: Number(s.totalAmount),
          giftCount:   Number(s.giftCount),
        };
      }),
    );

    res.json({
      totalGiftAmount: Number(agg?.totalGiftAmount ?? 0),
      totalGiftCount:  Number(agg?.totalGiftCount  ?? 0),
      lastGiftTime:    agg?.lastGiftTime ?? null,
      topSenders:      enriched,
    });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

/* ─── GET /gifts/user/:userId/stats ─────────────────────────────────────── */
router.get("/gifts/user/:userId/stats", async (req, res) => {
  try {
    const { userId } = req.params;

    const [sent] = await db
      .select({
        totalSentDN:    sql<number>`coalesce(sum(${giftLedgerTable.amount}), 0)`,
        sentCount:      sql<number>`coalesce(count(*), 0)`,
      })
      .from(giftLedgerTable)
      .where(eq(giftLedgerTable.senderId, userId));

    const [received] = await db
      .select({
        totalReceivedDN: sql<number>`coalesce(sum(${giftLedgerTable.amount}), 0)`,
        receivedCount:   sql<number>`coalesce(count(*), 0)`,
      })
      .from(giftLedgerTable)
      .where(eq(giftLedgerTable.receiverId, userId));

    res.json({
      totalSentDN:           Number(sent?.totalSentDN       ?? 0),
      totalReceivedDN:       Number(received?.totalReceivedDN ?? 0),
      totalGiftTransactions: Number(sent?.sentCount ?? 0) + Number(received?.receivedCount ?? 0),
      totalSent:             Number(sent?.sentCount    ?? 0),
      totalReceived:         Number(received?.receivedCount ?? 0),
    });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

/* ─── GET /gifts/user/:userId/history ───────────────────────────────────── */
router.get("/gifts/user/:userId/history", async (req, res) => {
  try {
    const { userId } = req.params;
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const dir   = String(req.query.dir || "both"); // sent | received | both

    const conditions =
      dir === "sent"     ? eq(giftLedgerTable.senderId,   userId) :
      dir === "received" ? eq(giftLedgerTable.receiverId,  userId) :
      sql`(${giftLedgerTable.senderId} = ${userId} OR ${giftLedgerTable.receiverId} = ${userId})`;

    const rows = await db
      .select()
      .from(giftLedgerTable)
      .where(conditions as any)
      .orderBy(desc(giftLedgerTable.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const [cnt] = await db
      .select({ count: sql<number>`count(*)` })
      .from(giftLedgerTable)
      .where(conditions as any);

    res.json({
      data:  rows,
      total: Number(cnt?.count ?? 0),
      page,
      limit,
    });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

export default router;
