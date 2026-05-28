import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";

type Step = 'welcome' | 'google-form' | 'verify-email';

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function AuthScreen() {
  const { loginWithGoogle, loginWithPiNetwork, loginAsGuest } = useGame();
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  const handleGoogle = async () => {
    setError('');
    if (!name.trim()) { setError('يرجى إدخال اسمك'); return; }
    if (!email.trim() || !email.includes('@')) { setError('يرجى إدخال بريد إلكتروني صحيح'); return; }
    const code = generateCode();
    setSentCode(code);
    setCodeSent(true);
    setStep('verify-email');
  };

  const handleVerifyCode = async () => {
    setError('');
    if (codeInput.trim() !== sentCode) {
      setError('الرمز غير صحيح، يرجى المحاولة مرة أخرى');
      return;
    }
    setLoading('google');
    await loginWithGoogle(name.trim(), email.trim());
    setLoading(null);
  };

  const handleResendCode = () => {
    const code = generateCode();
    setSentCode(code);
    setCodeInput('');
    setError('');
  };

  const handlePi = async () => {
    setLoading('pi');
    await loginWithPiNetwork();
    setLoading(null);
  };

  const handleGuest = () => {
    loginAsGuest();
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}
      dir="rtl"
    >
      {/* Background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 6 + 2,
              height: Math.random() * 6 + 2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: i % 3 === 0 ? '#a78bfa' : i % 3 === 1 ? '#60a5fa' : '#f472b6',
              opacity: 0.4,
            }}
            animate={{ y: [0, -30, 0], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 3 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 3 }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm px-6 flex flex-col items-center gap-6"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="flex flex-col items-center gap-3"
            >
              <div
                className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  boxShadow: '0 0 40px rgba(124,58,237,0.5)',
                }}
              >
                🏆
              </div>
              <div className="text-center">
                <h1 className="text-4xl font-black text-white tracking-tight">SkillLeague</h1>
                <p className="text-purple-300 text-sm font-medium mt-1">بطل المهارات</p>
              </div>
            </motion.div>

            {/* Tagline */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <p className="text-white/70 text-base leading-relaxed">
                تنافس، تطور، واثبت مهاراتك
                <br />
                في أكبر منصة ألعاب مهارات
              </p>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex gap-6 text-center"
            >
              {[
                { value: '10K+', label: 'لاعب' },
                { value: '50+', label: 'بطولة' },
                { value: '∞', label: 'تحدي' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-2xl font-black text-purple-300">{s.value}</p>
                  <p className="text-white/50 text-xs">{s.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Login buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full flex flex-col gap-3"
            >
              {/* Google */}
              <button
                onClick={() => setStep('google-form')}
                className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-bold text-base transition-all active:scale-95"
                style={{ background: 'white', color: '#1f1f1f', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>تسجيل الدخول بـ Google</span>
              </button>

              {/* Pi Network */}
              <button
                onClick={handlePi}
                disabled={loading === 'pi'}
                className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-bold text-base transition-all active:scale-95 disabled:opacity-70"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  color: 'white',
                  boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
                }}
              >
                {loading === 'pi' ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white"
                  />
                ) : (
                  <>
                    <span className="text-2xl">π</span>
                    <span>تسجيل الدخول بـ Pi Network</span>
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/20" />
                <span className="text-white/40 text-xs">أو</span>
                <div className="flex-1 h-px bg-white/20" />
              </div>

              {/* Guest */}
              <button
                onClick={handleGuest}
                className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-medium text-sm transition-all active:scale-95"
                style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }}
              >
                <span>👤</span>
                <span>الدخول كضيف (بدون حفظ)</span>
              </button>
            </motion.div>

            {/* Guest disclaimer */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-white/30 text-xs text-center"
            >
              وضع الضيف لا يحفظ التقدم ولا يتيح المشاركة في البطولات
            </motion.p>
          </motion.div>
        )}

        {step === 'google-form' && (
          <motion.div
            key="google-form"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm px-6 flex flex-col gap-5"
          >
            {/* Back */}
            <button
              onClick={() => { setStep('welcome'); setError(''); }}
              className="self-start flex items-center gap-2 text-white/60 text-sm active:scale-95 transition-transform"
            >
              <span>→</span>
              <span>رجوع</span>
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg">
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-white font-bold text-xl">Google</h2>
                <p className="text-white/50 text-sm">أنشئ حسابك بحساب Google</p>
              </div>
            </div>

            {/* Form */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-white/70 text-sm font-medium">الاسم</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="اكتب اسمك هنا"
                  maxLength={20}
                  className="w-full h-12 px-4 rounded-2xl text-white text-right outline-none font-medium"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-white/70 text-sm font-medium">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  dir="ltr"
                  className="w-full h-12 px-4 rounded-2xl text-white text-left outline-none font-medium"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-sm text-center"
                >
                  {error}
                </motion.p>
              )}

              <button
                onClick={handleGoogle}
                disabled={loading === 'google'}
                className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-base transition-all active:scale-95 disabled:opacity-70 mt-2"
                style={{ background: 'white', color: '#1f1f1f' }}
              >
                {loading === 'google' ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-6 h-6 rounded-full border-2 border-gray-300 border-t-gray-700"
                  />
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>دخول بـ Google</span>
                  </>
                )}
              </button>
            </div>

            {/* Privacy note */}
            <p className="text-white/30 text-xs text-center">
              بياناتك محفوظة محلياً فقط ولن تُشارك مع أي جهة خارجية
            </p>
          </motion.div>
        )}

        {step === 'verify-email' && (
          <motion.div
            key="verify-email"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm px-6 flex flex-col gap-5"
          >
            <button
              onClick={() => { setStep('google-form'); setError(''); setCodeInput(''); }}
              className="self-start flex items-center gap-2 text-white/60 text-sm active:scale-95 transition-transform"
            >
              <span>→</span>
              <span>رجوع</span>
            </button>

            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-3xl bg-green-500/20 flex items-center justify-center text-4xl">
                📧
              </div>
              <h2 className="text-white font-bold text-xl">تحقق من بريدك</h2>
              <p className="text-white/60 text-sm leading-relaxed">
                تم إرسال رمز التحقق إلى
                <br />
                <span className="text-white/80 font-medium" dir="ltr">{email}</span>
              </p>
            </div>

            {/* Demo mode - show code */}
            <div className="rounded-2xl p-4 text-center"
              style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}>
              <p className="text-yellow-400/70 text-xs mb-1">وضع تجريبي — الرمز الخاص بك:</p>
              <p className="text-yellow-300 text-3xl font-black tracking-[0.3em]" dir="ltr">{sentCode}</p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-white/70 text-sm font-medium">أدخل رمز التحقق (6 أرقام)</label>
                <input
                  type="text"
                  value={codeInput}
                  onChange={e => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="_ _ _ _ _ _"
                  dir="ltr"
                  maxLength={6}
                  className="w-full h-14 px-4 rounded-2xl text-white text-center outline-none font-black text-2xl tracking-[0.3em]"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-sm text-center"
                >
                  {error}
                </motion.p>
              )}

              <button
                onClick={handleVerifyCode}
                disabled={loading === 'google' || codeInput.length < 6}
                className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-base transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white' }}
              >
                {loading === 'google' ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white"
                  />
                ) : (
                  <><span>✓</span><span>تأكيد الرمز والدخول</span></>
                )}
              </button>

              <button
                onClick={handleResendCode}
                className="text-white/40 text-sm text-center hover:text-white/70 transition-colors"
              >
                لم تصلك الرسالة؟ إعادة إرسال الرمز
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
