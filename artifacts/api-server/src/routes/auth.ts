import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";
import { nanoid } from "../lib/nanoid.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { getClientIp, getDeviceFingerprint, trackIpFingerprint, detectMultiAccount, logSuspicious, logAudit } from "../middleware/antiCheat.js";
import { strictRateLimit } from "../middleware/rateLimit.js";
import { claimLoginReward } from "../lib/daily-rewards.js";

const router = Router();
const BCRYPT_ROUNDS = 10;

function buildToken(player: typeof playersTable.$inferSelect): string {
  return signToken({
    playerId: player.id,
    username: player.username,
    role:     player.piUid ? "player" : "player",
  });
}

router.post("/auth/register", strictRateLimit, async (req, res) => {
  const { username, password, language } = req.body as Record<string, unknown>;
  if (typeof username !== "string" || username.trim().length < 2) {
    res.status(400).json({ error: "username must be at least 2 chars" }); return;
  }
  if (typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "password must be at least 6 chars" }); return;
  }

  const ip = getClientIp(req);
  const fingerprint = getDeviceFingerprint(req);

  try {
    const existing = await db.select({ id: playersTable.id })
      .from(playersTable).where(eq(playersTable.username, username.trim())).limit(1);
    if (existing.length) { res.status(409).json({ error: "username already taken" }); return; }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const playerId = nanoid();
    const [player] = await db.insert(playersTable).values({
      id: playerId,
      username: username.trim().slice(0, 20),
      language: typeof language === "string" ? language : "en",
      passwordHash,
    }).returning();

    await trackIpFingerprint(playerId, ip, fingerprint);
    await logAudit(playerId, "register", "player", playerId, null, { username: player.username }, ip, req.headers["user-agent"] ?? "");

    const token = buildToken(player);
    res.status(201).json({ token, player });
  } catch (err) {
    req.log.error({ err }, "register error");
    res.status(500).json({ error: "internal" });
  }
});

router.post("/auth/login", strictRateLimit, async (req, res) => {
  const { username, password } = req.body as Record<string, unknown>;
  if (typeof username !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "username and password required" }); return;
  }

  const ip = getClientIp(req);
  const fingerprint = getDeviceFingerprint(req);

  try {
    const [player] = await db.select().from(playersTable)
      .where(eq(playersTable.username, username.trim())).limit(1);

    if (!player || !player.passwordHash) {
      res.status(401).json({ error: "Invalid credentials" }); return;
    }
    const valid = await bcrypt.compare(password, player.passwordHash);
    if (!valid) {
      await logSuspicious(player.id, ip, fingerprint, "failed_login", "low", { username, attempts: 1 });
      res.status(401).json({ error: "Invalid credentials" }); return;
    }

    await db.update(playersTable).set({ lastActiveAt: new Date() }).where(eq(playersTable.id, player.id));
    await trackIpFingerprint(player.id, ip, fingerprint);

    const multiAccount = await detectMultiAccount(ip, player.id);
    if (multiAccount) {
      await logSuspicious(player.id, ip, fingerprint, "multi_account_ip", "medium", { ip });
    }

    await logAudit(player.id, "login", "player", player.id, null, { ip }, ip, req.headers["user-agent"] ?? "");
    // Economy hook: daily login coin (fire-and-forget)
    claimLoginReward(player.id).catch(() => {});
    const token = buildToken(player);
    res.json({ token, player });
  } catch (err) {
    req.log.error({ err }, "login error");
    res.status(500).json({ error: "internal" });
  }
});

router.post("/auth/guest", strictRateLimit, async (req, res) => {
  const { guestId, username } = req.body as Record<string, unknown>;
  const ip = getClientIp(req);
  const fingerprint = getDeviceFingerprint(req);

  try {
    const safeUsername = (typeof username === "string" ? username.trim() : "").slice(0, 20) || `Guest_${nanoid().slice(0, 6)}`;
    const playerId = typeof guestId === "string" && guestId.length > 4 ? guestId : `guest_${nanoid()}`;

    let player: typeof playersTable.$inferSelect;
    const [existing] = await db.select().from(playersTable).where(eq(playersTable.id, playerId)).limit(1);
    if (existing) {
      await db.update(playersTable).set({ lastActiveAt: new Date() }).where(eq(playersTable.id, playerId));
      player = { ...existing };
    } else {
      const [created] = await db.insert(playersTable).values({
        id: playerId, username: safeUsername, language: "ar",
      }).returning();
      player = created;
    }

    await trackIpFingerprint(player.id, ip, fingerprint);
    // Economy hook: daily login coin (fire-and-forget)
    claimLoginReward(player.id).catch(() => {});
    const token = buildToken(player);
    res.json({ token, player });
  } catch (err) {
    req.log.error({ err }, "guest auth error");
    res.status(500).json({ error: "internal" });
  }
});

router.post("/auth/pi", strictRateLimit, async (req, res) => {
  const { accessToken } = req.body as Record<string, unknown>;
  if (typeof accessToken !== "string" || !accessToken) {
    res.status(400).json({ error: "accessToken required" });
    return;
  }

  const ip = getClientIp(req);
  const fingerprint = getDeviceFingerprint(req);

  // Validate the access token against Pi Network — this is the authoritative
  // source of uid/username; we never trust client-supplied values.
  let piUid: string;
  let piUsername: string;
  try {
    const piRes = await fetch("https://api.minepi.com/v2/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!piRes.ok) {
      req.log.warn({ status: piRes.status }, "Pi /v2/me rejected access token");
      res.status(401).json({ error: "invalid_pi_token" });
      return;
    }
    const piUser = (await piRes.json()) as { uid: string; username: string };
    piUid     = piUser.uid;
    piUsername = piUser.username ?? `Pi_${piUser.uid.slice(0, 6)}`;
    req.log.info({ piUid }, "[PI AUTH] Authenticated Pi UID: " + piUid);
  } catch (err) {
    req.log.error({ err }, "Pi token validation request failed");
    res.status(502).json({ error: "pi_validation_failed" });
    return;
  }

  try {
    const [existing] = await db.select().from(playersTable)
      .where(eq(playersTable.piUid, piUid)).limit(1);

    let player: typeof playersTable.$inferSelect;
    if (existing) {
      await db.update(playersTable).set({
        lastActiveAt: new Date(),
        verificationStatus: "verified",
        username: piUsername.trim().slice(0, 20),
      }).where(eq(playersTable.id, existing.id));
      player = { ...existing, verificationStatus: "verified", username: piUsername.trim().slice(0, 20) };
    } else {
      const safeUsername = piUsername.trim().slice(0, 20) || `Pi_${nanoid().slice(0, 6)}`;
      const [created] = await db.insert(playersTable).values({
        id: nanoid(), username: safeUsername, piUid, verificationStatus: "verified",
      }).returning();
      player = created;
    }

    await trackIpFingerprint(player.id, ip, fingerprint);
    await logAudit(player.id, "pi_login", "player", player.id, null, { piUid }, ip, req.headers["user-agent"] ?? "");
    // Economy hook: daily login coin (fire-and-forget)
    claimLoginReward(player.id).catch(() => {});
    const token = buildToken(player);
    res.json({ token, player });
  } catch (err) {
    req.log.error({ err }, "pi auth error");
    res.status(500).json({ error: "internal" });
  }
});

router.post("/auth/refresh", requireAuth, async (req, res) => {
  try {
    const [player] = await db.select().from(playersTable)
      .where(eq(playersTable.id, req.auth!.playerId)).limit(1);
    if (!player) { res.status(404).json({ error: "player not found" }); return; }
    const token = buildToken(player);
    res.json({ token, player });
  } catch (err) {
    req.log.error({ err }, "refresh error");
    res.status(500).json({ error: "internal" });
  }
});

router.post("/auth/logout", requireAuth, async (req, res) => {
  const ip = getClientIp(req);
  await logAudit(req.auth!.playerId, "logout", "player", req.auth!.playerId, null, {}, ip, req.headers["user-agent"] ?? "");
  res.json({ ok: true });
});

export default router;
