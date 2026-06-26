import { Router } from "express";
import { eq, desc, and, or } from "drizzle-orm";
import { db, messagesTable, blocksTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";

const router = Router();

// GET /messages/inbox/:playerId  — path-param form (canonical)
router.get("/messages/inbox/:playerId", async (req, res) => {
  try {
    const rows = await db.select().from(messagesTable)
      .where(and(
        eq(messagesTable.deleted, false),
        or(
          eq(messagesTable.toId, req.params.playerId),
          eq(messagesTable.fromId, req.params.playerId),
        )
      ))
      .orderBy(desc(messagesTable.createdAt)).limit(100);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

// GET /messages/inbox  — query-param form (client compatibility)
router.get("/messages/inbox", async (req, res) => {
  const playerId = String(req.query.playerId ?? "");
  if (!playerId) { res.status(400).json({ error: "playerId required" }); return; }
  try {
    const rows = await db.select().from(messagesTable)
      .where(and(
        eq(messagesTable.deleted, false),
        or(
          eq(messagesTable.toId, playerId),
          eq(messagesTable.fromId, playerId),
        )
      ))
      .orderBy(desc(messagesTable.createdAt)).limit(100);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

// GET /messages/thread/:playerA/:playerB  — path-param form (canonical)
router.get("/messages/thread/:playerA/:playerB", async (req, res) => {
  try {
    const { playerA, playerB } = req.params;
    const rows = await db.select().from(messagesTable)
      .where(and(
        eq(messagesTable.deleted, false),
        or(
          and(eq(messagesTable.fromId, playerA), eq(messagesTable.toId, playerB)),
          and(eq(messagesTable.fromId, playerB), eq(messagesTable.toId, playerA))
        )
      ))
      .orderBy(messagesTable.createdAt).limit(100);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

// GET /messages/thread  — query-param form (client compatibility)
router.get("/messages/thread", async (req, res) => {
  const playerA = String(req.query.a ?? "");
  const playerB = String(req.query.b ?? "");
  if (!playerA || !playerB) { res.status(400).json({ error: "a and b required" }); return; }
  try {
    const rows = await db.select().from(messagesTable)
      .where(and(
        eq(messagesTable.deleted, false),
        or(
          and(eq(messagesTable.fromId, playerA), eq(messagesTable.toId, playerB)),
          and(eq(messagesTable.fromId, playerB), eq(messagesTable.toId, playerA))
        )
      ))
      .orderBy(messagesTable.createdAt).limit(100);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.post("/messages", async (req, res) => {
  try {
    const { fromId, toId, content } = req.body as Record<string, unknown>;
    if (!fromId || !toId || !content) { res.status(400).json({ error: "missing fields" }); return; }
    if (typeof content === "string" && content.length > 500) { res.status(400).json({ error: "too long" }); return; }
    if (fromId === toId) { res.status(400).json({ error: "cannot message self" }); return; }
    const block = await db.select({ id: blocksTable.id }).from(blocksTable)
      .where(or(
        and(eq(blocksTable.blockerId, String(toId)), eq(blocksTable.blockedId, String(fromId))),
        and(eq(blocksTable.blockerId, String(fromId)), eq(blocksTable.blockedId, String(toId)))
      )).limit(1);
    if (block.length) { res.status(403).json({ error: "blocked" }); return; }
    const [msg] = await db.insert(messagesTable).values({
      id: nanoid(), fromId: String(fromId), toId: String(toId),
      content: String(content).trim(),
    }).returning();
    res.status(201).json(msg);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.patch("/messages/:id/read", async (req, res) => {
  try {
    await db.update(messagesTable).set({ read: true }).where(eq(messagesTable.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.post("/messages/block", async (req, res) => {
  try {
    const { blockerId, blockedId } = req.body as Record<string, unknown>;
    if (!blockerId || !blockedId) { res.status(400).json({ error: "missing fields" }); return; }
    await db.insert(blocksTable).values({ id: nanoid(), blockerId: String(blockerId), blockedId: String(blockedId) }).onConflictDoNothing();
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.post("/messages/unblock", async (req, res) => {
  try {
    const { blockerId, blockedId } = req.body as Record<string, unknown>;
    if (!blockerId || !blockedId) { res.status(400).json({ error: "missing fields" }); return; }
    await db.delete(blocksTable).where(and(eq(blocksTable.blockerId, String(blockerId)), eq(blocksTable.blockedId, String(blockedId))));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

export default router;
