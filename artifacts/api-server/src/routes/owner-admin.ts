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
import {
  getOfficialPagesSettings, updateOfficialPagesSettings, setOfficialPageEnabled,
  getSocialSettings, updateSocialSettings,
  getReservedUsernames, addReservedUsername, removeReservedUsername,
} from "../lib/settings-service.js";
import { getOfficialPagesRuntimeStats, OFFICIAL_PAGES } from "../lib/official-pages.js";

const router = Router();

/* ─── Official Pages / Bots: settings + control ─────────────────────────── */
router.get("/owner/official-pages", requireAdmin, async (_req, res) => {
  const settings = await getOfficialPagesSettings();
  const stats = getOfficialPagesRuntimeStats();
  res.json({ settings, stats, pages: OFFICIAL_PAGES.map(p => ({ id: p.id, name: p.name, category: p.category })) });
});

router.patch("/owner/official-pages/settings", requireAdmin, async (req, res) => {
  try {
    const { enabled, postingIntervalMinutes, engagementIntervalMinutes } = req.body as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    if (typeof enabled === "boolean") patch.enabled = enabled;
    if (typeof postingIntervalMinutes === "number" && postingIntervalMinutes > 0) patch.postingIntervalMinutes = postingIntervalMinutes;
    if (typeof engagementIntervalMinutes === "number" && engagementIntervalMinutes > 0) patch.engagementIntervalMinutes = engagementIntervalMinutes;
    const next = await updateOfficialPagesSettings(patch);
    res.json({ ok: true, settings: next });
  } catch (err) {
    req.log.error({ err }, "owner official-pages settings update error");
    res.status(500).json({ error: "internal" });
  }
});

router.patch("/owner/official-pages/:pageId/toggle", requireAdmin, async (req, res) => {
  try {
    const pageId = String(req.params.pageId);
    const { enabled } = req.body as Record<string, unknown>;
    if (typeof enabled !== "boolean") { res.status(400).json({ error: "enabled_required" }); return; }
    const next = await setOfficialPageEnabled(pageId, enabled);
    res.json({ ok: true, settings: next });
  } catch (err) {
    req.log.error({ err }, "owner official-page toggle error");
    res.status(500).json({ error: "internal" });
  }
});

/* ─── Social system settings ────────────────────────────────────────────── */
router.get("/owner/social-settings", requireAdmin, async (_req, res) => {
  res.json(await getSocialSettings());
});

router.patch("/owner/social-settings", requireAdmin, async (req, res) => {
  try {
    const { likesEnabled, commentsEnabled } = req.body as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    if (typeof likesEnabled === "boolean") patch.likesEnabled = likesEnabled;
    if (typeof commentsEnabled === "boolean") patch.commentsEnabled = commentsEnabled;
    const next = await updateSocialSettings(patch);
    res.json({ ok: true, settings: next });
  } catch (err) {
    req.log.error({ err }, "owner social-settings update error");
    res.status(500).json({ error: "internal" });
  }
});

/* ─── Reserved usernames ─────────────────────────────────────────────────── */
router.get("/owner/reserved-usernames", requireAdmin, async (_req, res) => {
  res.json({ words: await getReservedUsernames() });
});

router.post("/owner/reserved-usernames", requireAdmin, async (req, res) => {
  try {
    const { word } = req.body as Record<string, unknown>;
    if (typeof word !== "string" || !word.trim()) { res.status(400).json({ error: "word_required" }); return; }
    const words = await addReservedUsername(word);
    res.json({ ok: true, words });
  } catch (err) {
    req.log.error({ err }, "owner reserved-username add error");
    res.status(500).json({ error: "internal" });
  }
});

router.delete("/owner/reserved-usernames/:word", requireAdmin, async (req, res) => {
  try {
    const words = await removeReservedUsername(String(req.params.word));
    res.json({ ok: true, words });
  } catch (err) {
    req.log.error({ err }, "owner reserved-username remove error");
    res.status(500).json({ error: "internal" });
  }
});

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
