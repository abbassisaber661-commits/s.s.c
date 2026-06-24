import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquarePlus, X, Star, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/contexts/GameContext";
import { api } from "@/lib/apiClient";
import { useLocation } from "wouter";

const CATEGORIES = [
  { id: "general",     label: "عام" },
  { id: "bug",         label: "🐛 خطأ" },
  { id: "pvp",         label: "⚔️ PvP" },
  { id: "ui",          label: "🎨 واجهة" },
  { id: "performance", label: "⚡ أداء" },
  { id: "feature",     label: "💡 ميزة" },
];

export default function BetaFeedbackWidget() {
  const { authUser, username } = useGame();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.betaFeedback.submit({
        playerId: authUser?.uid, username: username || "guest",
        rating, category, message, page: location,
      });
      setSent(true);
      setMessage("");
      setTimeout(() => { setSent(false); setOpen(false); setRating(5); setCategory("general"); }, 2000);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <motion.button
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.5, type: "spring" }}
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-3 z-40 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl px-3 py-2 shadow-lg flex items-center gap-1.5 text-xs font-bold"
      >
        <MessageSquarePlus size={15} />
        <span>Beta</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="bg-card border border-border rounded-3xl p-5 w-full max-w-md space-y-4">

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-base flex items-center gap-2">
                    <MessageSquarePlus size={16} className="text-indigo-400" /> ملاحظات النسخة التجريبية
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">ساعدنا في تحسين SkillLeague</p>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted"><X size={18} /></button>
              </div>

              {sent ? (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-8 space-y-2">
                  <div className="text-5xl">🙏</div>
                  <div className="font-bold text-lg">شكراً على ملاحظاتك!</div>
                  <div className="text-sm text-muted-foreground">تساعدنا كثيراً في التحسين</div>
                </motion.div>
              ) : (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-2">تقييمك للتطبيق</label>
                    <div className="flex justify-center gap-3">
                      {[1, 2, 3, 4, 5].map(r => (
                        <motion.button key={r} whileTap={{ scale: 0.85 }} onClick={() => setRating(r)}>
                          <Star size={32} className={`transition-colors ${r <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-2">الفئة</label>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map(c => (
                        <button key={c.id} onClick={() => setCategory(c.id)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${category === c.id ? "border-indigo-500 bg-indigo-500/20 text-indigo-300" : "border-border text-muted-foreground hover:border-muted-foreground"}`}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-2">ملاحظتك أو اقتراحك</label>
                    <textarea value={message} onChange={e => setMessage(e.target.value)}
                      dir="rtl" rows={3} placeholder="اكتب هنا..."
                      className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>

                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2 h-11"
                    onClick={handleSubmit} disabled={!message.trim() || sending}>
                    <Send size={15} />
                    {sending ? "جاري الإرسال..." : "إرسال الملاحظة"}
                  </Button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
