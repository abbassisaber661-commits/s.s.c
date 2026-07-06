import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Activity, AlertTriangle, CheckCircle, Clock, Cpu, Users,
  Swords, Zap, TrendingUp, Shield, Bot, Coins, RefreshCw, Wifi, WifiOff,
  Bell, BellOff, BarChart3, Package,
} from 'lucide-react';
import { api } from '@/lib/apiClient';
import { isRTL } from '@/lib/i18n';
import { useGame } from '@/contexts/GameContext';

interface LiveData {
  server: {
    uptime: string; uptimeSeconds: number; avgResponseTime: number;
    p95ResponseTime: number; totalRequests: number; errorRequests: number;
    errorRate: number; activeSessions: number; memoryMB: number; memoryTotal: number;
  };
  stats: { newPlayers1h: number; activePlayers24h: number; matches1h: number; events1h: number; coinTxns1h: number };
  recentErrors: Array<{ time: number; message: string; count: number; timeAgo: string }>;
  health: { status: 'healthy' | 'degraded' | 'critical'; alerts: Array<{ level: string; msg: string }> };
}
interface FeatureRow { event: string; uses: number; unique_users: number }
interface BotRow    { id: string; username: string; matches_played: number; matches_won: number; flag_type?: string; severity?: string; created_at: string }
interface EconData  { hourly: Array<{ hour: string; type: string; total_amount: number; tx_count: number }>; topBalances: Array<{ username: string; dnBalance?: number; level: number; elo: number }> }

const STATUS_COLOR = { healthy: '#22c55e', degraded: '#f59e0b', critical: '#ef4444' };
const STATUS_LABEL = { healthy: '✅ سليم', degraded: '⚠️ متدهور', critical: '🔴 حرج' };
const ALERT_COLOR  = { critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };

function Chip({ label, value, color, icon: Icon }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-3 flex items-start gap-2.5">
      <div className="p-1.5 rounded-lg shrink-0" style={{ background: color + '22' }}>
        <Icon size={14} style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
        <div className="text-lg font-black tabular-nums leading-tight mt-0.5">{value}</div>
      </div>
    </motion.div>
  );
}

type Tab = 'live' | 'features' | 'bots' | 'economy';

export default function MonitorDashboard() {
  const { language } = useGame();
  const rtl = isRTL(language);

  const [tab, setTab]             = useState<Tab>('live');
  const [live, setLive]           = useState<LiveData | null>(null);
  const [features, setFeatures]   = useState<FeatureRow[]>([]);
  const [bots, setBots]           = useState<BotRow[]>([]);
  const [econ, setEcon]           = useState<EconData | null>(null);
  const [loading, setLoading]     = useState(false);
  const [autoRefresh, setAuto]    = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const apiFetch = (path: string) =>
    fetch((import.meta.env.BASE_URL?.replace(/\/$/, '') || '') + '/api' + path, {
      headers: { Authorization: `Bearer ${localStorage.getItem('sl_jwt_token') ?? ''}` },
    }).then(r => r.json());

  async function loadLive() {
    setLoading(true);
    try {
      const d = await apiFetch('/monitor/live');
      setLive(d);
      setLastUpdate(new Date());
    } catch {}
    setLoading(false);
  }

  async function loadFeatures() {
    setLoading(true);
    try { setFeatures(await apiFetch('/monitor/features')); } catch {}
    setLoading(false);
  }

  async function loadBots() {
    setLoading(true);
    try { setBots(await apiFetch('/monitor/bots')); } catch {}
    setLoading(false);
  }

  async function loadEcon() {
    setLoading(true);
    try { setEcon(await apiFetch('/monitor/economy')); } catch {}
    setLoading(false);
  }

  useEffect(() => {
    if (tab === 'live') loadLive();
    else if (tab === 'features') loadFeatures();
    else if (tab === 'bots') loadBots();
    else if (tab === 'economy') loadEcon();
  }, [tab]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoRefresh && tab === 'live') {
      timerRef.current = setInterval(loadLive, 15_000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoRefresh, tab]);

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'live',     label: 'مباشر',    icon: Activity   },
    { id: 'features', label: 'الميزات',  icon: BarChart3  },
    { id: 'bots',     label: 'البوتات',  icon: Bot        },
    { id: 'economy',  label: 'الاقتصاد', icon: Coins      },
  ];

  return (
    <div className="min-h-screen pb-24" dir={rtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/beta-dashboard">
          <button className="p-1.5 rounded-lg hover:bg-muted"><ArrowLeft size={18} /></button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base">📡 مراقبة مباشرة</h1>
          {lastUpdate && <p className="text-[10px] text-muted-foreground">آخر تحديث: {lastUpdate.toLocaleTimeString('ar-SA')}</p>}
        </div>
        <button onClick={() => setAuto(a => !a)}
          className={`p-1.5 rounded-lg transition-colors ${autoRefresh ? 'text-green-400 bg-green-400/10' : 'text-muted-foreground hover:bg-muted'}`}>
          {autoRefresh ? <Wifi size={15} /> : <WifiOff size={15} />}
        </button>
        <button onClick={() => tab === 'live' ? loadLive() : tab === 'features' ? loadFeatures() : tab === 'bots' ? loadBots() : loadEcon()}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2 overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}>
            <t.icon size={11} />{t.label}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-4">

        {/* LIVE TAB */}
        {tab === 'live' && (
          <>
            {/* Health banner */}
            {live && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-xl border px-4 py-3 flex items-center justify-between"
                style={{
                  borderColor: STATUS_COLOR[live.health.status] + '40',
                  background: STATUS_COLOR[live.health.status] + '10',
                }}>
                <div>
                  <div className="font-bold text-sm">{STATUS_LABEL[live.health.status]}</div>
                  <div className="text-xs text-muted-foreground">Uptime: {live.server.uptime}</div>
                </div>
                <div className="text-2xl font-black tabular-nums" style={{ color: STATUS_COLOR[live.health.status] }}>
                  {live.server.errorRate.toFixed(1)}%<span className="text-xs font-normal text-muted-foreground ml-1">خطأ</span>
                </div>
              </motion.div>
            )}

            {/* Alerts */}
            <AnimatePresence>
              {live?.health.alerts.map((alert, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  className="rounded-xl border px-4 py-3 flex items-center gap-3 text-sm font-medium"
                  style={{ borderColor: ALERT_COLOR[alert.level as keyof typeof ALERT_COLOR] + '40', background: ALERT_COLOR[alert.level as keyof typeof ALERT_COLOR] + '10', color: ALERT_COLOR[alert.level as keyof typeof ALERT_COLOR] }}>
                  <AlertTriangle size={14} />{alert.msg}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Server metrics */}
            {live && (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <Chip icon={Clock}      label="متوسط وقت الاستجابة" value={`${live.server.avgResponseTime}ms`}         color="#3b82f6" />
                  <Chip icon={Zap}        label="P95 استجابة"          value={`${live.server.p95ResponseTime}ms`}         color="#f59e0b" />
                  <Chip icon={Users}      label="جلسات نشطة"           value={live.server.activeSessions}                  color="#22c55e" />
                  <Chip icon={Cpu}        label="الذاكرة المستخدمة"    value={`${live.server.memoryMB}MB`}                color="#a855f7" />
                  <Chip icon={TrendingUp} label="إجمالي الطلبات"       value={live.server.totalRequests.toLocaleString()} color="#06b6d4" />
                  <Chip icon={AlertTriangle} label="طلبات بخطأ"        value={live.server.errorRequests}                  color="#ef4444" />
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Activity size={14} className="text-green-400" />إحصاءات الساعة الأخيرة</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'لاعبون جدد', value: live.stats.newPlayers1h, color: '#22c55e' },
                      { label: 'نشطون (24h)', value: live.stats.activePlayers24h, color: '#3b82f6' },
                      { label: 'مباريات', value: live.stats.matches1h, color: '#ef4444' },
                      { label: 'معاملات عملات', value: live.stats.coinTxns1h, color: '#f59e0b' },
                    ].map(s => (
                      <div key={s.label} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                        <span className="text-xs text-muted-foreground">{s.label}</span>
                        <span className="font-bold text-sm tabular-nums" style={{ color: s.color }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {live.recentErrors.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-red-400"><AlertTriangle size={14} />أخطاء حديثة</h3>
                    <div className="space-y-2">
                      {live.recentErrors.map((e, i) => (
                        <div key={i} className="bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-mono text-red-400 truncate">{e.message}</div>
                            <div className="text-[10px] text-muted-foreground">{e.timeAgo}</div>
                          </div>
                          <span className="text-xs font-bold text-red-400 shrink-0">×{e.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {live.recentErrors.length === 0 && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 text-center">
                    <CheckCircle size={28} className="text-green-400 mx-auto mb-2" />
                    <p className="text-sm text-green-400 font-bold">لا أخطاء مسجّلة</p>
                  </div>
                )}
              </>
            )}

            {!live && !loading && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <Shield size={36} className="mx-auto mb-3 opacity-30" />
                <p>تحتاج صلاحيات المشرف لرؤية بيانات المراقبة</p>
              </div>
            )}
          </>
        )}

        {/* FEATURES TAB */}
        {tab === 'features' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <BarChart3 size={14} className="text-primary" />
              <span className="font-bold text-sm">أكثر الميزات استخدامًا (7 أيام)</span>
            </div>
            {features.length === 0 && !loading && (
              <div className="p-8 text-center text-muted-foreground text-sm">لا بيانات متاحة</div>
            )}
            <div className="divide-y divide-border/50">
              {features.map((f, i) => {
                const max = features[0]?.uses ?? 1;
                return (
                  <motion.div key={f.event} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs text-primary">{f.event}</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{f.unique_users} مستخدم</span>
                        <span className="font-bold text-foreground">{Number(f.uses).toLocaleString()} مرة</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }} animate={{ width: `${(f.uses / max) * 100}%` }}
                        transition={{ duration: 0.6, delay: i * 0.03 }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* BOTS TAB */}
        {tab === 'bots' && (
          <div className="space-y-3">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-400 flex items-start gap-2">
              <Bot size={14} className="shrink-0 mt-0.5" />
              <span>اللاعبون المشبوهون بناءً على معدل الفوز ونشاط الحسابات وبيانات مكافحة الغش.</span>
            </div>
            {bots.length === 0 && !loading && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-8 text-center">
                <Shield size={32} className="text-green-400 mx-auto mb-2" />
                <p className="text-sm text-green-400 font-bold">لا حسابات مشبوهة مكتشفة</p>
              </div>
            )}
            {bots.map((b, i) => {
              const winRate = b.matches_played > 0 ? Math.round((b.matches_won / b.matches_played) * 100) : 0;
              return (
                <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm">{b.username}</div>
                      <div className="text-xs text-muted-foreground font-mono">{b.id?.slice(0, 16)}</div>
                    </div>
                    {b.flag_type && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: '#ef444420', color: '#ef4444' }}>
                        {b.flag_type}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div>
                      <div className="text-xs text-muted-foreground">مباريات</div>
                      <div className="font-bold text-sm">{b.matches_played}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">معدل الفوز</div>
                      <div className="font-bold text-sm" style={{ color: winRate > 90 ? '#ef4444' : winRate > 70 ? '#f59e0b' : '#22c55e' }}>
                        {winRate}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">عملات</div>
                      <div className="font-bold text-sm text-yellow-400">{(b as any).elo}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ECONOMY TAB */}
        {tab === 'economy' && econ && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Package size={14} className="text-yellow-400" />أعلى الأرصدة</h3>
              <div className="space-y-2">
                {econ.topBalances.map((p, i) => (
                  <div key={p.username} className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0">
                    <span className={`text-xs font-bold w-5 tabular-nums ${i === 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{p.username}</div>
                      <div className="text-xs text-muted-foreground">Lv.{p.level} · ELO {p.elo}</div>
                    </div>
                    <span className="font-black text-yellow-400 tabular-nums">{Number(p.dnBalance ?? 0).toLocaleString()} DN$</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><TrendingUp size={14} className="text-blue-400" />معاملات آخر 24 ساعة</h3>
              {econ.hourly.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">لا معاملات حديثة</p>
              )}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {econ.hourly.map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                    <div>
                      <span className="font-mono text-muted-foreground">{h.hour?.slice(11, 16)}</span>
                      <span className="mx-2 text-primary font-medium">{h.type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">×{h.tx_count}</span>
                      <span className="font-bold text-yellow-400">{Number(h.total_amount).toLocaleString()} 🪙</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
