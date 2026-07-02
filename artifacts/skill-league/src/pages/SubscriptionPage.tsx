import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { Language } from "@/lib/i18n";
import { useEntryLanguage } from "@/contexts/EntryLanguageContext";

/* ─── Translations ─────────────────────────────────────────────────────── */
interface SubT {
  heading: string;
  powered: string;
  pi_test_notice: string;
  connecting: string;
  error_pi: string;
  footer: string;
  guest_disclaimer: string;
  premium_name: string;
  premium_features: string[];
  standard_name: string;
  standard_features: string[];
  guest_name: string;
  guest_features: string[];
  btn_premium: string;
  btn_standard: string;
  btn_guest: string;
  recommended: string;
}

const T: Record<Language, SubT> = {
  en: {
    heading: "Choose Your Plan",
    powered: "Payments powered by Pi Network",
    pi_test_notice: " is used for all payments. This is NOT real Pi cryptocurrency — it is test currency only.",
    connecting: "Connecting to Pi…",
    error_pi: "Pi Network authentication failed. Please try again.",
    footer: "Paid plans create a permanent account. Your progress, wallet, and subscription are saved forever. Guest mode is temporary and resets on every session.",
    guest_disclaimer: "Guest access is temporary. You'll see this screen every time you reopen the app.",
    premium_name: "Premium",
    premium_features: ["Full access to all features", "Competitive league participation", "DN Wallet & Creator earnings", "Exclusive premium badges", "Priority matchmaking", "All social features unlocked", "Marketplace & Jobs access", "Monthly reward drops"],
    standard_name: "Standard",
    standard_features: ["Core platform access", "League participation", "DN Wallet activated", "Social features", "Marketplace access"],
    guest_name: "Guest",
    guest_features: ["Browse platform only", "View leaderboards", "Watch matches", "Limited access"],
    btn_premium: "Get Premium — 3 PI TEST",
    btn_standard: "Get Standard — 1 PI TEST",
    btn_guest: "Continue as Guest",
    recommended: "⭐ RECOMMENDED",
  },
  ar: {
    heading: "اختر خطتك",
    powered: "المدفوعات بدعم من شبكة Pi",
    pi_test_notice: " مستخدم لجميع المدفوعات. هذه ليست عملة Pi حقيقية — إنها عملة اختبار فقط.",
    connecting: "جارٍ الاتصال بـ Pi…",
    error_pi: "فشل التحقق من Pi Network. يرجى المحاولة مرة أخرى.",
    footer: "الخطط المدفوعة تنشئ حسابًا دائمًا. يتم حفظ تقدمك ومحفظتك واشتراكك للأبد. وضع الضيف مؤقت ويُعاد ضبطه في كل جلسة.",
    guest_disclaimer: "وصول الضيف مؤقت. ستظهر هذه الشاشة في كل مرة تعيد فيها فتح التطبيق.",
    premium_name: "بريميوم",
    premium_features: ["وصول كامل لجميع الميزات", "مشاركة في الدوري التنافسي", "محفظة DN وأرباح المبدعين", "شارات بريميوم حصرية", "مطابقة ذات أولوية", "جميع الميزات الاجتماعية مفعّلة", "الوصول للسوق والوظائف", "مكافآت شهرية"],
    standard_name: "ستاندرد",
    standard_features: ["وصول أساسي للمنصة", "مشاركة في الدوري", "تفعيل محفظة DN", "الميزات الاجتماعية", "وصول للسوق"],
    guest_name: "ضيف",
    guest_features: ["تصفح المنصة فقط", "عرض لوحات الصدارة", "مشاهدة المباريات", "وصول محدود"],
    btn_premium: "احصل على بريميوم — 3 PI TEST",
    btn_standard: "احصل على ستاندرد — 1 PI TEST",
    btn_guest: "المتابعة كضيف",
    recommended: "⭐ موصى به",
  },
  fr: {
    heading: "Choisissez votre formule",
    powered: "Paiements via Pi Network",
    pi_test_notice: " est utilisé pour tous les paiements. Ce n'est PAS du vrai Pi — c'est de la monnaie de test uniquement.",
    connecting: "Connexion à Pi…",
    error_pi: "Échec de l'authentification Pi Network. Veuillez réessayer.",
    footer: "Les forfaits payants créent un compte permanent. Vos progrès, portefeuille et abonnement sont sauvegardés à vie. Le mode invité est temporaire.",
    guest_disclaimer: "L'accès invité est temporaire. Vous verrez cet écran à chaque réouverture.",
    premium_name: "Premium",
    premium_features: ["Accès complet", "Participation aux ligues compétitives", "Portefeuille DN & gains créateurs", "Badges premium exclusifs", "Matchmaking prioritaire", "Toutes les fonctions sociales", "Accès Marketplace & Emplois", "Récompenses mensuelles"],
    standard_name: "Standard",
    standard_features: ["Accès de base", "Participation aux ligues", "Portefeuille DN activé", "Fonctions sociales", "Accès Marketplace"],
    guest_name: "Invité",
    guest_features: ["Parcourir la plateforme", "Voir les classements", "Regarder des matchs", "Accès limité"],
    btn_premium: "Premium — 3 PI TEST",
    btn_standard: "Standard — 1 PI TEST",
    btn_guest: "Continuer en tant qu'invité",
    recommended: "⭐ RECOMMANDÉ",
  },
  es: {
    heading: "Elige tu plan",
    powered: "Pagos a través de Pi Network",
    pi_test_notice: " se usa para todos los pagos. No es Pi real — es moneda de prueba.",
    connecting: "Conectando con Pi…",
    error_pi: "Fallo en la autenticación de Pi Network. Por favor, inténtalo de nuevo.",
    footer: "Los planes de pago crean una cuenta permanente. Tu progreso, cartera y suscripción se guardan para siempre. El modo invitado es temporal.",
    guest_disclaimer: "El acceso como invitado es temporal. Verás esta pantalla cada vez que abras la app.",
    premium_name: "Premium",
    premium_features: ["Acceso completo", "Participación en ligas competitivas", "Cartera DN & ganancias creador", "Insignias premium exclusivas", "Emparejamiento prioritario", "Todas las funciones sociales", "Acceso a Marketplace y Empleos", "Recompensas mensuales"],
    standard_name: "Estándar",
    standard_features: ["Acceso básico", "Participación en ligas", "Cartera DN activada", "Funciones sociales", "Acceso a Marketplace"],
    guest_name: "Invitado",
    guest_features: ["Solo navegar", "Ver clasificaciones", "Ver partidas", "Acceso limitado"],
    btn_premium: "Obtener Premium — 3 PI TEST",
    btn_standard: "Obtener Estándar — 1 PI TEST",
    btn_guest: "Continuar como Invitado",
    recommended: "⭐ RECOMENDADO",
  },
  de: {
    heading: "Wähle deinen Plan",
    powered: "Zahlungen über Pi Network",
    pi_test_notice: " wird für alle Zahlungen verwendet. Dies ist KEIN echtes Pi — nur Testwährung.",
    connecting: "Verbindung mit Pi…",
    error_pi: "Pi Network-Authentifizierung fehlgeschlagen. Bitte versuche es erneut.",
    footer: "Bezahlte Pläne erstellen ein dauerhaftes Konto. Dein Fortschritt, deine Wallet und dein Abonnement werden für immer gespeichert. Gastmodus ist temporär.",
    guest_disclaimer: "Gastzugang ist temporär. Du siehst diesen Bildschirm jedes Mal beim Öffnen.",
    premium_name: "Premium",
    premium_features: ["Vollzugriff", "Teilnahme an Wettkampfligen", "DN-Wallet & Creator-Einnahmen", "Exklusive Premium-Abzeichen", "Prioritäts-Matchmaking", "Alle sozialen Funktionen", "Zugang zu Marktplatz & Jobs", "Monatliche Belohnungen"],
    standard_name: "Standard",
    standard_features: ["Grundzugang", "Ligenteilnahme", "DN-Wallet aktiviert", "Soziale Funktionen", "Marktplatzzugang"],
    guest_name: "Gast",
    guest_features: ["Nur browsen", "Ranglisten ansehen", "Matches ansehen", "Eingeschränkter Zugang"],
    btn_premium: "Premium holen — 3 PI TEST",
    btn_standard: "Standard holen — 1 PI TEST",
    btn_guest: "Als Gast fortfahren",
    recommended: "⭐ EMPFOHLEN",
  },
  pt: {
    heading: "Escolha seu plano",
    powered: "Pagamentos via Pi Network",
    pi_test_notice: " é usado para todos os pagamentos. NÃO é Pi real — é moeda de teste.",
    connecting: "Conectando ao Pi…",
    error_pi: "Falha na autenticação do Pi Network. Por favor, tente novamente.",
    footer: "Planos pagos criam uma conta permanente. Seu progresso, carteira e assinatura são salvos para sempre. Modo convidado é temporário.",
    guest_disclaimer: "O acesso como convidado é temporário. Você verá esta tela toda vez que abrir o app.",
    premium_name: "Premium",
    premium_features: ["Acesso completo", "Participação em ligas competitivas", "Carteira DN & ganhos criador", "Distintivos premium exclusivos", "Matchmaking prioritário", "Todas as funções sociais", "Acesso a Marketplace e Empregos", "Recompensas mensais"],
    standard_name: "Padrão",
    standard_features: ["Acesso básico", "Participação em ligas", "Carteira DN ativada", "Funções sociais", "Acesso ao Marketplace"],
    guest_name: "Convidado",
    guest_features: ["Apenas navegar", "Ver classificações", "Assistir partidas", "Acesso limitado"],
    btn_premium: "Obter Premium — 3 PI TEST",
    btn_standard: "Obter Padrão — 1 PI TEST",
    btn_guest: "Continuar como Convidado",
    recommended: "⭐ RECOMENDADO",
  },
  tr: {
    heading: "Planını seç",
    powered: "Pi Network ile ödemeler",
    pi_test_notice: " tüm ödemeler için kullanılır. Bu gerçek Pi değil — yalnızca test para birimidir.",
    connecting: "Pi'ye bağlanıyor…",
    error_pi: "Pi Network kimlik doğrulaması başarısız. Lütfen tekrar deneyin.",
    footer: "Ücretli planlar kalıcı bir hesap oluşturur. İlerlemeniz, cüzdanınız ve aboneliğiniz sonsuza kadar kaydedilir. Misafir modu geçicidir.",
    guest_disclaimer: "Misafir erişimi geçicidir. Uygulamayı her açtığınızda bu ekranı göreceksiniz.",
    premium_name: "Premium",
    premium_features: ["Tüm özelliklere tam erişim", "Rekabetçi lig katılımı", "DN Cüzdanı & Yaratıcı kazançları", "Özel premium rozetler", "Öncelikli eşleştirme", "Tüm sosyal özellikler", "Pazar & İş erişimi", "Aylık ödüller"],
    standard_name: "Standart",
    standard_features: ["Temel platform erişimi", "Lig katılımı", "DN Cüzdanı aktif", "Sosyal özellikler", "Pazar erişimi"],
    guest_name: "Misafir",
    guest_features: ["Yalnızca gezinme", "Sıralamaları görüntüleme", "Maçları izleme", "Sınırlı erişim"],
    btn_premium: "Premium Al — 3 PI TEST",
    btn_standard: "Standart Al — 1 PI TEST",
    btn_guest: "Misafir Olarak Devam Et",
    recommended: "⭐ ÖNERİLEN",
  },
  hi: {
    heading: "अपना प्लान चुनें",
    powered: "Pi Network द्वारा संचालित भुगतान",
    pi_test_notice: " सभी भुगतानों के लिए उपयोग किया जाता है। यह वास्तविक Pi नहीं है — केवल टेस्ट करेंसी है।",
    connecting: "Pi से जोड़ रहे हैं…",
    error_pi: "Pi Network प्रमाणीकरण विफल। कृपया पुनः प्रयास करें।",
    footer: "पेड प्लान एक स्थायी खाता बनाते हैं। आपकी प्रगति, वॉलेट और सदस्यता हमेशा के लिए सहेजी जाती है। गेस्ट मोड अस्थायी है।",
    guest_disclaimer: "गेस्ट एक्सेस अस्थायी है। ऐप हर बार खोलने पर यह स्क्रीन दिखाई देगी।",
    premium_name: "प्रीमियम",
    premium_features: ["सभी सुविधाओं तक पूर्ण पहुँच", "प्रतिस्पर्धी लीग भागीदारी", "DN वॉलेट और क्रिएटर कमाई", "विशेष प्रीमियम बैज", "प्राथमिकता मैचमेकिंग", "सभी सोशल फीचर", "मार्केटप्लेस और जॉब्स एक्सेस", "मासिक पुरस्कार"],
    standard_name: "स्टैंडर्ड",
    standard_features: ["मूल प्लेटफ़ॉर्म एक्सेस", "लीग भागीदारी", "DN वॉलेट सक्रिय", "सोशल फीचर", "मार्केटप्लेस एक्सेस"],
    guest_name: "अतिथि",
    guest_features: ["केवल ब्राउज़ करें", "लीडरबोर्ड देखें", "मैच देखें", "सीमित पहुँच"],
    btn_premium: "प्रीमियम लें — 3 PI TEST",
    btn_standard: "स्टैंडर्ड लें — 1 PI TEST",
    btn_guest: "अतिथि के रूप में जारी रखें",
    recommended: "⭐ अनुशंसित",
  },
  zh: {
    heading: "选择您的套餐",
    powered: "通过 Pi Network 支付",
    pi_test_notice: " 用于所有付款。这不是真实的 Pi 加密货币——仅为测试货币。",
    connecting: "正在连接 Pi…",
    error_pi: "Pi Network 身份验证失败，请重试。",
    footer: "付费套餐创建永久账户。您的进度、钱包和订阅将永久保存。访客模式为临时模式，每次打开应用将重置。",
    guest_disclaimer: "访客访问是临时的。每次重新打开应用都会看到此页面。",
    premium_name: "高级版",
    premium_features: ["完整功能访问", "参与竞技联赛", "DN钱包和创作者收益", "专属高级徽章", "优先匹配", "所有社交功能", "市场和工作访问", "每月奖励"],
    standard_name: "标准版",
    standard_features: ["基础平台访问", "联赛参与", "DN钱包已激活", "社交功能", "市场访问"],
    guest_name: "访客",
    guest_features: ["仅浏览平台", "查看排行榜", "观看比赛", "有限访问"],
    btn_premium: "获取高级版 — 3 PI TEST",
    btn_standard: "获取标准版 — 1 PI TEST",
    btn_guest: "以访客身份继续",
    recommended: "⭐ 推荐",
  },
  ru: {
    heading: "Выберите план",
    powered: "Платежи через Pi Network",
    pi_test_notice: " используется для всех платежей. Это НЕ настоящий Pi — только тестовая валюта.",
    connecting: "Подключение к Pi…",
    error_pi: "Ошибка аутентификации Pi Network. Попробуйте ещё раз.",
    footer: "Платные планы создают постоянный аккаунт. Прогресс, кошелёк и подписка сохраняются навсегда. Гостевой режим временный.",
    guest_disclaimer: "Гостевой доступ временный. Вы будете видеть этот экран каждый раз при открытии приложения.",
    premium_name: "Премиум",
    premium_features: ["Полный доступ", "Участие в лигах", "DN-кошелёк и доходы создателя", "Эксклюзивные значки", "Приоритетный матчмейкинг", "Все социальные функции", "Доступ к рынку и вакансиям", "Ежемесячные награды"],
    standard_name: "Стандарт",
    standard_features: ["Базовый доступ", "Участие в лигах", "DN-кошелёк активирован", "Социальные функции", "Доступ к рынку"],
    guest_name: "Гость",
    guest_features: ["Только просмотр", "Просмотр таблиц лидеров", "Просмотр матчей", "Ограниченный доступ"],
    btn_premium: "Premium — 3 PI TEST",
    btn_standard: "Стандарт — 1 PI TEST",
    btn_guest: "Продолжить как гость",
    recommended: "⭐ РЕКОМЕНДУЕТСЯ",
  },
};

/* ─── Plan shape ────────────────────────────────────────────────────────── */
interface Plan {
  id: "premium3" | "premium1" | "guest";
  icon: string;
  price: string | null;
  gradient: string;
  glow: string;
  border: string;
  btnStyle: React.CSSProperties;
  featured: boolean;
}

const PLANS: Plan[] = [
  {
    id: "premium3",
    icon: "💎",
    price: "3",
    gradient: "from-violet-600 via-purple-600 to-indigo-700",
    glow: "rgba(139,92,246,0.5)",
    border: "rgba(167,139,250,0.5)",
    btnStyle: {
      background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
      boxShadow: "0 0 30px rgba(124,58,237,0.6)",
      color: "white",
    },
    featured: true,
  },
  {
    id: "premium1",
    icon: "💰",
    price: "1",
    gradient: "from-blue-600 to-indigo-700",
    glow: "rgba(99,102,241,0.4)",
    border: "rgba(99,102,241,0.4)",
    btnStyle: {
      background: "linear-gradient(135deg, #2563eb, #4f46e5)",
      boxShadow: "0 0 20px rgba(99,102,241,0.5)",
      color: "white",
    },
    featured: false,
  },
  {
    id: "guest",
    icon: "👀",
    price: null,
    gradient: "from-gray-600 to-gray-700",
    glow: "rgba(107,114,128,0.3)",
    border: "rgba(107,114,128,0.3)",
    btnStyle: {
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.2)",
      color: "rgba(255,255,255,0.7)",
    },
    featured: false,
  },
];

/* ─── Component ─────────────────────────────────────────────────────────── */
interface Props {
  onBack: () => void;
}

export default function SubscriptionPage({ onBack }: Props) {
  const { loginWithPiNetwork, loginAsGuest } = useGame();
  const { language, isRTL } = useEntryLanguage();
  const tx = T[language];

  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSelect = async (plan: Plan) => {
    if (loading) return;
    setError("");

    if (plan.id === "guest") {
      try { sessionStorage.setItem("sl_guest_active", "1"); } catch {}
      loginAsGuest();
      return;
    }

    setLoading(plan.id);
    try {
      await loginWithPiNetwork();
      try {
        localStorage.setItem("sl_subscription", JSON.stringify({ plan: plan.id, ts: Date.now() }));
      } catch {}
    } catch {
      setError(tx.error_pi);
    } finally {
      setLoading(null);
    }
  };

  // Map plan id → translated display data
  const planDisplay = (plan: Plan) => ({
    name:        plan.id === "premium3" ? tx.premium_name : plan.id === "premium1" ? tx.standard_name : tx.guest_name,
    features:    plan.id === "premium3" ? tx.premium_features : plan.id === "premium1" ? tx.standard_features : tx.guest_features,
    btnLabel:    plan.id === "premium3" ? tx.btn_premium : plan.id === "premium1" ? tx.btn_standard : tx.btn_guest,
    badge:       plan.id === "premium3" ? tx.recommended : null,
    badgeColor:  "from-amber-400 to-yellow-500",
    priceLabel:  plan.price ? "PI TEST" : (language === "en" ? "Free" : language === "ar" ? "مجاني" : language === "fr" ? "Gratuit" : language === "es" ? "Gratis" : language === "de" ? "Kostenlos" : language === "pt" ? "Grátis" : language === "tr" ? "Ücretsiz" : language === "hi" ? "निःशुल्क" : language === "zh" ? "免费" : language === "ru" ? "Бесплатно" : "Free"),
  });

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
          className="absolute top-[-5%] right-[-10%] w-[55vw] h-[55vw] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-[0%] left-[-10%] w-[50vw] h-[50vw] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-5 pt-5 pb-2">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onBack}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <span className="text-white text-base">{isRTL ? "→" : "←"}</span>
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <motion.h2
            key={`heading-${language}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="text-white font-black text-xl leading-tight"
          >
            {tx.heading}
          </motion.h2>
          <p className="text-white/40 text-xs">{tx.powered}</p>
        </motion.div>
      </div>

      {/* PI TEST notice */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mx-5 mt-3 rounded-2xl px-4 py-3 flex items-center gap-2.5 relative z-10"
        style={{
          background: "rgba(245,158,11,0.12)",
          border: "1px solid rgba(245,158,11,0.35)",
        }}
      >
        <span className="text-lg flex-shrink-0">⚠️</span>
        <motion.p
          key={`notice-${language}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="text-amber-300 text-xs leading-relaxed"
        >
          <span className="font-bold">PI TEST</span>
          {tx.pi_test_notice}
        </motion.p>
      </motion.div>

      {/* Plan cards */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 flex flex-col gap-4 relative z-10">
        {PLANS.map((plan, idx) => {
          const d = planDisplay(plan);
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.15 + idx * 0.12 }}
              className="relative rounded-3xl overflow-hidden"
              style={{
                background: plan.featured
                  ? "linear-gradient(160deg, rgba(124,58,237,0.15) 0%, rgba(79,70,229,0.1) 100%)"
                  : "rgba(255,255,255,0.04)",
                border: `1.5px solid ${plan.border}`,
                boxShadow: plan.featured
                  ? `0 0 40px ${plan.glow}, 0 0 80px rgba(124,58,237,0.08)`
                  : "none",
              }}
            >
              {/* Recommended badge */}
              {d.badge && (
                <motion.div
                  key={`badge-${language}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`absolute top-0 left-0 right-0 flex justify-center py-2 bg-gradient-to-r ${d.badgeColor} text-black font-black text-xs tracking-wider`}
                >
                  {d.badge}
                </motion.div>
              )}

              <div className={`p-5 ${d.badge ? "pt-9" : ""}`}>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 bg-gradient-to-br ${plan.gradient} shadow-lg`}
                      style={{ boxShadow: `0 6px 20px ${plan.glow}` }}
                    >
                      {plan.icon}
                    </div>
                    <div>
                      <motion.h3
                        key={`name-${language}-${plan.id}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="text-white font-bold text-base leading-tight"
                      >
                        {d.name}
                      </motion.h3>
                      {plan.price ? (
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-white font-black text-xl leading-none">
                            {plan.price}
                          </span>
                          <span
                            className="text-xs font-black tracking-wide px-1.5 py-0.5 rounded-lg"
                            style={{
                              background: "rgba(245,158,11,0.2)",
                              color: "#fbbf24",
                            }}
                          >
                            PI TEST
                          </span>
                        </div>
                      ) : (
                        <span className="text-white/50 text-sm font-semibold">
                          {d.priceLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {plan.featured && (
                    <motion.div
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                      className="text-2xl flex-shrink-0"
                    >
                      ✨
                    </motion.div>
                  )}
                </div>

                {/* Divider */}
                <div
                  className="my-4 h-px"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${plan.border}, transparent)`,
                  }}
                />

                {/* Features */}
                <ul className="flex flex-col gap-2">
                  {d.features.map((f, i) => (
                    <motion.li
                      key={`${language}-${plan.id}-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15, delay: i * 0.03 }}
                      className="flex items-center gap-2.5"
                    >
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-xs"
                        style={{
                          background:
                            plan.id === "guest"
                              ? "rgba(107,114,128,0.3)"
                              : `linear-gradient(135deg, ${plan.glow
                                  .replace("0.4", "0.9")
                                  .replace("0.5", "0.9")}, ${plan.glow})`,
                        }}
                      >
                        <span style={{ fontSize: 8, color: "white" }}>✓</span>
                      </div>
                      <span className="text-white/70 text-sm">{f}</span>
                    </motion.li>
                  ))}
                </ul>

                {plan.id === "guest" && (
                  <motion.p
                    key={`disclaimer-${language}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="text-white/35 text-xs mt-3 leading-relaxed"
                  >
                    {tx.guest_disclaimer}
                  </motion.p>
                )}

                {/* CTA button */}
                <motion.button
                  onClick={() => handleSelect(plan)}
                  disabled={loading !== null}
                  className="w-full mt-5 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-95 disabled:opacity-60"
                  style={{ ...plan.btnStyle, height: 52 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <AnimatePresence mode="wait">
                    {loading === plan.id ? (
                      <motion.div
                        key="spinner"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 rounded-full border-2"
                          style={{
                            borderColor: "rgba(255,255,255,0.3)",
                            borderTopColor: "white",
                          }}
                        />
                        <span>{tx.connecting}</span>
                      </motion.div>
                    ) : (
                      <motion.span
                        key={`btn-${language}-${plan.id}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        {plan.id !== "guest" && <span className="mr-1">π</span>}
                        {d.btnLabel}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            </motion.div>
          );
        })}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="rounded-2xl px-4 py-3 text-center"
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.3)",
              }}
            >
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.p
          key={`footer-${language}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.3 }}
          className="text-white/25 text-xs text-center px-4 leading-relaxed"
        >
          {tx.footer}
        </motion.p>
      </div>
    </div>
  );
}
