import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";

const router = Router();

router.get("/notifications/:playerId", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const rows = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.playerId, req.params.playerId))
      .orderBy(desc(notificationsTable.createdAt)).limit(limit);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.post("/notifications", async (req, res) => {
  try {
    const { playerId, type, title, body, data } = req.body as Record<string, unknown>;
    if (!playerId || !type || !title) { res.status(400).json({ error: "missing fields" }); return; }
    const [notif] = await db.insert(notificationsTable).values({
      id: nanoid(), playerId: String(playerId),
      type: String(type), title: String(title),
      body: String(body || ""), data: (data as Record<string, unknown>) || {},
    }).returning();
    res.status(201).json(notif);
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.patch("/notifications/:id/read", async (req, res) => {
  try {
    await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

router.patch("/notifications/:playerId/read-all", async (req, res) => {
  try {
    await db.update(notificationsTable).set({ read: true }).where(
      and(eq(notificationsTable.playerId, req.params.playerId), eq(notificationsTable.read, false))
    );
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }); res.status(500).json({ error: "internal" });
  }
});

export default router;
