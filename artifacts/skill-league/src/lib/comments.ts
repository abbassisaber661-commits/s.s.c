export interface Comment {
  id: string;
  postId: string;
  authorName: string;
  authorLevel: number;
  content: string;
  timestamp: number;
}

export type ReactionType = '❤️' | '🔥' | '😂' | '💪' | '🤯' | '👏';
export const REACTION_TYPES: ReactionType[] = ['❤️', '🔥', '😂', '💪', '🤯', '👏'];

export interface PostReactions {
  postId: string;
  counts: Record<ReactionType, number>;
  mine: ReactionType | null;
}

const COMMENTS_KEY  = 'sl_comments';
const REACTIONS_KEY = 'sl_reactions';

// ─── Comments ────────────────────────────────────────────────────

export function getComments(postId: string): Comment[] {
  try {
    const raw = localStorage.getItem(COMMENTS_KEY);
    const all: Comment[] = raw ? JSON.parse(raw) : [];
    return all.filter(c => c.postId === postId).sort((a, b) => a.timestamp - b.timestamp);
  } catch { return []; }
}

export function addComment(
  postId: string,
  authorName: string,
  authorLevel: number,
  content: string,
): Comment[] {
  try {
    const raw = localStorage.getItem(COMMENTS_KEY);
    const all: Comment[] = raw ? JSON.parse(raw) : [];
    const comment: Comment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      postId, authorName, authorLevel,
      content: content.trim().slice(0, 200),
      timestamp: Date.now(),
    };
    const updated = [...all, comment].slice(-500);
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(updated));
    return updated.filter(c => c.postId === postId).sort((a, b) => a.timestamp - b.timestamp);
  } catch { return []; }
}

export function getCommentCounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(COMMENTS_KEY);
    const all: Comment[] = raw ? JSON.parse(raw) : [];
    const counts: Record<string, number> = {};
    for (const c of all) counts[c.postId] = (counts[c.postId] ?? 0) + 1;
    return counts;
  } catch { return {}; }
}

// ─── Reactions ────────────────────────────────────────────────────

export function getReactions(postId: string): PostReactions {
  try {
    const raw = localStorage.getItem(REACTIONS_KEY);
    const all: Record<string, PostReactions> = raw ? JSON.parse(raw) : {};
    return all[postId] ?? buildEmpty(postId);
  } catch { return buildEmpty(postId); }
}

export function toggleReaction(postId: string, reaction: ReactionType): PostReactions {
  try {
    const raw = localStorage.getItem(REACTIONS_KEY);
    const all: Record<string, PostReactions> = raw ? JSON.parse(raw) : {};
    const current = all[postId] ?? buildEmpty(postId);
    const wasMine = current.mine === reaction;
    const newCounts = { ...current.counts };
    if (wasMine) {
      newCounts[reaction] = Math.max(0, (newCounts[reaction] ?? 1) - 1);
    } else {
      if (current.mine) newCounts[current.mine] = Math.max(0, (newCounts[current.mine] ?? 1) - 1);
      newCounts[reaction] = (newCounts[reaction] ?? 0) + 1;
    }
    const updated: PostReactions = { postId, counts: newCounts, mine: wasMine ? null : reaction };
    all[postId] = updated;
    localStorage.setItem(REACTIONS_KEY, JSON.stringify(all));
    return updated;
  } catch { return buildEmpty(postId); }
}

export function getAllReactions(): Record<string, PostReactions> {
  try {
    const raw = localStorage.getItem(REACTIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function buildEmpty(postId: string): PostReactions {
  const counts = {} as Record<ReactionType, number>;
  for (const r of REACTION_TYPES) counts[r] = 0;
  return { postId, counts, mine: null };
}

export function totalReactions(reactions: PostReactions): number {
  return Object.values(reactions.counts).reduce((s, v) => s + v, 0);
}

export function getCommentAge(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
