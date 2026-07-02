/**
 * Owner Admin Routes — full control panel data layer.
 * All endpoints require admin role (requireAdmin middleware).
 * These routes are additive — they touch nothing outside players table
 * and read-only queries on wallet/gift tables.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { playersTable } from "@workspace/db";
import { eq, ilike, desc, or, count } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

/* ─── Overview Stats ────────────────────────────────────────────────────── */
router.get("/owner/overview", requireAdmin, async (req, res) => {
  try {
    const [stats] = await db.execute(`
      SELECT
        (SELECT COUNT(*)                FROM players)                                                    AS total_players,
        (SELECT COUNT(*)                FROM players WHERE last_active_at > NOW() - INTERVAL '7 days')  AS active_7d,
        (SELECT COUNT(*)                FROM players WHERE last_active_at > NOW() - INTERVAL '24 hours')AS active_24h,
        (SELECT COUNT(*)                FROM players WHERE verified = true)                             AS verified_players,
        (SELECT COUNT(*)                FROM players WHERE verification_status = 'pending')             AS pending_verifications,
        (SELECT COUNT(*)                FROM players WHERE suspended = true)                            AS suspended_players,
        (SELECT COUNT(*)                FROM players WHERE created_at > NOW() - INTERVAL '24 hours')   AS new_players_24h,
        (SELECT COUNT(*)                FROM pvp_matches  WHERE created_at > NOW() - INTERVAL '24 hours') AS matches_24h,
        (SELECT COALESCE(COUNT(*),0)    FROM wallet_transactions WHERE type = 'gift')                  AS total_gifts,
        (SELECT COALESCE(SUM(ABS(amount)),0) FROM wallet_transactions)                                 AS total_dn_volume,
        (SELECT COUNT(*)                FROM suspicious_activity WHERE resolved = FALSE)               AS open_flags
    ` as any) as any;
    res.json((stats as any).rows?.[0] ?? {});
  } catch (err) {
    req.log.error({ err }, "owner overview error");
    res.status(500).json({ error: "internal" });
  }
});

/* ─── User List ─────────────────────────────────────────────────────────── */
router.get("/owner/users", requireAdmin, async (req, res) => {
  try {
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const search = (req.query.search as string | undefined)?.trim() ?? "";
    const offset = (page - 1) * limit;

    // Build base query
    const base = db
      .select({
        id:                 playersTable.id,
        username:           playersTable.username,
        avatar:             playersTable.avatar,
        level:              playersTable.level,
        matchesPlayed:      playersTable.matchesPlayed,
        verified:           playersTable.verified,
        verificationStatus: playersTable.verificationStatus,
        suspended:          playersTable.suspended,
        createdAt:          playersTable.createdAt,
        lastActiveAt:       playersTable.lastActiveAt,
      })
      .from(playersTable);

    const rows = search
      ? await base.where(ilike(playersTable.username, `%${search}%`)).orderBy(desc(playersTable.createdAt)).limit(limit).offset(offset)
      : await base.orderBy(desc(playersTable.createdAt)).limit(limit).offset(offset);

    // Total count
    const [totalRow] = search
      ? await db.select({ cnt: count() }).from(playersTable).where(ilike(playersTable.username, `%${search}%`))
      : await db.select({ cnt: count() }).from(playersTable);

    res.json({ users: rows, total: totalRow?.cnt ?? 0, page, limit });
  } catch (err) {
    req.log.error({ err }, "owner users error");
    res.status(500).json({ error: "internal" });
  }
});

/* ─── Force-Verify a user ───────────────────────────────────────────────── */
router.patch("/owner/users/:userId/force-verify", requireAdmin, async (req, res) => {
  const userId = String(req.params.userId);
  try {
    const [existing] = await db.select({ id: playersTable.id }).from(playersTable).where(eq(playersTable.id, userId));
    if (!existing) { res.status(404).json({ error: "player_not_found" }); return; }
    await db.update(playersTable).set({ verified: true, verificationStatus: "approved" }).where(eq(playersTable.id, userId));
    res.json({ ok: true, userId, verified: true, verificationStatus: "approved" });
  } catch (err) {
    req.log.error({ err }, "force-verify error");
    res.status(500).json({ error: "internal" });
  }
});

/* ─── Remove verification ───────────────────────────────────────────────── */
router.patch("/owner/users/:userId/remove-verify", requireAdmin, async (req, res) => {
  const userId = String(req.params.userId);
  try {
    const [existing] = await db.select({ id: playersTable.id }).from(playersTable).where(eq(playersTable.id, userId));
    if (!existing) { res.status(404).json({ error: "player_not_found" }); return; }
    await db.update(playersTable).set({ verified: false, verificationStatus: "none" }).where(eq(playersTable.id, userId));
    res.json({ ok: true, userId, verified: false, verificationStatus: "none" });
  } catch (err) {
    req.log.error({ err }, "remove-verify error");
    res.status(500).json({ error: "internal" });
  }
});

/* ─── Suspend / Unsuspend user ──────────────────────────────────────────── */
router.patch("/owner/users/:userId/suspend", requireAdmin, async (req, res) => {
  const userId = String(req.params.userId);
  try {
    const [existing] = await db.select({ id: playersTable.id, suspended: playersTable.suspended }).from(playersTable).where(eq(playersTable.id, userId));
    if (!existing) { res.status(404).json({ error: "player_not_found" }); return; }
    const newSuspended = !existing.suspended;
    await db.update(playersTable).set({ suspended: newSuspended }).where(eq(playersTable.id, userId));
    res.json({ ok: true, userId, suspended: newSuspended });
  } catch (err) {
    req.log.error({ err }, "suspend error");
    res.status(500).json({ error: "internal" });
  }
});

export default router;
