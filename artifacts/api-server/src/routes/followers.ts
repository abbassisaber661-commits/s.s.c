import { Router } from "express";
import { eq, count, and } from "drizzle-orm";
import { db, followersTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";

const router = Router();

// GET /followers/:playerId — follower/following counts + optional isFollowing
router.get("/followers/:playerId", async (req, res) => {
  try {
    const { playerId } = req.params;
    const viewerId = req.query["viewerId"] as string | undefined;

    const [followerRow] = await db
      .select({ cnt: count() })
      .from(followersTable)
      .where(eq(followersTable.followingId, playerId));

    const [followingRow] = await db
      .select({ cnt: count() })
      .from(followersTable)
      .where(eq(followersTable.followerId, playerId));

    let isFollowing = false;
    let followers: { id: string; username: string }[] = [];

    if (viewerId) {
      const [row] = await db
        .select()
        .from(followersTable)
        .where(and(
          eq(followersTable.followerId, viewerId),
          eq(followersTable.followingId, playerId),
        ));
      isFollowing = !!row;
    }

    res.json({
      followersCount: followerRow?.cnt ?? 0,
      followingCount: followingRow?.cnt ?? 0,
      isFollowing,
      followers,
    });
  } catch (err) {
    res.status(500).json({ error: "internal" });
  }
});

// POST /followers/follow
router.post("/followers/follow", async (req, res) => {
  try {
    const { followerId, followingId } = req.body as { followerId: string; followingId: string };
    if (!followerId || !followingId) {
      res.status(400).json({ error: "followerId and followingId required" });
      return;
    }
    const existing = await db
      .select()
      .from(followersTable)
      .where(and(
        eq(followersTable.followerId, followerId),
        eq(followersTable.followingId, followingId),
      ));
    if (existing.length === 0) {
      await db.insert(followersTable).values({ id: nanoid(), followerId, followingId });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "internal" });
  }
});

// POST /followers/unfollow
router.post("/followers/unfollow", async (req, res) => {
  try {
    const { followerId, followingId } = req.body as { followerId: string; followingId: string };
    if (!followerId || !followingId) {
      res.status(400).json({ error: "followerId and followingId required" });
      return;
    }
    await db
      .delete(followersTable)
      .where(and(
        eq(followersTable.followerId, followerId),
        eq(followersTable.followingId, followingId),
      ));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "internal" });
  }
});

// GET /followers/:playerId/following — list players this user follows
router.get("/followers/:playerId/following", async (req, res) => {
  try {
    const { playerId } = req.params;
    const rows = await db
      .select()
      .from(followersTable)
      .where(eq(followersTable.followerId, playerId));
    res.json(rows.map(r => ({ id: r.followingId, username: r.followingId })));
  } catch (err) {
    res.status(500).json({ error: "internal" });
  }
});

export default router;
