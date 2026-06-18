import { Router } from "express";
import { db } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { getClientIp, getDeviceFingerprint, logSuspicious, validateScoreAntiCheat, validateCoinAmount, logAudit, detectSuspiciousWinRate, detectRapidRegistration } from "../middleware/antiCheat.js";
import { strictRateLimit } from "../middleware/rateLimit.js";

const router = Router();

router.post("/security/report", requireAuth, strictRateLimit, async (req, res) => {
  const { playerId, type, details } = req.body as Record<string, unknown>;
  const ip = getClientIp(req);
  const fingerprint = getDeviceFingerprint(req);
  try {
    await logSuspicious(
      typeof playerId === "string" ? playerId : null,
      ip, fingerprint,
      typeof type === "string" ? type : "client_report",
      "low",
      (details as Record<string, unknown>) ?? {},
    );
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "security report error");
    res.status(500).json({ error: "internal" });
  }
});

// Phase 20: Automated bot/fake-account detection scan
router.post("/security/scan-player", requireAuth, async (req, res) => {
  const { playerId } = req.body as { playerId?: string };
  if (!playerId) { res.status(400).json({ error: "playerId_required" }); return; }
  const ip = getClientIp(req);
  const fingerprint = getDeviceFingerprint(req);
  try {
    const [suspiciousWinRate, rapidReg] = await Promise.all([
      detectSuspiciousWinRate(playerId),
      detectRapidRegistration(ip),
    ]);
    const flags: string[] = [];
    if (suspiciousWinRate) {
      flags.push("suspicious_win_rate");
      await logSuspicious(playerId, ip, fingerprint, "suspicious_win_rate", "high", { autoDetected: true });
    }
    if (rapidReg) {
      flags.push("rapid_registration");
      await logSuspicious(playerId, ip, fingerprint, "rapid_registration", "medium", { autoDetected: true });
    }
    res.json({ clean: flags.length === 0, flags });
  } catch (err) {
    req.log.error({ err }, "scan-player error");
    res.status(500).json({ error: "internal" });
  }
});

router.post("/security/validate-score", requireAuth, async (req, res) => {
  const { score, duration, accuracy } = req.body as Record<string, unknown>;
  const result = validateScoreAntiCheat(Number(score), Number(duration), Number(accuracy));
  if (!result.valid) {
    const ip = getClientIp(req);
    const fingerprint = getDeviceFingerprint(req);
    await logSuspicious(req.auth!.playerId, ip, fingerprint, "invalid_score", "high", {
      score, duration, accuracy, reason: result.reason,
    });
    res.status(422).json({ valid: false, reason: result.reason });
    return;
  }
  res.json({ valid: true });
});

router.get("/admin/logs", requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const playerId = req.query.playerId as string | undefined;
  try {
    const whereClause = playerId ? `WHERE player_id = '${playerId.replace(/'/g, "")}'` : '';
    const rows = await db.execute(`
      SELECT * FROM audit_logs ${whereClause}
      ORDER BY created_at DESC LIMIT ${limit}
    ` as any);
    res.json((rows as any).rows ?? []);
  } catch (err) {
    req.log.error({ err }, "admin logs error");
    res.status(500).json({ error: "internal" });
  }
});

router.get("/admin/suspicious", requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  try {
    const rows = await db.execute(`
      SELECT * FROM suspicious_activity WHERE resolved = FALSE
      ORDER BY created_at DESC LIMIT ${limit}
    ` as any);
    res.json((rows as any).rows ?? []);
  } catch (err) {
    req.log.error({ err }, "admin suspicious error");
    res.status(500).json({ error: "internal" });
  }
});

router.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    const [stats] = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM players) as total_players,
        (SELECT COUNT(*) FROM players WHERE created_at > NOW() - INTERVAL '24 hours') as new_players_24h,
        (SELECT COUNT(*) FROM pvp_matches WHERE created_at > NOW() - INTERVAL '24 hours') as matches_24h,
        (SELECT COUNT(*) FROM coin_transactions WHERE created_at > NOW() - INTERVAL '24 hours') as txns_24h,
        (SELECT COUNT(*) FROM suspicious_activity WHERE resolved = FALSE) as open_flags,
        (SELECT COUNT(*) FROM players WHERE verification_status = 'verified') as verified_players
    ` as any) as any;
    res.json((stats as any).rows?.[0] ?? {});
  } catch (err) {
    req.log.error({ err }, "admin stats error");
    res.status(500).json({ error: "internal" });
  }
});

router.patch("/admin/suspicious/:id/resolve", requireAdmin, async (req, res) => {
  try {
    await db.execute(`
      UPDATE suspicious_activity SET resolved = TRUE WHERE id = ${Number(req.params.id)}
    ` as any);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "resolve suspicious error");
    res.status(500).json({ error: "internal" });
  }
});

export default router;
