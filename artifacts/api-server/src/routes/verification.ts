import { Router } from "express";
import { db } from "@workspace/db";
import { playersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

/* ─── User: request verification ─────────────────────────────────────── */
router.post("/verification/request", requireAuth, async (req, res) => {
  const playerId = req.auth!.playerId;
  try {
    const [player] = await db
      .select({ id: playersTable.id, verificationStatus: playersTable.verificationStatus })
      .from(playersTable)
      .where(eq(playersTable.id, playerId));

    if (!player) { res.status(404).json({ error: "player_not_found" }); return; }

    if (player.verificationStatus === "pending") {
      res.status(400).json({ error: "already_pending" }); return;
    }
    if (player.verificationStatus === "approved") {
      res.status(400).json({ error: "already_approved" }); return;
    }

    await db
      .update(playersTable)
      .set({ verificationStatus: "pending", verificationRequestedAt: new Date() })
      .where(eq(playersTable.id, playerId));

    res.json({ ok: true, status: "pending" });
  } catch (err) {
    req.log.error({ err }, "verification request error");
    res.status(500).json({ error: "internal" });
  }
});

/* ─── Public: get verification status for any user ───────────────────── */
router.get("/verification/status/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const [player] = await db
      .select({
        id: playersTable.id,
        username: playersTable.username,
        verified: playersTable.verified,
        verificationStatus: playersTable.verificationStatus,
      })
      .from(playersTable)
      .where(eq(playersTable.id, userId));

    if (!player) { res.status(404).json({ error: "not_found" }); return; }
    res.json(player);
  } catch (err) {
    req.log.error({ err }, "verification status error");
    res.status(500).json({ error: "internal" });
  }
});

/* ─── Admin: list pending requests ───────────────────────────────────── */
router.get("/verification/pending", requireAdmin, async (req, res) => {
  try {
    const pending = await db
      .select({
        id: playersTable.id,
        username: playersTable.username,
        avatar: playersTable.avatar,
        level: playersTable.level,
        matchesPlayed: playersTable.matchesPlayed,
        verificationStatus: playersTable.verificationStatus,
        verificationRequestedAt: playersTable.verificationRequestedAt,
        createdAt: playersTable.createdAt,
      })
      .from(playersTable)
      .where(eq(playersTable.verificationStatus, "pending"));

    res.json(pending);
  } catch (err) {
    req.log.error({ err }, "verification pending error");
    res.status(500).json({ error: "internal" });
  }
});

/* ─── Admin: approve ─────────────────────────────────────────────────── */
router.patch("/verification/:userId/approve", requireAdmin, async (req, res) => {
  const userId = String(req.params.userId);
  try {
    const [existing] = await db
      .select({ id: playersTable.id })
      .from(playersTable)
      .where(eq(playersTable.id, userId));

    if (!existing) { res.status(404).json({ error: "player_not_found" }); return; }

    await db
      .update(playersTable)
      .set({ verified: true, verificationStatus: "approved" })
      .where(eq(playersTable.id, userId));

    res.json({ ok: true, userId, status: "approved" });
  } catch (err) {
    req.log.error({ err }, "verification approve error");
    res.status(500).json({ error: "internal" });
  }
});

/* ─── Admin: reject ──────────────────────────────────────────────────── */
router.patch("/verification/:userId/reject", requireAdmin, async (req, res) => {
  const userId = String(req.params.userId);
  try {
    const [existing] = await db
      .select({ id: playersTable.id })
      .from(playersTable)
      .where(eq(playersTable.id, userId));

    if (!existing) { res.status(404).json({ error: "player_not_found" }); return; }

    await db
      .update(playersTable)
      .set({ verified: false, verificationStatus: "rejected" })
      .where(eq(playersTable.id, userId));

    res.json({ ok: true, userId, status: "rejected" });
  } catch (err) {
    req.log.error({ err }, "verification reject error");
    res.status(500).json({ error: "internal" });
  }
});

export default router;
