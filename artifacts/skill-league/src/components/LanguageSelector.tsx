import { useState, useRef, useEffect } from 'react';
import { Language, LANGUAGES, t } from '@/lib/i18n';
import { Globe } from 'lucide-react';

interface Props {
  current: Language;
  onChange: (lang: Language) => void;
  upward?: boolean;
}

export default function LanguageSelector({ current, onChange, upward = false }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentLang = LANGUAGES.find(l => l.code === current);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-sm font-medium hover:bg-card/80 active:scale-95 transition-transform"
        aria-label={t(current, 'language_label')}
      >
        <Globe className="w-4 h-4 text-muted-foreground" />
        <span className="font-semibold">{currentLang?.native ?? current.toUpperCase()}</span>
      </button>

      {open && (
        <div
          className={`absolute z-50 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden ${upward ? 'bottom-full mb-2' : 'top-full mt-2'}`}
          style={{ minWidth: '200px', right: 0 }}
        >
          <div className="p-2 grid grid-cols-1 gap-0.5 max-h-72 overflow-y-auto">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => { onChange(lang.code); setOpen(false); }}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-left transition-colors active:scale-95 ${
                  lang.code === current
                    ? 'bg-primary/20 text-primary font-bold'
                    : 'hover:bg-muted/50 text-foreground'
                }`}
              >
                <span className="font-semibold">{lang.native}</span>
                <span className="text-xs text-muted-foreground ml-3">{lang.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
