import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, postsTable, postLikesTable, postCommentsTable, notificationsTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";
import { recordPost, recordLikeGiven, recordCommentGiven } from "../lib/daily-rewards.js";

const router = Router();

// helper: fire-and-forget notification
async function notify(playerId: string, type: string, title: string, body: string, data: Record<string, unknown> = {}) {
  try {
    await db.insert(notificationsTable).values({ id: nanoid(), playerId, type, title, body, data });
  } catch {}
}

// helper: extract hashtags
function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w\u0600-\u06FF]+/g) ?? [];
  return [...new Set(matches.map(t => t.toLowerCase()))];
}

// helper: extract mentions (@username)
function extractMentions(text: string): string[] {
  const matches = text.match(/@[\w]+/g) ?? [];
  return [...new Set(matches.map(t => t.slice(1).toLowerCase()))];
}

router.get("/community/posts", async (req, res) => {
  try {
    const limit   = Math.min(Number(req.query.limit) || 30, 100);
    const hashtag = req.query.hashtag ? String(req.query.hashtag) : null;

    let query = db.select().from(postsTable).orderBy(desc(postsTable.createdAt)).limit(limit);
    const rows = await query;

    if (hashtag) {
      const tag = hashtag.toLowerCase().replace(/^#?/, "#");
      const filtered = rows.filter(p => extractHashtags(p.content).includes(tag));
      res.json(filtered);
      return;
    }

    res.json(rows);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.post("/community/posts", async (req, res) => {
  try {
    const { authorId, username, level, content, imageUrl, type, meta } = req.body as Record<string, unknown>;
    const hasContent = typeof content === "string" && content.trim().length > 0;
    const hasImage   = typeof imageUrl === "string" && imageUrl.length > 0;
    if (!authorId || (!hasContent && !hasImage)) { res.status(400).json({ error: "missing fields" }); return; }
    if (hasContent && String(content).length > 500) { res.status(400).json({ error: "too long" }); return; }

    const textContent = hasContent ? String(content).trim() : "";
    const hashtags = hasContent ? extractHashtags(textContent) : [];
    const mentions = hasContent ? extractMentions(textContent) : [];

    const [post] = await db.insert(postsTable).values({
      id: nanoid(),
      authorId: String(authorId),
      username: String(username || "Player"),
      level: Number(level) || 1,
      content: textContent,
      imageUrl: hasImage ? String(imageUrl) : null,
      type: String(type || "text"),
      meta: { ...(meta as Record<string, unknown> || {}), hashtags, mentions },
    }).returning();

    // Economy hook: daily post coin (fire-and-forget)
    recordPost(String(authorId)).catch(() => {});

    // Mention notifications (fire-and-forget)
    // Note: mentions by username - we'd need to look up player IDs in a real system
    // For now we emit a notification to any player whose username matches a mention
    if (mentions.length > 0) {
      const { playersTable } = await import("@workspace/db");
      const { ilike } = await import("drizzle-orm");
      for (const mention of mentions) {
        try {
          const [mentionedPlayer] = await db
            .select({ id: playersTable.id, username: playersTable.username })
            .from(playersTable)
            .where(ilike(playersTable.username, mention))
            .limit(1);
          if (mentionedPlayer && mentionedPlayer.id !== String(authorId)) {
            notify(
              mentionedPlayer.id,
              "mention",
              `📢 ${String(username)} mentioned you`,
              `"${String(content).slice(0, 60)}${String(content).length > 60 ? '...' : ''}"`,
              { postId: post.id, mentionBy: String(authorId), mentionByUsername: String(username) }
            );
          }
        } catch {}
      }
    }

    res.status(201).json(post);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.post("/community/posts/:id/like", async (req, res) => {
  try {
    const { playerId, playerUsername } = req.body as Record<string, unknown>;
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
      const [post] = await db.select({ likes: postsTable.likes, authorId: postsTable.authorId, content: postsTable.content }).from(postsTable).where(eq(postsTable.id, req.params.id));
      await db.update(postsTable).set({ likes: (post?.likes ?? 0) + 1 }).where(eq(postsTable.id, req.params.id));

      // Economy hook — track like GIVEN by the acting player
      recordLikeGiven(String(playerId)).catch(() => {});

      // ── PHASE 3: Like notification ──
      if (post?.authorId && post.authorId !== String(playerId)) {
        const liker = String(playerUsername || playerId);
        notify(
          post.authorId,
          "like",
          `❤️ ${liker} liked your post`,
          `"${(post.content ?? '').slice(0, 60)}${(post.content ?? '').length > 60 ? '...' : ''}"`,
          { postId: req.params.id, likerId: String(playerId), likerUsername: liker }
        );
      }

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
    const [postForReply] = await db.select({ r: postsTable.replies, authorId: postsTable.authorId, content: postsTable.content }).from(postsTable).where(eq(postsTable.id, req.params.id));
    await db.update(postsTable).set({ replies: (postForReply?.r ?? 0) + 1 }).where(eq(postsTable.id, req.params.id));

    // Economy hook — track comment GIVEN by the acting player
    recordCommentGiven(String(authorId)).catch(() => {});

    // ── PHASE 3: Comment notification ──
    if (postForReply?.authorId && postForReply.authorId !== String(authorId)) {
      notify(
        postForReply.authorId,
        "comment",
        `💬 ${String(username)} commented on your post`,
        `"${String(content).slice(0, 60)}${String(content).length > 60 ? '...' : ''}"`,
        { postId: req.params.id, commenterId: String(authorId), commenterUsername: String(username) }
      );
    }

    res.status(201).json(comment);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

// GET /community/likes/by-player/:playerId — post IDs liked by this player
router.get("/community/likes/by-player/:playerId", async (req, res) => {
  try {
    const rows = await db
      .select({ postId: postLikesTable.postId })
      .from(postLikesTable)
      .where(eq(postLikesTable.playerId, req.params.playerId));
    res.json(rows.map(r => r.postId));
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
