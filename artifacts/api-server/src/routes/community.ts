import { Router } from "express";
import { eq, desc, and, asc, sql, inArray } from "drizzle-orm";
import { db, postsTable, postLikesTable, postCommentsTable, postSavesTable, playersTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";
import { getOwnerPlayerId } from "../lib/owner.js";
import { recordPost, recordLikeGiven, recordCommentGiven } from "../lib/daily-rewards.js";
import { createNotification } from "../lib/notificationService.js";

const router = Router();

// helper: fire-and-forget notification (real-time via socket + DB)
function notify(playerId: string, type: string, title: string, body: string, data: Record<string, unknown> = {}) {
  createNotification({ playerId, type: type as "post_like" | "post_comment" | "follow" | "gift" | "gift_sent" | "rank" | "dn" | "system", title, body, data }).catch(() => {});
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

// helper: map DB row → CommunityPost shape expected by the frontend
function mapPost(
  row: Record<string, unknown>,
  likedPostIds: Set<string> = new Set(),
  savedPostIds: Set<string> = new Set(),
  ownerPlayerId: string | null = null,
) {
  const postId = row.id as string;
  return {
    id:            postId,
    authorId:      row.authorId,
    authorName:    row.username,
    authorLevel:   row.level ?? 1,
    authorIsOwner: ownerPlayerId !== null && row.authorId === ownerPlayerId,
    content:       row.content ?? "",
    imageUrl:      row.imageUrl ?? undefined,
    type:          row.type ?? "text",
    timestamp:     row.createdAt ? new Date(row.createdAt as string).getTime() : Date.now(),
    likes:         row.likes ?? 0,
    likedByMe:     likedPostIds.has(postId),
    savedByMe:     savedPostIds.has(postId),
    replyCount:    row.replies ?? 0,
    views:         row.views ?? 0,
    isPinned:      row.isPinned ?? false,
    isPublic:      row.isPublic ?? true,
    username:      row.username,
    level:         row.level ?? 1,
    createdAt:     row.createdAt,
    replies:       row.replies ?? 0,
  };
}

// helper: fetch liked/saved post IDs for a given player
async function getPlayerInteractions(playerId: string | null, postIds: string[]) {
  const likedPostIds = new Set<string>();
  const savedPostIds = new Set<string>();

  if (!playerId || postIds.length === 0) return { likedPostIds, savedPostIds };

  try {
    const [likeRows, saveRows] = await Promise.all([
      db.select({ postId: postLikesTable.postId })
        .from(postLikesTable)
        .where(and(
          eq(postLikesTable.playerId, playerId),
          inArray(postLikesTable.postId, postIds),
        )),
      db.select({ postId: postSavesTable.postId })
        .from(postSavesTable)
        .where(and(
          eq(postSavesTable.playerId, playerId),
          inArray(postSavesTable.postId, postIds),
        )),
    ]);
    likeRows.forEach(r => likedPostIds.add(r.postId));
    saveRows.forEach(r => savedPostIds.add(r.postId));
  } catch {}

  return { likedPostIds, savedPostIds };
}

// GET /community/posts
// Supports: ?type=fyp|following|trending|latest  ?page=1  ?limit=10  ?hashtag=  ?format=flat  ?playerId=  ?authorId=
router.get("/community/posts", async (req, res) => {
  try {
    const limit    = Math.min(Number(req.query.limit) || 30, 100);
    const page     = Math.max(Number(req.query.page)  || 1, 1);
    const type     = String(req.query.type ?? "fyp");
    const hashtag  = req.query.hashtag  ? String(req.query.hashtag)  : null;
    const flat     = req.query.format === "flat";
    const playerId = req.query.playerId ? String(req.query.playerId) : null;
    const authorId = req.query.authorId ? String(req.query.authorId) : null;

    const offset = (page - 1) * limit;

    // Build base query with optional authorId filter
    let query;
    if (authorId) {
      if (type === "trending") {
        query = db.select().from(postsTable)
          .where(eq(postsTable.authorId, authorId))
          .orderBy(desc(postsTable.likes))
          .limit(limit + 1).offset(offset);
      } else {
        query = db.select().from(postsTable)
          .where(eq(postsTable.authorId, authorId))
          .orderBy(desc(postsTable.createdAt))
          .limit(limit + 1).offset(offset);
      }
    } else if (type === "trending") {
      query = db.select().from(postsTable)
        .orderBy(desc(postsTable.likes))
        .limit(limit + 1).offset(offset);
    } else {
      query = db.select().from(postsTable)
        .orderBy(desc(postsTable.createdAt))
        .limit(limit + 1).offset(offset);
    }

    let rows = await query;

    // hashtag filter (post-fetch)
    if (hashtag) {
      const tag = hashtag.toLowerCase().replace(/^#?/, "#");
      rows = rows.filter((p: any) => extractHashtags(p.content).includes(tag));
    }

    // Determine if there's a next page
    const hasMore  = rows.length > limit;
    const pageRows = rows.slice(0, limit);

    // Fetch per-player interaction state
    const postIds = pageRows.map((r: any) => r.id as string);
    const [{ likedPostIds, savedPostIds }, ownerPlayerId] = await Promise.all([
      getPlayerInteractions(playerId, postIds),
      getOwnerPlayerId(),
    ]);

    // Legacy flat-array mode
    if (flat) {
      res.json(pageRows.map((r: any) => mapPost(r as Record<string, unknown>, likedPostIds, savedPostIds, ownerPlayerId)));
      return;
    }

    res.json({
      data:     pageRows.map((r: any) => mapPost(r as Record<string, unknown>, likedPostIds, savedPostIds, ownerPlayerId)),
      nextPage: hasMore ? page + 1 : null,
      total:    pageRows.length,
    });
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.post("/community/posts", async (req, res) => {
  try {
    const { authorId, username, level, content, imageUrl, type, meta } = req.body as Record<string, unknown>;
    const hasContent = typeof content === "string" && content.trim().length > 0;
    const hasImage   = typeof imageUrl === "string" && imageUrl.length > 0;
    if (!hasContent && !hasImage) { res.status(400).json({ error: "missing fields" }); return; }
    if (hasContent && String(content).length > 500) { res.status(400).json({ error: "too long" }); return; }

    const textContent = hasContent ? String(content).trim() : "";
    const hashtags = hasContent ? extractHashtags(textContent) : [];
    const mentions = hasContent ? extractMentions(textContent) : [];

    const [post] = await db.insert(postsTable).values({
      id: nanoid(),
      authorId: authorId ? String(authorId) : "guest",
      username: String(username || "Player"),
      level: Number(level) || 1,
      content: textContent,
      imageUrl: hasImage ? String(imageUrl) : null,
      type: String(type || "text"),
      meta: { ...(meta as Record<string, unknown> || {}), hashtags, mentions },
    }).returning();

    if (authorId) recordPost(String(authorId)).catch(() => {});

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

    res.status(201).json(mapPost(post as unknown as Record<string, unknown>));
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
      const newLikes = Math.max(0, (post?.likes ?? 1) - 1);
      await db.update(postsTable).set({ likes: newLikes }).where(eq(postsTable.id, req.params.id));
      res.json({ liked: false, likes: newLikes, likedByMe: false, postId: req.params.id });
    } else {
      await db.insert(postLikesTable).values({ id: nanoid(), postId: req.params.id, playerId: String(playerId) });
      const [post] = await db.select({ likes: postsTable.likes, authorId: postsTable.authorId, content: postsTable.content }).from(postsTable).where(eq(postsTable.id, req.params.id));
      const newLikes = (post?.likes ?? 0) + 1;
      await db.update(postsTable).set({ likes: newLikes }).where(eq(postsTable.id, req.params.id));

      recordLikeGiven(String(playerId)).catch(() => {});

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

      res.json({ liked: true, likes: newLikes, likedByMe: true, postId: req.params.id });
    }
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

// PATCH /community/posts/:id/like — toggle like (used by useLikePost in FeedPage)
router.patch("/community/posts/:id/like", async (req, res) => {
  const { playerId, playerUsername } = req.body as Record<string, unknown>;
  const pid = playerId ? String(playerId) : null;
  try {
    if (pid) {
      const existing = await db.select({ id: postLikesTable.id }).from(postLikesTable)
        .where(and(eq(postLikesTable.postId, req.params.id), eq(postLikesTable.playerId, pid))).limit(1);

      if (existing.length) {
        // Unlike
        await db.delete(postLikesTable).where(eq(postLikesTable.id, existing[0].id));
        const [post] = await db.select({ likes: postsTable.likes }).from(postsTable).where(eq(postsTable.id, req.params.id)).limit(1);
        const newLikes = Math.max(0, (post?.likes ?? 1) - 1);
        await db.update(postsTable).set({ likes: newLikes }).where(eq(postsTable.id, req.params.id));
        res.json({ liked: false, likes: newLikes, likedByMe: false, postId: req.params.id });
        return;
      }

      // Like
      await db.insert(postLikesTable).values({ id: nanoid(), postId: req.params.id, playerId: pid });
      const [post] = await db.select({ likes: postsTable.likes, authorId: postsTable.authorId, content: postsTable.content }).from(postsTable).where(eq(postsTable.id, req.params.id));
      const newLikes = (post?.likes ?? 0) + 1;
      await db.update(postsTable).set({ likes: newLikes }).where(eq(postsTable.id, req.params.id));

      recordLikeGiven(pid).catch(() => {});

      if (post?.authorId && post.authorId !== pid) {
        const liker = String(playerUsername || pid);
        notify(
          post.authorId,
          "like",
          `❤️ ${liker} liked your post`,
          `"${(post.content ?? '').slice(0, 60)}${(post.content ?? '').length > 60 ? '...' : ''}"`,
          { postId: req.params.id, likerId: pid, likerUsername: liker }
        );
      }

      res.json({ liked: true, likes: newLikes, likedByMe: true, postId: req.params.id });
      return;
    }

    // No playerId — just increment (guest/legacy)
    const [post] = await db.select({ likes: postsTable.likes }).from(postsTable).where(eq(postsTable.id, req.params.id)).limit(1);
    const newLikes = (post?.likes ?? 0) + 1;
    await db.update(postsTable).set({ likes: newLikes }).where(eq(postsTable.id, req.params.id));
    res.json({ liked: true, likes: newLikes, likedByMe: false, postId: req.params.id });
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

// POST /community/posts/:id/view — increment view count (fire-and-forget from client)
router.post("/community/posts/:id/view", async (req, res) => {
  try {
    await db.update(postsTable)
      .set({ views: sql`${postsTable.views} + 1` })
      .where(eq(postsTable.id, req.params.id));
    const [post] = await db.select({ views: postsTable.views }).from(postsTable).where(eq(postsTable.id, req.params.id)).limit(1);
    res.json({ ok: true, views: post?.views ?? 0, postId: req.params.id });
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

// POST /community/posts/:id/save — toggle save for current player
router.post("/community/posts/:id/save", async (req, res) => {
  try {
    const { playerId } = req.body as Record<string, unknown>;
    if (!playerId) { res.status(400).json({ error: "playerId required" }); return; }
    const pid = String(playerId);

    const existing = await db.select({ id: postSavesTable.id }).from(postSavesTable)
      .where(and(eq(postSavesTable.postId, req.params.id), eq(postSavesTable.playerId, pid))).limit(1);

    if (existing.length) {
      await db.delete(postSavesTable).where(eq(postSavesTable.id, existing[0].id));
      res.json({ saved: false, postId: req.params.id });
    } else {
      await db.insert(postSavesTable).values({ id: nanoid(), postId: req.params.id, playerId: pid });
      res.json({ saved: true, postId: req.params.id });
    }
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

// GET /community/saved?playerId= — fetch all saved posts for a player
router.get("/community/saved", async (req, res) => {
  try {
    const playerId = req.query.playerId ? String(req.query.playerId) : null;
    if (!playerId) { res.status(400).json({ error: "playerId required" }); return; }

    const saveRows = await db.select({ postId: postSavesTable.postId })
      .from(postSavesTable)
      .where(eq(postSavesTable.playerId, playerId))
      .orderBy(desc(postSavesTable.createdAt));

    const postIds = saveRows.map(r => r.postId);
    if (postIds.length === 0) {
      res.json({ data: [], nextPage: null, total: 0 });
      return;
    }

    const posts = await db.select().from(postsTable)
      .where(inArray(postsTable.id, postIds))
      .orderBy(desc(postsTable.createdAt));

    const savedSet = new Set(postIds);
    const { likedPostIds } = await getPlayerInteractions(playerId, postIds);

    res.json({
      data: posts.map((p: any) => mapPost(p as Record<string, unknown>, likedPostIds, savedSet)),
      nextPage: null,
      total: posts.length,
    });
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

    recordCommentGiven(String(authorId)).catch(() => {});

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

// GET /community/likes/by-player/:playerId
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

// PATCH /community/posts/:id — edit content / imageUrl (owner only)
router.patch("/community/posts/:id", async (req, res) => {
  try {
    const { authorId, content, imageUrl } = req.body as Record<string, unknown>;
    if (!authorId) { res.status(400).json({ error: "authorId required" }); return; }
    if (typeof content === "string" && content.length > 500) { res.status(400).json({ error: "too long" }); return; }
    const updates: Record<string, unknown> = {};
    if (typeof content === "string") updates.content = content.trim();
    if (imageUrl !== undefined) updates.imageUrl = imageUrl || null;
    if (Object.keys(updates).length === 0) { res.status(400).json({ error: "nothing to update" }); return; }
    await db.update(postsTable).set(updates as any).where(
      and(eq(postsTable.id, req.params.id), eq(postsTable.authorId, String(authorId)))
    );
    const [updated] = await db.select().from(postsTable).where(eq(postsTable.id, req.params.id)).limit(1);
    res.json(updated ? mapPost(updated as unknown as Record<string, unknown>) : { ok: true });
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

// PATCH /community/posts/:id/pin — toggle pin (owner only)
router.patch("/community/posts/:id/pin", async (req, res) => {
  try {
    const { authorId, isPinned } = req.body as Record<string, unknown>;
    if (!authorId) { res.status(400).json({ error: "authorId required" }); return; }
    await db.update(postsTable).set({ isPinned: Boolean(isPinned) }).where(
      and(eq(postsTable.id, req.params.id), eq(postsTable.authorId, String(authorId)))
    );
    res.json({ ok: true, isPinned: Boolean(isPinned) });
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

// PATCH /community/posts/:id/visibility — toggle public/private (owner only)
router.patch("/community/posts/:id/visibility", async (req, res) => {
  try {
    const { authorId, isPublic } = req.body as Record<string, unknown>;
    if (!authorId) { res.status(400).json({ error: "authorId required" }); return; }
    await db.update(postsTable).set({ isPublic: Boolean(isPublic) }).where(
      and(eq(postsTable.id, req.params.id), eq(postsTable.authorId, String(authorId)))
    );
    res.json({ ok: true, isPublic: Boolean(isPublic) });
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

// POST /community/posts/:id/report — report post (any authenticated user)
router.post("/community/posts/:id/report", async (req, res) => {
  try {
    const { reporterId, reason } = req.body as Record<string, unknown>;
    if (!reporterId) { res.status(400).json({ error: "reporterId required" }); return; }
    const [postRow] = await db.select({ authorId: postsTable.authorId }).from(postsTable)
      .where(eq(postsTable.id, req.params.id)).limit(1);
    if (!postRow) { res.status(404).json({ error: "post not found" }); return; }
    await notify(
      postRow.authorId,
      "system",
      "Post reported",
      `Your post was reported${reason ? `: ${reason}` : ""}`,
      { postId: req.params.id, reporterId: String(reporterId), reason: reason ?? "" }
    );
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.delete("/community/posts/:postId/comments/:commentId", async (req, res) => {
  try {
    const { authorId } = req.body as Record<string, unknown>;
    const { postId, commentId } = req.params;
    await db.delete(postCommentsTable).where(
      and(eq(postCommentsTable.id, commentId), eq(postCommentsTable.postId, postId), eq(postCommentsTable.authorId, String(authorId)))
    );
    await db.update(postsTable).set({ replies: sql`GREATEST(${postsTable.replies} - 1, 0)` }).where(eq(postsTable.id, postId));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

export default router;
