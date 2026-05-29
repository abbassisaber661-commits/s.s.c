import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";

const MAX_SCORE_PER_SECOND = 50;
const MAX_COINS_PER_TX     = 10_000;

export function getClientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

export function getDeviceFingerprint(req: Request): string {
  const ua   = req.headers["user-agent"]         ?? "";
  const lang = req.headers["accept-language"]    ?? "";
  const enc  = req.headers["accept-encoding"]    ?? "";
  return Buffer.from(`${ua}|${lang}|${enc}`).toString("base64").slice(0, 64);
}

export async function trackIpFingerprint(
  playerId: string, ip: string, fingerprint: string,
): Promise<void> {
  try {
    await db.execute(
      `INSERT INTO ip_fingerprints (ip_address, device_fingerprint, player_id, first_seen_at, last_seen_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (ip_address, player_id) DO UPDATE SET last_seen_at = NOW(), device_fingerprint = $2` as never,
      [ip, fingerprint, playerId] as never,
    );
  } catch { /* non-critical */ }
}

export async function detectMultiAccount(ip: string, playerId: string): Promise<boolean> {
  try {
    const result = await db.execute(
      `SELECT COUNT(DISTINCT player_id) as cnt FROM ip_fingerprints
       WHERE ip_address = $1 AND player_id != $2` as never,
      [ip, playerId] as never,
    ) as unknown as { rows: Array<{ cnt: string }> };
    return Number(result.rows?.[0]?.cnt ?? 0) >= 3;
  } catch { return false; }
}

export async function logSuspicious(
  playerId: string | null, ip: string, fingerprint: string,
  type: string, severity: "low" | "medium" | "high" | "critical",
  details: Record<string, unknown>,
): Promise<void> {
  try {
    await db.execute(
      `INSERT INTO suspicious_activity (player_id, ip_address, device_fingerprint, type, severity, details)
       VALUES ($1, $2, $3, $4, $5, $6)` as never,
      [playerId, ip, fingerprint, type, severity, JSON.stringify(details)] as never,
    );
  } catch { /* non-critical */ }
}

export async function logAudit(
  playerId: string | null, action: string, entity: string,
  entityId: string | null, oldVal: unknown, newVal: unknown,
  ip: string, ua: string, status = "ok",
): Promise<void> {
  try {
    await db.execute(
      `INSERT INTO audit_logs (player_id, action, entity, entity_id, old_value, new_value, ip_address, user_agent, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)` as never,
      [
        playerId, action, entity, entityId,
        JSON.stringify(oldVal), JSON.stringify(newVal),
        ip, ua, status,
      ] as never,
    );
  } catch { /* non-critical */ }
}

export function validateScoreAntiCheat(
  score: number, duration: number, accuracy: number,
): { valid: boolean; reason?: string } {
  if (score < 0)                              return { valid: false, reason: "negative_score" };
  if (duration <= 0)                          return { valid: false, reason: "invalid_duration" };
  if (accuracy < 0 || accuracy > 1)          return { valid: false, reason: "invalid_accuracy" };
  const maxPossible = duration * MAX_SCORE_PER_SECOND;
  if (score > maxPossible)                    return { valid: false, reason: `score_too_high:${score}>${maxPossible}` };
  if (score > 0 && accuracy > 0.99 && duration > 30)
    return { valid: false, reason: "perfect_accuracy_sustained" };
  return { valid: true };
}

export function validateCoinAmount(amount: number): { valid: boolean; reason?: string } {
  if (!Number.isInteger(amount))              return { valid: false, reason: "non_integer" };
  if (Math.abs(amount) > MAX_COINS_PER_TX)   return { valid: false, reason: `exceeds_max` };
  return { valid: true };
}

export function antiCheatMiddleware(req: Request, _res: Response, next: NextFunction): void {
  (req as any).clientIp         = getClientIp(req);
  (req as any).deviceFingerprint = getDeviceFingerprint(req);
  next();
}
