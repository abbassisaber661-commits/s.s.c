/**
 * settings-service.ts
 * ────────────────────
 * Tiny key/value settings layer backed by `system_settings`. Used by the
 * hidden Owner Tools panel to control the official-pages bot system,
 * social interaction toggles, and reserved usernames — without touching
 * any existing table or route behavior. Purely additive.
 */

import { db, systemSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger.js";

export interface OfficialPagesSettings {
  enabled: boolean;
  postingIntervalMinutes: number;
  engagementIntervalMinutes: number;
  pages: Record<string, { enabled: boolean }>;
}

export interface SocialSettings {
  likesEnabled: boolean;
  commentsEnabled: boolean;
}

const DEFAULT_OFFICIAL_PAGES_SETTINGS: OfficialPagesSettings = {
  enabled: true,
  postingIntervalMinutes: 50,
  engagementIntervalMinutes: 25,
  pages: {
    sl_page_wisdom: { enabled: true },
    sl_page_motivation: { enabled: true },
    sl_page_health: { enabled: true },
    sl_page_faith: { enabled: true },
    sl_page_explore: { enabled: true },
  },
};

const DEFAULT_SOCIAL_SETTINGS: SocialSettings = {
  likesEnabled: true,
  commentsEnabled: true,
};

const DEFAULT_RESERVED_USERNAMES = ["skillleague"];

const KEYS = {
  officialPages: "official_pages_settings",
  social: "social_settings",
  reservedUsernames: "reserved_usernames",
} as const;

const cache = new Map<string, unknown>();

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  if (cache.has(key)) return cache.get(key) as T;
  try {
    const [row] = await db.select().from(systemSettingsTable).where(eq(systemSettingsTable.key, key)).limit(1);
    const value = (row?.value as T) ?? fallback;
    cache.set(key, value);
    return value;
  } catch (err) {
    logger.error({ err, key }, "settings-service: read error");
    return fallback;
  }
}

async function setSetting<T>(key: string, value: T): Promise<void> {
  cache.set(key, value);
  await db.insert(systemSettingsTable)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: systemSettingsTable.key, set: { value, updatedAt: new Date() } });
}

export async function getOfficialPagesSettings(): Promise<OfficialPagesSettings> {
  const stored = await getSetting<Partial<OfficialPagesSettings>>(KEYS.officialPages, {});
  return {
    ...DEFAULT_OFFICIAL_PAGES_SETTINGS,
    ...stored,
    pages: { ...DEFAULT_OFFICIAL_PAGES_SETTINGS.pages, ...(stored.pages ?? {}) },
  };
}

export async function updateOfficialPagesSettings(patch: Partial<Omit<OfficialPagesSettings, "pages">>): Promise<OfficialPagesSettings> {
  const current = await getOfficialPagesSettings();
  const next = { ...current, ...patch };
  await setSetting(KEYS.officialPages, next);
  return next;
}

export async function setOfficialPageEnabled(pageId: string, enabled: boolean): Promise<OfficialPagesSettings> {
  const current = await getOfficialPagesSettings();
  const next = { ...current, pages: { ...current.pages, [pageId]: { enabled } } };
  await setSetting(KEYS.officialPages, next);
  return next;
}

export async function getSocialSettings(): Promise<SocialSettings> {
  return getSetting<SocialSettings>(KEYS.social, DEFAULT_SOCIAL_SETTINGS);
}

export async function updateSocialSettings(patch: Partial<SocialSettings>): Promise<SocialSettings> {
  const current = await getSocialSettings();
  const next = { ...current, ...patch };
  await setSetting(KEYS.social, next);
  return next;
}

export async function getReservedUsernames(): Promise<string[]> {
  return getSetting<string[]>(KEYS.reservedUsernames, DEFAULT_RESERVED_USERNAMES);
}

export async function addReservedUsername(word: string): Promise<string[]> {
  const current = await getReservedUsernames();
  const normalized = word.trim().toLowerCase();
  if (!normalized) return current;
  const next = current.includes(normalized) ? current : [...current, normalized];
  await setSetting(KEYS.reservedUsernames, next);
  return next;
}

export async function removeReservedUsername(word: string): Promise<string[]> {
  const current = await getReservedUsernames();
  const normalized = word.trim().toLowerCase();
  const next = current.filter(w => w !== normalized);
  await setSetting(KEYS.reservedUsernames, next);
  return next;
}

export async function isUsernameReserved(username: string): Promise<boolean> {
  const reserved = await getReservedUsernames();
  const lower = username.toLowerCase();
  return reserved.some(word => lower.includes(word));
}

export function invalidateSettingsCache(): void {
  cache.clear();
}
