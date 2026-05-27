import { useGame } from "@/contexts/GameContext";
import { getTranslation } from "@/lib/i18n";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Results() {
  const { language, lastScore, lastAccuracy, lastCoinsEarned, lastTokensEarned } = useGame();
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-black mb-8">{t('results_title')}</h1>
      
      <div className="space-y-6 w-full max-w-sm bg-card p-8 rounded-3xl border shadow-xl">
        <div>
          <div className="text-muted-foreground text-sm uppercase tracking-wider">{t('score')}</div>
          <div className="text-6xl font-black text-primary my-2">{lastScore}</div>
        </div>
        
        <div className="flex justify-between border-t border-border pt-6">
          <div>
            <div className="text-muted-foreground text-xs uppercase">{t('accuracy')}</div>
            <div className="text-2xl font-bold">{lastAccuracy}%</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs uppercase">{t('earned')}</div>
            <div className="text-2xl font-bold text-yellow-400">+{lastCoinsEarned}</div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-4 mt-12">
        <Link href="/leagues" className="w-full block">
          <Button size="lg" className="w-full h-16 text-xl bg-primary">
            {t('play_again')}
          </Button>
        </Link>
        <Link href="/" className="w-full block">
          <Button variant="outline" size="lg" className="w-full h-14">
            {t('back_to_leagues')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
