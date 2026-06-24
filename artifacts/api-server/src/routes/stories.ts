import { Router } from "express";
import { eq, desc, gt, sql, and } from "drizzle-orm";
import { db, storiesTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";
import { recordStory } from "../lib/daily-rewards.js";

const router = Router();
const STORY_TTL_MS = 24 * 60 * 60 * 1000;

// ─── Stub emit helpers (no-op until story-events service is wired) ─────────
function emitViewUpdate(_storyId: string) {}
function emitReactionUpdate(_storyId: string, _reactions: unknown) {}
function emitNewReply(_storyId: string, _replies: unknown) {}
function emitReplyLike(_storyId: string, _replies: unknown) {}

// ─── Helper ────────────────────────────────────────
function safeJson(value: unknown) {
  try {
    return typeof value === "string" ? JSON.parse(value) : value || [];
  } catch {
    return [];
  }
}

type AnyStory = Record<string, unknown>;

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
    if (!id) {
      res.status(400).json({ error: "storyId required" });
      return;
    }

    const story = await db.query.storiesTable.findFirst({
      where: eq(storiesTable.id, id),
    });

    if (!story) {
      res.status(404).json({ error: "not found" });
      return;
    }

    const s = story as AnyStory;
    const clean = {
      ...story,
      replies:   safeJson(s["replies"]),
      reactions: (s["reactions"] as Record<string, unknown>) || {},
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
      res.status(400).json({ error: "authorId and authorName required" });
      return;
    }

    const hasContent = typeof content === "string" && content.trim().length > 0;
    const hasImage = typeof imageUrl === "string" && imageUrl.length > 0;

    if (!hasContent && !hasImage) {
      res.status(400).json({ error: "content or imageUrl required" });
      return;
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
    const { userId } = req.body;

    if (!storyId || !userId) {
      res.status(400).json({ error: "missing data" });
      return;
    }

    await db
      .update(storiesTable)
      .set({ views: sql`${storiesTable.views} + 1` })
      .where(eq(storiesTable.id, storyId));

    emitViewUpdate(storyId);

    res.json({ ok: true, isNewView: true });
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

    if (!storyId) {
      res.status(400).json({ error: "storyId required" });
      return;
    }
    if (!userId) {
      res.status(400).json({ error: "userId required" });
      return;
    }

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
      .set({ reactions: updateQuery } as any)
      .where(eq(storiesTable.id, storyId));

    const updated = await db.query.storiesTable.findFirst({
      where: eq(storiesTable.id, storyId),
    });

    const u = updated as AnyStory | undefined;
    const clean = {
      ...updated,
      replies:   safeJson(u?.["replies"]),
      reactions: (u?.["reactions"] as Record<string, unknown>) || {},
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

    if (!storyId) {
      res.status(400).json({ error: "storyId required" });
      return;
    }
    if (!userId || !text?.trim()) {
      res.status(400).json({ error: "userId and text required" });
      return;
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
      } as any)
      .where(eq(storiesTable.id, storyId));

    const updated = await db.query.storiesTable.findFirst({
      where: eq(storiesTable.id, storyId),
    });

    const u = updated as AnyStory | undefined;
    const clean = {
      ...updated,
      replies:   safeJson(u?.["replies"]),
      reactions: (u?.["reactions"] as Record<string, unknown>) || {},
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

    if (!storyId) {
      res.status(400).json({ error: "storyId required" });
      return;
    }
    if (!replyId) {
      res.status(400).json({ error: "replyId required" });
      return;
    }
    if (!userId) {
      res.status(400).json({ error: "userId required" });
      return;
    }

    const story = await db.query.storiesTable.findFirst({
      where: eq(storiesTable.id, storyId),
    });

    if (!story) {
      res.status(404).json({ error: "story not found" });
      return;
    }

    const replies = safeJson((story as AnyStory)["replies"]);
    const updatedReplies = (replies as any[]).map((r: any) => {
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
      .set({ replies: JSON.stringify(updatedReplies) } as any)
      .where(eq(storiesTable.id, storyId));

    const updated = await db.query.storiesTable.findFirst({
      where: eq(storiesTable.id, storyId),
    });

    const u = updated as AnyStory | undefined;
    const clean = {
      ...updated,
      replies:   safeJson(u?.["replies"]),
      reactions: (u?.["reactions"] as Record<string, unknown>) || {},
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

    if (!storyId) {
      res.status(400).json({ error: "storyId required" });
      return;
    }
    if (!replyId) {
      res.status(400).json({ error: "replyId required" });
      return;
    }

    const story = await db.query.storiesTable.findFirst({
      where: eq(storiesTable.id, storyId),
    });

    if (!story) {
      res.status(404).json({ error: "story not found" });
      return;
    }

    const replies = safeJson((story as AnyStory)["replies"]);
    const updatedReplies = (replies as any[]).filter((r: any) => r.id !== replyId);

    await db
      .update(storiesTable)
      .set({ replies: JSON.stringify(updatedReplies) } as any)
      .where(eq(storiesTable.id, storyId));

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

    if (!storyId) {
      res.status(400).json({ error: "storyId required" });
      return;
    }

    res.json({ viewers: [] });
  } catch (err) {
    req.log.error({ err });
    res.status(500).json({ error: "internal" });
  }
});

export default router;
