/**
 * Feed Intelligence Layer
 * ──────────────────────
 * Architecture-ready feed ranking and scoring system.
 * Currently runs client-side; swap `rankPosts` to call API for server-side ranking.
 */

import type { CommunityPost } from "@/lib/community";

export type FeedType = "fyp" | "following" | "trending" | "latest";

// ── Engagement weights ────────────────────────────────────────────
const W_LIKE    = 1;
const W_COMMENT = 3;
const W_SHARE   = 4;
const W_VIEW    = 0.1;

// Decay constant (in ms) — older posts score lower
const HALF_LIFE_MS = 6 * 60 * 60 * 1000; // 6 hours

export interface ScoredPost extends CommunityPost {
  _score: number;
  _engagementScore: number;
  _freshness: number;
  _isTrending: boolean;
}

// ── Freshness score (0-1, decays over time) ──────────────────────
export function freshnessScore(timestamp: number): number {
  const age = Math.max(0, Date.now() - timestamp);
  return Math.exp(-age / HALF_LIFE_MS);
}

// ── Engagement score ─────────────────────────────────────────────
export function engagementScore(post: CommunityPost, views = 0, shares = 0): number {
  return (
    post.likes   * W_LIKE +
    0            * W_COMMENT +   // comment count wired via separate state in Community
    shares       * W_SHARE +
    views        * W_VIEW
  );
}

// ── Viral detection ──────────────────────────────────────────────
export function isViral(post: CommunityPost, windowMs = 3_600_000): boolean {
  const age = Date.now() - post.timestamp;
  const likeRate = age > 0 ? post.likes / (age / 60_000) : 0; // likes per minute
  return likeRate > 0.5 && post.likes > 10;
}

// ── Main ranking function ────────────────────────────────────────
export function rankPosts(posts: CommunityPost[], feedType: FeedType): ScoredPost[] {
  const now = Date.now();
  const trendingWindow = 24 * 60 * 60 * 1000; // 24h

  return posts
    .map((post): ScoredPost => {
      const fresh  = freshnessScore(post.timestamp);
      const engage = engagementScore(post);
      const viral  = isViral(post);

      let score = 0;
      switch (feedType) {
        case "fyp":
          // Weighted blend of freshness + engagement + boost
          score = engage * 0.5 + fresh * 10 + (post.boosted ? 8 : 0) + (viral ? 5 : 0);
          break;
        case "following":
          // Chronological with light engagement boost
          score = fresh * 20 + engage * 0.2;
          break;
        case "trending":
          // Engagement-first, recent window only
          const isRecent = now - post.timestamp < trendingWindow;
          score = isRecent ? engage * 2 + (viral ? 10 : 0) : -Infinity;
          break;
        case "latest":
          // Pure chronological
          score = post.timestamp;
          break;
      }

      return {
        ...post,
        _score:           score,
        _engagementScore: engage,
        _freshness:       fresh,
        _isTrending:      viral,
      };
    })
    .filter((p) => p._score > -Infinity)
    .sort((a, b) => b._score - a._score);
}

// ── Deduplicate (for personalized mixing) ────────────────────────
export function deduplicatePosts(posts: ScoredPost[]): ScoredPost[] {
  const seen = new Set<string>();
  return posts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

// ── Trending hashtag extraction ─────────────────────────────────
export function extractTrendingHashtags(posts: CommunityPost[]): { tag: string; count: number }[] {
  const counts: Record<string, number> = {};
  const window24h = Date.now() - 24 * 60 * 60 * 1000;
  posts
    .filter((p) => p.timestamp > window24h)
    .forEach((p) => {
      const tags = p.content.match(/#[\w\u0600-\u06FF]+/g) ?? [];
      tags.forEach((tag) => {
        counts[tag] = (counts[tag] ?? 0) + 1;
      });
    });
  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

// ── Engagement metrics for a post ───────────────────────────────
export function computeEngagementRate(
  likes: number,
  comments: number,
  shares: number,
  views: number
): number {
  if (views === 0) return 0;
  return ((likes + comments * 3 + shares * 4) / views) * 100;
}
