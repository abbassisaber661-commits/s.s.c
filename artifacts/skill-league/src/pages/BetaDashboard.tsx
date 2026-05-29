import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Shield, Users, AlertTriangle, Clock, Wifi, WifiOff,
  BarChart3, Bug, CheckCircle, XCircle, RefreshCw, Pi, Activity,
  Key, Copy, Plus, Trash2, TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGame } from '@/contexts/GameContext';
import { api } from '@/lib/apiClient';
import { isOfflineMode } from '@/lib/syncService';
import { BETA_VERSION, getBetaAccess, getBetaTierLabel } from '@/lib/betaSystem';
import { getTotalPlaytimeFormatted } from '@/lib/sessionTracker';
import { isRTL } from '@/lib/i18n';

interface BetaStats {
  betaVersion: string;
  totalPlayers: number;
  newPlayersToday: number;
  activeToday: number;
  openFlags: number;
  piPaymentsCount: number;
  piPaymentsTotal: number;
  auditEvents24h: number;
  feedbackLast7d: number;
  waitlistCount: number;
  inviteCodes: Array<{ code: string; tier: string; uses: number; maxUses: number; active: boolean }>;
}

interface SuspiciousItem {
  id: number;
  player_id: string;
  username?: string;
  type: string;
  severity: string;
  created_at: string;
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4 flex items-start gap-3"
    >
      <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}22` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold tabular-nums">{typeof value === 'number' ? value.toLocaleString('ar-SA') : value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </motion.div>
  );
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#6b7280',
};

export default function BetaDashboard() {
  const { language, authUser } = useGame();
  const rtl     = isRTL(language);
  const access  = getBetaAccess();
  const offline = isOfflineMode();
  const playtime = getTotalPlaytimeFormatted();

  const [stats,     setStats]     = useState<BetaStats | null>(null);
  const [flags,     setFlags]     = useState<SuspiciousItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [tab,       setTab]       = useState<'overview' | 'security' | 'invites' | 'my'>('overview');
  const [copied,    setCopied]    = useState<string | null>(null);
  const [newCode,   setNewCode]   = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [s, f] = await Promise.all([
        api.admin.stats().catch(() => null),
        api.admin.suspicious().catch(() => []),
      ]);
      if (s) setStats(s as BetaStats);
      setFlags(f as SuspiciousItem[]);
    } catch (e: any) {
      setError('تعذّر تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  }

  async function generateCode() {
    try {
      const res = await api.admin.stats();
      setNewCode('BETA' + Math.random().toString(36).slice(2, 8).toUpperCase());
      await loadData();
    } catch {}
  }

  const isAdmin = (authUser as any)?.role === 'admin' || access.tier === 'team';

  const TABS = [
    { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
    { id: 'security', label: 'الأمان', icon: Shield },
    { id: 'invites',  label: 'الدعوات', icon: Key },
    { id: 'my',       label: 'جلستي', icon: Activity },
  ] as const;

  return (
    <div className="min-h-screen pb-24" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/"><button className="p-1.5 rounded-lg hover:bg-muted"><ArrowLeft size={18} /></button></Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base leading-tight">لوحة Beta Dashboard</h1>
          <p className="text-xs text-muted-foreground">v{BETA_VERSION} · {getBetaTierLabel(access.tier)}</p>
        </div>
        <div className="flex items-center gap-2">
          {offline
            ? <span className="flex items-center gap-1 text-xs text-amber-400"><WifiOff size={12} />غير متصل</span>
            : <span className="flex items-center gap-1 text-xs text-green-400"><Wifi size={12} />متصل</span>
          }
          <button onClick={loadData} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      <div className="flex gap-1 px-4 py-2 overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}>
            <t.icon size={12} />{t.label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-2 space-y-4">

        {tab === 'overview' && (
          <>
            {loading && <div className="text-center py-10 text-muted-foreground text-sm">جاري التحميل…</div>}
            {error && !loading && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-sm text-destructive text-center">
                {error}<br />
                <button onClick={loadData} className="mt-2 text-xs underline">إعادة المحاولة</button>
              </div>
            )}
            {stats && (
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={Users}       label="إجمالي اللاعبين"  value={stats.totalPlayers}    color="#a855f7" />
                <StatCard icon={TrendingUp}  label="جدد اليوم"        value={stats.newPlayersToday} color="#22c55e" />
                <StatCard icon={Activity}    label="نشطون اليوم"      value={stats.activeToday}     color="#3b82f6" />
                <StatCard icon={AlertTriangle} label="تنبيهات أمان"  value={stats.openFlags}       color="#f97316" sub={stats.openFlags > 0 ? 'تحتاج مراجعة' : 'لا مشاكل'} />
                <StatCard icon={Pi}          label="مدفوعات Pi"       value={stats.piPaymentsCount} color="#7c3aed" sub={`${stats.piPaymentsTotal.toFixed(2)} π`} />
                <StatCard icon={Bug}         label="تقارير البيتا"   value={stats.feedbackLast7d}  color="#ec4899" sub="آخر 7 أيام" />
              </div>
            )}
            {!stats && !loading && !error && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Shield size={40} className="mx-auto mb-3 opacity-30" />
                <p>البيانات غير متاحة للحساب الحالي</p>
                <p className="text-xs mt-1 opacity-60">تحتاج إلى صلاحيات المشرف لرؤية الإحصاءات</p>
              </div>
            )}
          </>
        )}

        {tab === 'security' && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground px-1">النشاط المشبوه المفتوح</h3>
            {flags.length === 0 && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center">
                <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
                <p className="text-sm text-green-400">لا يوجد نشاط مشبوه مفتوح</p>
              </div>
            )}
            {flags.map((f, i) => (
              <motion.div key={f.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{f.type}</span>
                      <span className="text-xs font-medium" style={{ color: SEVERITY_COLOR[f.severity] ?? '#6b7280' }}>
                        {f.severity}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {f.username ? `@${f.username}` : f.player_id?.slice(0, 12) ?? 'مجهول'}
                      {' · '}{new Date(f.created_at).toLocaleString('ar-SA')}
                    </p>
                  </div>
                  <AlertTriangle size={14} className="shrink-0 mt-1" style={{ color: SEVERITY_COLOR[f.severity] ?? '#6b7280' }} />
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {tab === 'invites' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground">رموز الدعوة</h3>
              {isAdmin && (
                <button onClick={generateCode}
                  className="flex items-center gap-1 text-xs bg-primary/20 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/30 transition-colors">
                  <Plus size={12} />إنشاء رمز
                </button>
              )}
            </div>
            {newCode && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">رمز جديد</p>
                <p className="font-mono font-bold text-green-400 text-lg">{newCode}</p>
              </div>
            )}
            {(stats?.inviteCodes ?? []).map((c, i) => (
              <motion.div key={c.code} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                className={`bg-card border rounded-xl p-3 flex items-center gap-3 ${!c.active ? 'opacity-50' : 'border-border'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-purple-400">{c.code}</span>
                    {!c.active && <span className="text-xs text-red-400">معطّل</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {c.tier} · استُخدم {c.uses}/{c.maxUses}
                  </div>
                  <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full transition-all"
                      style={{ width: `${Math.min((c.uses / c.maxUses) * 100, 100)}%` }} />
                  </div>
                </div>
                <button onClick={() => copyCode(c.code)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                  {copied === c.code ? <CheckCircle size={15} className="text-green-400" /> : <Copy size={15} />}
                </button>
              </motion.div>
            ))}
            {(!stats?.inviteCodes || stats.inviteCodes.length === 0) && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Key size={32} className="mx-auto mb-2 opacity-30" />
                <p>لا توجد رموز دعوة (تحتاج صلاحيات المشرف)</p>
              </div>
            )}
          </div>
        )}

        {tab === 'my' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground px-1">إحصاءات جلستك</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Clock}    label="إجمالي وقت اللعب" value={playtime}           color="#a855f7" />
              <StatCard icon={Wifi}     label="حالة الاتصال"     value={offline ? 'غير متصل' : 'متصل'} color={offline ? '#f59e0b' : '#22c55e'} />
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h4 className="font-semibold text-sm">معلومات البيتا</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">الإصدار</span><span className="font-mono text-purple-400">v{BETA_VERSION}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">مستوى الوصول</span><span>{getBetaTierLabel(access.tier)}</span></div>
                {access.inviteCode && <div className="flex justify-between"><span className="text-muted-foreground">رمز الدعوة</span><span className="font-mono text-xs">{access.inviteCode}</span></div>}
                {access.grantedAt && <div className="flex justify-between"><span className="text-muted-foreground">تاريخ الانضمام</span><span className="text-xs">{new Date(access.grantedAt).toLocaleDateString('ar-SA')}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">المستخدم</span><span className="font-mono text-xs truncate max-w-32">{authUser?.uid?.slice(0, 16) ?? '—'}</span></div>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <h4 className="font-semibold text-sm text-amber-400 mb-2">⚠️ تنبيه البيتا</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                هذه نسخة تجريبية. قد تُفقد البيانات، وقد تتوقف الميزات. نقدّر ملاحظاتك لتحسين التطبيق قبل الإطلاق الرسمي.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
