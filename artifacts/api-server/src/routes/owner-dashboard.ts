/**
 * Owner Dashboard — extended admin data layer for the private sidebar dashboard.
 * All endpoints require admin role (requireAdmin middleware). Purely additive:
 * new read/moderation endpoints only, no changes to auth/payment/DB structure.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import {
  playersTable, postsTable, postCommentsTable, pvpMatchesTable,
  walletTransactionsTable, piPaymentsTable, subscriptionsTable,
  notificationsTable,
} from "@workspace/db";
import { eq, ilike, desc, count, sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";
import { nanoid } from "../lib/nanoid.js";
import { getIO } from "../ws/socket-manager.js";
import { getLeagues, getActiveSeason, getStandings, getSeasonCurrentRound } from "../lib/league-store.js";

const router = Router();

/* ─────────────────────────── 1. Overview ─────────────────────────── */
router.get("/owner/dashboard/overview", requireAdmin, async (req, res) => {
  try {
    const stats = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM players)                                                    AS total_players,
        (SELECT COUNT(*) FROM players WHERE last_active_at > NOW() - INTERVAL '24 hours') AS active_24h,
        (SELECT COUNT(*) FROM players WHERE last_active_at > NOW() - INTERVAL '7 days')   AS active_7d,
        (SELECT COUNT(*) FROM players WHERE created_at > NOW() - INTERVAL '24 hours')     AS new_players_24h,
        (SELECT COUNT(*) FROM players WHERE verified = true)                              AS verified_players,
        (SELECT COUNT(*) FROM players WHERE verification_status = 'pending')              AS pending_verifications,
        (SELECT COUNT(*) FROM players WHERE suspended = true)                             AS suspended_players,
        (SELECT COUNT(*) FROM posts)                                                      AS total_posts,
        (SELECT COUNT(*) FROM post_comments)                                              AS total_comments,
        (SELECT COUNT(*) FROM pvp_matches WHERE created_at > NOW() - INTERVAL '24 hours')  AS matches_24h,
        (SELECT COUNT(*) FROM pvp_matches)                                                AS total_matches,
        (SELECT COALESCE(COUNT(*),0) FROM wallet_transactions WHERE type = 'gift')         AS total_gifts,
        (SELECT COALESCE(SUM(ABS(amount)),0) FROM wallet_transactions)                     AS total_dn_volume,
        (SELECT COUNT(*) FROM suspicious_activity WHERE resolved = FALSE)                  AS open_flags,
        (SELECT COUNT(*) FROM subscriptions WHERE status = 'active')                       AS active_subscriptions,
        (SELECT COALESCE(SUM(amount),0) FROM pi_payments WHERE status = 'confirmed')       AS total_pi_confirmed
    `);
    res.json((stats as any).rows?.[0] ?? {});
  } catch (err) {
    req.log.error({ err }, "owner dashboard overview error");
    res.status(500).json({ error: "internal" });
  }
});

/* ──────────────────── 2. Social Content Management ──────────────────── */
router.get("/owner/dashboard/posts", requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const search = (req.query.search as string | undefined)?.trim() ?? "";
    const offset = (page - 1) * limit;

    const base = db.select().from(postsTable);
    const rows = search
      ? await base.where(ilike(postsTable.username, `%${search}%`)).orderBy(desc(postsTable.createdAt)).limit(limit).offset(offset)
      : await base.orderBy(desc(postsTable.createdAt)).limit(limit).offset(offset);

    const [totalRow] = search
      ? await db.select({ cnt: count() }).from(postsTable).where(ilike(postsTable.username, `%${search}%`))
      : await db.select({ cnt: count() }).from(postsTable);

    res.json({ posts: rows, total: totalRow?.cnt ?? 0, page, limit });
  } catch (err) {
    req.log.error({ err }, "owner dashboard posts error");
    res.status(500).json({ error: "internal" });
  }
});

router.patch("/owner/dashboard/posts/:id/visibility", requireAdmin, async (req, res) => {
  try {
    const { isPublic } = req.body as Record<string, unknown>;
    if (typeof isPublic !== "boolean") { res.status(400).json({ error: "isPublic_required" }); return; }
    const id = String(req.params.id);
    await db.update(postsTable).set({ isPublic }).where(eq(postsTable.id, id));
    res.json({ ok: true, id, isPublic });
  } catch (err) {
    req.log.error({ err }, "owner dashboard post visibility error");
    res.status(500).json({ error: "internal" });
  }
});

router.delete("/owner/dashboard/posts/:id", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    await db.delete(postCommentsTable).where(eq(postCommentsTable.postId, id));
    await db.delete(postsTable).where(eq(postsTable.id, id));
    res.json({ ok: true, id });
  } catch (err) {
    req.log.error({ err }, "owner dashboard post delete error");
    res.status(500).json({ error: "internal" });
  }
});

router.get("/owner/dashboard/posts/:id/comments", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(postCommentsTable)
      .where(eq(postCommentsTable.postId, String(req.params.id)))
      .orderBy(desc(postCommentsTable.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "owner dashboard post comments error");
    res.status(500).json({ error: "internal" });
  }
});

router.delete("/owner/dashboard/comments/:id", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    await db.delete(postCommentsTable).where(eq(postCommentsTable.id, id));
    res.json({ ok: true, id });
  } catch (err) {
    req.log.error({ err }, "owner dashboard comment delete error");
    res.status(500).json({ error: "internal" });
  }
});

/* ─────────────────── 3. SkillLeague Management ─────────────────── */
router.get("/owner/dashboard/leagues", requireAdmin, async (req, res) => {
  try {
    const leagues = getLeagues();
    const summary = leagues.map((league) => {
      const season = getActiveSeason(league.id);
      const standings = season ? getStandings(season.id) : [];
      return {
        league,
        season: season ? { ...season, currentRound: getSeasonCurrentRound(season) } : null,
        topStandings: standings.slice(0, 10),
        totalPlayers: standings.length,
      };
    });
    res.json(summary);
  } catch (err) {
    req.log.error({ err }, "owner dashboard leagues error");
    res.status(500).json({ error: "internal" });
  }
});

router.get("/owner/dashboard/matches/recent", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const rows = await db.select().from(pvpMatchesTable).orderBy(desc(pvpMatchesTable.createdAt)).limit(limit);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "owner dashboard matches error");
    res.status(500).json({ error: "internal" });
  }
});

/* ───────────────────── 4. Economy & Pi System ───────────────────── */
router.get("/owner/dashboard/economy", requireAdmin, async (req, res) => {
  try {
    const hourly = await db.execute(sql`
      SELECT DATE_TRUNC('hour', created_at)::text AS hour, type,
        SUM(amount) AS total_amount, COUNT(*) AS tx_count
      FROM wallet_transactions
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY 1, 2 ORDER BY 1 DESC LIMIT 50
    `);
    const topBalances = await db.execute(sql`
      SELECT username, coins AS dn, level, elo FROM players ORDER BY coins DESC LIMIT 10
    `);
    const subscriptionsByPlan = await db.execute(sql`
      SELECT plan, COUNT(*) AS count FROM subscriptions WHERE status = 'active' GROUP BY plan
    `);
    const piPayments = await db.select().from(piPaymentsTable).orderBy(desc(piPaymentsTable.createdAt)).limit(30);
    const piTotals = await db.execute(sql`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE status = 'confirmed'), 0) AS confirmed_total,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)   AS pending_total,
        COUNT(*) FILTER (WHERE kind = 'gift' AND status = 'confirmed')    AS gift_count,
        COUNT(*) FILTER (WHERE kind = 'purchase' AND status = 'confirmed') AS purchase_count
      FROM pi_payments
    `);
    res.json({
      hourly: (hourly as any).rows ?? [],
      topBalances: (topBalances as any).rows ?? [],
      subscriptionsByPlan: (subscriptionsByPlan as any).rows ?? [],
      piPayments,
      piTotals: (piTotals as any).rows?.[0] ?? {},
    });
  } catch (err) {
    req.log.error({ err }, "owner dashboard economy error");
    res.status(500).json({ error: "internal" });
  }
});

/* ─────────────────── 5. Verification (list verified) ─────────────────── */
router.get("/owner/dashboard/verified", requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const rows = await db.select({
      id: playersTable.id,
      username: playersTable.username,
      avatar: playersTable.avatar,
      level: playersTable.level,
      verificationStatus: playersTable.verificationStatus,
      createdAt: playersTable.createdAt,
    }).from(playersTable)
      .where(eq(playersTable.verified, true))
      .orderBy(desc(playersTable.createdAt))
      .limit(limit).offset((page - 1) * limit);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "owner dashboard verified list error");
    res.status(500).json({ error: "internal" });
  }
});

/* ──────────────────── 6. Notifications / Announcements ──────────────────── */
router.post("/owner/dashboard/announce", requireAdmin, async (req, res) => {
  try {
    const { title, body } = req.body as Record<string, unknown>;
    if (typeof title !== "string" || !title.trim() || typeof body !== "string" || !body.trim()) {
      res.status(400).json({ error: "title_and_body_required" }); return;
    }
    const broadcastId = nanoid();
    const ids = await db.select({ id: playersTable.id }).from(playersTable);

    if (ids.length > 0) {
      const now = new Date();
      const rows = ids.map((p) => ({
        id: nanoid(),
        playerId: p.id,
        type: "system" as const,
        title: title.trim(),
        body: body.trim(),
        data: { broadcastId, owner: true },
        createdAt: now,
      }));
      const chunkSize = 500;
      for (let i = 0; i < rows.length; i += chunkSize) {
        await db.insert(notificationsTable).values(rows.slice(i, i + chunkSize));
      }
    }

    const io = getIO();
    if (io) {
      io.emit("notification:broadcast", { broadcastId, title: title.trim(), body: body.trim(), createdAt: new Date().toISOString() });
    }

    res.json({ ok: true, broadcastId, recipients: ids.length });
  } catch (err) {
    req.log.error({ err }, "owner dashboard announce error");
    res.status(500).json({ error: "internal" });
  }
});

router.get("/owner/dashboard/announcements", requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        data->>'broadcastId' AS broadcast_id,
        MAX(title)      AS title,
        MAX(body)       AS body,
        COUNT(*)        AS recipients,
        MAX(created_at) AS created_at
      FROM notifications
      WHERE type = 'system' AND data->>'broadcastId' IS NOT NULL
      GROUP BY data->>'broadcastId'
      ORDER BY MAX(created_at) DESC
      LIMIT 30
    `);
    res.json((rows as any).rows ?? []);
  } catch (err) {
    req.log.error({ err }, "owner dashboard announcements list error");
    res.status(500).json({ error: "internal" });
  }
});

export default router;
