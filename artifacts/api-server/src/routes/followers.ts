import { Router } from "express";
import { eq, and, count, desc } from "drizzle-orm";
import { db, followersTable, playersTable, notificationsTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";

const router = Router();

// helper: fire-and-forget notification
async function notify(playerId: string, type: string, title: string, body: string, data: Record<string, unknown> = {}) {
  try {
    await db.insert(notificationsTable).values({ id: nanoid(), playerId, type, title, body, data });
  } catch {}
}

router.post("/followers/:id/follow", async (req, res) => {
  try {
    const { id: followingId } = req.params;
    const { followerId, followerUsername } = req.body;
    if (!followerId || followerId === followingId) { res.status(400).json({ error: "invalid" }); return; }

    const existing = await db.select().from(followersTable)
      .where(and(eq(followersTable.followerId, followerId), eq(followersTable.followingId, followingId)))
      .limit(1);
    if (existing.length > 0) { res.json({ ok: true, alreadyFollowing: true }); return; }

    await db.insert(followersTable).values({ id: nanoid(), followerId, followingId });

    // ── PHASE 3: Follow notification ──
    const liker = String(followerUsername || followerId);
    notify(
      followingId,
      "follow",
      `👤 ${liker} started following you`,
      "You have a new follower!",
      { followerId, followerUsername: liker }
    );

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "follow error");
    res.status(500).json({ error: "server_error" });
  }
});

router.delete("/followers/:id/unfollow", async (req, res) => {
  try {
    const { id: followingId } = req.params;
    const { followerId } = req.body;
    await db.delete(followersTable)
      .where(and(eq(followersTable.followerId, followerId), eq(followersTable.followingId, followingId)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "unfollow error");
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/followers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { viewerId } = req.query;

    const followerRows = await db.select({ count: count() }).from(followersTable)
      .where(eq(followersTable.followingId, id));
    const followingRows = await db.select({ count: count() }).from(followersTable)
      .where(eq(followersTable.followerId, id));

    let isFollowing = false;
    if (viewerId) {
      const check = await db.select().from(followersTable)
        .where(and(eq(followersTable.followerId, viewerId as string), eq(followersTable.followingId, id)))
        .limit(1);
      isFollowing = check.length > 0;
    }

    const followers = await db
      .select({ id: playersTable.id, username: playersTable.username, avatar: playersTable.avatar, elo: playersTable.elo, level: playersTable.level, verificationStatus: playersTable.verificationStatus })
      .from(followersTable)
      .innerJoin(playersTable, eq(followersTable.followerId, playersTable.id))
      .where(eq(followersTable.followingId, id))
      .orderBy(desc(followersTable.createdAt))
      .limit(50);

    res.json({
      followersCount: followerRows[0]?.count ?? 0,
      followingCount: followingRows[0]?.count ?? 0,
      isFollowing,
      followers,
    });
  } catch (err) {
    req.log.error({ err }, "followers error");
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/following/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const following = await db
      .select({ id: playersTable.id, username: playersTable.username, avatar: playersTable.avatar, elo: playersTable.elo, level: playersTable.level, verificationStatus: playersTable.verificationStatus })
      .from(followersTable)
      .innerJoin(playersTable, eq(followersTable.followingId, playersTable.id))
      .where(eq(followersTable.followerId, id))
      .orderBy(desc(followersTable.createdAt))
      .limit(50);
    res.json(following);
  } catch (err) {
    req.log.error({ err }, "following error");
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
