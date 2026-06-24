import { Router } from "express";
import { db, playersTable, pvpMatchesTable, analyticsEventsTable, coinTransactionsTable } from "@workspace/db";
import { gte, count, desc, sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

const startTime = Date.now();
const errorLog: Array<{ time: number; message: string; count: number }> = [];
const responseTimeSamples: number[] = [];
let totalRequests = 0;
let errorRequests = 0;
const activeSessions = new Map<string, number>();

export function recordRequest(duration: number) {
  totalRequests++;
  responseTimeSamples.push(duration);
  if (responseTimeSamples.length > 500) responseTimeSamples.shift();
}

export function recordError(message: string) {
  errorRequests++;
  const existing = errorLog.find(e => e.message === message);
  if (existing) {
    existing.count++;
    existing.time = Date.now();
  } else {
    errorLog.unshift({ time: Date.now(), message, count: 1 });
    if (errorLog.length > 50) errorLog.pop();
  }
}

export function trackSession(playerId: string) {
  activeSessions.set(playerId, Date.now());
}

export function cleanSessions() {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [id, ts] of activeSessions.entries()) {
    if (ts < cutoff) activeSessions.delete(id);
  }
}

setInterval(cleanSessions, 60_000);

router.get("/monitor/live", requireAdmin, async (req, res) => {
  try {
    const since1h = new Date(Date.now() - 60 * 60 * 1000);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [newPlayers1h] = await db.select({ count: count() })
      .from(playersTable).where(gte(playersTable.createdAt, since1h));
    const [activePlayers24h] = await db.select({ count: count() })
      .from(playersTable).where(gte(playersTable.lastActiveAt, since24h));
    const [matches1h] = await db.select({ count: count() })
      .from(pvpMatchesTable).where(gte(pvpMatchesTable.createdAt, since1h));
    const [events1h] = await db.select({ count: count() })
      .from(analyticsEventsTable).where(gte(analyticsEventsTable.createdAt, since1h));
    const [coins1h] = await db.select({ count: count() })
      .from(coinTransactionsTable).where(gte(coinTransactionsTable.createdAt, since1h));

    const avgResponseTime = responseTimeSamples.length > 0
      ? Math.round(responseTimeSamples.reduce((a, b) => a + b, 0) / responseTimeSamples.length)
      : 0;

    const p95 = responseTimeSamples.length > 0
      ? Math.round([...responseTimeSamples].sort((a, b) => a - b)[Math.floor(responseTimeSamples.length * 0.95)] ?? 0)
      : 0;

    const errorRate = totalRequests > 0 ? Math.round((errorRequests / totalRequests) * 10000) / 100 : 0;

    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const uptimeStr = `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`;

    res.json({
      server: {
        uptime: uptimeStr,
        uptimeSeconds,
        avgResponseTime,
        p95ResponseTime: p95,
        totalRequests,
        errorRequests,
        errorRate,
        activeSessions: activeSessions.size,
        memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        memoryTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      stats: {
        newPlayers1h: newPlayers1h.count,
        activePlayers24h: activePlayers24h.count,
        matches1h: matches1h.count,
        events1h: events1h.count,
        coinTxns1h: coins1h.count,
      },
      recentErrors: errorLog.slice(0, 10).map(e => ({
        ...e,
        timeAgo: `${Math.floor((Date.now() - e.time) / 60000)}m ago`,
      })),
      health: {
        status: errorRate < 5 ? 'healthy' : errorRate < 15 ? 'degraded' : 'critical',
        alerts: [
          ...(errorRate > 10 ? [{ level: 'critical', msg: `معدل خطأ مرتفع: ${errorRate}%` }] : []),
          ...(avgResponseTime > 2000 ? [{ level: 'warning', msg: `زمن استجابة بطيء: ${avgResponseTime}ms` }] : []),
          ...(activeSessions.size > 1000 ? [{ level: 'info', msg: `حمل مرتفع: ${activeSessions.size} جلسة نشطة` }] : []),
        ],
      },
    });
  } catch (err) {
    req.log.error({ err }, "monitor error");
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/monitor/retention", requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        DATE_TRUNC('day', created_at)::date AS day,
        COUNT(*) AS new_users,
        COUNT(*) FILTER (WHERE last_active_at > created_at + INTERVAL '1 day') AS retained_d1,
        COUNT(*) FILTER (WHERE last_active_at > created_at + INTERVAL '7 days') AS retained_d7
      FROM players
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY 1 ORDER BY 1 DESC LIMIT 14
    `);
    res.json((rows as any).rows ?? []);
  } catch (err) {
    req.log.error({ err }, "retention error");
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/monitor/features", requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT event, COUNT(*) AS uses, COUNT(DISTINCT player_id) AS unique_users
      FROM analytics_events
      WHERE created_at > NOW() - INTERVAL '7 days'
        AND event NOT LIKE '%heartbeat%'
      GROUP BY event ORDER BY uses DESC LIMIT 20
    `);
    res.json((rows as any).rows ?? []);
  } catch (err) {
    req.log.error({ err }, "features error");
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/monitor/bots", requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT p.id, p.username, p.created_at, p.last_active_at,
        p.matches_played, p.matches_won, p.coins, p.elo,
        sa.type as flag_type, sa.severity
      FROM players p
      LEFT JOIN suspicious_activity sa ON sa.player_id = p.id AND sa.resolved = FALSE
      WHERE
        (p.matches_played > 0 AND (p.matches_won::float / NULLIF(p.matches_played,0)) > 0.95 AND p.matches_played > 10)
        OR (p.created_at > NOW() - INTERVAL '1 hour' AND p.matches_played > 20)
        OR sa.id IS NOT NULL
      ORDER BY p.created_at DESC LIMIT 30
    `);
    res.json((rows as any).rows ?? []);
  } catch (err) {
    req.log.error({ err }, "bots error");
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/monitor/economy", requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        DATE_TRUNC('hour', created_at)::text AS hour,
        type,
        SUM(amount) AS total_amount,
        COUNT(*) AS tx_count,
        AVG(amount)::int AS avg_amount
      FROM coin_transactions
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY 1, 2 ORDER BY 1 DESC, total_amount DESC LIMIT 50
    `);
    const topBalances = await db.execute(sql`
      SELECT username, coins, level, elo FROM players
      ORDER BY coins DESC LIMIT 10
    `);
    res.json({
      hourly: (rows as any).rows ?? [],
      topBalances: (topBalances as any).rows ?? [],
    });
  } catch (err) {
    req.log.error({ err }, "economy monitor error");
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/monitor/alert/resolve", requireAdmin, async (req, res) => {
  res.json({ ok: true, message: "التنبيه تم إغلاقه" });
});

export default router;
