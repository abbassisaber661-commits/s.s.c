import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, postsTable, postLikesTable, postCommentsTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";

const router = Router();

router.get("/community/posts", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const rows = await db.select().from(postsTable).orderBy(desc(postsTable.createdAt)).limit(limit);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.post("/community/posts", async (req, res) => {
  try {
    const { authorId, username, level, content, type, meta } = req.body as Record<string, unknown>;
    if (!authorId || !content) { res.status(400).json({ error: "missing fields" }); return; }
    if (typeof content === "string" && content.length > 500) { res.status(400).json({ error: "too long" }); return; }
    const [post] = await db.insert(postsTable).values({
      id: nanoid(),
      authorId: String(authorId),
      username: String(username || "Player"),
      level: Number(level) || 1,
      content: String(content).trim(),
      type: String(type || "text"),
      meta: (meta as Record<string, unknown>) || {},
    }).returning();
    res.status(201).json(post);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.post("/community/posts/:id/like", async (req, res) => {
  try {
    const { playerId } = req.body as Record<string, unknown>;
    if (!playerId) { res.status(400).json({ error: "playerId required" }); return; }
    const existing = await db.select({ id: postLikesTable.id }).from(postLikesTable)
      .where(and(eq(postLikesTable.postId, req.params.id), eq(postLikesTable.playerId, String(playerId)))).limit(1);
    if (existing.length) {
      await db.delete(postLikesTable).where(eq(postLikesTable.id, existing[0].id));
      const [post] = await db.select({ likes: postsTable.likes }).from(postsTable).where(eq(postsTable.id, req.params.id)).limit(1);
      await db.update(postsTable).set({ likes: Math.max(0, (post?.likes ?? 1) - 1) }).where(eq(postsTable.id, req.params.id));
      res.json({ liked: false });
    } else {
      await db.insert(postLikesTable).values({ id: nanoid(), postId: req.params.id, playerId: String(playerId) });
      const [post] = await db.select({ likes: postsTable.likes }).from(postsTable).where(eq(postsTable.id, req.params.id));
      await db.update(postsTable).set({ likes: (post?.likes ?? 0) + 1 }).where(eq(postsTable.id, req.params.id));
      res.json({ liked: true });
    }
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.get("/community/posts/:id/comments", async (req, res) => {
  try {
    const rows = await db.select().from(postCommentsTable).where(eq(postCommentsTable.postId, req.params.id)).orderBy(postCommentsTable.createdAt);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.post("/community/posts/:id/comments", async (req, res) => {
  try {
    const { authorId, username, content } = req.body as Record<string, unknown>;
    if (!authorId || !content) { res.status(400).json({ error: "missing fields" }); return; }
    if (typeof content === "string" && content.length > 300) { res.status(400).json({ error: "too long" }); return; }
    const [comment] = await db.insert(postCommentsTable).values({
      id: nanoid(), postId: req.params.id,
      authorId: String(authorId), username: String(username || "Player"),
      content: String(content).trim(),
    }).returning();
    await db.update(postsTable).set({ replies: (await db.select({ r: postsTable.replies }).from(postsTable).where(eq(postsTable.id, req.params.id)))[0]?.r + 1 || 1 }).where(eq(postsTable.id, req.params.id));
    res.status(201).json(comment);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.delete("/community/posts/:id", async (req, res) => {
  try {
    const { authorId } = req.body as Record<string, unknown>;
    await db.delete(postsTable).where(and(eq(postsTable.id, req.params.id), eq(postsTable.authorId, String(authorId))));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

export default router;
