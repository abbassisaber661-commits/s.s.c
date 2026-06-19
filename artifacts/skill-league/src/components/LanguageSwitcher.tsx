import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { LANGUAGES, type Language } from "@/lib/i18n";

const PRIMARY: Language[] = ['en', 'ar', 'fr', 'es', 'pt'];

interface Props {
  compact?: boolean;
}

export default function LanguageSwitcher({ compact = false }: Props) {
  // استخدام hook الترجمة الجديد
  const { currentLanguage, changeLanguage } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const current = LANGUAGES.find(l => l.code === currentLanguage);
  const primary = LANGUAGES.filter(l => PRIMARY.includes(l.code));
  const others = LANGUAGES.filter(l => !PRIMARY.includes(l.code));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors rounded-xl hover:bg-white/10 active:scale-95 ${
          compact ? 'p-2' : 'px-2.5 py-1.5'
        }`}
        title="Language"
      >
        <Globe size={compact ? 17 : 18} />
        {!compact && <span className="text-sm font-bold">{current?.native ?? 'EN'}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-[200] bg-card border border-border rounded-xl shadow-xl py-1 min-w-[140px]">
          <div className="px-2 py-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
            Language
          </div>
          {primary.map(lang => (
            <button
              key={lang.code}
              onClick={() => { changeLanguage(lang.code); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors ${
                currentLanguage === lang.code ? 'text-primary font-bold' : 'text-foreground'
              }`}
            >
              {currentLanguage === lang.code && <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />}
              {currentLanguage !== lang.code && <span className="w-1.5 h-1.5 inline-block" />}
              <span>{lang.native}</span>
            </button>
          ))}
          {others.length > 0 && (
            <>
              <div className="border-t border-border/50 my-1" />
              {others.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { changeLanguage(lang.code); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors ${
                    currentLanguage === lang.code ? 'text-primary font-bold' : 'text-foreground'
                  }`}
                >
                  {currentLanguage === lang.code && <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />}
                  {currentLanguage !== lang.code && <span className="w-1.5 h-1.5 inline-block" />}
                  <span>{lang.native}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}