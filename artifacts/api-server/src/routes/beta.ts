import { Router } from "express";
import { db } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";
import { requireAdmin, optionalAuth } from "../middleware/auth.js";
import { getClientIp } from "../middleware/antiCheat.js";
import { strictRateLimit } from "../middleware/rateLimit.js";

const router = Router();

const INVITE_CODES = new Map<string, {
  code: string; tier: string; uses: number; maxUses: number;
  createdAt: number; active: boolean;
}>();

const WAITLIST: Array<{ email?: string; piUid?: string; createdAt: number; ip: string }> = [];

const BUILTIN: Record<string, { tier: string; maxUses: number }> = {
  'SKILL2025': { tier: 'early_access', maxUses: 200 },
  'TESTER100': { tier: 'tester',       maxUses: 100 },
  'PINETWORK': { tier: 'vip_tester',   maxUses: 50  },
  'BETAVIP01': { tier: 'vip_tester',   maxUses: 50  },
  'TEAM2025':  { tier: 'team',         maxUses: 20  },
};

for (const [code, cfg] of Object.entries(BUILTIN)) {
  INVITE_CODES.set(code, { code, tier: cfg.tier, uses: 0, maxUses: cfg.maxUses, createdAt: Date.now(), active: true });
}

router.post("/beta/invite/validate", strictRateLimit, optionalAuth, async (req, res) => {
  const { code } = req.body as Record<string, unknown>;
  if (typeof code !== "string" || !code.trim()) {
    res.status(400).json({ valid: false, error: "code required" }); return;
  }
  const entry = INVITE_CODES.get(code.toUpperCase().trim());
  if (!entry || !entry.active) {
    res.status(200).json({ valid: false, error: "invalid_code" }); return;
  }
  if (entry.uses >= entry.maxUses) {
    res.status(200).json({ valid: false, error: "code_exhausted" }); return;
  }
  entry.uses++;
  res.json({ valid: true, tier: entry.tier, usesLeft: entry.maxUses - entry.uses });
});

router.post("/beta/waitlist", strictRateLimit, async (req, res) => {
  const { email, piUid } = req.body as Record<string, unknown>;
  const ip = getClientIp(req);
  if (!email && !piUid) { res.status(400).json({ error: "email or piUid required" }); return; }
  WAITLIST.push({ email: email as string, piUid: piUid as string, createdAt: Date.now(), ip });
  res.status(201).json({ ok: true, position: WAITLIST.length });
});

router.get("/beta/stats", requireAdmin, async (req, res) => {
  try {
    const totalPlayers = await db.execute(`SELECT COUNT(*) as cnt FROM players` as never) as unknown as { rows: Array<{ cnt: string }> };
    const newToday     = await db.execute(`SELECT COUNT(*) as cnt FROM players WHERE created_at > NOW() - INTERVAL '24 hours'` as never) as unknown as { rows: Array<{ cnt: string }> };
    const activeToday  = await db.execute(`SELECT COUNT(*) as cnt FROM players WHERE last_active_at > NOW() - INTERVAL '24 hours'` as never) as unknown as { rows: Array<{ cnt: string }> };
    const suspCount    = await db.execute(`SELECT COUNT(*) as cnt FROM suspicious_activity WHERE resolved = FALSE` as never) as unknown as { rows: Array<{ cnt: string }> };
    const piPayments   = await db.execute(`SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total FROM pi_payments WHERE status = 'completed'` as never) as unknown as { rows: Array<{ cnt: string; total: string }> };
    const auditLast24h = await db.execute(`SELECT COUNT(*) as cnt FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 hours'` as never) as unknown as { rows: Array<{ cnt: string }> };
    const feedback     = await db.execute(`SELECT COUNT(*) as cnt FROM beta_feedback WHERE created_at > NOW() - INTERVAL '7 days'` as never).catch(() => ({ rows: [{ cnt: '0' }] })) as unknown as { rows: Array<{ cnt: string }> };

    res.json({
      betaVersion: '0.19.0',
      totalPlayers:    Number(totalPlayers.rows?.[0]?.cnt ?? 0),
      newPlayersToday: Number(newToday.rows?.[0]?.cnt ?? 0),
      activeToday:     Number(activeToday.rows?.[0]?.cnt ?? 0),
      openFlags:       Number(suspCount.rows?.[0]?.cnt ?? 0),
      piPaymentsCount: Number(piPayments.rows?.[0]?.cnt ?? 0),
      piPaymentsTotal: Number(piPayments.rows?.[0]?.total ?? 0),
      auditEvents24h:  Number(auditLast24h.rows?.[0]?.cnt ?? 0),
      feedbackLast7d:  Number(feedback.rows?.[0]?.cnt ?? 0),
      waitlistCount:   WAITLIST.length,
      inviteCodes:     Array.from(INVITE_CODES.values()),
    });
  } catch (err) {
    req.log.error({ err }, "beta stats error");
    res.status(500).json({ error: "internal" });
  }
});

router.post("/beta/invite/generate", requireAdmin, async (req, res) => {
  const { tier = "tester", maxUses = 10 } = req.body as Record<string, unknown>;
  const code = `BETA${nanoid().slice(0, 6).toUpperCase()}`;
  INVITE_CODES.set(code, {
    code, tier: String(tier), uses: 0, maxUses: Number(maxUses), createdAt: Date.now(), active: true,
  });
  res.json({ code, tier, maxUses });
});

router.get("/beta/invite/list", requireAdmin, async (req, res) => {
  res.json(Array.from(INVITE_CODES.values()));
});

router.delete("/beta/invite/:code", requireAdmin, async (req, res) => {
  const entry = INVITE_CODES.get(String(req.params.code).toUpperCase());
  if (!entry) { res.status(404).json({ error: "not found" }); return; }
  entry.active = false;
  res.json({ ok: true });
});

router.get("/beta/suspicious", requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(
      `SELECT sa.*, p.username FROM suspicious_activity sa
       LEFT JOIN players p ON p.id = sa.player_id
       WHERE sa.resolved = FALSE
       ORDER BY sa.created_at DESC LIMIT 50` as never,
    ) as unknown as { rows: unknown[] };
    res.json(rows.rows ?? []);
  } catch (err) {
    req.log.error({ err }, "beta suspicious error");
    res.status(500).json({ error: "internal" });
  }
});

router.post("/beta/invite/validate", async (req, res) => {
  res.json({ ok: true });
});

export default router;
