import { eq } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";

const OWNER_UID = process.env["OWNER_UID"] ?? "";

export function isOwnerPiUid(piUid: string | null | undefined): boolean {
  return Boolean(OWNER_UID && piUid && piUid === OWNER_UID);
}

let _cachedOwnerPlayerId: string | null | undefined;

export async function getOwnerPlayerId(): Promise<string | null> {
  if (_cachedOwnerPlayerId !== undefined) return _cachedOwnerPlayerId;
  if (!OWNER_UID) { _cachedOwnerPlayerId = null; return null; }
  try {
    const [row] = await db
      .select({ id: playersTable.id })
      .from(playersTable)
      .where(eq(playersTable.piUid, OWNER_UID))
      .limit(1);
    _cachedOwnerPlayerId = row?.id ?? null;
  } catch {
    _cachedOwnerPlayerId = null;
  }
  return _cachedOwnerPlayerId;
}

export function invalidateOwnerCache(): void {
  _cachedOwnerPlayerId = undefined;
}
