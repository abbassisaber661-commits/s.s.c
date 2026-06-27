import { Router } from "express";
import { eq, count, and } from "drizzle-orm";
import { db, followersTable, playersTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";

const router = Router();

// GET /followers/:playerId — follower/following counts + optional isFollowing check
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

    if (viewerId) {
      const [row] = await db
        .select({ id: followersTable.id })
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
    });
  } catch (err) {
    res.status(500).json({ error: "internal" });
  }
});

// GET /followers/:playerId/list — list users who follow playerId (with profile data)
router.get("/followers/:playerId/list", async (req, res) => {
  try {
    const { playerId } = req.params;
    const viewerId = req.query["viewerId"] as string | undefined;

    // Get all follower IDs
    const rows = await db
      .select({ followerId: followersTable.followerId })
      .from(followersTable)
      .where(eq(followersTable.followingId, playerId));

    if (rows.length === 0) {
      res.json([]);
      return;
    }

    const followerIds = rows.map(r => r.followerId);

    // Fetch player data for each follower
    const players = await Promise.all(
      followerIds.map(fid =>
        db.select({
          id: playersTable.id,
          username: playersTable.username,
          avatar: playersTable.avatar,
          level: playersTable.level,
        }).from(playersTable).where(eq(playersTable.id, fid)).limit(1)
          .then(rs => rs[0] ?? null)
      )
    );

    // If viewerId provided, check which ones the viewer follows back
    let viewerFollowingSet = new Set<string>();
    if (viewerId) {
      const vRows = await db
        .select({ followingId: followersTable.followingId })
        .from(followersTable)
        .where(eq(followersTable.followerId, viewerId));
      viewerFollowingSet = new Set(vRows.map(r => r.followingId));
    }

    const result = players
      .filter(Boolean)
      .map(p => ({
        id:          p!.id,
        username:    p!.username,
        displayName: p!.username,
        avatar:      p!.avatar,
        level:       p!.level,
        isFollowing: viewerFollowingSet.has(p!.id),
        mutualCount: 0,
        verification: "none" as const,
      }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "internal" });
  }
});

// GET /followers/:playerId/following — list users that playerId follows (with profile data)
router.get("/followers/:playerId/following", async (req, res) => {
  try {
    const { playerId } = req.params;
    const viewerId = req.query["viewerId"] as string | undefined;

    const rows = await db
      .select({ followingId: followersTable.followingId })
      .from(followersTable)
      .where(eq(followersTable.followerId, playerId));

    if (rows.length === 0) {
      res.json([]);
      return;
    }

    const followingIds = rows.map(r => r.followingId);

    const players = await Promise.all(
      followingIds.map(fid =>
        db.select({
          id: playersTable.id,
          username: playersTable.username,
          avatar: playersTable.avatar,
          level: playersTable.level,
        }).from(playersTable).where(eq(playersTable.id, fid)).limit(1)
          .then(rs => rs[0] ?? null)
      )
    );

    // Viewer is always considered following all of these (they appear in playerId's following list)
    // But check if viewerId also follows them (for mutual follow detection)
    let viewerFollowingSet = new Set<string>();
    if (viewerId && viewerId !== playerId) {
      const vRows = await db
        .select({ followingId: followersTable.followingId })
        .from(followersTable)
        .where(eq(followersTable.followerId, viewerId));
      viewerFollowingSet = new Set(vRows.map(r => r.followingId));
    } else {
      // When viewing own following list, mark all as followed
      viewerFollowingSet = new Set(followingIds);
    }

    const result = players
      .filter(Boolean)
      .map(p => ({
        id:          p!.id,
        username:    p!.username,
        displayName: p!.username,
        avatar:      p!.avatar,
        level:       p!.level,
        isFollowing: viewerFollowingSet.has(p!.id),
        mutualCount: 0,
        verification: "none" as const,
      }));

    res.json(result);
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
    if (followerId === followingId) {
      res.status(400).json({ error: "cannot follow yourself" });
      return;
    }
    const existing = await db
      .select({ id: followersTable.id })
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

export default router;
