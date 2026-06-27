import { Router } from "express";
import { eq, desc, and, or, ilike } from "drizzle-orm";
import { db, jobsTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";

const router = Router();

// GET /jobs — list all jobs, supports ?type=offer|request&category=&country=&q=
router.get("/jobs", async (req, res) => {
  try {
    const { type, category, country, q } = req.query as Record<string, string>;
    let rows = await db
      .select()
      .from(jobsTable)
      .orderBy(desc(jobsTable.createdAt))
      .limit(100);

    if (type && (type === "offer" || type === "request")) {
      rows = rows.filter(r => r.jobType === type);
    }
    if (category && category !== "all") {
      rows = rows.filter(r => r.category === category);
    }
    if (country) {
      rows = rows.filter(r => r.country.toLowerCase().includes(country.toLowerCase()));
    }
    if (q) {
      const lq = q.toLowerCase();
      rows = rows.filter(r =>
        r.title.toLowerCase().includes(lq) ||
        r.description.toLowerCase().includes(lq) ||
        r.authorName.toLowerCase().includes(lq) ||
        r.country.toLowerCase().includes(lq)
      );
    }
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "jobs list error");
    res.status(500).json({ error: "server_error" });
  }
});

// POST /jobs — create a job listing
router.post("/jobs", async (req, res) => {
  try {
    const { authorId, authorName, title, description, jobType, country, category } = req.body;
    if (!authorId || !authorName || !title?.trim() || !description?.trim()) {
      res.status(400).json({ error: "authorId, authorName, title, description required" });
      return;
    }
    const type = jobType === "request" ? "request" : "offer";
    const [job] = await db.insert(jobsTable).values({
      id:          nanoid(),
      authorId:    String(authorId),
      authorName:  String(authorName),
      title:       String(title).slice(0, 120),
      description: String(description).slice(0, 1000),
      jobType:     type,
      country:     String(country || "").slice(0, 60),
      category:    String(category || "general").slice(0, 40),
    }).returning();
    res.status(201).json(job);
  } catch (err) {
    req.log.error({ err }, "jobs create error");
    res.status(500).json({ error: "server_error" });
  }
});

// DELETE /jobs/:id — delete own job
router.delete("/jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { authorId } = req.body;
    if (!authorId) { res.status(400).json({ error: "authorId required" }); return; }
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id)).limit(1);
    if (!job) { res.status(404).json({ error: "not_found" }); return; }
    if (job.authorId !== authorId) { res.status(403).json({ error: "forbidden" }); return; }
    await db.delete(jobsTable).where(eq(jobsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "jobs delete error");
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
