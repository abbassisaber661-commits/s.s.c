import { useGame } from "@/contexts/GameContext";
import { getTranslation } from "@/lib/i18n";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Rules() {
  const { language } = useGame();
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col max-w-md mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{t('rules')}</h1>
      </div>
      
      <div className="space-y-6 text-left">
        <div className="bg-card p-6 rounded-2xl border">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">🎯 Reaction</h2>
          <div className="flex gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-primary animate-pulse"></div>
            <div className="w-10 h-10 rounded-full bg-muted"></div>
            <div className="w-10 h-10 rounded-full bg-muted"></div>
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-2xl border">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">⚡ Decision</h2>
          <div className="flex flex-col gap-4 items-center">
            <div className="w-12 h-12 bg-yellow-400 rotate-45"></div>
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-blue-400 rounded-full"></div>
              <div className="w-10 h-10 bg-yellow-400 rotate-45 border-4 border-white"></div>
              <div className="w-10 h-10 bg-green-400"></div>
            </div>
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-2xl border">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">🧠 Memory</h2>
          <div className="flex gap-2">
             <div className="w-10 h-10 bg-primary opacity-100"></div>
             <div className="w-10 h-10 bg-blue-400 opacity-50"></div>
             <div className="w-10 h-10 bg-green-400 opacity-50"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
