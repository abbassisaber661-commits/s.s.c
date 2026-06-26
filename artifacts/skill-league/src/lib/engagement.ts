/**
 * Engagement Tracking Store
 * ─────────────────────────
 * Client-side engagement data with API-ready interface.
 * Replace localStorage calls with API calls when backend is ready.
 */

const KEY = "sl_engagement_v1";

export interface EngagementData {
  postId: string;
  views:  number;
  shares: number;
  saves:  number;
  clicks: number;
  lastViewedAt: number;
}

function readAll(): Record<string, EngagementData> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, EngagementData>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}

function getOrCreate(postId: string): EngagementData {
  const all = readAll();
  return all[postId] ?? {
    postId,
    views:        0,
    shares:       0,
    saves:        0,
    clicks:       0,
    lastViewedAt: 0,
  };
}

// ── Public API ───────────────────────────────────────────────────

export function trackView(postId: string): EngagementData {
  const all  = readAll();
  const item = getOrCreate(postId);
  const updated = { ...item, views: item.views + 1, lastViewedAt: Date.now() };
  all[postId] = updated;
  writeAll(all);
  return updated;
}

export function trackShare(postId: string): EngagementData {
  const all  = readAll();
  const item = getOrCreate(postId);
  const updated = { ...item, shares: item.shares + 1 };
  all[postId] = updated;
  writeAll(all);
  return updated;
}

export function trackSave(postId: string, saved: boolean): EngagementData {
  const all  = readAll();
  const item = getOrCreate(postId);
  const updated = { ...item, saves: Math.max(0, item.saves + (saved ? 1 : -1)) };
  all[postId] = updated;
  writeAll(all);
  return updated;
}

export function trackClick(postId: string): EngagementData {
  const all  = readAll();
  const item = getOrCreate(postId);
  const updated = { ...item, clicks: item.clicks + 1 };
  all[postId] = updated;
  writeAll(all);
  return updated;
}

export function getEngagement(postId: string): EngagementData {
  return getOrCreate(postId);
}

export function getTopPosts(limit = 10): EngagementData[] {
  const all = readAll();
  return Object.values(all)
    .sort((a, b) => b.views + b.shares * 4 - (a.views + a.shares * 4))
    .slice(0, limit);
}

// ── Draft system ────────────────────────────────────────────────

const DRAFT_KEY = "sl_post_draft_v1";

export interface PostDraft {
  content:    string;
  imageUrls:  string[];
  audience:   "public" | "friends";
  savedAt:    number;
}

export function saveDraft(draft: Partial<PostDraft>) {
  try {
    const existing = getDraft() ?? {};
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...existing, ...draft, savedAt: Date.now() }));
  } catch {}
}

export function getDraft(): PostDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}
