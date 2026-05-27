import { useGame } from "@/contexts/GameContext";
import { useT } from "@/lib/i18n";
import { Link } from "wouter";
import { Trophy, Zap, Coins, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageSelector from "@/components/LanguageSelector";

export default function Home() {
  const { user, login, logout, language, setLanguage, trainingCoins, entryTokens } = useGame();
  const t = useT(language);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Top bar */}
      <div className="w-full max-w-md flex justify-between items-center absolute top-0 pt-5 px-5 z-10">
        <LanguageSelector current={language} onChange={setLanguage} />
        <div>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-primary">{user.username}</span>
              <Button variant="outline" size="sm" onClick={logout}>{t('logout')}</Button>
            </div>
          ) : (
            <Button onClick={login} variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/10">
              {t('sign_in_pi')}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md z-10 space-y-12">

        {/* Logo + title */}
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-accent shadow-[0_0_40px_rgba(var(--primary),0.5)] mb-4">
            <Zap className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            {t('app_name')}
          </h1>
          <p className="text-lg text-muted-foreground font-medium uppercase tracking-widest">
            {t('tagline')}
          </p>
        </div>

        {/* Currency */}
        <div className="flex gap-6 animate-in fade-in zoom-in-95 duration-700 delay-150">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-card border border-border shadow-lg">
              <Coins className="w-6 h-6 text-yellow-400" />
            </div>
            <span className="text-2xl font-bold tabular-nums">{trainingCoins}</span>
            <span className="text-xs text-muted-foreground uppercase text-center">{t('training_coins')}</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-card border border-border shadow-lg">
              <Trophy className="w-6 h-6 text-purple-400" />
            </div>
            <span className="text-2xl font-bold tabular-nums">{entryTokens}</span>
            <span className="text-xs text-muted-foreground uppercase text-center">{t('entry_tokens')}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <Link href="/leagues" className="w-full block">
            <Button size="lg" className="w-full h-16 text-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all active:scale-95">
              {t('play')}
            </Button>
          </Link>
          <Link href="/rules" className="w-full block">
            <Button variant="outline" size="lg" className="w-full h-14 font-semibold gap-2 border-border/50 hover:bg-card">
              <Info className="w-5 h-5" />
              {t('rules')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
