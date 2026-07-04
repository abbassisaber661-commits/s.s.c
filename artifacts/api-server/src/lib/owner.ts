import { eq, sql } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";

const OWNER_UID = process.env["OWNER_UID"] ?? "";
// Optional fallback for accounts that log in with username/password instead
// of Pi Network — lets the app owner get admin access without a Pi UID.
const OWNER_USERNAME = (process.env["OWNER_USERNAME"] ?? "").trim().toLowerCase();

export function isOwnerPiUid(piUid: string | null | undefined): boolean {
  return Boolean(OWNER_UID && piUid && piUid === OWNER_UID);
}

export function isOwnerUsername(username: string | null | undefined): boolean {
  return Boolean(OWNER_USERNAME && username && username.trim().toLowerCase() === OWNER_USERNAME);
}

export function isOwnerPlayer(player: { piUid?: string | null; username?: string | null }): boolean {
  return isOwnerPiUid(player.piUid) || isOwnerUsername(player.username);
}

let _cachedOwnerPlayerId: string | null | undefined;

export async function getOwnerPlayerId(): Promise<string | null> {
  if (_cachedOwnerPlayerId !== undefined) return _cachedOwnerPlayerId;
  if (!OWNER_UID && !OWNER_USERNAME) { _cachedOwnerPlayerId = null; return null; }
  try {
    if (OWNER_UID) {
      const [row] = await db
        .select({ id: playersTable.id })
        .from(playersTable)
        .where(eq(playersTable.piUid, OWNER_UID))
        .limit(1);
      if (row) { _cachedOwnerPlayerId = row.id; return _cachedOwnerPlayerId; }
    }
    if (OWNER_USERNAME) {
      const [row] = await db
        .select({ id: playersTable.id })
        .from(playersTable)
        .where(sql`lower(${playersTable.username}) = ${OWNER_USERNAME}`)
        .limit(1);
      if (row) { _cachedOwnerPlayerId = row.id; return _cachedOwnerPlayerId; }
    }
    _cachedOwnerPlayerId = null;
  } catch {
    _cachedOwnerPlayerId = null;
  }
  return _cachedOwnerPlayerId;
}

export function invalidateOwnerCache(): void {
  _cachedOwnerPlayerId = undefined;
}
