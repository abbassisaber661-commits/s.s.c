import { useGame } from "@/contexts/GameContext";
import { useT } from "@/lib/i18n";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Rules() {
  const { language } = useGame();
  const t = useT(language);

  const sections = [
    {
      emoji: '🎯',
      title: t('rules_reaction_title'),
      desc:  t('rules_reaction_desc'),
      preview: (
        <div className="flex gap-3 mt-3">
          <div className="w-10 h-10 rounded-full bg-[#FF3A5E] shadow-[0_0_16px_#FF3A5E]" />
          <div className="w-10 h-10 rounded-full bg-[#3AB4FF] opacity-30" />
          <div className="w-10 h-10 rounded-full bg-[#2EE87A] opacity-30" />
          <div className="w-10 h-10 rounded-full bg-[#FFD93D] opacity-30" />
        </div>
      ),
    },
    {
      emoji: '⚡',
      title: t('rules_decision_title'),
      desc:  t('rules_decision_desc'),
      preview: (
        <div className="flex flex-col gap-3 mt-3 items-start">
          <div className="w-12 h-12 rounded-xl bg-[#B44FFF] shadow-[0_0_20px_#B44FFF55]" />
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3AB4FF] opacity-40" />
            <div className="w-10 h-10 rounded-xl bg-[#B44FFF] border-2 border-white shadow-[0_0_16px_#B44FFF]" />
            <div className="w-10 h-10 rounded-xl bg-[#2EE87A] opacity-40" />
          </div>
        </div>
      ),
    },
    {
      emoji: '🧠',
      title: t('rules_memory_title'),
      desc:  t('rules_memory_desc'),
      preview: (
        <div className="flex gap-2 mt-3">
          {['#FF3A5E','#B44FFF','#FFD93D'].map((c, i) => (
            <div
              key={i}
              className="w-10 h-10 rounded-xl transition-all"
              style={{
                backgroundColor: c,
                opacity: i === 0 ? 1 : 0.25,
                boxShadow: i === 0 ? `0 0 20px ${c}` : 'none',
              }}
            />
          ))}
        </div>
      ),
    },
    {
      emoji: '🏆',
      title: t('rules_scoring_title'),
      desc:  t('rules_scoring_desc'),
      preview: null,
    },
  ];

  return (
    <div className="min-h-screen bg-background p-5 flex flex-col max-w-md mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{t('rules')}</h1>
      </div>

      <div className="space-y-4">
        {sections.map((s) => (
          <div key={s.title} className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>{s.emoji}</span> {s.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">
              {s.desc}
            </p>
            {s.preview}
          </div>
        ))}
      </div>
    </div>
  );
}
