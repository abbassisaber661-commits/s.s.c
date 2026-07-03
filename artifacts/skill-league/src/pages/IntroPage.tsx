import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LANGUAGES, Language } from "@/lib/i18n";
import { useEntryLanguage } from "@/contexts/EntryLanguageContext";
import { Logo } from "@/components/Logo";

/* ─── Translations ─────────────────────────────────────────────────────── */
interface IntroTranslations {
  tagline: string;
  subtitle: string;
  social_title: string;
  social_items: string[];
  gaming_title: string;
  gaming_items: string[];
  jobs_title: string;
  jobs_items: string[];
  economy_title: string;
  economy_items: string[];
  continue_btn: string;
  select_lang: string;
  stat_players: string;
  stat_tournaments: string;
  stat_challenges: string;
}

const T: Record<Language, IntroTranslations> = {
  en: {
    tagline: "The Future of Competitive Play",
    subtitle: "Social platform. Competitive gaming. Digital economy. All in one.",
    social_title: "Full Social Platform",
    social_items: ["Posts & Photos", "Videos & Reels", "Gifts & Creator Economy"],
    gaming_title: "Competitive Gaming",
    gaming_items: ["Leagues & Rankings", "Promotion & Relegation", "Rewards & Prizes"],
    jobs_title: "Jobs & Marketplace",
    jobs_items: ["Job Opportunities", "Buy & Sell", "Global Marketplace"],
    economy_title: "Digital Economy",
    economy_items: ["Denous (DN) Currency", "Wallet & Earnings", "Creator Rewards"],
    continue_btn: "Continue",
    select_lang: "Language",
    stat_players: "Players",
    stat_tournaments: "Tournaments",
    stat_challenges: "Challenges",
  },
  ar: {
    tagline: "مستقبل الألعاب التنافسية",
    subtitle: "منصة اجتماعية. ألعاب تنافسية. اقتصاد رقمي. كل شيء في مكان واحد.",
    social_title: "منصة اجتماعية متكاملة",
    social_items: ["منشورات وصور", "مقاطع الفيديو", "الهدايا واقتصاد المبدعين"],
    gaming_title: "الألعاب التنافسية",
    gaming_items: ["الدوريات والتصنيفات", "الترقية والهبوط", "المكافآت والجوائز"],
    jobs_title: "الوظائف والسوق",
    jobs_items: ["فرص العمل", "البيع والشراء", "السوق العالمي"],
    economy_title: "الاقتصاد الرقمي",
    economy_items: ["عملة دينوس (DN)", "المحفظة والأرباح", "مكافآت المبدعين"],
    continue_btn: "متابعة",
    select_lang: "اللغة",
    stat_players: "لاعب",
    stat_tournaments: "بطولة",
    stat_challenges: "تحدي",
  },
  fr: {
    tagline: "L'Avenir du Jeu Compétitif",
    subtitle: "Plateforme sociale. Jeux compétitifs. Économie numérique. Tout en un.",
    social_title: "Plateforme Sociale Complète",
    social_items: ["Posts & Photos", "Vidéos & Reels", "Cadeaux & Économie Créatrice"],
    gaming_title: "Jeux Compétitifs",
    gaming_items: ["Ligues & Classements", "Promotion & Relégation", "Récompenses & Prix"],
    jobs_title: "Emplois & Marché",
    jobs_items: ["Opportunités d'emploi", "Acheter & Vendre", "Marché Mondial"],
    economy_title: "Économie Numérique",
    economy_items: ["Devise Denous (DN)", "Portefeuille & Gains", "Récompenses Créateurs"],
    continue_btn: "Continuer",
    select_lang: "Langue",
    stat_players: "Joueurs",
    stat_tournaments: "Tournois",
    stat_challenges: "Défis",
  },
  es: {
    tagline: "El Futuro del Juego Competitivo",
    subtitle: "Plataforma social. Juegos competitivos. Economía digital. Todo en uno.",
    social_title: "Plataforma Social Completa",
    social_items: ["Posts y Fotos", "Videos y Reels", "Regalos y Economía Creadora"],
    gaming_title: "Juegos Competitivos",
    gaming_items: ["Ligas y Rankings", "Ascenso y Descenso", "Recompensas y Premios"],
    jobs_title: "Empleos y Mercado",
    jobs_items: ["Oportunidades de Empleo", "Comprar y Vender", "Mercado Global"],
    economy_title: "Economía Digital",
    economy_items: ["Moneda Denous (DN)", "Cartera y Ganancias", "Recompensas Creadores"],
    continue_btn: "Continuar",
    select_lang: "Idioma",
    stat_players: "Jugadores",
    stat_tournaments: "Torneos",
    stat_challenges: "Desafíos",
  },
  de: {
    tagline: "Die Zukunft des Wettkampfspiels",
    subtitle: "Soziale Plattform. Wettkampfspiele. Digitale Wirtschaft. Alles in einem.",
    social_title: "Vollständige Soziale Plattform",
    social_items: ["Beiträge & Fotos", "Videos & Reels", "Geschenke & Creator Economy"],
    gaming_title: "Wettkampfspiele",
    gaming_items: ["Ligen & Rankings", "Aufstieg & Abstieg", "Belohnungen & Preise"],
    jobs_title: "Jobs & Marktplatz",
    jobs_items: ["Jobmöglichkeiten", "Kaufen & Verkaufen", "Globaler Marktplatz"],
    economy_title: "Digitale Wirtschaft",
    economy_items: ["Denous (DN) Währung", "Wallet & Einnahmen", "Creator-Belohnungen"],
    continue_btn: "Weiter",
    select_lang: "Sprache",
    stat_players: "Spieler",
    stat_tournaments: "Turniere",
    stat_challenges: "Herausforderungen",
  },
  pt: {
    tagline: "O Futuro do Jogo Competitivo",
    subtitle: "Plataforma social. Jogos competitivos. Economia digital. Tudo em um.",
    social_title: "Plataforma Social Completa",
    social_items: ["Posts e Fotos", "Vídeos e Reels", "Presentes e Economia Criadora"],
    gaming_title: "Jogos Competitivos",
    gaming_items: ["Ligas e Rankings", "Promoção e Rebaixamento", "Recompensas e Prêmios"],
    jobs_title: "Empregos e Mercado",
    jobs_items: ["Oportunidades de Emprego", "Comprar e Vender", "Mercado Global"],
    economy_title: "Economia Digital",
    economy_items: ["Moeda Denous (DN)", "Carteira e Ganhos", "Recompensas para Criadores"],
    continue_btn: "Continuar",
    select_lang: "Idioma",
    stat_players: "Jogadores",
    stat_tournaments: "Torneios",
    stat_challenges: "Desafios",
  },
  tr: {
    tagline: "Rekabetçi Oyunun Geleceği",
    subtitle: "Sosyal platform. Rekabetçi oyunlar. Dijital ekonomi. Hepsi bir arada.",
    social_title: "Tam Sosyal Platform",
    social_items: ["Gönderiler & Fotoğraflar", "Videolar & Reels", "Hediyeler & Yaratıcı Ekonomi"],
    gaming_title: "Rekabetçi Oyunlar",
    gaming_items: ["Ligler & Sıralamalar", "Terfi & Düşme", "Ödüller & Mükâfatlar"],
    jobs_title: "İşler & Pazar",
    jobs_items: ["İş Fırsatları", "Al & Sat", "Küresel Pazar"],
    economy_title: "Dijital Ekonomi",
    economy_items: ["Denous (DN) Para Birimi", "Cüzdan & Kazançlar", "Yaratıcı Ödüller"],
    continue_btn: "Devam Et",
    select_lang: "Dil",
    stat_players: "Oyuncu",
    stat_tournaments: "Turnuva",
    stat_challenges: "Meydan Okuma",
  },
  hi: {
    tagline: "प्रतिस्पर्धी खेल का भविष्य",
    subtitle: "सोशल प्लेटफ़ॉर्म। प्रतिस्पर्धी गेमिंग। डिजिटल अर्थव्यवस्था। सब एक में।",
    social_title: "पूर्ण सोशल प्लेटफ़ॉर्म",
    social_items: ["पोस्ट और फ़ोटो", "वीडियो और रील्स", "उपहार और क्रिएटर इकॉनमी"],
    gaming_title: "प्रतिस्पर्धी गेमिंग",
    gaming_items: ["लीग और रैंकिंग", "प्रमोशन और रेलीगेशन", "पुरस्कार और इनाम"],
    jobs_title: "नौकरियां और बाज़ार",
    jobs_items: ["नौकरी के अवसर", "खरीदें और बेचें", "वैश्विक बाज़ार"],
    economy_title: "डिजिटल अर्थव्यवस्था",
    economy_items: ["डेनस (DN) मुद्रा", "वॉलेट और कमाई", "क्रिएटर पुरस्कार"],
    continue_btn: "जारी रखें",
    select_lang: "भाषा",
    stat_players: "खिलाड़ी",
    stat_tournaments: "टूर्नामेंट",
    stat_challenges: "चुनौतियाँ",
  },
  zh: {
    tagline: "竞技游戏的未来",
    subtitle: "社交平台。竞技游戏。数字经济。全在一处。",
    social_title: "完整社交平台",
    social_items: ["帖子与照片", "视频与短视频", "礼物与创作者经济"],
    gaming_title: "竞技游戏",
    gaming_items: ["联赛与排名", "晋级与降级", "奖励与奖品"],
    jobs_title: "工作与市场",
    jobs_items: ["工作机会", "买卖交易", "全球市场"],
    economy_title: "数字经济",
    economy_items: ["Denous (DN) 货币", "钱包与收益", "创作者奖励"],
    continue_btn: "继续",
    select_lang: "语言",
    stat_players: "玩家",
    stat_tournaments: "锦标赛",
    stat_challenges: "挑战",
  },
  ru: {
    tagline: "Будущее Соревновательных Игр",
    subtitle: "Социальная платформа. Конкурентные игры. Цифровая экономика. Всё в одном.",
    social_title: "Полноценная Социальная Платформа",
    social_items: ["Посты и фото", "Видео и Reels", "Подарки и экономика создателей"],
    gaming_title: "Соревновательные Игры",
    gaming_items: ["Лиги и рейтинги", "Повышение и понижение", "Награды и призы"],
    jobs_title: "Вакансии и Рынок",
    jobs_items: ["Вакансии", "Купить и продать", "Глобальный рынок"],
    economy_title: "Цифровая Экономика",
    economy_items: ["Валюта Denous (DN)", "Кошелёк и доходы", "Награды создателям"],
    continue_btn: "Продолжить",
    select_lang: "Язык",
    stat_players: "Игроков",
    stat_tournaments: "Турниров",
    stat_challenges: "Испытаний",
  },
};

/* ─── Section data ─────────────────────────────────────────────────────── */
const SECTIONS = (t: IntroTranslations) => [
  {
    icon: "💬",
    title: t.social_title,
    items: t.social_items,
    gradient: "from-violet-600 to-purple-700",
    glow: "rgba(139,92,246,0.35)",
    border: "rgba(139,92,246,0.4)",
  },
  {
    icon: "🎮",
    title: t.gaming_title,
    items: t.gaming_items,
    gradient: "from-blue-600 to-indigo-700",
    glow: "rgba(99,102,241,0.35)",
    border: "rgba(99,102,241,0.4)",
  },
  {
    icon: "💼",
    title: t.jobs_title,
    items: t.jobs_items,
    gradient: "from-emerald-600 to-teal-700",
    glow: "rgba(16,185,129,0.35)",
    border: "rgba(16,185,129,0.4)",
  },
  {
    icon: "💰",
    title: t.economy_title,
    items: t.economy_items,
    gradient: "from-amber-500 to-orange-600",
    glow: "rgba(245,158,11,0.35)",
    border: "rgba(245,158,11,0.4)",
  },
];

/* ─── Language Picker — ref-based outside-click (no z-index conflict) ──── */
function LanguagePicker({
  lang,
  onChange,
}: {
  lang: Language;
  onChange: (l: Language) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((l) => l.code === lang);

  // Close on outside click — avoids z-index stacking context bugs with fixed overlay
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative" style={{ zIndex: 100 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-2xl font-semibold text-sm transition-all active:scale-95"
        style={{
          background: "rgba(255,255,255,0.12)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.18)",
          color: "white",
        }}
      >
        <span>🌐</span>
        <span>{current?.native ?? "EN"}</span>
        <span style={{ fontSize: 10, opacity: 0.7 }}>{open ? "▲" : "▼"}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 rounded-2xl overflow-hidden overflow-y-auto"
            style={{
              background: "rgba(15,12,41,0.97)",
              border: "1px solid rgba(255,255,255,0.15)",
              backdropFilter: "blur(20px)",
              minWidth: 160,
              maxHeight: "60vh",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              zIndex: 9999,
            }}
          >
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onMouseDown={(e) => {
                  // Use onMouseDown so it fires before the outside-click handler
                  e.stopPropagation();
                  onChange(l.code);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-white/10"
                style={{
                  color: l.code === lang ? "#a78bfa" : "rgba(255,255,255,0.8)",
                }}
              >
                <span className="font-bold text-xs w-6 opacity-60">
                  {l.code.toUpperCase()}
                </span>
                <span>{l.native}</span>
                {l.code === lang && (
                  <span className="ml-auto text-purple-400 text-xs">✓</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */
interface Props {
  onContinue: () => void;
}

export default function IntroPage({ onContinue }: Props) {
  // Language from shared EntryLanguageContext — persists across EntryFlow steps
  const { language, setLanguage, isRTL } = useEntryLanguage();
  const t = T[language];
  const sections = SECTIONS(t);

  return (
    <div
      className="min-h-screen w-full flex flex-col relative overflow-hidden"
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        background:
          "linear-gradient(160deg, #0a0818 0%, #130d2e 35%, #0d1a3a 70%, #0a0818 100%)",
      }}
    >
      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-[20%] right-[-15%] w-[45vw] h-[45vw] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(59,130,246,0.14) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-[10%] left-[5%] w-[40vw] h-[40vw] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 relative" style={{ zIndex: 100 }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden shadow-lg"
            style={{ boxShadow: "0 0 20px rgba(124,58,237,0.5)" }}
          >
            <Logo size={36} rounded="rounded-xl" />
          </div>
          <span className="text-white font-black text-base tracking-tight">
            SkillLeague
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <LanguagePicker lang={language} onChange={setLanguage} />
        </motion.div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-32 relative z-10">
        {/* Hero section */}
        <div className="px-5 pt-6 pb-8 text-center">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 180, delay: 0.2 }}
            className="flex justify-center mb-5"
          >
            <div
              className="relative w-24 h-24 rounded-3xl flex items-center justify-center overflow-hidden shadow-2xl"
              style={{
                boxShadow:
                  "0 0 50px rgba(124,58,237,0.6), 0 0 100px rgba(124,58,237,0.2)",
              }}
            >
              <Logo size={96} rounded="rounded-3xl" />
              <motion.div
                className="absolute inset-0 rounded-3xl"
                style={{ border: "1.5px solid rgba(167,139,250,0.5)" }}
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
            </div>
          </motion.div>

          <motion.h1
            key={`title-${language}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="text-3xl font-black text-white tracking-tight leading-tight"
          >
            {t.tagline}
          </motion.h1>

          <motion.p
            key={`sub-${language}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="text-white/55 text-sm leading-relaxed mt-3 max-w-xs mx-auto"
          >
            {t.subtitle}
          </motion.p>

          {/* Stat pills */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center gap-3 mt-5 flex-wrap"
          >
            {[
              { value: "10K+", label: t.stat_players },
              { value: "50+",  label: t.stat_tournaments },
              { value: "∞",    label: t.stat_challenges },
            ].map((s) => (
              <div
                key={s.label}
                className="px-4 py-2 rounded-2xl text-center"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <p className="text-lg font-black text-purple-300 leading-none">
                  {s.value}
                </p>
                <motion.p
                  key={`stat-${language}-${s.label}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="text-white/40 text-xs mt-0.5"
                >
                  {s.label}
                </motion.p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Feature cards */}
        <div className="px-4 flex flex-col gap-4">
          {sections.map((sec, idx) => (
            <motion.div
              key={`${language}-${idx}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 * idx }}
              className="relative rounded-3xl overflow-hidden p-5"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${sec.border}`,
                backdropFilter: "blur(12px)",
              }}
            >
              {/* Glow */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  background: `radial-gradient(ellipse at top left, ${sec.glow}, transparent 70%)`,
                }}
              />

              <div className="relative flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 bg-gradient-to-br ${sec.gradient} shadow-lg`}
                  style={{ boxShadow: `0 6px 20px ${sec.glow}` }}
                >
                  {sec.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-base leading-tight mb-2">
                    {sec.title}
                  </h3>
                  <ul className="flex flex-col gap-1.5">
                    {sec.items.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-white/65 text-sm"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{
                            background: sec.glow.replace("0.35", "0.9"),
                          }}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Fixed bottom Continue button */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4"
        style={{
          background:
            "linear-gradient(to top, rgba(10,8,24,1) 60%, transparent)",
          zIndex: 50,
        }}
      >
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={onContinue}
          className="w-full h-14 rounded-2xl flex items-center justify-center gap-2.5 font-bold text-base text-white transition-all active:scale-95 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #6d28d9 100%)",
            boxShadow:
              "0 0 40px rgba(124,58,237,0.55), 0 4px 20px rgba(79,70,229,0.4)",
          }}
          whileTap={{ scale: 0.96 }}
        >
          <motion.div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
            }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5 }}
          />
          <motion.span
            key={`btn-${language}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {t.continue_btn}
          </motion.span>
          <span style={{ fontSize: 18 }}>{isRTL ? "←" : "→"}</span>
        </motion.button>
      </div>
    </div>
  );
}
