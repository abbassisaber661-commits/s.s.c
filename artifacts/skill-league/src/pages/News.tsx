import { useState, useEffect } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { playTap } from "@/lib/sounds";
import { isRTL } from "@/lib/i18n";
import { NEWS_ITEMS, getReadNewsIds, markNewsRead, markAllNewsRead, getUnreadCount, TYPE_COLORS, TYPE_LABELS, type NewsItem } from "@/lib/news";

export default function News() {
  const { language } = useGame();
  const rtl = isRTL(language);
  const [, navigate] = useLocation();

  const [readIds, setReadIds]     = useState<string[]>([]);
  const [selected, setSelected]   = useState<NewsItem | null>(null);
  const [unread, setUnread]       = useState(0);

  useEffect(() => {
    setReadIds(getReadNewsIds());
    setUnread(getUnreadCount());
  }, []);

  function openItem(item: NewsItem) {
    markNewsRead(item.id);
    setReadIds(getReadNewsIds());
    setUnread(getUnreadCount());
    setSelected(item);
    playTap();
  }

  function handleMarkAll() {
    markAllNewsRead();
    setReadIds(getReadNewsIds());
    setUnread(0);
    playTap();
  }

  const typeLabels = TYPE_LABELS[language === 'ar' ? 'ar' : 'en'];

  function formatDate(iso: string) {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return language === 'ar' ? 'اليوم' : 'Today';
    if (days === 1) return language === 'ar' ? 'أمس' : 'Yesterday';
    return language === 'ar' ? `منذ ${days} أيام` : `${days} days ago`;
  }

  if (selected) {
    const typeColor = TYPE_COLORS[selected.type];
    return (
      <div dir={rtl ? 'rtl' : 'ltr'} className="min-h-screen bg-background text-foreground pb-24">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/60 px-4 py-3 flex items-center gap-3">
          <button className="p-2 rounded-xl hover:bg-card active:scale-95 transition-all" onClick={() => { setSelected(null); playTap(); }}>
            <ChevronLeft className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} />
          </button>
          <h1 className="text-lg font-black flex-1 truncate">{language === 'ar' ? selected.titleAr : selected.title}</h1>
        </div>
        <div className="max-w-md mx-auto px-4 pt-6 space-y-5">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {/* Icon + Type */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl"
                style={{ background: typeColor + '20' }}>{selected.icon}</div>
              <div>
                <div className="text-[10px] px-2 py-0.5 rounded-full font-bold inline-block mb-1"
                  style={{ background: typeColor + '20', color: typeColor }}>
                  {typeLabels[selected.type as keyof typeof typeLabels]}
                </div>
                <div className="text-sm font-bold">{language === 'ar' ? selected.titleAr : selected.title}</div>
                <div className="text-xs text-muted-foreground">{formatDate(selected.date)}</div>
              </div>
            </div>

            {/* Body */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm leading-relaxed">
                {language === 'ar' ? selected.bodyAr : selected.body}
              </p>
            </div>

            {selected.actionUrl && (
              <Button onClick={() => navigate(selected.actionUrl!)} className="w-full mt-4 font-bold">
                {language === 'ar' ? '🔗 ذهاب' : '🔗 View'}
              </Button>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="min-h-screen bg-background text-foreground pb-24">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/60 px-4 py-3 flex items-center gap-3">
        <button className="p-2 rounded-xl hover:bg-card active:scale-95 transition-all" onClick={() => { playTap(); window.history.back(); }}><ChevronLeft className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} /></button>
        <h1 className="text-lg font-black flex-1">📰 {language === 'ar' ? 'الأخبار' : 'News'}</h1>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAll} className="text-xs flex items-center gap-1">
            <CheckCheck className="w-3 h-3" />
            {language === 'ar' ? 'قراءة الكل' : 'Mark all read'}
          </Button>
        )}
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-3">
        {unread > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/30">
            <Bell className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-primary">
              {language === 'ar' ? `${unread} أخبار جديدة` : `${unread} new items`}
            </span>
          </motion.div>
        )}

        {NEWS_ITEMS.map((item, i) => {
          const isRead = readIds.includes(item.id);
          const typeColor = TYPE_COLORS[item.type];
          return (
            <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => openItem(item)}
              className={`rounded-2xl border bg-card cursor-pointer active:scale-[0.98] transition-all overflow-hidden ${
                !isRead ? 'border-primary/30' : 'border-border'
              }`}>
              <div className="p-4 flex items-start gap-3">
                {/* Icon */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: typeColor + '20' }}>
                    {item.icon}
                  </div>
                  {!isRead && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                  )}
                  {item.isPinned && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 text-[8px] flex items-center justify-center">📌</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`text-xs font-bold ${!isRead ? '' : 'text-muted-foreground'}`}>
                      {language === 'ar' ? item.titleAr : item.title}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                      style={{ background: typeColor + '20', color: typeColor }}>
                      {typeLabels[item.type as keyof typeof typeLabels]}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {language === 'ar' ? item.bodyAr : item.body}
                  </p>
                  <div className="text-[10px] text-muted-foreground mt-1">{formatDate(item.date)}</div>
                </div>

                <ChevronLeft className={`w-4 h-4 text-muted-foreground flex-shrink-0 mt-1 ${rtl ? '' : 'rotate-180'}`} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
