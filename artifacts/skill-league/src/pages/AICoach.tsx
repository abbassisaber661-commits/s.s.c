import { useState, useRef, useEffect } from "react";
import { useGame } from "@/contexts/GameContext";
import { Link } from "wouter";
import { ChevronLeft, Send, Bot, Zap, Target, TrendingUp, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { playTap } from "@/lib/sounds";
import { isRTL } from "@/lib/i18n";
import { generateAiHints } from "@/lib/ai-hints";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  ts: number;
}

function getCoachResponse(msg: string, stats: any, language: string): string {
  const m = msg.toLowerCase();
  const isAr = language === 'ar';

  if (m.includes('speed') || m.includes('سرعة') || m.includes('reaction') || m.includes('ردة فعل')) {
    return isAr
      ? `🏎️ لتحسين سرعتك الحالية (${stats.skillSpeed}/100):\n\n1. تدرب على وضع Reaction أكثر\n2. استهدف ضرب الأهداف في أقل من 300ms\n3. ضع ساعة للتدريب 10 دقائق يومياً\n4. تمرن على مستوى Bronze أولاً ثم Silver`
      : `🏎️ To improve your speed (${stats.skillSpeed}/100):\n\n1. Train Reaction mode more often\n2. Aim to hit targets in under 300ms\n3. Set 10 min daily training sessions\n4. Start on Bronze, then Silver`;
  }

  if (m.includes('memory') || m.includes('ذاكرة') || m.includes('remember') || m.includes('تذكر')) {
    return isAr
      ? `🧠 لتحسين ذاكرتك (${stats.skillMemory}/100):\n\n1. مارس وضع Memory يومياً\n2. ابدأ بتسلسلات 3 عناصر ثم زد تدريجياً\n3. الراحة الكافية تحسن الذاكرة بشكل ملحوظ\n4. تجنب الشاشات قبل النوم`
      : `🧠 To improve your memory (${stats.skillMemory}/100):\n\n1. Practice Memory mode daily\n2. Start with 3-item sequences, build up gradually\n3. Adequate sleep dramatically improves memory\n4. Avoid screens before bedtime`;
  }

  if (m.includes('elo') || m.includes('rank') || m.includes('رتبة')) {
    const advice = stats.elo < 1200
      ? (isAr ? 'تدرب على وضع Training أولاً ثم انتقل لـ Bronze' : 'Train on Training mode first, then move to Bronze')
      : stats.elo < 1400
      ? (isAr ? 'العب Bronze بانتظام للوصول لـ Silver' : 'Play Bronze consistently to reach Silver')
      : (isAr ? 'أنت في المستوى الجيد! ركز على PvP لرفع ELO' : "You're doing well! Focus on PvP to climb");
    return isAr
      ? `📊 ELO الحالي: ${stats.elo}\n\n${advice}\n\n• الفوز في PvP يمنحك أكبر مكسب ELO\n• تجنب المباريات عندما تكون متعباً\n• حافظ على تركيزك في كل مباراة`
      : `📊 Your ELO: ${stats.elo}\n\n${advice}\n\n• PvP wins give the biggest ELO gains\n• Avoid playing when tired\n• Stay focused in every match`;
  }

  if (m.includes('coin') || m.includes('dn$') || m.includes('عملة') || m.includes('money') || m.includes('مال')) {
    return isAr
      ? `💰 أفضل طرق كسب DN$:\n\n1. انشر في المجتمع واحصل على إعجابات\n2. سجل دخول يومياً (+1 DN$)\n3. العب مباريات الدوري\n4. اكمل التحديات اليومية\n5. اكمل المهمات الأسبوعية`
      : `💰 Best ways to earn DN$:\n\n1. Post in the community and get likes\n2. Log in daily (+1 DN$)\n3. Play league matches\n4. Complete daily challenges\n5. Finish weekly missions`;
  }

  if (m.includes('pvp') || m.includes('مباراة')) {
    return isAr
      ? `⚔️ نصائح PvP للمستوى ${stats.level}:\n\n1. ركز على الدقة لا السرعة في البداية\n2. اقرأ خصمك — لاحظ أنماطه\n3. استخدم التعزيزات بحكمة قبل المباريات المهمة\n4. ELO الخاص بك ${stats.elo} — منافسوك المثاليون حوله\n5. سلسلة الفوز تعطي مكافآت مضاعفة!`
      : `⚔️ PvP tips for Level ${stats.level}:\n\n1. Focus on accuracy over speed initially\n2. Read your opponent — notice their patterns\n3. Use boosts wisely before important matches\n4. Your ELO is ${stats.elo} — your ideal opponents are nearby\n5. Win streaks give double rewards!`;
  }

  if (m.includes('tournament') || m.includes('بطولة')) {
    return isAr
      ? `🏆 استراتيجية البطولات:\n\n1. تأكد من أنك في أفضل حالة قبل البطولة\n2. البطولات تعطي أكبر مكافآت ELO\n3. الفوز بـ 3+ بطولات يمنحك لقباً خاصاً\n4. تدرب يوماً كاملاً قبل كل بطولة كبيرة`
      : `🏆 Tournament strategy:\n\n1. Make sure you're at peak condition before the tournament\n2. Tournaments give the biggest ELO rewards\n3. Winning 3+ gives you a special title\n4. Train for a full day before any big tournament`;
  }

  if (m.includes('hello') || m.includes('hi') || m.includes('مرحبا') || m.includes('هلا') || m.includes('أهلا')) {
    return isAr
      ? `مرحباً بك في مساعد SkillLeague الذكي! 🤖\n\nأنا هنا لمساعدتك على تحسين أدائك. يمكنني مساعدتك في:\n• تحسين السرعة والدقة\n• استراتيجيات PvP والبطولات\n• رفع ELO\n• كسب المزيد من DN$\n\nعن ماذا تريد التحدث؟`
      : `Hello! Welcome to SkillLeague AI Coach! 🤖\n\nI'm here to help you improve your performance. I can help with:\n• Speed and accuracy improvement\n• PvP and tournament strategies\n• Climbing ELO\n• Earning more DN$\n\nWhat would you like to discuss?`;
  }

  // Default response with personalized analysis
  const weakest = stats.skillSpeed < stats.skillMemory && stats.skillSpeed < stats.skillAccuracy ? 'speed' :
                  stats.skillMemory < stats.skillAccuracy ? 'memory' : 'accuracy';
  return isAr
    ? `📊 تحليل أدائك الآن:\n\nالمستوى: ${stats.level} | ELO: ${stats.elo}\nسرعة: ${stats.skillSpeed} | دقة: ${stats.skillAccuracy} | ذاكرة: ${stats.skillMemory}\n\nنقطة ضعفك الرئيسية: ${weakest === 'speed' ? 'السرعة' : weakest === 'memory' ? 'الذاكرة' : 'الدقة'}\n\nأسألني عن: سرعة، ذاكرة، ELO، PvP، بطولة، أو DN$`
    : `📊 Your performance analysis:\n\nLevel: ${stats.level} | ELO: ${stats.elo}\nSpeed: ${stats.skillSpeed} | Accuracy: ${stats.skillAccuracy} | Memory: ${stats.skillMemory}\n\nMain weakness: ${weakest}\n\nAsk me about: speed, memory, ELO, PvP, tournament, or DN$`;
}

const QUICK_PROMPTS = [
  { en: '⚡ Improve speed',     ar: '⚡ تحسين السرعة'   },
  { en: '🧠 Better memory',     ar: '🧠 تحسين الذاكرة'  },
  { en: '📊 Boost my ELO',      ar: '📊 رفع ELO'        },
  { en: '⚔️ PvP strategy',     ar: '⚔️ استراتيجية PvP' },
  { en: '💰 Earn more DN$',     ar: '💰 المزيد من DN$' },
  { en: '🏆 Win tournaments',   ar: '🏆 الفوز بالبطولات' },
];

export default function AICoach() {
  const { language, level, elo, matchesPlayed, matchesWon, pvpWins, pvpLosses, pvpWinStreak, bestStreak, skillSpeed, skillAccuracy, skillMemory, dnBalance, tournamentWins, dailyChallengesCompleted, xpBoostUntil } = useGame();
  const rtl = isRTL(language);

  const stats = { level, elo, matchesPlayed, matchesWon, pvpWins, pvpLosses, pvpWinStreak, bestStreak, skillSpeed, skillAccuracy, skillMemory, dnBalance, tournamentWins, dailyChallengesCompleted: dailyChallengesCompleted ?? 0, xpBoostUntil: xpBoostUntil ?? null };

  const [messages, setMessages] = useState<Message[]>([{
    id: '0', role: 'assistant',
    text: language === 'ar'
      ? `مرحباً! 🤖 أنا مساعدك الذكي في SkillLeague.\n\nمستواك: ${level} | ELO: ${elo}\nأنا هنا لأساعدك تتحسن وتفوز أكثر. اسألني أي شيء!`
      : `Hello! 🤖 I'm your SkillLeague AI Coach.\n\nYour Level: ${level} | ELO: ${elo}\nI'm here to help you improve and win more. Ask me anything!`,
    ts: Date.now(),
  }]);
  const [input, setInput]       = useState('');
  const [thinking, setThinking] = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

  const hints = generateAiHints(stats);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  function sendMessage(text: string) {
    if (!text.trim() || thinking) return;
    playTap();
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: text.trim(), ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);
    setTimeout(() => {
      const reply = getCoachResponse(text, stats, language);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: reply, ts: Date.now() }]);
      setThinking(false);
    }, 900 + Math.random() * 600);
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/60 px-4 py-3 flex items-center gap-3">
        <button className="p-2 rounded-xl hover:bg-card active:scale-95 transition-all" onClick={() => { playTap(); window.history.back(); }}><ChevronLeft className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} /></button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-black">AI Coach</div>
            <div className="flex items-center gap-1">
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[10px] text-green-400 font-bold">{language === 'ar' ? 'نشط' : 'Online'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Hints strip */}
      {hints.length > 0 && (
        <div className="px-4 py-2 bg-primary/5 border-b border-border/40">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {hints.slice(0, 3).map((h, i) => (
              <button key={i} onClick={() => sendMessage(h.title)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-bold hover:border-primary/40 active:scale-95 transition-all">
                <span>{h.icon}</span>
                <span className="text-muted-foreground">{h.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-36">
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`flex items-end gap-2 ${msg.role === 'user' ? (rtl ? 'flex-row' : 'flex-row-reverse') : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-card border border-border rounded-bl-sm'
              }`}>
                {msg.text}
              </div>
            </motion.div>
          ))}
          {thinking && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="w-2 h-2 rounded-full bg-primary/60"
                      animate={{ y: [0, -6, 0] }} transition={{ duration: 0.7, delay: i * 0.15, repeat: Infinity }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="fixed bottom-16 left-0 right-0 bg-background/80 backdrop-blur px-4 py-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-2">
          {QUICK_PROMPTS.map((p, i) => (
            <button key={i} onClick={() => sendMessage(language === 'ar' ? p.ar : p.en)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-bold hover:border-primary/40 active:scale-95 transition-all text-muted-foreground">
              {language === 'ar' ? p.ar : p.en}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="max-w-md mx-auto flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
            placeholder={language === 'ar' ? 'اسألني أي شيء...' : 'Ask me anything...'}
            className="flex-1 bg-card border border-border rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-primary/50" />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || thinking}
            className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all">
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
