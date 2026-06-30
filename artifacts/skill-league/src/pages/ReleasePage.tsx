import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  ArrowLeft, CheckCircle, Clock, Rocket, Globe, Smartphone, Pi,
  Shield, BarChart3, Coins, Trophy, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { isRTL } from '@/lib/i18n';
import { useGame } from '@/contexts/GameContext';

interface ReleaseStatus {
  version: string; date: string; readiness: number;
  checklist: Array<{ id: string; label: string; status: string; note: string }>;
  summary: { totalPlayers: number; matchesLast7d: number; featuresReady: number; featuresPending: number; overallStatus: string };
  deploymentTargets: Array<{ id: string; label: string; status: string; url: string }>;
  removedFeatures: string[];
}

const DEPLOY_ICONS: Record<string, any> = { web: Globe, mobile: Smartphone, pi: Pi };
const DEPLOY_COLORS: Record<string, string> = { live: '#22c55e', ready: '#3b82f6', pending: '#f59e0b' };
const DEPLOY_LABELS: Record<string, string> = { live: 'مباشر', ready: 'جاهز', pending: 'قيد الانتظار' };

export default function ReleasePage() {
  const { language } = useGame();
  const rtl = isRTL(language);

  const [data, setData]     = useState<ReleaseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinged, setPinged]   = useState(false);
  const [pingOk, setPingOk]   = useState<boolean | null>(null);

  const BASE = (import.meta.env.BASE_URL?.replace(/\/$/, '') || '') + '/api';

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/release/status`).then(r => r.json());
      setData(r);
    } catch {}
    setLoading(false);
  }

  async function ping() {
    setPinged(false);
    try {
      const r = await fetch(`${BASE}/release/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'web', version: data?.version }),
      }).then(r => r.json());
      setPingOk(r.ok);
    } catch { setPingOk(false); }
    setPinged(true);
  }

  useEffect(() => { load(); }, []);

  const STATUS_COLORS: Record<string, string> = { ready: '#22c55e', almost_ready: '#f59e0b', in_progress: '#3b82f6' };
  const STATUS_LABELS: Record<string, string> = { ready: '🚀 جاهز للإطلاق', almost_ready: '⚡ قريبًا', in_progress: '🔧 جارٍ العمل' };

  return (
    <div className="min-h-screen pb-24" dir={rtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button className="p-1.5 rounded-lg hover:bg-muted" onClick={() => window.history.back()}><ArrowLeft size={18} /></button>
        <div className="flex-1">
          <h1 className="font-bold text-base flex items-center gap-2"><Rocket size={16} className="text-primary" />نسخة الإصدار (RC)</h1>
          {data && <p className="text-[10px] text-muted-foreground">v{data.version} · {data.date}</p>}
        </div>
        <button onClick={load} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {data && (
        <div className="px-4 pt-4 space-y-5">

          {/* Readiness */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border p-5 text-center"
            style={{ borderColor: STATUS_COLORS[data.summary.overallStatus] + '40', background: STATUS_COLORS[data.summary.overallStatus] + '08' }}>
            <div className="text-lg font-black mb-1" style={{ color: STATUS_COLORS[data.summary.overallStatus] }}>
              {STATUS_LABELS[data.summary.overallStatus]}
            </div>
            <div className="text-5xl font-black tabular-nums my-3">{data.readiness}%</div>
            <div className="text-xs text-muted-foreground mb-3">جاهزية الإطلاق</div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full"
                initial={{ width: 0 }} animate={{ width: `${data.readiness}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                style={{ background: `linear-gradient(90deg, ${STATUS_COLORS[data.summary.overallStatus]}, ${STATUS_COLORS[data.summary.overallStatus]}88)` }} />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
              <span>{data.summary.featuresReady} ميزة جاهزة</span>
              <span>{data.summary.featuresPending} قيد الانتظار</span>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Trophy, label: 'إجمالي اللاعبين', value: data.summary.totalPlayers.toLocaleString(), color: '#a855f7' },
              { icon: BarChart3, label: 'مباريات (7 أيام)', value: data.summary.matchesLast7d.toLocaleString(), color: '#3b82f6' },
            ].map(s => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: s.color + '20' }}>
                  <s.icon size={16} style={{ color: s.color }} />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  <div className="text-xl font-black">{s.value}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Deployment Targets */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border font-bold text-sm flex items-center gap-2">
              <Globe size={14} className="text-primary" />منصات النشر
            </div>
            {data.deploymentTargets.map((t, i) => {
              const Icon = DEPLOY_ICONS[t.id] ?? Globe;
              const color = DEPLOY_COLORS[t.status];
              return (
                <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 }}
                  className="px-4 py-3.5 border-b border-border/50 last:border-0 flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: color + '20' }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{t.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.url}</div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: color + '20', color }}>
                    {DEPLOY_LABELS[t.status]}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Ping test */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Shield size={14} className="text-green-400" />اختبار الاتصال بالخادم</h3>
            <button onClick={ping}
              className="w-full py-2.5 rounded-xl font-bold text-sm bg-primary/20 text-primary hover:bg-primary/30 transition-colors flex items-center justify-center gap-2">
              <Rocket size={14} />تشغيل اختبار Ping
            </button>
            {pinged && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={`mt-3 rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2 ${
                  pingOk ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                {pingOk ? <><CheckCircle size={14} />الخادم يعمل بشكل طبيعي ✅</> : <><AlertTriangle size={14} />فشل الاتصال بالخادم</>}
              </motion.div>
            )}
          </div>

          {/* Checklist */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border font-bold text-sm flex items-center gap-2">
              <CheckCircle size={14} className="text-green-400" />قائمة جاهزية الإطلاق
            </div>
            <div className="divide-y divide-border/50">
              {data.checklist.map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="px-4 py-3 flex items-center gap-3">
                  {item.status === 'done'
                    ? <CheckCircle size={16} className="text-green-400 shrink-0" />
                    : <Clock size={16} className="text-amber-400 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-[10px] text-muted-foreground">{item.note}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.status === 'done'
                      ? 'bg-green-500/15 text-green-400'
                      : 'bg-amber-500/15 text-amber-400'
                  }`}>
                    {item.status === 'done' ? 'جاهز' : 'معلّق'}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Removed features */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-muted-foreground">
              <AlertTriangle size={13} />ميزات تمت إزالتها للنسخة النهائية
            </h3>
            <ul className="space-y-1.5">
              {data.removedFeatures.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Final launch banner */}
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
            className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-purple-500/5 p-6 text-center">
            <div className="text-4xl mb-2">🚀</div>
            <div className="font-black text-lg">SkillLeague {data.version}</div>
            <div className="text-xs text-muted-foreground mt-1">نسخة مرشحة للإصدار النهائي</div>
            <div className="mt-3 text-xs text-primary font-medium">
              {data.readiness}% جاهز · {data.summary.featuresReady} ميزة مكتملة
            </div>
          </motion.div>

        </div>
      )}
    </div>
  );
}
