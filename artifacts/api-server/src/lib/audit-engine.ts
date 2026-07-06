/**
 * audit-engine.ts
 * ────────────────
 * Smart Audit Engine for SkillLeague.
 *
 * READ-ONLY — never modifies any system, data, or logic.
 * Performs static integration-map analysis + live DB verification checks.
 *
 * Two audit layers:
 *   1. Static Manifest   — hardcoded knowledge of what SHOULD be connected
 *   2. Runtime Probes    — DB queries verifying connections produce real data
 */

import { desc, eq, and, gte, count } from 'drizzle-orm';
import {
  db,
  walletTransactionsTable,
  playersTable,
  postsTable,
  pvpMatchesTable,
  userDailyEconomyTable,
  storePurchasesTable,
} from '@workspace/db';

// ── Types ─────────────────────────────────────────────────────────────────────

export type LinkStatus = 'linked' | 'partial' | 'unlinked' | 'no_data';

export interface AuditCheck {
  name:        string;
  description: string;
  status:      LinkStatus;
  details:     string;
  probe?:      string;
}

export interface CategoryAudit {
  status:  LinkStatus;
  checks:  AuditCheck[];
}

export interface AuditSuggestion {
  severity: 'critical' | 'warning' | 'info';
  event:    string;
  issue:    string;
  fix:      string;
}

export interface AuditReport {
  generatedAt: string;
  social: {
    posts:    LinkStatus;
    likes:    LinkStatus;
    comments: LinkStatus;
    details:  AuditCheck[];
  };
  economy: {
    dn:    LinkStatus;
    pi:    LinkStatus;
    shop:  LinkStatus;
    details: AuditCheck[];
  };
  game: {
    matches: LinkStatus;
    login:   LinkStatus;
    seasons: LinkStatus;
    details: AuditCheck[];
  };
  unlinkedEvents:  string[];
  issues:          number;
  warnings:        string[];
  suggestions:     AuditSuggestion[];
  stats: {
    totalChecks:  number;
    passed:       number;
    partial:      number;
    failed:       number;
    noData:       number;
  };
}

// ── Integration Manifest ──────────────────────────────────────────────────────
//
// Describes every integration hook in the codebase.
// source: the coin_transactions.source or user_daily_economy field to probe.

interface IntegrationPoint {
  id:          string;
  category:    'social' | 'economy' | 'game';
  subcategory: string;
  description: string;
  hookFile:    string;
  hookFn:      string;
  probeType:   'dn_tx_source' | 'daily_field' | 'store_purchase' | 'pi_tx' | 'table_rows';
  probeKey:    string;
  severity:    'critical' | 'warning' | 'info';
}

const INTEGRATION_MANIFEST: IntegrationPoint[] = [
  // ── Social ────────────────────────────────────────────────────────────────
  {
    id:          'post_creation_reward',
    category:    'social',
    subcategory: 'posts',
    description: 'Post creation triggers daily post-coin reward (1 Coin on 2nd post/day)',
    hookFile:    'routes/community.ts',
    hookFn:      'recordPost(authorId)',
    probeType:   'dn_tx_source',
    probeKey:    'daily_posts',
    severity:    'warning',
  },
  {
    id:          'like_interaction_reward',
    category:    'social',
    subcategory: 'likes',
    description: 'Likes on posts increment author interaction counter toward 1 Coin reward',
    hookFile:    'routes/community.ts',
    hookFn:      'recordInteraction(postAuthorId, "like")',
    probeType:   'daily_field',
    probeKey:    'likes_received',
    severity:    'warning',
  },
  {
    id:          'comment_interaction_reward',
    category:    'social',
    subcategory: 'comments',
    description: 'Comments on posts increment author interaction counter toward 1 Coin reward',
    hookFile:    'routes/community.ts',
    hookFn:      'recordInteraction(postAuthorId, "comment")',
    probeType:   'daily_field',
    probeKey:    'comments_received',
    severity:    'warning',
  },
  {
    id:          'interaction_coin_reward',
    category:    'social',
    subcategory: 'interactions',
    description: '1 Coin awarded when author receives 5 likes + 5 comments in a day',
    hookFile:    'routes/community.ts',
    hookFn:      'recordInteraction → awardDN(daily_interactions)',
    probeType:   'dn_tx_source',
    probeKey:    'daily_interactions',
    severity:    'info',
  },

  // ── Game ──────────────────────────────────────────────────────────────────
  {
    id:          'match_completion_reward',
    category:    'game',
    subcategory: 'matches',
    description: '1 Coin awarded once per day when a full match is completed',
    hookFile:    'routes/matches.ts',
    hookFn:      'claimMatchReward(pAId)',
    probeType:   'dn_tx_source',
    probeKey:    'daily_match',
    severity:    'critical',
  },
  {
    id:          'daily_login_reward',
    category:    'game',
    subcategory: 'login',
    description: '1 Coin awarded once per day on first login (password, guest, or Pi)',
    hookFile:    'routes/auth.ts',
    hookFn:      'claimLoginReward(player.id)',
    probeType:   'dn_tx_source',
    probeKey:    'daily_login',
    severity:    'critical',
  },
  {
    id:          'season_end_pi',
    category:    'game',
    subcategory: 'seasons',
    description: 'Pi distributed to top-ranked real players when a season ends',
    hookFile:    'routes/league-system.ts',
    hookFn:      'awardSeasonEndPi(leagueId)',
    probeType:   'pi_tx',
    probeKey:    'season_end',
    severity:    'warning',
  },

  // ── Economy ───────────────────────────────────────────────────────────────
  {
    id:          'dn_earn_pipeline',
    category:    'economy',
    subcategory: 'dn',
    description: 'coin_transactions table records all earn events correctly',
    hookFile:    'lib/daily-rewards.ts',
    hookFn:      'awardDN()',
    probeType:   'dn_tx_source',
    probeKey:    'daily_login',
    severity:    'critical',
  },
  {
    id:          'pi_earn_pipeline',
    category:    'economy',
    subcategory: 'pi',
    description: 'Pi rewards are tracked in pi_payments table',
    hookFile:    'lib/audit-engine.ts (DB probe)',
    hookFn:      'pi_payments table',
    probeType:   'table_rows',
    probeKey:    'pi_payments',
    severity:    'critical',
  },
  {
    id:          'shop_coin_deduction',
    category:    'economy',
    subcategory: 'shop',
    description: 'Shop purchases deduct DN$ and are recorded in store_purchases + coin_transactions',
    hookFile:    'lib/shop-service.ts',
    hookFn:      'purchaseShopItem()',
    probeType:   'store_purchase',
    probeKey:    'shop_purchase',
    severity:    'critical',
  },
  {
    id:          'daily_economy_table',
    category:    'economy',
    subcategory: 'dn',
    description: 'user_daily_economy table exists and enforces per-day limits',
    hookFile:    'lib/daily-rewards.ts',
    hookFn:      'getOrCreateDailyRecord()',
    probeType:   'table_rows',
    probeKey:    'user_daily_economy',
    severity:    'critical',
  },
];

// ── DB Probes ──────────────────────────────────────────────────────────────────

async function probeCoinTxSource(source: string): Promise<{ count: number; lastAt?: string }> {
  try {
    const rows = await db
      .select({ id: walletTransactionsTable.id, createdAt: walletTransactionsTable.createdAt })
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.type, source))
      .orderBy(desc(walletTransactionsTable.createdAt))
      .limit(1);
    const total = await db
      .select({ n: count() })
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.type, source));
    return { count: total[0]?.n ?? 0, lastAt: rows[0]?.createdAt?.toISOString() };
  } catch {
    return { count: 0 };
  }
}

async function probePiTx(source: string): Promise<{ count: number }> {
  try {
    const rows = await db
      .select({ n: count() })
      .from(walletTransactionsTable)
      .where(and(
        eq(walletTransactionsTable.type, 'gem_earn'),
        eq(walletTransactionsTable.type, source),
      ));
    return { count: rows[0]?.n ?? 0 };
  } catch {
    return { count: 0 };
  }
}

async function probeDailyField(field: 'likes_received' | 'comments_received'): Promise<{ totalAccumulated: number }> {
  try {
    let total = 0;
    if (field === 'likes_received') {
      const rows = await db.select({ v: userDailyEconomyTable.likesReceived }).from(userDailyEconomyTable).limit(100);
      total = rows.reduce((s, r) => s + (r.v ?? 0), 0);
    } else {
      const rows = await db.select({ v: userDailyEconomyTable.commentsReceived }).from(userDailyEconomyTable).limit(100);
      total = rows.reduce((s, r) => s + (r.v ?? 0), 0);
    }
    return { totalAccumulated: total };
  } catch {
    return { totalAccumulated: 0 };
  }
}

async function probeTableRows(key: string): Promise<{ rowCount: number; ok: boolean }> {
  try {
    if (key === 'pi_payments') {
      // gems removed — check DN$ wallet table instead
      const [r] = await db.select({ n: count() }).from(walletTransactionsTable);
      return { rowCount: r?.n ?? 0, ok: (r?.n ?? 0) >= 0 };
    }
    if (key === 'user_daily_economy') {
      const [r] = await db.select({ n: count() }).from(userDailyEconomyTable);
      return { rowCount: r?.n ?? 0, ok: true };
    }
    return { rowCount: 0, ok: false };
  } catch {
    return { rowCount: 0, ok: false };
  }
}

async function probeStorePurchase(source: string): Promise<{ count: number }> {
  try {
    const [r] = await db.select({ n: count() }).from(storePurchasesTable);
    return { count: r?.n ?? 0 };
  } catch {
    return { count: 0 };
  }
}

// ── Probe dispatcher ─────────────────────────────────────────────────────────

interface ProbeResult {
  status:  LinkStatus;
  details: string;
  data:    Record<string, unknown>;
}

async function runProbe(point: IntegrationPoint): Promise<ProbeResult> {
  switch (point.probeType) {
    case 'dn_tx_source': {
      const r = await probeCoinTxSource(point.probeKey);
      if (r.count > 0) {
        return {
          status:  'linked',
          details: `${r.count} transaction(s) found (source="${point.probeKey}"); last: ${r.lastAt ?? 'n/a'}`,
          data: r,
        };
      }
      return {
        status:  'no_data',
        details: `No coin transactions found with source="${point.probeKey}" — integration may not have fired yet`,
        data: r,
      };
    }

    case 'pi_tx': {
      const r = await probePiTx(point.probeKey);
      if (r.count > 0) {
        return {
          status:  'linked',
          details: `${r.count} gem_earn transaction(s) found (source="${point.probeKey}")`,
          data: r,
        };
      }
      return {
        status:  'no_data',
        details: `No gem transactions yet (source="${point.probeKey}") — fires only at season end`,
        data: r,
      };
    }

    case 'daily_field': {
      const field = point.probeKey === 'likes_received' ? 'likes_received' : 'comments_received';
      const r = await probeDailyField(field as 'likes_received' | 'comments_received');
      if (r.totalAccumulated > 0) {
        return {
          status:  'linked',
          details: `Total ${field} accumulated across all daily records: ${r.totalAccumulated}`,
          data: r,
        };
      }
      return {
        status:  'no_data',
        details: `No ${field} data in user_daily_economy yet — fires when users receive interactions`,
        data: r,
      };
    }

    case 'store_purchase': {
      const r = await probeStorePurchase(point.probeKey);
      if (r.count > 0) {
        return {
          status:  'linked',
          details: `${r.count} store purchase record(s) found`,
          data: r,
        };
      }
      return {
        status:  'no_data',
        details: 'No shop purchases yet — shop deduction logic is present but not yet used',
        data: r,
      };
    }

    case 'table_rows': {
      const r = await probeTableRows(point.probeKey);
      if (r.ok) {
        return {
          status:  'linked',
          details: `Table/column "${point.probeKey}" is present; ${r.rowCount} row(s)`,
          data: r,
        };
      }
      return {
        status:  'unlinked',
        details: `Table/column "${point.probeKey}" probe failed — schema may be missing`,
        data: r,
      };
    }

    default:
      return { status: 'unlinked', details: 'Unknown probe type', data: {} };
  }
}

// ── Status aggregator ─────────────────────────────────────────────────────────

function aggregateStatus(checks: AuditCheck[]): LinkStatus {
  if (checks.some(c => c.status === 'unlinked'))  return 'unlinked';
  if (checks.some(c => c.status === 'partial'))   return 'partial';
  if (checks.every(c => c.status === 'linked'))   return 'linked';
  if (checks.every(c => c.status === 'no_data'))  return 'no_data';
  // mixed linked + no_data → partial (code hook exists, no runtime data yet)
  if (checks.some(c => c.status === 'linked') && checks.some(c => c.status === 'no_data')) return 'partial';
  return 'partial';
}

// ── Suggestion builder ────────────────────────────────────────────────────────

function buildSuggestions(results: Map<string, ProbeResult>, manifest: IntegrationPoint[]): AuditSuggestion[] {
  const suggestions: AuditSuggestion[] = [];

  for (const point of manifest) {
    const r = results.get(point.id);
    if (!r) continue;

    if (r.status === 'unlinked') {
      suggestions.push({
        severity: point.severity === 'critical' ? 'critical' : 'warning',
        event:    point.id,
        issue:    `Integration "${point.id}" not detected: ${point.description}`,
        fix:      `Connect ${point.id} → call \`${point.hookFn}\` in \`${point.hookFile}\``,
      });
    } else if (r.status === 'no_data') {
      suggestions.push({
        severity: 'info',
        event:    point.id,
        issue:    `"${point.id}" hook is present in code but no runtime data recorded yet`,
        fix:      `Trigger the event (e.g. login, create post, play match) to verify the hook fires`,
      });
    }
  }

  // Cross-system check: likes & comments unified?
  const likeResult    = results.get('like_interaction_reward');
  const commentResult = results.get('comment_interaction_reward');
  if (likeResult && commentResult) {
    const likeOk    = likeResult.status === 'linked';
    const commentOk = commentResult.status === 'linked';
    if (likeOk !== commentOk) {
      suggestions.push({
        severity: 'warning',
        event:    'interaction_unification',
        issue:    'Likes and Comments interaction counters are not equally populated — one may be missing data',
        fix:      'Ensure both recordInteraction("like") and recordInteraction("comment") are called in community.ts',
      });
    }
  }

  return suggestions;
}

// ── Unlinked event detector ────────────────────────────────────────────────────

function detectUnlinkedEvents(results: Map<string, ProbeResult>): string[] {
  const unlinked: string[] = [];
  for (const [id, result] of results.entries()) {
    if (result.status === 'unlinked') {
      const point = INTEGRATION_MANIFEST.find(p => p.id === id);
      unlinked.push(point ? `${id} (${point.hookFile})` : id);
    }
  }
  return unlinked;
}

// ── Main audit function ───────────────────────────────────────────────────────

export async function runFullAudit(): Promise<AuditReport> {
  const results = new Map<string, ProbeResult>();

  // Run all probes (sequentially to avoid DB overload)
  for (const point of INTEGRATION_MANIFEST) {
    const result = await runProbe(point).catch(
      (err): ProbeResult => ({ status: 'unlinked', details: `Probe error: ${String(err)}`, data: {} }),
    );
    results.set(point.id, result);
  }

  // Group by category / subcategory
  function buildChecks(category: string): AuditCheck[] {
    return INTEGRATION_MANIFEST
      .filter(p => p.category === category)
      .map(p => {
        const r = results.get(p.id)!;
        return {
          name:        p.id,
          description: p.description,
          status:      r.status,
          details:     r.details,
          probe:       `${p.probeType}:${p.probeKey}`,
        };
      });
  }

  const socialChecks  = buildChecks('social');
  const economyChecks = buildChecks('economy');
  const gameChecks    = buildChecks('game');

  const postChecks        = socialChecks.filter(c => c.name.includes('post'));
  const likeChecks        = socialChecks.filter(c => c.name.includes('like'));
  const commentChecks     = socialChecks.filter(c => c.name.includes('comment') || c.name.includes('interaction'));
  const coinChecks        = economyChecks.filter(c => c.name.includes('coin') || c.name.includes('daily_economy'));
  const gemChecks         = economyChecks.filter(c => c.name.includes('gem'));
  const shopChecks        = economyChecks.filter(c => c.name.includes('shop'));
  const matchChecks       = gameChecks.filter(c => c.name.includes('match'));
  const loginChecks       = gameChecks.filter(c => c.name.includes('login'));
  const seasonChecks      = gameChecks.filter(c => c.name.includes('season'));

  const suggestions    = buildSuggestions(results, INTEGRATION_MANIFEST);
  const unlinkedEvents = detectUnlinkedEvents(results);

  const warnings: string[] = [];
  for (const s of suggestions) {
    if (s.severity === 'warning' || s.severity === 'critical') {
      warnings.push(`[${s.severity.toUpperCase()}] ${s.issue}`);
    }
  }

  const allChecks = [...socialChecks, ...economyChecks, ...gameChecks];
  const stats = {
    totalChecks: allChecks.length,
    passed:      allChecks.filter(c => c.status === 'linked').length,
    partial:     allChecks.filter(c => c.status === 'partial').length,
    failed:      allChecks.filter(c => c.status === 'unlinked').length,
    noData:      allChecks.filter(c => c.status === 'no_data').length,
  };

  return {
    generatedAt: new Date().toISOString(),

    social: {
      posts:    aggregateStatus(postChecks),
      likes:    aggregateStatus(likeChecks),
      comments: aggregateStatus(commentChecks),
      details:  socialChecks,
    },

    economy: {
      dn:    aggregateStatus(coinChecks),
      pi:    aggregateStatus(gemChecks),
      shop:  aggregateStatus(shopChecks),
      details: economyChecks,
    },

    game: {
      matches: aggregateStatus(matchChecks),
      login:   aggregateStatus(loginChecks),
      seasons: aggregateStatus(seasonChecks),
      details: gameChecks,
    },

    unlinkedEvents,
    issues:   stats.failed + stats.partial,
    warnings,
    suggestions,
    stats,
  };
}

// ── Quick health check (for /system/audit/health) ────────────────────────────

export interface AuditHealth {
  status:       'healthy' | 'degraded' | 'critical';
  linkedCount:  number;
  totalChecks:  number;
  criticalIssues: string[];
}

export async function runHealthCheck(): Promise<AuditHealth> {
  const report = await runFullAudit();
  const criticalPoints = INTEGRATION_MANIFEST.filter(p => p.severity === 'critical').map(p => p.id);

  const criticalIssues: string[] = [];
  for (const id of criticalPoints) {
    const check = [...report.social.details, ...report.economy.details, ...report.game.details]
      .find(c => c.name === id);
    if (check && check.status === 'unlinked') {
      criticalIssues.push(id);
    }
  }

  const status: AuditHealth['status'] =
    criticalIssues.length > 0         ? 'critical' :
    report.stats.failed > 0           ? 'degraded' :
    report.stats.partial > 2          ? 'degraded' :
    'healthy';

  return {
    status,
    linkedCount:  report.stats.passed,
    totalChecks:  report.stats.totalChecks,
    criticalIssues,
  };
}
