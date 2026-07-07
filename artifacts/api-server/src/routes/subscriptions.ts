/**
 * subscriptions.ts — Subscription status routes
 *
 * GET  /api/subscriptions/status/:playerId  → check active subscription
 * GET  /api/subscriptions/history/:playerId → full subscription history
 *
 * Subscriptions are created by the pi-payments /complete handler when
 * metadata.kind === 'subscription'. This file only exposes read endpoints.
 */
import { Router } from "express";
import { eq, and, gt } from "drizzle-orm";
import { db, subscriptionsTable } from "@workspace/db";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/* ─── GET /api/subscriptions/status/:playerId ─── */
router.get("/subscriptions/status/:playerId", requireAuth, async (req, res) => {
  const playerId = String(req.params.playerId);

  // Players may only check their own subscription
  if (req.auth!.playerId !== playerId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    const now = new Date();
    const [active] = await db
      .select()
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.playerId, playerId),
          eq(subscriptionsTable.status, "active"),
          gt(subscriptionsTable.expiresAt, now),
        ),
      )
      .orderBy(subscriptionsTable.expiresAt)
      .limit(1);

    if (!active) {
      res.json({ active: false, plan: null, expiresAt: null, daysLeft: 0 });
      return;
    }

    const daysLeft = Math.max(
      0,
      Math.ceil((active.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );

    res.json({
      active:    true,
      plan:      active.plan,
      expiresAt: active.expiresAt.toISOString(),
      daysLeft,
      piTxId:    active.piTxId,
    });
  } catch (err) {
    req.log.error({ err }, "subscription status error");
    res.status(500).json({ error: "internal" });
  }
});

/* ─── GET /api/subscriptions/history/:playerId ─── */
router.get("/subscriptions/history/:playerId", requireAuth, async (req, res) => {
  const playerId = String(req.params.playerId);
  if (req.auth!.playerId !== playerId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.playerId, playerId))
      .orderBy(subscriptionsTable.createdAt);

    res.json({
      data: rows.reverse().map(r => ({
        id:          r.id,
        plan:        r.plan,
        amountPi:    r.amountPi,
        status:      r.status,
        expiresAt:   r.expiresAt.toISOString(),
        createdAt:   r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "subscription history error");
    res.status(500).json({ error: "internal" });
  }
});

export default router;
