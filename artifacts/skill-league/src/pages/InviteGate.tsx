import { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Loader2, CheckCircle, XCircle, Users, Zap } from 'lucide-react';
import { tryBuiltinCode, setBetaAccess, BETA_VERSION } from '@/lib/betaSystem';
import { api } from '@/lib/apiClient';
import { Logo } from '@/components/Logo';

interface Props {
  onGranted: () => void;
}

export default function InviteGate({ onGranted }: Props) {
  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || loading) return;
    setLoading(true);
    setError(null);

    const upper = code.trim().toUpperCase();

    const builtin = tryBuiltinCode(upper);
    if (builtin) {
      setSuccess(true);
      setTimeout(onGranted, 1000);
      setLoading(false);
      return;
    }

    try {
      const res = await api.betaFeedback.submit({ action: 'validate_invite', code: upper }) as any;
      if (res.valid) {
        setBetaAccess({ granted: true, inviteCode: upper, grantedAt: Date.now(), tier: res.tier ?? 'early_access' });
        setSuccess(true);
        setTimeout(onGranted, 1000);
      } else {
        setError(res.error === 'code_exhausted' ? 'هذا الرمز تجاوز الحد الأقصى من الاستخدامات' : 'رمز غير صالح. تحقق من الرمز وحاول مجددًا.');
      }
    } catch {
      setError('رمز غير صالح. تحقق من الرمز وحاول مجددًا.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto overflow-hidden border border-purple-500/30">
            <Logo size={80} rounded="rounded-3xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">SkillLeague</h1>
            <p className="text-muted-foreground text-sm mt-1">الإصدار التجريبي Beta v{BETA_VERSION}</p>
          </div>
        </div>

        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
            <Users size={14} />
            <span>وصول محدود — دعوة فقط</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            SkillLeague في مرحلة البيتا. للوصول تحتاج رمز دعوة من الفريق أو أحد المختبرين.
          </p>
        </div>

        {success ? (
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}
            className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle size={48} className="text-green-400" />
            <p className="font-bold text-green-400">مرحبًا بك في Beta! 🎉</p>
            <p className="text-sm text-muted-foreground">جاري فتح اللعبة…</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">رمز الدعوة</label>
              <div className="relative">
                <Key size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={code}
                  onChange={e => { setCode(e.target.value.toUpperCase()); setError(null); }}
                  placeholder="أدخل رمز الدعوة"
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 pr-10 font-mono uppercase tracking-widest text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  maxLength={12}
                  autoComplete="off"
                  spellCheck={false}
                  dir="ltr"
                />
              </div>
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 px-3 py-2 rounded-lg">
                  <XCircle size={13} />{error}
                </motion.div>
              )}
            </div>
            <button type="submit" disabled={loading || !code.trim()}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={16} />}
              {loading ? 'جاري التحقق…' : 'دخول Beta'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground">
          لا يوجد رمز دعوة؟{' '}
          <a href="https://t.me/skillleague" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">
            انضم للقائمة الانتظار
          </a>
        </p>
      </motion.div>
    </div>
  );
}
