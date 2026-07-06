/**
 * EconomyDashboard.tsx
 * ─────────────────────
 * Admin Economy Dashboard — Read-Only monitoring panel.
 * Connects to the Economy Balancer API endpoints.
 *
 * ❌ No writes — pure display layer.
 * Route: /admin/economy-dashboard
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, RefreshCw, Wifi, WifiOff,
  TrendingUp, TrendingDown, Minus,
  Coins, Gem, BarChart3, AlertTriangle,
  CheckCircle, ShieldAlert, Zap, Users,
  ArrowUpRight, ArrowDownRight, Calendar,
  ChevronRight, CircleDot, Info,
} from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { isRTL } from '@/lib/i18n';

// ── API types ─────────────────────────────────────────────────────────────────

interface BalanceReport {
  inflation:          'HIGH' | 'NORMAL' | 'LOW';
  coinsPerUserPerDay: number;
  gemsFlow:           'STABLE' | 'GROWING' | 'DECLINING' | 'INSUFFICIENT_DATA';
  riskLevel:          'HIGH' | 'MEDIUM' | 'LOW';
  recommendation:     string;
  metrics: {
    coinsEarnedPerDay:    number;
    coinsSpentPerDay:     number;
    netFlow:              number;
    averageCoinsPerUser:  number;
    totalActiveUsers:     number;
    gemsDistributedTotal: number;
    gemsPerLeague:        { div3: number; div2: number; pro: number; champions: number };
    rarityDistribution:   { common: number; uncommon: number; rare: number; legendary: number };
    periodDays:           number;
    calculatedAt:         string;
  };
  recommendations: Array<{
    type:     string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    message:  string;
  }>;
  generatedAt: string;
}

interface WeeklyAnalysis {
  currentWeek: {
    weekStart: string; weekEnd: string;
    coinsEarned: number; coinsSpent: number; netFlow: number;
    activeUsers: number; coinsPerUserPerDay: number;
  };
  previousWeek: {
    weekStart: string; weekEnd: string;
    coinsEarned: number; coinsSpent: number; netFlow: number;
    activeUsers: number; coinsPerUserPerDay: number;
  } | null;
  trend:         'Growing' | 'Stable' | 'Over-inflated' | 'Under-powered';
  changePercent: number | null;
  comparedAt:    string;
}

interface ScalingPreview {
  inflation:          'HIGH' | 'NORMAL' | 'LOW';
  scalingFactor:      number;
  coinsPerUserPerDay: number;
  preview: Array<{
    type: string; label: string;
    base: number; scaled: number;
    factor: number; exempt: boolean;
  }>;
  calculatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const INFLATION_CONFIG = {
  HIGH:   { color: '#ef4444', bg: '#ef444415', label: 'تضخم مرتفع 🔴', icon: TrendingUp  },
  NORMAL: { color: '#22c55e', bg: '#22c55e15', label: 'طبيعي 🟢',       icon: Minus       },
  LOW:    { color: '#3b82f6', bg: '#3b82f615', label: 'منخفض 🔵',       icon: TrendingDown },
};

const RISK_CONFIG = {
  HIGH:   { color: '#ef4444', label: 'خطر مرتفع'   },
  MEDIUM: { color: '#f59e0b', label: 'خطر متوسط'   },
  LOW:    { color: '#22c55e', label: 'خطر منخفض'   },
};

const PRIORITY_CONFIG = {
  HIGH:   { color: '#ef4444', bg: '#ef444415', label: 'عالية'   },
  MEDIUM: { color: '#f59e0b', bg: '#f59e0b15', label: 'متوسطة'  },
  LOW:    { color: '#3b82f6', bg: '#3b82f615', label: 'منخفضة'  },
};

const TREND_CONFIG = {
  'Growing':       { color: '#22c55e', label: 'نمو 📈',         icon: TrendingUp   },
  'Stable':        { color: '#3b82f6', label: 'مستقر →',        icon: Minus        },
  'Over-inflated': { color: '#ef4444', label: 'تضخم مفرط 🔴',  icon: TrendingUp   },
  'Under-powered': { color: '#f59e0b', label: 'ضعيف الأداء 📉', icon: TrendingDown },
};

const GEMS_FLOW_CONFIG = {
  'STABLE':            { color: '#3b82f6', label: 'مستقر' },
  'GROWING':           { color: '#22c55e', label: 'نمو'   },
  'DECLINING':         { color: '#f59e0b', label: 'تراجع' },
  'INSUFFICIENT_DATA': { color: '#6b7280', label: 'بيانات غير كافية' },
};

function fmt(n: number, digits = 1): string {
  return n.toLocaleString('ar-SA', { maximumFractionDigits: digits });
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color, icon: Icon, trend,
}: {
  label: string; value: string | number; sub?: string;
  color: string; icon: any; trend?: 'up' | 'down' | 'flat';
}) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-3.5 flex flex-col gap-1.5"
    >
      <div className="flex items-center justify-between">
        <div className="p-1.5 rounded-lg" style={{ background: color + '22' }}>
          <Icon size={13} style={{ color }} />
        </div>
        {TrendIcon && <TrendIcon size={13} style={{ color: trend === 'up' ? '#22c55e' : '#ef4444' }} />}
      </div>
      <div className="text-xl font-black tabular-nums leading-none" style={{ color }}>
        {typeof value === 'number' ? fmt(value) : value}
      </div>
      <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground/60">{sub}</div>}
    </motion.div>
  );
}

function SectionTitle({ icon: Icon, label, color = '#3b82f6' }: { icon: any; label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="p-1 rounded-md" style={{ background: color + '20' }}>
        <Icon size={13} style={{ color }} />
      </div>
      <span className="font-bold text-sm">{label}</span>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'dn' | 'pi' | 'weekly' | 'scaling';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview', label: 'نظرة عامة',  icon: BarChart3  },
  { id: 'dn',       label: 'DN$',        icon: Coins      },
  { id: 'pi',       label: 'Pi',         icon: Gem        },
  { id: 'weekly',   label: 'أسبوعي',     icon: Calendar   },
  { id: 'scaling',  label: 'التعديل',    icon: Zap        },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function EconomyDashboard() {
  const { language } = useGame();
  const rtl = isRTL(language);

  const [tab, setTab]           = useState<Tab>('overview');
  const [report, setReport]     = useState<BalanceReport | null>(null);
  const [weekly, setWeekly]     = useState<WeeklyAnalysis | null>(null);
  const [scaling, setScaling]   = useState<ScalingPreview | null>(null);
  const [loading, setLoading]   = useState(false);
  const [lastUpdate, setLast]   = useState<Date | null>(null);
  const [autoRefresh, setAuto]  = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const apiFetch = useCallback((path: string) =>
    fetch((import.meta.env.BASE_URL?.replace(/\/$/, '') || '') + '/api' + path, {
      headers: { Authorization: `Bearer ${localStorage.getItem('sl_jwt_token') ?? ''}` },
    }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
  []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const [r, w, s] = await Promise.all([
        apiFetch('/system/economy/balance-report'),
        apiFetch('/system/economy/weekly-analysis'),
        apiFetch('/system/economy/scaling-preview'),
      ]);
      setReport(r); setWeekly(w); setScaling(s);
      setLast(new Date());
    } catch (e) {
      console.error('[EconomyDashboard] fetch error:', e);
    }
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => { loadReport(); }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoRefresh) timerRef.current = setInterval(loadReport, 30_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoRefresh, loadReport]);

  const inf = report ? INFLATION_CONFIG[report.inflation] : null;

  return (
    <div className="min-h-screen pb-28" dir={rtl ? 'rtl' : 'ltr'}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/beta-dashboard">
          <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft size={17} />
          </button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-sm">⚖️ لوحة تحكم الاقتصاد</h1>
          {lastUpdate && (
            <p className="text-[10px] text-muted-foreground">
              آخر تحديث: {lastUpdate.toLocaleTimeString('ar-SA')}
            </p>
          )}
        </div>
        <button
          onClick={() => setAuto(a => !a)}
          className={`p-1.5 rounded-lg transition-colors ${autoRefresh ? 'text-green-400 bg-green-400/10' : 'text-muted-foreground hover:bg-muted'}`}
        >
          {autoRefresh ? <Wifi size={14} /> : <WifiOff size={14} />}
        </button>
        <button
          onClick={loadReport}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Inflation Banner ────────────────────────────────────────────── */}
      <AnimatePresence>
        {inf && report && (
          <motion.div
            key={report.inflation}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mx-4 mt-4 rounded-xl border px-4 py-3.5 flex items-center justify-between gap-3"
            style={{ borderColor: inf.color + '40', background: inf.bg }}
          >
            <div>
              <div className="font-black text-base" style={{ color: inf.color }}>{inf.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {fmt(report.coinsPerUserPerDay)} DN$/مستخدم/يوم
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-bold" style={{ color: RISK_CONFIG[report.riskLevel].color }}>
                {RISK_CONFIG[report.riskLevel].label}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {GEMS_FLOW_CONFIG[report.gemsFlow].label} — Pi
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Alerts Panel ────────────────────────────────────────────────── */}
      {report && (report.riskLevel === 'HIGH' || report.inflation !== 'NORMAL') && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mx-4 mt-3 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 flex items-start gap-2.5"
        >
          <ShieldAlert size={15} className="text-amber-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-bold text-amber-400 mb-1">⚠️ تنبيه النظام</div>
            <div className="text-xs text-muted-foreground leading-relaxed">{report.recommendation}</div>
          </div>
        </motion.div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 px-4 pt-4 pb-2 overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              tab === t.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <t.icon size={11} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-4 pb-4">

        {loading && !report && <LoadingSpinner />}

        {/* ══════════════════════ OVERVIEW TAB ══════════════════════════ */}
        {tab === 'overview' && report && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <StatCard label="مستخدمون نشطون" value={report.metrics.totalActiveUsers}
                color="#3b82f6" icon={Users} />
              <StatCard label="صافي التدفق اليومي" value={report.metrics.netFlow}
                color={report.metrics.netFlow >= 0 ? '#22c55e' : '#ef4444'} icon={TrendingUp}
                trend={report.metrics.netFlow > 0 ? 'up' : report.metrics.netFlow < 0 ? 'down' : 'flat'} />
              <StatCard label="متوسط DN$/مستخدم" value={fmt(report.metrics.averageCoinsPerUser)}
                color="#f59e0b" icon={Coins} />
              <StatCard label="إجمالي Pi الموزعة" value={report.metrics.gemsDistributedTotal}
                color="#a855f7" icon={Gem} />
            </div>

            {/* Economy health card */}
            <div className="bg-card border border-border rounded-xl p-4">
              <SectionTitle icon={BarChart3} label="صحة الاقتصاد" color="#3b82f6" />
              <div className="space-y-2.5">
                {[
                  { label: 'حالة التضخم', value: inf?.label ?? '—', color: inf?.color ?? '#6b7280' },
                  { label: 'تدفق Pi', value: GEMS_FLOW_CONFIG[report.gemsFlow].label, color: GEMS_FLOW_CONFIG[report.gemsFlow].color },
                  { label: 'مستوى الخطر',  value: RISK_CONFIG[report.riskLevel].label,  color: RISK_CONFIG[report.riskLevel].color  },
                  { label: 'فترة التحليل', value: `${report.metrics.periodDays} أيام`,  color: '#6b7280' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className="text-xs font-bold" style={{ color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-card border border-border rounded-xl p-4">
              <SectionTitle icon={Info} label="التوصيات الذكية" color="#f59e0b" />
              <div className="space-y-2.5">
                {report.recommendations.map((rec, i) => {
                  const p = PRIORITY_CONFIG[rec.priority];
                  return (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="rounded-lg border px-3 py-2.5 flex items-start gap-2.5"
                      style={{ borderColor: p.color + '30', background: p.bg }}
                    >
                      <CircleDot size={12} className="mt-0.5 shrink-0" style={{ color: p.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-bold mb-0.5" style={{ color: p.color }}>
                          أولوية {p.label}
                        </div>
                        <div className="text-xs text-foreground/80 leading-relaxed">{rec.message}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

          </motion.div>
        )}

        {/* ══════════════════════ DN$ TAB ══════════════════════════════ */}
        {tab === 'dn' && report && (
          <motion.div key="dn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

            <div className="grid grid-cols-2 gap-2.5">
              <StatCard label="مكتسبة/يوم" value={fmt(report.metrics.coinsEarnedPerDay)}
                color="#f59e0b" icon={Coins} trend="up" sub="DN$" />
              <StatCard label="منفقة/يوم" value={fmt(report.metrics.coinsSpentPerDay)}
                color="#ef4444" icon={Coins} trend="down" sub="DN$" />
              <StatCard label="صافي التدفق/يوم" value={fmt(report.metrics.netFlow)}
                color={report.metrics.netFlow >= 0 ? '#22c55e' : '#ef4444'} icon={TrendingUp}
                trend={report.metrics.netFlow > 0 ? 'up' : 'down'} />
              <StatCard label="متوسط/مستخدم" value={fmt(report.metrics.averageCoinsPerUser)}
                color="#3b82f6" icon={Users} />
            </div>

            {/* DN$ per user per day — inflation gauge */}
            <div className="bg-card border border-border rounded-xl p-4">
              <SectionTitle icon={TrendingUp} label="مقياس التضخم" color="#f59e0b" />
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>DN$/مستخدم/يوم</span>
                  <span className="font-black text-lg" style={{ color: inf?.color }}>
                    {fmt(report.coinsPerUserPerDay)}
                  </span>
                </div>
                {/* Visual gauge bar */}
                <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                  {/* Low zone 0-5 */}
                  <div className="absolute inset-y-0 left-0 bg-blue-500/30 rounded-l-full" style={{ width: '33%' }} />
                  {/* Normal zone 5-10 */}
                  <div className="absolute inset-y-0 bg-green-500/30" style={{ left: '33%', width: '33%' }} />
                  {/* High zone 10+ */}
                  <div className="absolute inset-y-0 right-0 bg-red-500/30 rounded-r-full" style={{ width: '34%' }} />
                  {/* Needle */}
                  <motion.div
                    className="absolute top-0 bottom-0 w-1 rounded-full"
                    style={{ background: inf?.color }}
                    initial={{ left: '0%' }}
                    animate={{ left: `${Math.min(Math.max((report.coinsPerUserPerDay / 15) * 100, 1), 97)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                  <span>🔵 منخفض (&lt;5)</span>
                  <span>🟢 طبيعي (5–10)</span>
                  <span>🔴 مرتفع (&gt;10)</span>
                </div>
              </div>
            </div>

            {/* Rarity distribution */}
            <div className="bg-card border border-border rounded-xl p-4">
              <SectionTitle icon={Users} label="توزيع ثروة اللاعبين" color="#a855f7" />
              {(() => {
                const d = report.metrics.rarityDistribution;
                const total = Math.max(d.common + d.uncommon + d.rare + d.legendary, 1);
                return [
                  { label: 'عادي',    value: d.common,    color: '#6b7280' },
                  { label: 'غير عادي', value: d.uncommon,  color: '#3b82f6' },
                  { label: 'نادر',    value: d.rare,      color: '#a855f7' },
                  { label: 'أسطوري',  value: d.legendary, color: '#f59e0b' },
                ].map(row => (
                  <div key={row.label} className="mb-2.5 last:mb-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-bold" style={{ color: row.color }}>
                        {row.value} ({Math.round((row.value / total) * 100)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: row.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(row.value / total) * 100}%` }}
                        transition={{ duration: 0.7 }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>

          </motion.div>
        )}

        {/* ══════════════════════ Pi TAB ═══════════════════════════════ */}
        {tab === 'pi' && report && (
          <motion.div key="pi" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

            {/* Pi flow status */}
            <div
              className="rounded-xl border p-4 flex items-center justify-between"
              style={{
                borderColor: GEMS_FLOW_CONFIG[report.gemsFlow].color + '40',
                background:  GEMS_FLOW_CONFIG[report.gemsFlow].color + '10',
              }}
            >
              <div>
                <div className="font-black text-base" style={{ color: GEMS_FLOW_CONFIG[report.gemsFlow].color }}>
                  π {GEMS_FLOW_CONFIG[report.gemsFlow].label}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">تدفق Pi الحالي</div>
              </div>
              <div className="text-3xl font-black tabular-nums" style={{ color: GEMS_FLOW_CONFIG[report.gemsFlow].color }}>
                {report.metrics.gemsDistributedTotal}
              </div>
            </div>

            {/* Per-league gem distribution */}
            <div className="bg-card border border-border rounded-xl p-4">
              <SectionTitle icon={Gem} label="Pi حسب الدوري" color="#a855f7" />
              {(() => {
                const g = report.metrics.gemsPerLeague;
                const total = Math.max(g.div3 + g.div2 + g.pro + g.champions, 1);
                const leagues = [
                  { label: 'Division III',  value: g.div3,      color: '#6b7280', emoji: '⚙️' },
                  { label: 'Division II',   value: g.div2,      color: '#3b82f6', emoji: '🥈' },
                  { label: 'Professional',  value: g.pro,       color: '#a855f7', emoji: '💜' },
                  { label: 'Champions',     value: g.champions, color: '#f59e0b', emoji: '🏆' },
                ];
                return leagues.map((l, i) => (
                  <motion.div key={l.label}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="mb-3 last:mb-0"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span>{l.emoji}</span> {l.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-black tabular-nums" style={{ color: l.color }}>
                          {l.value} لاعب
                        </span>
                        <span className="text-muted-foreground text-[10px]">
                          ({Math.round((l.value / total) * 100)}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: l.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(l.value / total) * 100}%` }}
                        transition={{ duration: 0.7, delay: i * 0.07 }}
                      />
                    </div>
                  </motion.div>
                ));
              })()}
            </div>

            {/* Season gem table info */}
            <div className="bg-card border border-border rounded-xl p-4">
              <SectionTitle icon={Info} label="جدول Pi الموسم" color="#6b7280" />
              {[
                { league: '⚙️ Division III',  rewards: '1st → +1 💎' },
                { league: '🥈 Division II',   rewards: '1st → +2, 2nd → +1 💎' },
                { league: '💜 Professional',  rewards: '1st → +3, 2nd → +2, 3rd → +1 💎' },
                { league: '🏆 Champions',     rewards: '1st → +4, 2nd → +3, 3rd → +2, 4th → +1 💎' },
              ].map(r => (
                <div key={r.league} className="flex items-start justify-between py-2 border-b border-border/40 last:border-0 gap-2">
                  <span className="text-xs font-medium">{r.league}</span>
                  <span className="text-[11px] text-muted-foreground text-right">{r.rewards}</span>
                </div>
              ))}
            </div>

          </motion.div>
        )}

        {/* ══════════════════════ WEEKLY TAB ═══════════════════════════ */}
        {tab === 'weekly' && weekly && (
          <motion.div key="weekly" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

            {/* Trend banner */}
            {(() => {
              const t = TREND_CONFIG[weekly.trend];
              return (
                <div
                  className="rounded-xl border px-4 py-3.5 flex items-center justify-between"
                  style={{ borderColor: t.color + '40', background: t.color + '12' }}
                >
                  <div>
                    <div className="font-black text-base" style={{ color: t.color }}>{t.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">اتجاه الاقتصاد الأسبوعي</div>
                  </div>
                  {weekly.changePercent !== null && (
                    <div className="text-right">
                      <div className="text-2xl font-black tabular-nums" style={{ color: t.color }}>
                        {weekly.changePercent > 0 ? '+' : ''}{fmt(weekly.changePercent)}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">مقارنة بالأسبوع السابق</div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Side-by-side week comparison */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
                <div className="px-4 py-3 text-center">
                  <div className="text-[10px] text-muted-foreground">الأسبوع الحالي</div>
                  <div className="text-xs font-bold mt-0.5">
                    {dateLabel(weekly.currentWeek.weekStart)} – {dateLabel(weekly.currentWeek.weekEnd)}
                  </div>
                </div>
                <div className="px-4 py-3 text-center">
                  <div className="text-[10px] text-muted-foreground">الأسبوع السابق</div>
                  <div className="text-xs font-bold mt-0.5">
                    {weekly.previousWeek
                      ? `${dateLabel(weekly.previousWeek.weekStart)} – ${dateLabel(weekly.previousWeek.weekEnd)}`
                      : '—'
                    }
                  </div>
                </div>
              </div>

              {[
                { label: 'DN$ مكتسبة', cur: weekly.currentWeek.coinsEarned,       prev: weekly.previousWeek?.coinsEarned       ?? null, color: '#f59e0b' },
                { label: 'DN$ منفقة',  cur: weekly.currentWeek.coinsSpent,        prev: weekly.previousWeek?.coinsSpent        ?? null, color: '#ef4444' },
                { label: 'صافي التدفق',  cur: weekly.currentWeek.netFlow,           prev: weekly.previousWeek?.netFlow           ?? null, color: '#22c55e' },
                { label: 'مستخدمون',    cur: weekly.currentWeek.activeUsers,        prev: weekly.previousWeek?.activeUsers       ?? null, color: '#3b82f6' },
                { label: 'DN$/مستخدم/يوم', cur: weekly.currentWeek.coinsPerUserPerDay, prev: weekly.previousWeek?.coinsPerUserPerDay ?? null, color: '#a855f7' },
              ].map(row => (
                <div key={row.label} className="grid grid-cols-2 divide-x divide-border border-b border-border/50 last:border-0">
                  <div className="px-4 py-3 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground">{row.label}</span>
                    <span className="font-black tabular-nums text-sm" style={{ color: row.color }}>
                      {fmt(row.cur)}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-end gap-2">
                    {row.prev !== null ? (
                      <>
                        <span className="font-bold tabular-nums text-sm text-muted-foreground">
                          {fmt(row.prev)}
                        </span>
                        {row.cur > row.prev
                          ? <ArrowUpRight size={12} className="text-green-400" />
                          : row.cur < row.prev
                          ? <ArrowDownRight size={12} className="text-red-400" />
                          : <Minus size={12} className="text-muted-foreground" />
                        }
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </motion.div>
        )}

        {/* ══════════════════════ SCALING TAB ══════════════════════════ */}
        {tab === 'scaling' && scaling && (
          <motion.div key="scaling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

            {/* Current scaling factor */}
            <div
              className="rounded-xl border px-4 py-4 text-center"
              style={{
                borderColor: (inf?.color ?? '#6b7280') + '40',
                background:  (inf?.color ?? '#6b7280') + '10',
              }}
            >
              <div className="text-[10px] text-muted-foreground mb-1">معامل التعديل الحالي</div>
              <div className="text-5xl font-black tabular-nums" style={{ color: inf?.color }}>
                ×{scaling.scalingFactor.toFixed(3)}
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">
                حالة الاقتصاد: <span className="font-bold" style={{ color: inf?.color }}>{inf?.label}</span>
              </div>
            </div>

            {/* Scaling guide */}
            <div className="bg-card border border-border rounded-xl p-4">
              <SectionTitle icon={Zap} label="دليل معاملات التعديل" color="#f59e0b" />
              {[
                { level: 'HIGH 🔴',   factor: '×0.70', desc: 'تقليل 30% (تضخم مرتفع)', color: '#ef4444' },
                { level: 'NORMAL 🟢', factor: '×1.00', desc: 'لا تغيير (متوازن)',        color: '#22c55e' },
                { level: 'LOW 🔵',   factor: '×1.125', desc: 'زيادة 12.5% (منخفض)',     color: '#3b82f6' },
              ].map(r => (
                <div key={r.level} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                  <div>
                    <div className="text-xs font-bold" style={{ color: r.color }}>{r.level}</div>
                    <div className="text-[10px] text-muted-foreground">{r.desc}</div>
                  </div>
                  <div className="text-base font-black tabular-nums" style={{ color: r.color }}>{r.factor}</div>
                </div>
              ))}
            </div>

            {/* Live scaling preview */}
            <div className="bg-card border border-border rounded-xl p-4">
              <SectionTitle icon={ChevronRight} label="معاينة التعديل الحالي" color="#3b82f6" />
              <div className="space-y-3">
                {scaling.preview.map((p, i) => (
                  <motion.div key={p.type}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium leading-tight">{p.label}</div>
                      {p.exempt && (
                        <div className="text-[10px] text-green-400 mt-0.5">✓ معفى من التعديل</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-xs text-muted-foreground tabular-nums">{p.base}</div>
                      <ChevronRight size={10} className="text-muted-foreground" />
                      <div
                        className="text-sm font-black tabular-nums"
                        style={{
                          color: p.exempt ? '#22c55e' :
                            p.scaled > p.base ? '#22c55e' :
                            p.scaled < p.base ? '#ef4444' : '#f59e0b',
                        }}
                      >
                        {p.scaled}
                      </div>
                      <div className="text-[10px] text-muted-foreground w-10 text-right">
                        ×{p.factor.toFixed(2)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Note */}
              <div className="mt-4 bg-muted/50 rounded-lg px-3 py-2.5 flex items-start gap-2">
                <Info size={12} className="text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  هذا نظام طبقة مراقبة فقط — لا يُعدّل أي منطق أساسي في اللعبة.
                  مكافأة تسجيل الدخول معفاة دائمًا من التعديل.
                </p>
              </div>
            </div>

            {/* All recommendations */}
            {report && (
              <div className="bg-card border border-border rounded-xl p-4">
                <SectionTitle icon={AlertTriangle} label="جميع التوصيات" color="#f59e0b" />
                <div className="space-y-2.5">
                  {report.recommendations.map((rec, i) => {
                    const p = PRIORITY_CONFIG[rec.priority];
                    return (
                      <motion.div key={i}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-lg border px-3 py-2.5 flex items-start gap-2"
                        style={{ borderColor: p.color + '30', background: p.bg }}
                      >
                        <div
                          className="text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                          style={{ background: p.color + '30', color: p.color }}
                        >
                          {p.label}
                        </div>
                        <div className="text-xs text-foreground/80 leading-relaxed">{rec.message}</div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

          </motion.div>
        )}

        {/* Empty state */}
        {!loading && !report && (
          <div className="text-center py-16 text-muted-foreground">
            <CheckCircle size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">تعذّر تحميل بيانات الاقتصاد</p>
            <button
              onClick={loadReport}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
