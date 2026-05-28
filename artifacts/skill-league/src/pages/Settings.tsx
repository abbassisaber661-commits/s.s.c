import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link } from "wouter";
import { ArrowLeft, Settings2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { LANGUAGES, type Language } from "@/lib/i18n";
import { getVerificationStatus } from "@/lib/verified";
import { validateUsername } from "@/lib/anti-cheat";

export default function Settings() {
  const {
    username, language, setLanguage, updateUsername,
    notifPushMatch, notifPushCommunity, notifPushTrophy,
    soundEnabled, vibrationEnabled,
    verificationLevel, user,
    toggleNotif, toggleSound, toggleVibration,
  } = useGame();

  const [draft, setDraft]         = useState(username);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saved, setSaved]         = useState(false);

  const verif = getVerificationStatus((verificationLevel ?? 0) as 0 | 1 | 2);

  function handleSaveName() {
    const { valid, reason } = validateUsername(draft);
    if (!valid) { setNameError(reason ?? 'Invalid username'); return; }
    updateUsername(draft);
    setNameError(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const toggle = (label: string, value: boolean, onToggle: () => void) => (
    <div className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
      <span className="text-sm">{label}</span>
      <button onClick={onToggle}
        className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${value ? 'bg-primary' : 'bg-muted'}`}>
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-7' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground pb-10">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="p-1 rounded-lg hover:bg-card active:scale-95 transition-transform">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <Settings2 className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold flex-1">Settings</h1>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">

        {/* Account */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Account</div>
          <div className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-sm font-black text-primary">
              {username.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold">{username}</div>
              <div className="text-xs flex items-center gap-1" style={{ color: verif.color }}>
                {verif.badge && <span>{verif.badge}</span>}
                <span>{verif.label}</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Change Username</label>
            <div className="flex gap-2">
              <input value={draft} onChange={e => setDraft(e.target.value)}
                className="flex-1 bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                maxLength={20} placeholder="Your username" />
              <Button size="sm" onClick={handleSaveName} className="px-4">
                {saved ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : 'Save'}
              </Button>
            </div>
            {nameError && <p className="text-xs text-red-400">{nameError}</p>}
          </div>
          <div className="flex items-center justify-between rounded-xl bg-muted/20 px-3 py-2.5">
            <div>
              <div className="text-sm font-semibold">Pi Network</div>
              <div className="text-xs text-muted-foreground">{user ? `Signed in as ${user.username}` : 'Not signed in'}</div>
            </div>
            <div className={`text-xs font-bold px-2 py-1 rounded-lg ${user ? 'bg-green-500/20 text-green-400' : 'bg-muted/40 text-muted-foreground'}`}>
              {user ? '✓ Connected' : 'Connect'}
            </div>
          </div>
        </motion.div>

        {/* Language */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Language</div>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => setLanguage(l.code)}
                className={`py-2 px-3 rounded-xl text-sm font-medium transition-all text-left ${language === l.code ? 'bg-primary/20 border border-primary/40 text-primary' : 'bg-muted/30 border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                {l.native}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="rounded-2xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Notifications</div>
          {toggle('Match results', notifPushMatch ?? true, () => toggleNotif('match'))}
          {toggle('Community activity', notifPushCommunity ?? true, () => toggleNotif('community'))}
          {toggle('Trophies & level-ups', notifPushTrophy ?? true, () => toggleNotif('trophy'))}
        </motion.div>

        {/* Audio */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Audio & Haptics</div>
          {toggle('Sound effects', soundEnabled ?? true, () => toggleSound())}
          {toggle('Vibration', vibrationEnabled ?? true, () => toggleVibration())}
        </motion.div>

        {/* Quick links */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="rounded-2xl border border-border bg-card p-4 space-y-1">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Quick Links</div>
          {[
            { icon: '💰', label: 'Coins Wallet', href: '/wallet' },
            { icon: '🔒', label: 'Pi Lock System', href: '/pi-lock' },
            { icon: '📊', label: 'Leaderboard', href: '/leaderboard' },
            { icon: '🌀', label: 'Seasons', href: '/seasons' },
          ].map(r => (
            <Link key={r.href} href={r.href}>
              <button className="w-full flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-muted/30 transition-colors">
                <span className="text-xl">{r.icon}</span>
                <span className="text-sm font-medium flex-1 text-left">{r.label}</span>
                <span className="text-muted-foreground text-xs">→</span>
              </button>
            </Link>
          ))}
        </motion.div>

        <div className="text-center text-xs text-muted-foreground/50 py-2">SkillLeague v6.0 · Powered by Pi Network</div>
      </div>
    </div>
  );
}
