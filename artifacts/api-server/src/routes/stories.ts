import { Router } from "express";
import { eq, desc, gt, sql, and } from "drizzle-orm";
import { db, storiesTable, storyViewersTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";
import { recordStory } from "../lib/daily-rewards.js";
import { emitNewReply, emitReplyLike, emitReactionUpdate, emitViewUpdate } from "../services/story-events.js";

const router = Router();
const STORY_TTL_MS = 24 * 60 * 60 * 1000;

// ─── Helper ────────────────────────────────────────
function safeJson(value: any) {
  try {
    return typeof value === "string" ? JSON.parse(value) : value || [];
  } catch {
    return [];
  }
}

// ─── GET /stories ─────────────────────────────────
router.get("/stories", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const now = new Date();
    const rows = await db
      .select()
      .from(storiesTable)
      .where(gt(storiesTable.expiresAt, now))
      .orderBy(desc(storiesTable.createdAt))
      .limit(limit);
    res.json(rows);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

// ─── GET /stories/:id ─────────────────────────────
router.get("/stories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "storyId required" });

    const story = await db.query.storiesTable.findFirst({
      where: eq(storiesTable.id, id),
    });

    if (!story) {
      return res.status(404).json({ error: "not found" });
    }

    // تنظيف البيانات قبل الإرسال
    const clean = {
      ...story,
      replies: safeJson(story.replies),
      reactions: story.reactions || {},
    };

    res.json(clean);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

// ─── POST /stories ────────────────────────────────
router.post("/stories", async (req, res) => {
  try {
    const { authorId, authorName, authorLevel, emoji, content, imageUrl } =
      req.body as Record<string, unknown>;

    if (!authorId || !authorName) {
      return res.status(400).json({ error: "authorId and authorName required" });
    }

    const hasContent = typeof content === "string" && content.trim().length > 0;
    const hasImage = typeof imageUrl === "string" && imageUrl.length > 0;

    if (!hasContent && !hasImage) {
      return res.status(400).json({ error: "content or imageUrl required" });
    }

    const expiresAt = new Date(Date.now() + STORY_TTL_MS);

    const [story] = await db
      .insert(storiesTable)
      .values({
        id: nanoid(),
        authorId: String(authorId),
        authorName: String(authorName),
        authorLevel: Number(authorLevel) || 1,
        emoji: String(emoji || "⚡"),
        content: hasContent ? String(content).trim().slice(0, 120) : "📸",
        imageUrl: hasImage ? String(imageUrl) : null,
        views: 0,
        expiresAt,
      })
      .returning();

    recordStory(String(authorId)).catch(() => {});
    res.status(201).json(story);
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

// ─── PATCH /stories/:id/view ─────────────────────
router.patch("/stories/:id/view", async (req, res) => {
  try {
    const storyId = req.params.id;
    const { userId, userName, userAvatar } = req.body;

    if (!storyId || !userId) {
      return res.status(400).json({ error: "missing data" });
    }

    const existing = await db
      .select()
      .from(storyViewersTable)
      .where(
        and(
          eq(storyViewersTable.storyId, storyId),
          eq(storyViewersTable.userId, userId)
        )
      );

    const isNewView = existing.length === 0;

    if (isNewView) {
      await db.insert(storyViewersTable).values({
        id: nanoid(),
        storyId,
        userId,
        userName: userName || "مستخدم",
        userAvatar: userAvatar || null,
        viewedAt: new Date(),
      });

      await db
        .update(storiesTable)
        .set({ views: sql`${storiesTable.views} + 1` })
        .where(eq(storiesTable.id, storyId));

      emitViewUpdate(storyId);
    }

    const viewersCount = await db
      .select()
      .from(storyViewersTable)
      .where(eq(storyViewersTable.storyId, storyId));

    res.json({
      ok: true,
      isNewView,
      views: viewersCount.length,
    });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

// ─── PATCH /stories/:id/react ────────────────────
router.patch("/stories/:id/react", async (req, res) => {
  try {
    const { id: storyId } = req.params;
    const { userId, reaction } = req.body as {
      userId: string;
      reaction?: string;
    };

    if (!storyId) return res.status(400).json({ error: "storyId required" });
    if (!userId) return res.status(400).json({ error: "userId required" });

    const updateQuery = reaction
      ? sql`
          COALESCE(reactions, '{}'::jsonb)
          || jsonb_build_object(${userId}, ${reaction})
        `
      : sql`
          COALESCE(reactions, '{}'::jsonb) - ${userId}
        `;

    await db
      .update(storiesTable)
      .set({ reactions: updateQuery })
      .where(eq(storiesTable.id, storyId));

    const updated = await db.query.storiesTable.findFirst({
      where: eq(storiesTable.id, storyId),
    });

    // ✅ تنظيف البيانات قبل الإرسال
    const clean = {
      ...updated,
      replies: safeJson(updated?.replies),
      reactions: updated?.reactions || {},
    };

    emitReactionUpdate(storyId, clean.reactions);
    res.json({ ok: true, story: clean });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

// ─── PATCH /stories/:id/reply ────────────────────
router.patch("/stories/:id/reply", async (req, res) => {
  try {
    const { id: storyId } = req.params;
    const { userId, userName, text } = req.body as {
      userId: string;
      userName: string;
      text: string;
    };

    if (!storyId) return res.status(400).json({ error: "storyId required" });
    if (!userId || !text?.trim()) {
      return res.status(400).json({ error: "userId and text required" });
    }

    const reply = {
      id: nanoid(),
      userId,
      userName,
      text: text.trim().slice(0, 200),
      timestamp: Date.now(),
      likes: {},
    };

    await db
      .update(storiesTable)
      .set({
        replies: sql`
          COALESCE(replies, '[]'::jsonb) || ${JSON.stringify(reply)}::jsonb
        `,
      })
      .where(eq(storiesTable.id, storyId));

    const updated = await db.query.storiesTable.findFirst({
      where: eq(storiesTable.id, storyId),
    });

    // ✅ تنظيف البيانات قبل الإرسال
    const clean = {
      ...updated,
      replies: safeJson(updated?.replies),
      reactions: updated?.reactions || {},
    };

    emitNewReply(storyId, clean.replies);
    res.json({ ok: true, story: clean });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

// ─── PATCH /stories/:id/replies/:replyId/like ────
router.patch("/stories/:id/replies/:replyId/like", async (req, res) => {
  try {
    const { id: storyId, replyId } = req.params;
    const { userId } = req.body;

    if (!storyId) return res.status(400).json({ error: "storyId required" });
    if (!replyId) return res.status(400).json({ error: "replyId required" });
    if (!userId) return res.status(400).json({ error: "userId required" });

    const story = await db.query.storiesTable.findFirst({
      where: eq(storiesTable.id, storyId),
    });

    if (!story) return res.status(404).json({ error: "story not found" });

    const replies = safeJson(story.replies);
    const updatedReplies = replies.map((r: any) => {
      if (r.id !== replyId) return r;
      const likes = r.likes || {};
      if (likes[userId]) {
        delete likes[userId];
      } else {
        likes[userId] = true;
      }
      return { ...r, likes };
    });

    await db
      .update(storiesTable)
      .set({ replies: JSON.stringify(updatedReplies) as any })
      .where(eq(storiesTable.id, storyId));

    const updated = await db.query.storiesTable.findFirst({
      where: eq(storiesTable.id, storyId),
    });

    // ✅ تنظيف البيانات قبل الإرسال
    const clean = {
      ...updated,
      replies: safeJson(updated?.replies),
      reactions: updated?.reactions || {},
    };

    emitReplyLike(storyId, clean.replies);
    res.json({ ok: true, story: clean });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

// ─── DELETE /stories/:id/reply/:replyId ──────────
router.delete("/stories/:id/reply/:replyId", async (req, res) => {
  try {
    const { id: storyId, replyId } = req.params;

    if (!storyId) return res.status(400).json({ error: "storyId required" });
    if (!replyId) return res.status(400).json({ error: "replyId required" });

    const story = await db.query.storiesTable.findFirst({
      where: eq(storiesTable.id, storyId),
    });

    if (!story) return res.status(404).json({ error: "story not found" });

    const replies = safeJson(story.replies);
    const updatedReplies = replies.filter((r: any) => r.id !== replyId);

    await db
      .update(storiesTable)
      .set({ replies: JSON.stringify(updatedReplies) as any })
      .where(eq(storiesTable.id, storyId));

    const updated = await db.query.storiesTable.findFirst({
      where: eq(storiesTable.id, storyId),
    });

    // ✅ إرسال التحديث عبر WebSocket
    emitNewReply(storyId, updatedReplies);

    res.json({ ok: true, replies: updatedReplies });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

// ─── GET /stories/:id/viewers ─────────────────────
router.get("/stories/:id/viewers", async (req, res) => {
  try {
    const { id: storyId } = req.params;

    if (!storyId) return res.status(400).json({ error: "storyId required" });

    const viewers = await db
      .select()
      .from(storyViewersTable)
      .where(eq(storyViewersTable.storyId, storyId))
      .orderBy(desc(storyViewersTable.viewedAt))
      .limit(50);

    res.json({ viewers });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

export default router;